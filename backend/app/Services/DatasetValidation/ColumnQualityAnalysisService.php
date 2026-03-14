<?php

namespace App\Services\DatasetValidation;

use App\Services\ColumnProfilingService;
use App\Services\ValueParsingService;

class ColumnQualityAnalysisService
{
    use BuildsValidationIssue;

    private const MOSTLY_NUMERIC_RATIO = 0.65;
    private const MOSTLY_DATE_RATIO = 0.65;
    private const MOSTLY_BOOLEAN_RATIO = 0.8;
    private const HIGH_NULL_RATIO_WARNING = 0.45;
    private const IDENTIFIER_UNIQUE_RATIO = 0.95;

    public function __construct(
        private ColumnProfilingService $columnProfilingService,
        private ValueParsingService $valueParsingService
    ) {}

    public function analyze(array $columns, array $rows): array
    {
        $columnReports = [];
        $issues = [];

        foreach ($columns as $index => &$column) {
            $columnName = (string) ($column['name'] ?? ('Column_' . ($index + 1)));
            $columnValues = array_column($rows, $index);
            $quality = $this->buildColumnQuality(
                $columnName,
                $index,
                $columnValues,
                (string) ($column['physical_type'] ?? 'string')
            );

            $column['quality'] = $quality['quality'];
            $columnReports[] = $quality['report'];
            $issues = [...$issues, ...$quality['issues']];
        }
        unset($column);

        return [
            'columns' => $columns,
            'reports' => $columnReports,
            'issues' => $issues,
        ];
    }

    private function buildColumnQuality(string $columnName, int $position, array $values, string $physicalType): array
    {
        $profileResult = $this->columnProfilingService->profile($values, $columnName);
        $profile = $profileResult['profile'] ?? [];
        $physical = (string) ($profileResult['physicalType'] ?? $physicalType);

        $stats = $this->computeColumnParseStats($values);
        $issues = [];
        $flags = [
            'identifierLike' => false,
            'constant' => false,
            'mixedType' => false,
            'inconsistentCategories' => false,
            'highNullRatio' => false,
        ];

        if ($stats['nullRatio'] >= self::HIGH_NULL_RATIO_WARNING) {
            $flags['highNullRatio'] = true;
            $issues[] = $this->makeIssue(
                'warning',
                'column_high_null_ratio',
                "{$columnName}: high null ratio (" . round($stats['nullRatio'] * 100, 1) . '%).',
                'column',
                ['column' => $columnName, 'column_index' => $position + 1],
                ['nullRatio' => round($stats['nullRatio'], 6), 'nullCount' => $stats['nullCount']]
            );
        }

        if ($stats['numericRatio'] >= self::MOSTLY_NUMERIC_RATIO && $stats['invalidNumericCount'] > 0) {
            $flags['mixedType'] = true;
            $issues[] = $this->makeIssue(
                'warning',
                'column_invalid_numeric_values',
                "{$columnName}: {$stats['invalidNumericCount']} values could not be parsed as numbers.",
                'column',
                ['column' => $columnName, 'column_index' => $position + 1],
                ['invalidCount' => $stats['invalidNumericCount'], 'parseSuccess' => round($stats['numericRatio'], 6)]
            );
        }

        if ($stats['dateRatio'] >= self::MOSTLY_DATE_RATIO && $stats['invalidDateCount'] > 0) {
            $flags['mixedType'] = true;
            $issues[] = $this->makeIssue(
                'warning',
                'column_invalid_date_values',
                "{$columnName}: {$stats['invalidDateCount']} values could not be parsed as dates.",
                'column',
                ['column' => $columnName, 'column_index' => $position + 1],
                ['invalidCount' => $stats['invalidDateCount'], 'parseSuccess' => round($stats['dateRatio'], 6)]
            );
        }

        if ($stats['booleanRatio'] >= self::MOSTLY_BOOLEAN_RATIO && $stats['invalidBooleanCount'] > 0) {
            $issues[] = $this->makeIssue(
                'warning',
                'column_invalid_boolean_values',
                "{$columnName}: {$stats['invalidBooleanCount']} values could not be parsed as booleans.",
                'column',
                ['column' => $columnName, 'column_index' => $position + 1],
                ['invalidCount' => $stats['invalidBooleanCount'], 'parseSuccess' => round($stats['booleanRatio'], 6)]
            );
        }

        if ($stats['caseVariantGroups'] > 0 && in_array($physical, ['string', 'mixed', 'unknown'], true)) {
            $flags['inconsistentCategories'] = true;
            $issues[] = $this->makeIssue(
                'warning',
                'column_case_variants',
                "{$columnName}: inconsistent category casing detected.",
                'column',
                ['column' => $columnName, 'column_index' => $position + 1],
                ['groups' => $stats['caseVariantGroups']]
            );
        }

        if ($stats['topValueRatio'] >= 0.98 && $stats['nonNullCount'] > 1) {
            $flags['constant'] = true;
            $severity = in_array($physical, ['number', 'date', 'datetime'], true) ? 'warning' : 'info';
            $issues[] = $this->makeIssue(
                $severity,
                'column_constant_values',
                "{$columnName}: column is nearly constant.",
                'column',
                ['column' => $columnName, 'column_index' => $position + 1],
                ['dominantRatio' => round($stats['topValueRatio'], 6)]
            );
        }

        $nameHints = (array) ($profile['nameHints'] ?? []);
        $identifierByName = (bool) ($nameHints['identifier'] ?? false);
        $identifierByUniqueness = $stats['nonNullCount'] >= 5 && $stats['uniqueRatio'] >= self::IDENTIFIER_UNIQUE_RATIO;
        if ($identifierByName || $identifierByUniqueness) {
            $flags['identifierLike'] = true;
            $issues[] = $this->makeIssue(
                $identifierByUniqueness ? 'warning' : 'info',
                'column_identifier_like',
                "{$columnName}: looks like an identifier column.",
                'column',
                ['column' => $columnName, 'column_index' => $position + 1],
                ['identifierByName' => $identifierByName, 'uniqueRatio' => round($stats['uniqueRatio'], 6)]
            );
        }

        $status = $this->resolveColumnStatus($issues);
        $note = $issues[0]['message'] ?? 'No quality issues detected.';
        $parseSuccess = [
            'number' => round($stats['numericRatio'], 6),
            'date' => round($stats['dateRatio'], 6),
            'boolean' => round($stats['booleanRatio'], 6),
        ];

        return [
            'quality' => [
                'status' => $status,
                'note' => $note,
                'nullCount' => $stats['nullCount'],
                'nullRatio' => round($stats['nullRatio'], 6),
                'distinctCount' => $stats['distinctCount'],
                'distinctRatio' => round($stats['distinctRatio'], 6),
                'parseSuccess' => $parseSuccess,
                'flags' => $flags,
                'issueCodes' => array_values(array_map(fn($issue) => $issue['code'], $issues)),
            ],
            'report' => [
                'name' => $columnName,
                'position' => $position,
                'detectedPhysicalType' => $physical,
                'detectedSemanticType' => null,
                'status' => $status,
                'note' => $note,
                'nullCount' => $stats['nullCount'],
                'nullRatio' => round($stats['nullRatio'], 6),
                'distinctCount' => $stats['distinctCount'],
                'distinctRatio' => round($stats['distinctRatio'], 6),
                'parseSuccess' => $parseSuccess,
                'flags' => $flags,
                'issues' => $issues,
            ],
            'issues' => $issues,
        ];
    }

