<?php

namespace App\Services;

class SemanticTypeInferenceService
{
    private const SEMANTIC_TYPES = [
        'metric',
        'nominal',
        'ordinal',
        'temporal',
        'identifier',
        'binary',
        'ignored',
    ];

    public function infer(array $profile, string $physicalType, string $columnName): array
    {
        $scores = array_fill_keys(self::SEMANTIC_TYPES, 0.05);
        $reasons = array_fill_keys(self::SEMANTIC_TYPES, []);

        $nonNullCount = (int) ($profile['nonNullCount'] ?? 0);
        $nullCount = (int) ($profile['nullCount'] ?? 0);
        $distinctRatio = (float) ($profile['distinctRatio'] ?? 0.0);
        $distinctCount = (int) ($profile['distinctCount'] ?? 0);
        $parseNumber = (float) ($profile['parseSuccess']['number'] ?? 0.0);
        $parseDate = (float) ($profile['parseSuccess']['date'] ?? 0.0);
        $parseBoolean = (float) ($profile['parseSuccess']['boolean'] ?? 0.0);
        $nameHints = (array) ($profile['nameHints'] ?? []);

        $hasKnownOrdinalDictionary = ! empty($profile['knownOrdinalDictionaryMatch']['matched']);
        $isSequentialLike = (bool) ($profile['isSequentialLike'] ?? false);

        if ($nonNullCount === 0 || ($nullCount / max(1, $nonNullCount + $nullCount)) > 0.98) {
            $scores['ignored'] += 0.8;
            $reasons['ignored'][] = 'Column has almost no usable values.';
        }

        if ($physicalType === 'number') {
            $scores['metric'] += 0.42;
            $reasons['metric'][] = 'Physical type is numeric.';
        }
        if ($parseNumber >= 0.9) {
            $scores['metric'] += 0.2;
            $reasons['metric'][] = 'Most values parse as numbers.';
        }
        if ($distinctRatio >= 0.1 && $distinctRatio <= 0.95) {
            $scores['metric'] += 0.15;
            $reasons['metric'][] = 'Distinct ratio is typical for a measure.';
        }
        if (! empty($nameHints['metric'])) {
            $scores['metric'] += 0.2;
            $reasons['metric'][] = 'Column name looks like a measure.';
        }
        if ($distinctCount <= 2) {
            $scores['metric'] -= 0.25;
            $reasons['metric'][] = 'Too few distinct values for a meaningful metric.';
        }

        if (! empty($nameHints['identifier'])) {
            $scores['identifier'] += 0.5;
            $reasons['identifier'][] = 'Column name looks like an identifier.';
        }
        if ($distinctRatio >= 0.96 && $nonNullCount > 0) {
            $scores['identifier'] += 0.34;
            $reasons['identifier'][] = 'Values are almost unique.';
        }
        if ($isSequentialLike) {
            $scores['identifier'] += 0.2;
            $reasons['identifier'][] = 'Values are close to sequential.';
        }

        if (in_array($physicalType, ['string', 'mixed', 'unknown'], true)) {
            $scores['nominal'] += 0.3;
            $reasons['nominal'][] = 'Physical type is categorical-like.';
        }
        if ($distinctRatio <= 0.35 && $distinctCount > 1) {
            $scores['nominal'] += 0.26;
            $reasons['nominal'][] = 'Distinct ratio suggests categorical values.';
        }
        if (! empty($nameHints['categorical'])) {
            $scores['nominal'] += 0.2;
            $reasons['nominal'][] = 'Column name suggests categories.';
        }

        if ($hasKnownOrdinalDictionary) {
            $scores['ordinal'] += 0.56;
            $reasons['ordinal'][] = 'Values match a known ordinal dictionary.';
        }
        if (! empty($nameHints['ordinal'])) {
            $scores['ordinal'] += 0.2;
            $reasons['ordinal'][] = 'Column name suggests ordered categories.';
        }
        if ($distinctCount >= 2 && $distinctCount <= 8) {
            $scores['ordinal'] += 0.1;
            $reasons['ordinal'][] = 'Limited category count is compatible with ordinal scale.';
        }

        if (in_array($physicalType, ['date', 'datetime'], true)) {
            $scores['temporal'] += 0.56;
            $reasons['temporal'][] = 'Physical type is temporal.';
        }
        if ($parseDate >= 0.85) {
            $scores['temporal'] += 0.25;
            $reasons['temporal'][] = 'Most values parse as temporal.';
        }
        if (! empty($nameHints['temporal'])) {
            $scores['temporal'] += 0.2;
            $reasons['temporal'][] = 'Column name suggests a time dimension.';
        }

        if ($physicalType === 'boolean' || ($parseBoolean >= 0.95 && $distinctCount <= 2)) {
            $scores['binary'] += 0.7;
            $reasons['binary'][] = 'Values look binary/boolean.';
        }

        if ($scores['identifier'] >= 0.7) {
            $scores['metric'] -= 0.3;
            $reasons['metric'][] = 'Looks more like an identifier than a measure.';
        }
        if ($scores['temporal'] >= 0.7) {
            $scores['nominal'] -= 0.2;
            $scores['metric'] -= 0.1;
        }
        if ($scores['binary'] >= 0.7) {
            $scores['nominal'] += 0.1;
            $scores['metric'] -= 0.2;
        }

        foreach ($scores as $type => $score) {
            $scores[$type] = $this->clamp($score);
        }

        arsort($scores);
        $detectedSemanticType = array_key_first($scores);
        $topScore = (float) ($scores[$detectedSemanticType] ?? 0.0);
        $secondScore = (float) (array_values($scores)[1] ?? 0.0);
        $confidence = $this->computeConfidence($topScore, $secondScore);

        return [
            'detectedSemanticType' => $detectedSemanticType,
            'semanticConfidence' => $confidence,
            'inferenceScores' => $scores,
            'inferenceReasons' => $this->trimReasons($reasons),
            'detectedOrdinalOrder' => $hasKnownOrdinalDictionary
                ? ($profile['knownOrdinalDictionaryMatch']['order'] ?? null)
                : null,
            'analyticalRole' => $this->mapAnalyticalRole($detectedSemanticType),
        ];
    }

    public function mapAnalyticalRole(string $semanticType): string
    {
        return match ($semanticType) {
            'metric' => 'measure',
            'temporal' => 'timeDimension',
            'nominal', 'ordinal', 'binary' => 'dimension',
            default => 'excluded',
        };
    }

    private function computeConfidence(float $topScore, float $secondScore): float
    {
        $margin = max(0.0, $topScore - $secondScore);
        $confidence = min(0.99, max(0.05, 0.45 + ($topScore * 0.35) + ($margin * 0.45)));

        return round($confidence, 4);
    }

    private function trimReasons(array $reasons): array
    {
        $result = [];
        foreach ($reasons as $type => $messages) {
            if (empty($messages)) {
                continue;
            }
            $result[$type] = array_values(array_slice(array_unique($messages), 0, 6));
        }

        return $result;
    }

    private function clamp(float $score): float
    {
        return round(max(0.0, min(1.0, $score)), 4);
    }
}
