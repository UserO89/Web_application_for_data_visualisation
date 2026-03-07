<?php

namespace App\Services;

use Carbon\Carbon;

class DatasetValidationService
{
    private const MAX_ISSUES_IN_RESPONSE = 240;
    private const DATE_OUTPUT_FORMAT = 'd.m.Y';
    private const DATETIME_OUTPUT_FORMAT = 'Y-m-d H:i:s';
    private const MAX_HEADER_LENGTH = 120;
    private const MOSTLY_NUMERIC_RATIO = 0.65;
    private const MOSTLY_DATE_RATIO = 0.65;
    private const MOSTLY_BOOLEAN_RATIO = 0.8;
    private const HIGH_NULL_RATIO_WARNING = 0.45;
    private const IDENTIFIER_UNIQUE_RATIO = 0.95;
    private const EMPTY_MARKERS = ['n/a', 'na', 'null', 'none', '-', "\u{2014}", ''];

    public function __construct(
        private ValueParsingService $valueParsingService,
        private ColumnProfilingService $columnProfilingService,
        private ColumnTypeInferenceService $columnTypeInferenceService
    ) {}

    public function buildImportPlan(array $rows, bool $hasHeader = true): array
    {
        $issues = [];
        $severityCounts = $this->newSeverityCounter();
        $rows = array_map(
            fn($row) => is_array($row) ? array_values($row) : [],
            $rows
        );

        if (empty($rows)) {
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue('error', 'file_no_rows', 'The uploaded file has no readable rows.', 'dataset')
            );
            return $this->failedPlan($issues, $severityCounts);
        }

        $headerRow = $hasHeader ? ($rows[0] ?? []) : [];
        $dataRows = $hasHeader ? array_slice($rows, 1) : $rows;
        $expectedCount = max(count($headerRow), $this->maxColumnCount($dataRows));

