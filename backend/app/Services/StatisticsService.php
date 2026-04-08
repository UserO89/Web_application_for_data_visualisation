<?php

namespace App\Services;

use App\Models\Dataset;
use App\Models\DatasetRow;
use Illuminate\Support\Facades\Schema;

class StatisticsService
{
    private ?bool $statisticsCacheColumnsAvailable = null;

    public function __construct(
        private DatasetSemanticSchemaService $datasetSemanticSchemaService,
        private ValueParsingService $valueParsingService
    ) {}

    public function getStatistics(Dataset $dataset, bool $rebuild = false): array
    {
        if (!$rebuild && $dataset->statistics_json !== null) {
            return is_array($dataset->statistics_json) ? $dataset->statistics_json : [];
        }

        return $this->buildAndPersist($dataset);
    }

    public function buildAndPersist(Dataset $dataset): array
    {
        $statistics = $this->calculate($dataset);

        if (!$this->canPersistStatisticsCache()) {
            return $statistics;
        }

        $dataset->forceFill([
            'statistics_json' => $statistics,
            'statistics_generated_at' => now(),
        ])->save();

        return $statistics;
    }

    private function canPersistStatisticsCache(): bool
    {
        if ($this->statisticsCacheColumnsAvailable !== null) {
            return $this->statisticsCacheColumnsAvailable;
        }

        $this->statisticsCacheColumnsAvailable = Schema::hasColumns('datasets', [
            'statistics_json',
            'statistics_generated_at',
        ]);

        return $this->statisticsCacheColumnsAvailable;
    }

    public function calculate(Dataset $dataset): array
    {
        // Ensure schema exists and is synced at least once.
        $this->datasetSemanticSchemaService->getSchema($dataset);

        $columns = $dataset->columns()->orderBy('position')->get();
        $rows = $dataset->rows()->select('values')->orderBy('row_index')->get()->all();
        $statistics = [];

        foreach ($columns as $column) {
            $values = $this->extractColumnValues($rows, (int) $column->position, $column->name);
            $semanticType = $column->semantic_type ?: $column->detected_semantic_type ?: 'ignored';
            $columnStats = $this->calculateBySemanticType(
                $values,
                $semanticType,
                is_array($column->ordinal_order) ? $column->ordinal_order : null
            );

            $statistics[] = [
                'column_id' => $column->id,
                'column' => $column->name,
                'physical_type' => $column->physical_type,
                'semantic_type' => $semanticType,
                'analytical_role' => $column->analytical_role,
                'statistics' => $columnStats,
            ];
        }

        return $statistics;
    }

    /**
     * @param DatasetRow[] $rows
     */
    private function extractColumnValues(array $rows, int $position, string $columnName): array
    {
        $values = [];
        foreach ($rows as $row) {
            $raw = is_string($row->values) ? json_decode($row->values, true) : (is_array($row->values) ? $row->values : []);
            $values[] = $this->readRowValue($raw, $position, $columnName);
        }
        return $values;
    }

    private function readRowValue(mixed $values, int $position, string $columnName): mixed
    {
        if (!is_array($values)) {
            return null;
        }
        if (array_key_exists($position, $values)) {
            return $values[$position];
        }
        if (array_key_exists((string) $position, $values)) {
            return $values[(string) $position];
        }
        if (array_key_exists($columnName, $values)) {
            return $values[$columnName];
        }
        return null;
    }

    private function calculateBySemanticType(array $values, string $semanticType, ?array $ordinalOrder): array
    {
        $base = $this->buildBaseCounts($values);

        return match ($semanticType) {
            'metric' => [...$base, ...$this->calculateMetricStats($values)],
            'nominal' => [...$base, ...$this->calculateNominalStats($values)],
            'ordinal' => [...$base, ...$this->calculateOrdinalStats($values, $ordinalOrder)],
            'temporal' => [...$base, ...$this->calculateTemporalStats($values)],
            'binary' => [...$base, ...$this->calculateNominalStats($values)],
            default => $base,
        };
    }

    private function buildBaseCounts(array $values): array
    {
        $normalized = array_map(
            fn($value) => $this->valueParsingService->normalizeNullableString($value),
            $values
        );
        $nonNull = array_values(array_filter($normalized, fn($value) => $value !== null));
        $distinctCount = count(array_unique($nonNull));

        return [
            'count' => count($values),
            'non_null_count' => count($nonNull),
            'null_count' => count($values) - count($nonNull),
            'distinct_count' => $distinctCount,
        ];
    }

