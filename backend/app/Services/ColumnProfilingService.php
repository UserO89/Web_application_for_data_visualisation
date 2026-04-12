<?php

namespace App\Services;

use Carbon\Carbon;

class ColumnProfilingService
{
    private const SAMPLE_LIMIT = 5;

    private const TOP_FREQUENCY_LIMIT = 8;

    private const KNOWN_ORDINAL_SETS = [
        ['low', 'medium', 'high'],
        ['very low', 'low', 'medium', 'high', 'very high'],
        ['bad', 'average', 'good', 'excellent'],
        ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree'],
        ['junior', 'middle', 'senior'],
        ['a', 'b', 'c', 'd', 'f'],
    ];

    public function __construct(
        private ValueParsingService $valueParsingService
    ) {}

    public function profile(array $values, string $columnName): array
    {
        $normalizedNonNull = [];
        $nonNullRaw = [];

        foreach ($values as $value) {
            $normalized = $this->valueParsingService->normalizeNullableString($value);
            if ($normalized === null) {
                continue;
            }
            $normalizedNonNull[] = $normalized;
            $nonNullRaw[] = $value;
        }

        $rowCount = count($values);
        $nonNullCount = count($normalizedNonNull);
        $nullCount = $rowCount - $nonNullCount;

        $distinctValues = array_values(array_unique($normalizedNonNull));
        $distinctCount = count($distinctValues);
        $distinctRatio = $nonNullCount > 0 ? $distinctCount / $nonNullCount : 0.0;

        $numberParsed = [];
        $dateParsed = [];
        $dateLikeWithTime = 0;
        $booleanParsed = [];
        foreach ($normalizedNonNull as $normalized) {
            $numeric = $this->valueParsingService->toNumeric($normalized);
            if ($numeric !== null) {
                $numberParsed[] = $numeric;
            }

            $date = $this->valueParsingService->parseTemporal($normalized);
            if ($date !== null) {
                $dateParsed[] = $date;
                if ($this->valueParsingService->isDateTimeLikeString($normalized)) {
                    $dateLikeWithTime++;
                }
            }

            $bool = $this->valueParsingService->toBoolean($normalized);
            if ($bool !== null) {
                $booleanParsed[] = $bool;
            }
        }

        $parseSuccess = [
            'number' => $nonNullCount > 0 ? count($numberParsed) / $nonNullCount : 0.0,
            'date' => $nonNullCount > 0 ? count($dateParsed) / $nonNullCount : 0.0,
            'boolean' => $nonNullCount > 0 ? count($booleanParsed) / $nonNullCount : 0.0,
        ];

        $nameHints = $this->extractNameHints($columnName);
        $physicalType = $this->inferPhysicalType($nonNullCount, $parseSuccess, $dateLikeWithTime, $distinctCount, $nonNullRaw);

        $profile = [
            'rowCount' => $rowCount,
            'nonNullCount' => $nonNullCount,
            'nullCount' => $nullCount,
            'distinctCount' => $distinctCount,
            'distinctRatio' => round($distinctRatio, 6),
            'sampleValues' => array_slice($distinctValues, 0, self::SAMPLE_LIMIT),
            'parseSuccess' => [
                'number' => round($parseSuccess['number'], 6),
                'date' => round($parseSuccess['date'], 6),
                'boolean' => round($parseSuccess['boolean'], 6),
            ],
            'nameHints' => $nameHints,
        ];

        if (! empty($numberParsed)) {
            $numericStats = $this->buildNumericProfile($numberParsed);
            $profile = [...$profile, ...$numericStats];
        }

        if ($physicalType === 'string' || $physicalType === 'mixed' || $physicalType === 'unknown') {
            $stringStats = $this->buildStringProfile($normalizedNonNull);
            $profile = [...$profile, ...$stringStats];
        }

        if (! empty($dateParsed)) {
            $temporalStats = $this->buildTemporalProfile($dateParsed);
            $profile = [...$profile, ...$temporalStats];
        }

        $ordinalDictionary = $this->detectKnownOrdinalDictionary($distinctValues);
        if ($ordinalDictionary !== null) {
            $profile['knownOrdinalDictionaryMatch'] = $ordinalDictionary;
        }

        return [
            'physicalType' => $physicalType,
            'profile' => $profile,
        ];
    }

    private function buildNumericProfile(array $values): array
    {
        $sorted = [...$values];
        sort($sorted);
        $count = count($sorted);
        $sum = array_sum($sorted);
        $mean = $count > 0 ? $sum / $count : null;

        $isIntegerLike = $count > 0
            ? (count(array_filter($sorted, fn ($value) => floor($value) === $value)) / $count) >= 0.98
            : false;

        return [
            'min' => $sorted[0] ?? null,
            'max' => $sorted[$count - 1] ?? null,
            'mean' => $mean,
            'median' => $this->quantile($sorted, 0.5),
            'isIntegerLike' => $isIntegerLike,
            'isSequentialLike' => $this->isSequentialLike($sorted),
        ];
    }

    private function buildStringProfile(array $values): array
    {
        if (empty($values)) {
            return [
                'avgLength' => 0,
                'maxLength' => 0,
                'topFrequencies' => [],
            ];
        }

        $lengths = array_map(fn ($v) => mb_strlen((string) $v), $values);
        $frequencies = array_count_values($values);
        arsort($frequencies);

        $top = [];
        foreach (array_slice($frequencies, 0, self::TOP_FREQUENCY_LIMIT, true) as $value => $count) {
            $top[] = [
                'value' => $value,
                'count' => $count,
            ];
        }

        return [
            'avgLength' => array_sum($lengths) / count($lengths),
            'maxLength' => max($lengths),
            'topFrequencies' => $top,
        ];
    }