        if ($expectedCount === 0) {
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue('error', 'file_no_columns', 'No columns were detected in the uploaded file.', 'dataset')
            );
            return $this->failedPlan($issues, $severityCounts);
        }

        $headerNormalization = $this->normalizeHeaders($headerRow, $expectedCount, $hasHeader);
        $headers = $headerNormalization['headers'];
        $this->appendHeaderIssues($issues, $severityCounts, $headerNormalization['stats']);

        $rowsNormalization = $this->normalizeDataRows($dataRows, $expectedCount, $hasHeader);
        $normalizedRows = $rowsNormalization['rows'];
        $this->appendStructuralIssues($issues, $severityCounts, $rowsNormalization['stats']);

        if (empty($normalizedRows)) {
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue('error', 'file_no_data_rows', 'No data rows remain after safe normalization.', 'dataset')
            );
            return $this->failedPlan(
                $issues,
                $severityCounts,
                [
                    'rows_total' => count($dataRows),
                    'rows_checked' => count($dataRows),
                    'columns_detected' => $expectedCount,
                ]
            );
        }

        $columns = $this->inferColumns($headers, $normalizedRows, $expectedCount);
        $sanitized = $this->sanitizeImportedRows($normalizedRows, $columns);

        $duplicateRows = $this->countDuplicateRows($sanitized['rows']);
        if ($duplicateRows > 0) {
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue(
                    'warning',
                    'dataset_duplicate_rows',
                    "{$duplicateRows} duplicate rows detected.",
                    'dataset',
                    [],
                    ['duplicateRows' => $duplicateRows]
                )
            );
        }

        $columnReports = [];
        foreach ($columns as $index => &$column) {
            $columnName = (string) ($column['name'] ?? ("Column_" . ($index + 1)));
            $columnValues = array_column($normalizedRows, $index);
            $quality = $this->buildColumnQuality($columnName, $index, $columnValues, $column['physical_type'] ?? 'string');

            foreach ($quality['issues'] as $issue) {
                $this->appendIssue($issues, $severityCounts, $issue);
            }

            $column['quality'] = $quality['quality'];
            $columnReports[] = $quality['report'];
        }
        unset($column);

        $summary = [
            'import_status' => $this->resolveImportStatus($severityCounts),
            'rows_total' => count($dataRows),
            'rows_checked' => count($dataRows),
            'rows_imported' => count($sanitized['rows']),
            'rows_skipped' => (int) ($rowsNormalization['stats']['skipped_empty_rows'] ?? 0),
            'columns_detected' => $expectedCount,
            'error_count' => $severityCounts['error'],
            'warning_count' => $severityCounts['warning'],
            'info_count' => $severityCounts['info'],
            'issue_count' => array_sum($severityCounts),
            'fixed_cells' => (int) ($sanitized['summary']['fixed_cells'] ?? 0),
            'nullified_cells' => (int) ($sanitized['summary']['nullified_cells'] ?? 0),
            'row_shape_fixes' => (int) (
                ($rowsNormalization['stats']['rows_padded'] ?? 0)
                + ($rowsNormalization['stats']['rows_truncated'] ?? 0)
            ),
            'normalization' => [
                'headers_trimmed' => (int) ($headerNormalization['stats']['trimmed'] ?? 0),
                'headers_generated' => (int) ($headerNormalization['stats']['generated'] ?? 0),
                'headers_deduplicated' => (int) ($headerNormalization['stats']['deduplicated'] ?? 0),
                'placeholder_headers_replaced' => (int) ($headerNormalization['stats']['placeholder_replaced'] ?? 0),
                'long_headers_truncated' => (int) ($headerNormalization['stats']['long_truncated'] ?? 0),
                'rows_padded' => (int) ($rowsNormalization['stats']['rows_padded'] ?? 0),
                'rows_truncated' => (int) ($rowsNormalization['stats']['rows_truncated'] ?? 0),
                'rows_skipped_empty' => (int) ($rowsNormalization['stats']['skipped_empty_rows'] ?? 0),
                'cells_trimmed' => (int) ($sanitized['summary']['fixed_cells'] ?? 0),
                'cells_whitespace_collapsed' => 0,
                'empty_markers_to_null' => (int) ($sanitized['summary']['nullified_cells'] ?? 0),
            ],
        ];

        return [
            'canImport' => $severityCounts['error'] === 0,
            'rows' => $sanitized['rows'],
            'columns' => $columns,
            'report' => [
                'summary' => $summary,
                'dataset' => [
                    'has_header' => $hasHeader,
                    'duplicate_rows' => $duplicateRows,
                ],
                'columns' => $columnReports,
                'issues' => $issues,
            ],
        ];
    }

    public function buildFatalReport(string $code, string $message, array $metadata = []): array
    {
        $issues = [];
        $severityCounts = $this->newSeverityCounter();
        $this->appendIssue(
            $issues,
            $severityCounts,
            $this->makeIssue('error', $code, $message, 'dataset', [], $metadata)
        );

        return $this->failedPlan($issues, $severityCounts)['report'];
    }

    public function sanitizeImportedRows(array $rows, array $columns): array
    {
        $expectedCount = count($columns);
        $issues = [];
        $cleanRows = [];
        $fixedCells = 0;
        $nullifiedCells = 0;
        $rowShapeFixes = 0;

        foreach ($rows as $rowIndex => $row) {
            $sourceRow = is_array($row) ? array_values($row) : [];

            if (count($sourceRow) !== $expectedCount) {
                $rowShapeFixes++;
                $this->pushIssue($issues, [
                    'row' => $rowIndex + 1,
                    'column' => null,
                    'type' => 'row_shape',
                    'original' => count($sourceRow),
                    'fixed' => $expectedCount,
                    'message' => "Row had " . count($sourceRow) . " cells, normalized to {$expectedCount}.",
                ]);
            }

            if (count($sourceRow) < $expectedCount) {
                $sourceRow = array_pad($sourceRow, $expectedCount, null);
            } elseif (count($sourceRow) > $expectedCount) {
                $sourceRow = array_slice($sourceRow, 0, $expectedCount);
            }

            $cleanRow = [];
            foreach ($columns as $position => $column) {
                $original = $sourceRow[$position] ?? null;
                $normalized = $this->normalizeByType($original, (string) ($column['type'] ?? 'string'));

                if ($normalized['changed']) {
                    $fixedCells++;
                    if ($normalized['value'] === null) {
                        $nullifiedCells++;
                    }

                    $this->pushIssue($issues, [
                        'row' => $rowIndex + 1,
                        'column' => $column['name'] ?? ("Column_" . ($position + 1)),
                        'type' => $normalized['issue_type'],
                        'original' => $this->printable($original),
                        'fixed' => $this->printable($normalized['value']),
                        'message' => $normalized['message'],
                    ]);
                }

                $cleanRow[] = $normalized['value'];
            }

            $cleanRows[] = $cleanRow;
        }

        return [
            'rows' => $cleanRows,
            'issues' => $issues,
            'summary' => [
                'rows_checked' => count($rows),
                'fixed_cells' => $fixedCells,
                'nullified_cells' => $nullifiedCells,
                'row_shape_fixes' => $rowShapeFixes,
                'issue_count' => $fixedCells + $rowShapeFixes,
            ],
        ];
    }

    private function inferColumns(array $headers, array $rows, int $expectedCount): array
    {
        $rowsForInference = array_merge([$headers], $rows);
        $inferred = $this->columnTypeInferenceService->infer($rowsForInference, true);

        $columns = [];
        for ($i = 0; $i < $expectedCount; $i++) {
            $name = $headers[$i] ?? ("Column_" . ($i + 1));
            $legacyType = (string) ($inferred[$i]['type'] ?? 'string');
            $physicalType = (string) ($inferred[$i]['physical_type'] ?? $this->legacyTypeToPhysicalType($legacyType));
            $columns[] = [
                'name' => $name,
                'type' => $legacyType,
                'physical_type' => $physicalType,
            ];
        }

        return $columns;
    }

    private function normalizeHeaders(array $headerRow, int $expectedCount, bool $hasHeader): array
    {
        $headers = [];
        $used = [];
        $stats = [
            'trimmed' => 0,
            'generated' => 0,
            'deduplicated' => 0,
            'placeholder_replaced' => 0,
            'long_truncated' => 0,
        ];

        for ($position = 0; $position < $expectedCount; $position++) {
            $raw = $hasHeader ? ($headerRow[$position] ?? null) : null;
            $normalized = $this->normalizeHeaderCell($raw);
            $candidate = $normalized['value'];
            if ($normalized['trimmed']) {
                $stats['trimmed']++;
            }

            if (!$hasHeader || $candidate === '' || $this->isPlaceholderHeader($candidate)) {
                if ($hasHeader && $this->isPlaceholderHeader($candidate)) {
                    $stats['placeholder_replaced']++;
                }
                $candidate = "Column_" . ($position + 1);
                $stats['generated']++;
            }

            if (mb_strlen($candidate) > self::MAX_HEADER_LENGTH) {
                $candidate = mb_substr($candidate, 0, self::MAX_HEADER_LENGTH);
                $stats['long_truncated']++;
            }

            $base = $candidate;
            $name = $base;
            $suffix = 1;
            while (isset($used[mb_strtolower($name)])) {
                $suffix++;
                $name = "{$base}_{$suffix}";
                $stats['deduplicated']++;
            }
            $used[mb_strtolower($name)] = true;
            $headers[] = $name;
        }

        return [
            'headers' => $headers,
            'stats' => $stats,
        ];
    }

    private function normalizeDataRows(array $rows, int $expectedCount, bool $hasHeader): array
    {
        $normalizedRows = [];
        $stats = [
            'rows_padded' => 0,
            'rows_truncated' => 0,
            'skipped_empty_rows' => 0,
            'sample_padded_rows' => [],
            'sample_truncated_rows' => [],
        ];

        foreach ($rows as $index => $row) {
            $lineNumber = $hasHeader ? ($index + 2) : ($index + 1);
            $source = is_array($row) ? array_values($row) : [];
            $count = count($source);
            if ($count < $expectedCount) {
                $stats['rows_padded']++;
                if (count($stats['sample_padded_rows']) < 8) {
                    $stats['sample_padded_rows'][] = $lineNumber;
                }
                $source = array_pad($source, $expectedCount, null);
            } elseif ($count > $expectedCount) {
                $stats['rows_truncated']++;
                if (count($stats['sample_truncated_rows']) < 8) {
                    $stats['sample_truncated_rows'][] = $lineNumber;
                }
                $source = array_slice($source, 0, $expectedCount);
            }

            if ($this->isRowEmpty($source)) {
                $stats['skipped_empty_rows']++;
                continue;
            }

            $normalizedRows[] = $source;
        }

        return [
            'rows' => $normalizedRows,
            'stats' => $stats,
        ];
    }

    private function appendHeaderIssues(array &$issues, array &$severityCounts, array $stats): void
    {
        if (($stats['trimmed'] ?? 0) > 0) {
            $count = (int) $stats['trimmed'];
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue('info', 'header_trimmed', "{$count} headers were trimmed.", 'dataset', [], ['count' => $count])
            );
        }

        if (($stats['placeholder_replaced'] ?? 0) > 0) {
            $count = (int) $stats['placeholder_replaced'];
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue('info', 'header_placeholder_replaced', "{$count} placeholder headers were replaced.", 'dataset', [], ['count' => $count])
            );
        }

        if (($stats['deduplicated'] ?? 0) > 0) {
            $count = (int) $stats['deduplicated'];
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue('info', 'header_duplicates_renamed', "{$count} duplicate headers were renamed deterministically.", 'dataset', [], ['count' => $count])
            );
        }

        if (($stats['long_truncated'] ?? 0) > 0) {
            $count = (int) $stats['long_truncated'];
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue('warning', 'header_too_long', "{$count} headers exceeded max length and were truncated.", 'dataset', [], ['count' => $count])
            );
        }
    }

    private function appendStructuralIssues(array &$issues, array &$severityCounts, array $stats): void
    {
        if (($stats['skipped_empty_rows'] ?? 0) > 0) {
            $count = (int) $stats['skipped_empty_rows'];
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue('info', 'rows_empty_skipped', "{$count} completely empty rows were skipped.", 'dataset', [], ['count' => $count])
            );
        }

        if (($stats['rows_padded'] ?? 0) > 0) {
            $count = (int) $stats['rows_padded'];
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue(
                    'warning',
                    'rows_padded_with_nulls',
                    "{$count} rows had missing cells and were padded with nulls.",
                    'dataset',
                    [],
                    ['count' => $count, 'sampleRows' => $stats['sample_padded_rows'] ?? []]
                )
            );
        }

        if (($stats['rows_truncated'] ?? 0) > 0) {
            $count = (int) $stats['rows_truncated'];
            $this->appendIssue(
                $issues,
                $severityCounts,
                $this->makeIssue(
                    'warning',
                    'rows_truncated',
                    "{$count} rows had extra cells and were truncated to detected column count.",
                    'dataset',
                    [],
                    ['count' => $count, 'sampleRows' => $stats['sample_truncated_rows'] ?? []]
                )
            );
        }
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
                "{$columnName}: high null ratio (" . round($stats['nullRatio'] * 100, 1) . "%).",
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
            $trimmed = $this->trimValue($value);
            if ($trimmed === null) {
                continue;
            }
            $nonNullCount++;
            $distinct[$trimmed] = true;
            $frequency[$trimmed] = ($frequency[$trimmed] ?? 0) + 1;

            if ($this->toNumeric($trimmed) !== null) {
                $numericCount++;
            }
            if ($this->parseDate($trimmed) !== null) {
                $dateCount++;
            }
            if ($this->toBoolean($trimmed) !== null) {
                $booleanCount++;
            }

            $lower = mb_strtolower($trimmed);
            if (!isset($lowerToVariants[$lower])) {
                $lowerToVariants[$lower] = [];
            }
            $lowerToVariants[$lower][$trimmed] = true;
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

    private function normalizeByType(mixed $value, string $type): array
    {
        $trimmed = $this->trimValue($value);

        if ($trimmed === null) {
            if ($value === null || $value === '') {
                return [
                    'value' => null,
                    'changed' => false,
                    'issue_type' => null,
                    'message' => '',
                ];
            }

            return [
                'value' => null,
                'changed' => true,
                'issue_type' => 'empty_normalized',
                'message' => 'Converted empty marker to null.',
            ];
        }

        $normalizedType = mb_strtolower($type);
        if (in_array($normalizedType, ['integer', 'float', 'number'], true)) {
            $numeric = $this->toNumeric($trimmed);
            if ($numeric === null) {
                return [
                    'value' => null,
                    'changed' => true,
                    'issue_type' => 'invalid_number',
                    'message' => "Invalid {$normalizedType} value replaced with null.",
                ];
            }

            if ($normalizedType === 'integer') {
                $intValue = (int) round($numeric, 0);
                return [
                    'value' => $intValue,
                    'changed' => (string) $intValue !== (string) $trimmed,
                    'issue_type' => 'number_normalized',
                    'message' => 'Normalized numeric value.',
                ];
            }

            $floatValue = (float) $numeric;
            return [
                'value' => $floatValue,
                'changed' => (string) $floatValue !== (string) $trimmed,
                'issue_type' => 'number_normalized',
                'message' => 'Normalized numeric value.',
            ];
        }

        if ($normalizedType === 'boolean') {
            $parsedBoolean = $this->toBoolean($trimmed);
            if ($parsedBoolean === null) {
                return [
                    'value' => null,
                    'changed' => true,
                    'issue_type' => 'invalid_boolean',
                    'message' => 'Invalid boolean value replaced with null.',
                ];
            }

            $normalizedBoolean = $parsedBoolean ? 'true' : 'false';
            return [
                'value' => $parsedBoolean,
                'changed' => mb_strtolower($trimmed) !== $normalizedBoolean,
                'issue_type' => 'boolean_normalized',
                'message' => 'Normalized boolean value.',
            ];
        }

        if (in_array($normalizedType, ['date', 'datetime'], true)) {
            $parsedDate = $this->parseDate($trimmed);
            if ($parsedDate === null) {
                return [
                    'value' => null,
                    'changed' => true,
                    'issue_type' => 'invalid_date',
                    'message' => 'Invalid date value replaced with null.',
                ];
            }

            $format = $normalizedType === 'datetime'
                ? self::DATETIME_OUTPUT_FORMAT
                : self::DATE_OUTPUT_FORMAT;
            $normalizedDate = $parsedDate->format($format);
            return [
                'value' => $normalizedDate,
                'changed' => $normalizedDate !== $trimmed,
                'issue_type' => 'date_normalized',
                'message' => $normalizedType === 'datetime'
                    ? 'Normalized datetime format to YYYY-MM-DD HH:mm:ss.'
                    : 'Normalized date format to DD.MM.YYYY.',
            ];
        }

        return [
            'value' => $trimmed,
            'changed' => $trimmed !== (string) ($value ?? ''),
            'issue_type' => 'string_trimmed',
            'message' => 'Trimmed extra whitespace.',
        ];
    }

    private function normalizeHeaderCell(mixed $value): array
    {
        if ($value === null) {
            return [
                'value' => '',
                'trimmed' => false,
            ];
        }

        $string = trim((string) $value);
        $collapsed = preg_replace('/\s+/u', ' ', $string);
        if ($collapsed === null) {
            $collapsed = $string;
        }

        return [
            'value' => $collapsed,
            'trimmed' => $collapsed !== (string) $value,
        ];
    }

    private function isPlaceholderHeader(string $header): bool
    {
        $value = mb_strtolower(trim($header));
        if ($value === '') {
            return true;
        }
        return preg_match('/^(unnamed|column\s*\d*|col\s*\d*|field\s*\d*)$/i', $value) === 1;
    }

    private function isRowEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if ($this->trimValue($value) !== null) {
                return false;
            }
        }
        return true;
    }

    private function trimValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);
        $string = preg_replace('/\s+/u', ' ', $string);
        if ($string === null) {
            return null;
        }

        if (in_array(mb_strtolower($string), self::EMPTY_MARKERS, true)) {
            return null;
        }

        return $string;
    }

    private function toNumeric(string $value): ?float
    {
        $normalized = trim($value);
        $normalized = str_replace(["\u{00A0}", ' '], '', $normalized);
        $normalized = preg_replace('/[$€£¥%]/u', '', $normalized);
        $normalized = str_replace("'", '', $normalized);
        if ($normalized === null || $normalized === '') {
            return null;
        }

        $multiplier = 1.0;
        if (preg_match('/([kmb])$/i', $normalized, $suffixMatch) === 1) {
            $suffix = strtolower($suffixMatch[1]);
            $multiplier = match ($suffix) {
                'k' => 1_000.0,
                'm' => 1_000_000.0,
                'b' => 1_000_000_000.0,
                default => 1.0,
            };
            $normalized = substr($normalized, 0, -1);
            if ($normalized === '') {
                return null;
            }
        }

        $hasComma = str_contains($normalized, ',');
        $hasDot = str_contains($normalized, '.');

        if ($hasComma && $hasDot) {
            if (strrpos($normalized, ',') > strrpos($normalized, '.')) {
                $normalized = str_replace('.', '', $normalized);
                $normalized = str_replace(',', '.', $normalized);
            } else {
                $normalized = str_replace(',', '', $normalized);
            }
        } elseif ($hasComma) {
            if (preg_match('/,\d{1,2}$/', $normalized) === 1) {
                $normalized = str_replace(',', '.', $normalized);
            } else {
                $normalized = str_replace(',', '', $normalized);
            }
        }

        if (preg_match('/^-?\d+(\.\d+)?$/', $normalized) !== 1) {
            return null;
        }

        return (float) $normalized * $multiplier;
    }

    private function toBoolean(string $value): ?bool
    {
        $normalized = mb_strtolower(trim($value));
        if ($normalized === '') {
            return null;
        }

        $truthy = ['1', 'true', 'yes', 'y', 'on', 'active', 'enabled'];
        $falsy = ['0', 'false', 'no', 'n', 'off', 'inactive', 'disabled'];
        if (in_array($normalized, $truthy, true)) {
            return true;
        }
        if (in_array($normalized, $falsy, true)) {
            return false;
        }
        return null;
    }

    private function parseDate(string $value): ?Carbon
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $trimmed, $matches) === 1) {
            return $this->buildDate((int) $matches[3], (int) $matches[2], (int) $matches[1]);
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $trimmed, $matches) === 1) {
            $dayFirst = $this->buildDate((int) $matches[3], (int) $matches[2], (int) $matches[1]);
            if ($dayFirst !== null) {
                return $dayFirst;
            }
            return $this->buildDate((int) $matches[3], (int) $matches[1], (int) $matches[2]);
        }

        if (preg_match('/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/', $trimmed, $matches) === 1) {
            return $this->buildDate((int) $matches[1], (int) $matches[2], (int) $matches[3]);
        }

        try {
            return Carbon::parse($trimmed);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function buildDate(int $year, int $month, int $day): ?Carbon
    {
        if (!checkdate($month, $day, $year)) {
            return null;
        }
        return Carbon::create($year, $month, $day, 0, 0, 0);
    }

    private function legacyTypeToPhysicalType(string $legacyType): string
    {
        return match (mb_strtolower($legacyType)) {
            'integer', 'float', 'number' => 'number',
            'date' => 'date',
            'datetime' => 'datetime',
            'boolean' => 'boolean',
            default => 'string',
        };
    }

    private function resolveImportStatus(array $severityCounts): string
    {
        if (($severityCounts['error'] ?? 0) > 0) {
            return 'blocked';
        }
        if (($severityCounts['warning'] ?? 0) > 0) {
            return 'imported_with_warnings';
        }
        if (($severityCounts['info'] ?? 0) > 0) {
            return 'imported_with_info';
        }
        return 'imported_clean';
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

    private function failedPlan(array $issues, array $severityCounts, array $summaryOverrides = []): array
    {
        $summary = [
            'import_status' => 'blocked',
            'rows_total' => 0,
            'rows_checked' => 0,
            'rows_imported' => 0,
            'rows_skipped' => 0,
            'columns_detected' => 0,
            'error_count' => $severityCounts['error'],
            'warning_count' => $severityCounts['warning'],
            'info_count' => $severityCounts['info'],
            'issue_count' => array_sum($severityCounts),
            'fixed_cells' => 0,
            'nullified_cells' => 0,
            'row_shape_fixes' => 0,
            'normalization' => [
                'headers_trimmed' => 0,
                'headers_generated' => 0,
                'headers_deduplicated' => 0,
                'placeholder_headers_replaced' => 0,
                'long_headers_truncated' => 0,
                'rows_padded' => 0,
                'rows_truncated' => 0,
                'rows_skipped_empty' => 0,
                'cells_trimmed' => 0,
                'cells_whitespace_collapsed' => 0,
                'empty_markers_to_null' => 0,
            ],
        ];
        $summary = array_replace($summary, $summaryOverrides);

        return [
            'canImport' => false,
            'rows' => [],
            'columns' => [],
            'report' => [
                'summary' => $summary,
                'dataset' => [
                    'has_header' => true,
                    'duplicate_rows' => 0,
                ],
                'columns' => [],
                'issues' => $issues,
            ],
        ];
    }

    private function countDuplicateRows(array $rows): int
    {
        $seen = [];
        $duplicates = 0;
        foreach ($rows as $row) {
            $key = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($key === false) {
                continue;
            }
            if (isset($seen[$key])) {
                $duplicates++;
                continue;
            }
            $seen[$key] = true;
        }
        return $duplicates;
    }

    private function maxColumnCount(array $rows): int
    {
        if (empty($rows)) {
            return 0;
        }
        return max(array_map(fn($row) => count($row), $rows));
    }

    private function makeIssue(
        string $severity,
        string $code,
        string $message,
        string $targetLevel,
        array $target = [],
        array $metadata = []
    ): array {
        $resolvedTarget = ['level' => $targetLevel];
        if ($targetLevel === 'column') {
            $resolvedTarget['column'] = $target['column'] ?? null;
            $resolvedTarget['columnIndex'] = $target['column_index'] ?? null;
        }
        if ($targetLevel === 'row') {
            $resolvedTarget['row'] = $target['row'] ?? null;
            $resolvedTarget['column'] = $target['column'] ?? null;
            $resolvedTarget['columnIndex'] = $target['column_index'] ?? null;
        }

        $targetIdentifier = $target['column'] ?? ($target['row'] ?? 'dataset');

        return [
            'severity' => $severity,
            'code' => $code,
            'message' => $message,
            'target' => $resolvedTarget,
            'target_level' => $targetLevel,
            'target_identifier' => $targetIdentifier,
            'metadata' => $metadata,
            'row' => $target['row'] ?? null,
            'column' => $target['column'] ?? null,
        ];
    }

    private function appendIssue(array &$issues, array &$severityCounts, array $issue): void
    {
        $severity = (string) ($issue['severity'] ?? 'info');
        if (!isset($severityCounts[$severity])) {
            $severityCounts[$severity] = 0;
        }
        $severityCounts[$severity]++;

        if (count($issues) < self::MAX_ISSUES_IN_RESPONSE) {
            $issues[] = $issue;
        }
    }

    private function pushIssue(array &$issues, array $issue): void
    {
        if (count($issues) < self::MAX_ISSUES_IN_RESPONSE) {
            $issues[] = $issue;
        }
    }

    private function newSeverityCounter(): array
    {
        return [
            'error' => 0,
            'warning' => 0,
            'info' => 0,
        ];
    }

    private function printable(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }
        return $value;
    }
}