    private function calculateMetricStats(array $values): array
    {
        $numeric = [];
        foreach ($values as $value) {
            $normalized = $this->valueParsingService->normalizeNullableString($value);
            if ($normalized === null) {
                continue;
            }
            $parsed = $this->valueParsingService->toNumeric($normalized);
            if ($parsed !== null) {
                $numeric[] = $parsed;
            }
        }

        if (empty($numeric)) {
            return [];
        }

        sort($numeric);
        $count = count($numeric);
        $sum = array_sum($numeric);
        $mean = $sum / $count;
        $variance = $this->variance($numeric, $mean);
        $stdDev = sqrt($variance);
        $q1 = $this->quantile($numeric, 0.25);
        $median = $this->quantile($numeric, 0.5);
        $q3 = $this->quantile($numeric, 0.75);

        return [
            'min' => $numeric[0],
            'max' => $numeric[$count - 1],
            'mean' => $mean,
            'median' => $median,
            'quartiles' => [
                'q1' => $q1,
                'q2' => $median,
                'q3' => $q3,
            ],
            'range' => $numeric[$count - 1] - $numeric[0],
            'std_dev' => $stdDev,
            'variance' => $variance,
            'iqr' => $q3 !== null && $q1 !== null ? $q3 - $q1 : null,
        ];
    }

    private function calculateNominalStats(array $values): array
    {
        $categories = [];
        foreach ($values as $value) {
            $normalized = $this->valueParsingService->normalizeNullableString($value);
            if ($normalized === null) {
                continue;
            }
            $categories[] = $normalized;
        }

        if (empty($categories)) {
            return [
                'mode' => null,
                'frequency' => [],
                'top_categories' => [],
            ];
        }

        $frequencyMap = array_count_values($categories);
        arsort($frequencyMap);
        $total = count($categories);

        $frequency = [];
        foreach ($frequencyMap as $value => $count) {
            $frequency[] = [
                'value' => $value,
                'count' => $count,
                'percent' => $total > 0 ? round($count / $total, 6) : 0,
            ];
        }

        return [
            'mode' => $frequency[0]['value'] ?? null,
            'frequency' => $frequency,
            'top_categories' => array_slice($frequency, 0, 8),
        ];
    }

    private function calculateOrdinalStats(array $values, ?array $ordinalOrder): array
    {
        $nominal = $this->calculateNominalStats($values);
        if (empty($ordinalOrder)) {
            $nominal['median_rank'] = null;
            $nominal['median_rank_label'] = null;
            return $nominal;
        }

        $rankByValue = [];
        foreach (array_values($ordinalOrder) as $index => $label) {
            $rankByValue[mb_strtolower(trim((string) $label))] = $index + 1;
        }

        $rankValues = [];
        foreach ($values as $value) {
            $normalized = $this->valueParsingService->normalizeNullableString($value);
            if ($normalized === null) {
                continue;
            }
            $key = mb_strtolower($normalized);
            if (array_key_exists($key, $rankByValue)) {
                $rankValues[] = $rankByValue[$key];
            }
        }

        if (empty($rankValues)) {
            $nominal['median_rank'] = null;
            $nominal['median_rank_label'] = null;
            return $nominal;
        }

        sort($rankValues);
        $medianRank = $this->quantile($rankValues, 0.5);
        $rankIndex = $medianRank !== null ? (int) round($medianRank) - 1 : null;

        $nominal['median_rank'] = $medianRank;
        $nominal['median_rank_label'] = ($rankIndex !== null && array_key_exists($rankIndex, $ordinalOrder))
            ? $ordinalOrder[$rankIndex]
            : null;
        $nominal['ordinal_order'] = $ordinalOrder;

        return $nominal;
    }

    private function calculateTemporalStats(array $values): array
    {
        $dates = [];
        foreach ($values as $value) {
            $normalized = $this->valueParsingService->normalizeNullableString($value);
            if ($normalized === null) {
                continue;
            }
            $parsed = $this->valueParsingService->parseTemporal($normalized);
            if ($parsed !== null) {
                $dates[] = $parsed;
            }
        }

        if (empty($dates)) {
            return [
                'earliest' => null,
                'latest' => null,
                'range_seconds' => null,
                'granularity' => null,
                'frequency_by_period' => [],
            ];
        }

        usort($dates, fn($a, $b) => $a->timestamp <=> $b->timestamp);
        $earliest = $dates[0];
        $latest = $dates[count($dates) - 1];
        $granularity = $this->valueParsingService->inferTemporalGranularity($dates);

        $periodFormat = match ($granularity) {
            'year' => 'Y',
            'month' => 'Y-m',
            'day' => 'Y-m-d',
            'minute', 'second' => 'Y-m-d H:i',
            default => 'Y-m-d',
        };

        $periods = array_map(fn($date) => $date->format($periodFormat), $dates);
        $frequencyMap = array_count_values($periods);
        arsort($frequencyMap);

        $frequency = [];
        foreach ($frequencyMap as $period => $count) {
            $frequency[] = [
                'period' => $period,
                'count' => $count,
            ];
        }

        return [
            'earliest' => $earliest->toAtomString(),
            'latest' => $latest->toAtomString(),
            'range_seconds' => abs($latest->diffInSeconds($earliest)),
            'granularity' => $granularity,
            'frequency_by_period' => array_slice($frequency, 0, 12),
        ];
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

    private function variance(array $values, float $mean): float
    {
        if (empty($values)) {
            return 0.0;
        }

        $sumSq = array_reduce(
            $values,
            fn($carry, $value) => $carry + (($value - $mean) ** 2),
            0.0
        );

        return $sumSq / count($values);
    }
}