    private function computeColumnParseStats(array $values): array
    {
        $rowCount = count($values);
        $nonNullCount = 0;
        $numericCount = 0;
        $dateCount = 0;
        $booleanCount = 0;
        $distinct = [];
        $lowerToVariants = [];
        $frequency = [];

        foreach ($values as $value) {
            $normalized = $this->valueParsingService->normalizeNullableString($value);
            if ($normalized === null) {
                continue;
            }

            $nonNullCount++;
            $distinct[$normalized] = true;
            $frequency[$normalized] = ($frequency[$normalized] ?? 0) + 1;

            if ($this->valueParsingService->toNumeric($normalized) !== null) {
                $numericCount++;
            }
            if ($this->valueParsingService->parseTemporal($normalized) !== null) {
                $dateCount++;
            }
            if ($this->valueParsingService->toBoolean($normalized) !== null) {
                $booleanCount++;
            }

            $lower = mb_strtolower($normalized);
            if (!isset($lowerToVariants[$lower])) {
                $lowerToVariants[$lower] = [];
            }
            $lowerToVariants[$lower][$normalized] = true;
        }

        $nullCount = max(0, $rowCount - $nonNullCount);
        $distinctCount = count($distinct);
        $topValueCount = empty($frequency) ? 0 : max($frequency);
        $caseVariantGroups = count(array_filter(
            $lowerToVariants,
            fn(array $variants) => count($variants) > 1
        ));

        return [
            'rowCount' => $rowCount,
            'nonNullCount' => $nonNullCount,
            'nullCount' => $nullCount,
            'nullRatio' => $rowCount > 0 ? $nullCount / $rowCount : 0.0,
            'distinctCount' => $distinctCount,
            'distinctRatio' => $nonNullCount > 0 ? $distinctCount / $nonNullCount : 0.0,
            'numericRatio' => $nonNullCount > 0 ? $numericCount / $nonNullCount : 0.0,
            'dateRatio' => $nonNullCount > 0 ? $dateCount / $nonNullCount : 0.0,
            'booleanRatio' => $nonNullCount > 0 ? $booleanCount / $nonNullCount : 0.0,
            'invalidNumericCount' => max(0, $nonNullCount - $numericCount),
            'invalidDateCount' => max(0, $nonNullCount - $dateCount),
            'invalidBooleanCount' => max(0, $nonNullCount - $booleanCount),
            'topValueRatio' => $nonNullCount > 0 ? $topValueCount / $nonNullCount : 0.0,
            'uniqueRatio' => $nonNullCount > 0 ? $distinctCount / $nonNullCount : 0.0,
            'caseVariantGroups' => $caseVariantGroups,
        ];
    }

    private function resolveColumnStatus(array $issues): string
    {
        $severities = array_map(fn($issue) => $issue['severity'] ?? 'info', $issues);
        if (in_array('error', $severities, true)) {
            return 'error';
        }
        if (in_array('warning', $severities, true)) {
            return 'warning';
        }
        if (in_array('info', $severities, true)) {
            return 'info';
        }

        return 'ok';
    }

}