    private function buildTemporalProfile(array $dates): array
    {
        usort($dates, fn (Carbon $a, Carbon $b) => $a->timestamp <=> $b->timestamp);
        $earliest = $dates[0] ?? null;
        $latest = $dates[count($dates) - 1] ?? null;

        $granularity = $this->valueParsingService->inferTemporalGranularity($dates);
        $periodFormat = match ($granularity) {
            'year' => 'Y',
            'month' => 'Y-m',
            'day' => 'Y-m-d',
            'minute', 'second' => 'Y-m-d H:i',
            default => 'Y-m-d',
        };
        $uniquePeriods = count(array_unique(array_map(fn (Carbon $date) => $date->format($periodFormat), $dates)));

        return [
            'earliest' => $earliest?->toAtomString(),
            'latest' => $latest?->toAtomString(),
            'temporalRangeSeconds' => ($earliest && $latest) ? $latest->diffInSeconds($earliest) : null,
            'granularity' => $granularity,
            'uniquePeriods' => $uniquePeriods,
        ];
    }

    private function inferPhysicalType(
        int $nonNullCount,
        array $parseSuccess,
        int $dateLikeWithTime,
        int $distinctCount,
        array $nonNullRaw
    ): string {
        if ($nonNullCount === 0) {
            return 'unknown';
        }

        if ($parseSuccess['boolean'] >= 0.96 && $distinctCount <= 2) {
            return 'boolean';
        }

        if ($parseSuccess['number'] >= 0.9) {
            return 'number';
        }

        if ($parseSuccess['date'] >= 0.85) {
            $timeRatio = $nonNullCount > 0 ? $dateLikeWithTime / $nonNullCount : 0.0;

            return $timeRatio >= 0.2 ? 'datetime' : 'date';
        }

        $looksMixed = $parseSuccess['number'] >= 0.35 || $parseSuccess['date'] >= 0.35;
        if ($looksMixed) {
            return 'mixed';
        }

        if (! empty($nonNullRaw) && count(array_filter($nonNullRaw, fn ($value) => is_bool($value))) === count($nonNullRaw)) {
            return 'boolean';
        }

        return 'string';
    }

    private function extractNameHints(string $columnName): array
    {
        $name = mb_strtolower(trim($columnName));

        $identifier = preg_match('/(^|_|\\s)(id|uuid|code|serial|no|number|key|token)(_|\\s|$)/', $name) === 1;
        $metric = preg_match('/(age|salary|amount|price|score|weight|height|duration|distance|total|cost|revenue|profit|rate|count|qty|quantity)/', $name) === 1;
        $temporal = preg_match('/(date|time|timestamp|created|updated|month|year|day|week|quarter)/', $name) === 1;
        $ordinal = preg_match('/(rank|priority|level|grade|stage|severity)/', $name) === 1;
        $categorical = preg_match('/(country|city|region|department|category|group|type|status|color|segment)/', $name) === 1;

        return [
            'identifier' => $identifier,
            'metric' => $metric,
            'temporal' => $temporal,
            'ordinal' => $ordinal,
            'categorical' => $categorical,
        ];
    }

    private function detectKnownOrdinalDictionary(array $distinctValues): ?array
    {
        if (empty($distinctValues)) {
            return null;
        }

        $normalizedDistinct = array_values(array_unique(array_map(
            fn ($value) => mb_strtolower(trim((string) $value)),
            $distinctValues
        )));

        foreach (self::KNOWN_ORDINAL_SETS as $dictionary) {
            $intersection = array_values(array_intersect($normalizedDistinct, $dictionary));
            if (count($intersection) < 2) {
                continue;
            }

            // We need at least 60% of the set or all existing distinct values to match.
            $coverageByDict = count($intersection) / count($dictionary);
            $coverageByValues = count($intersection) / count($normalizedDistinct);
            if ($coverageByDict < 0.6 && $coverageByValues < 0.8) {
                continue;
            }

            $orderedIntersection = array_values(array_filter(
                $dictionary,
                fn ($candidate) => in_array($candidate, $intersection, true)
            ));

            return [
                'matched' => true,
                'order' => $orderedIntersection,
                'matchRatio' => round(max($coverageByDict, $coverageByValues), 4),
            ];
        }

        return null;
    }

    private function isSequentialLike(array $sortedValues): bool
    {
        $unique = array_values(array_unique(array_map(fn ($v) => (float) $v, $sortedValues)));
        if (count($unique) < 4) {
            return false;
        }

        sort($unique);
        $sequentialSteps = 0;
        $stepComparisons = 0;
        for ($i = 1; $i < count($unique); $i++) {
            $diff = $unique[$i] - $unique[$i - 1];
            if (! is_finite($diff) || $diff <= 0) {
                continue;
            }
            $stepComparisons++;
            if (abs($diff - 1.0) < 0.00001) {
                $sequentialSteps++;
            }
        }

        if ($stepComparisons === 0) {
            return false;
        }

        return ($sequentialSteps / $stepComparisons) >= 0.9;
    }

    private function quantile(array $sortedValues, float $quantile): ?float
    {
        if (empty($sortedValues)) {
            return null;
        }
        $position = (count($sortedValues) - 1) * $quantile;
        $lower = (int) floor($position);
        $upper = (int) ceil($position);
        if ($lower === $upper) {
            return (float) $sortedValues[$lower];
        }
        $weight = $position - $lower;

        return $sortedValues[$lower] * (1 - $weight) + $sortedValues[$upper] * $weight;
    }
}
