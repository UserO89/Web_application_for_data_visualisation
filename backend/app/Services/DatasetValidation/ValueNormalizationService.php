<?php

namespace App\Services\DatasetValidation;

use App\Services\ColumnTypeInferenceService;
use App\Services\ValueParsingService;

class ValueNormalizationService
{
    use BuildsValidationIssue;

    private const MAX_VALUE_ISSUE_SAMPLES = 36;
    private const DATE_OUTPUT_FORMAT = 'Y-m-d';
    private const DATETIME_OUTPUT_FORMAT = 'Y-m-d H:i:s';

    public function __construct(
        private ValueParsingService $valueParsingService,
        private ColumnTypeInferenceService $columnTypeInferenceService
    ) {}

    public function normalize(array $rows, array $headers, int $expectedCount): array
    {
        $columns = $this->inferColumns($headers, $rows, $expectedCount);
        $sanitized = $this->sanitizeImportedRows($rows, $columns);

        return [
            'columns' => $columns,
            'rows' => $sanitized['rows'],
            'summary' => $sanitized['summary'],
            'issues' => $this->buildNormalizationIssues($sanitized),
        ];
    }

    public function sanitizeImportedRows(array $rows, array $columns): array
    {
        $expectedCount = count($columns);
        $issues = [];
        $cleanRows = [];
        $fixedCells = 0;
        $nullifiedCells = 0;
        $rowShapeFixes = 0;
        $issueTypeCounts = [];
        $parseIssueCount = 0;
        $issueCount = 0;

        foreach ($rows as $rowIndex => $row) {
            $sourceRow = is_array($row) ? array_values($row) : [];

            if (count($sourceRow) !== $expectedCount) {
                $rowShapeFixes++;
                $issueCount++;
                $issueTypeCounts['row_shape'] = ($issueTypeCounts['row_shape'] ?? 0) + 1;

                if (count($issues) < self::MAX_VALUE_ISSUE_SAMPLES) {
                    $issues[] = [
                        'severity' => 'warning',
                        'code' => 'value_row_shape',
                        'row' => $rowIndex + 1,
                        'column' => null,
                        'message' => 'Row had ' . count($sourceRow) . " cells, normalized to {$expectedCount}.",
                        'metadata' => [
                            'type' => 'row_shape',
                            'original' => count($sourceRow),
                            'fixed' => $expectedCount,
                        ],
                    ];
                }
            }

            if (count($sourceRow) < $expectedCount) {
                $sourceRow = array_pad($sourceRow, $expectedCount, null);
            } elseif (count($sourceRow) > $expectedCount) {
                $sourceRow = array_slice($sourceRow, 0, $expectedCount);
            }

            $cleanRow = [];
            foreach ($columns as $position => $column) {
                $original = $sourceRow[$position] ?? null;
                $normalized = $this->normalizeByResolvedType($original, $column);

                if ($normalized['changed']) {
                    $fixedCells++;
                    if ($normalized['value'] === null) {
                        $nullifiedCells++;
                    }

                    $issueType = (string) ($normalized['issue_type'] ?? 'value_changed');
                    $issueCount++;
                    $issueTypeCounts[$issueType] = ($issueTypeCounts[$issueType] ?? 0) + 1;
                    if (str_starts_with($issueType, 'invalid_')) {
                        $parseIssueCount++;
                    }

                    if (count($issues) < self::MAX_VALUE_ISSUE_SAMPLES) {
                        $issues[] = [
                            'severity' => $this->resolveValueIssueSeverity($issueType),
                            'code' => "value_{$issueType}",
                            'row' => $rowIndex + 1,
                            'column' => $column['name'] ?? ('Column_' . ($position + 1)),
                            'message' => $normalized['message'],
                            'metadata' => [
                                'type' => $issueType,
                                'original' => $this->printable($original),
                                'fixed' => $this->printable($normalized['value']),
                                'normalizationType' => $this->resolveNormalizationType($column),
                            ],
                        ];
                    }
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
                'issue_count' => $issueCount,
                'issue_type_counts' => $issueTypeCounts,
                'parse_issue_count' => $parseIssueCount,
                'sampled_issue_count' => count($issues),
                'omitted_issue_count' => max(0, $issueCount - count($issues)),
            ],
        ];
    }

    private function inferColumns(array $headers, array $rows, int $expectedCount): array
    {
        $rowsForInference = array_merge([$headers], $rows);
        $inferred = $this->columnTypeInferenceService->infer($rowsForInference, true);

        $columns = [];
        for ($i = 0; $i < $expectedCount; $i++) {
            $name = $headers[$i] ?? ('Column_' . ($i + 1));
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

    private function buildNormalizationIssues(array $sanitized): array
    {
        $summary = (array) ($sanitized['summary'] ?? []);
        $sampleIssues = (array) ($sanitized['issues'] ?? []);
        $fixedCells = (int) ($summary['fixed_cells'] ?? 0);
        $nullifiedCells = (int) ($summary['nullified_cells'] ?? 0);
        $parseIssueCount = (int) ($summary['parse_issue_count'] ?? 0);
        $omittedIssues = (int) ($summary['omitted_issue_count'] ?? 0);
        $issueTypeCounts = (array) ($summary['issue_type_counts'] ?? []);

        $issues = [];

        if ($fixedCells > 0) {
            $issues[] = $this->makeIssue(
                'info',
                'cells_normalized',
                "{$fixedCells} cells were normalized during import sanitation.",
                'dataset',
                [],
                ['count' => $fixedCells]
            );
        }

        if ($nullifiedCells > 0) {
            $severity = $parseIssueCount > 0 ? 'warning' : 'info';
            $issues[] = $this->makeIssue(
                $severity,
                'cells_nullified',
                "{$nullifiedCells} cells were converted to null during sanitation.",
                'dataset',
                [],
                [
                    'count' => $nullifiedCells,
                    'parseIssueCount' => $parseIssueCount,
                    'issueTypeCounts' => $issueTypeCounts,
                ]
            );
        }

        foreach ($sampleIssues as $sample) {
            $row = isset($sample['row']) ? (int) $sample['row'] : null;
            $column = isset($sample['column']) ? (string) $sample['column'] : null;
            $issues[] = $this->makeIssue(
                (string) ($sample['severity'] ?? 'info'),
                (string) ($sample['code'] ?? 'value_normalized'),
                (string) ($sample['message'] ?? 'Value was normalized.'),
                'row',
                [
                    'row' => $row,
                    'column' => $column,
                ],
                (array) ($sample['metadata'] ?? [])
            );
        }

        if ($omittedIssues > 0) {
            $issues[] = $this->makeIssue(
                'info',
                'value_issue_samples_truncated',
                "{$omittedIssues} normalization issues were omitted from issue samples.",
                'dataset',
                [],
                ['omittedCount' => $omittedIssues]
            );
        }

        return $issues;
    }

    private function normalizeByResolvedType(mixed $value, array $column): array
    {
        $normalized = $this->valueParsingService->normalizeNullableString($value);
        if ($normalized === null) {
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

        $type = $this->resolveNormalizationType($column);
        return match ($type) {
            'integer' => $this->normalizeIntegerValue($normalized),
            'number' => $this->normalizeNumericValue($normalized),
            'boolean' => $this->normalizeBooleanValue($normalized),
            'date', 'datetime' => $this->normalizeTemporalValue($normalized, $type),
            default => [
                'value' => $normalized,
                'changed' => $normalized !== (string) ($value ?? ''),
                'issue_type' => 'string_trimmed',
                'message' => 'Trimmed extra whitespace.',
            ],
        };
    }

    private function normalizeIntegerValue(string $normalized): array
    {
        $numeric = $this->valueParsingService->toNumeric($normalized);
        if ($numeric === null) {
            return [
                'value' => null,
                'changed' => true,
                'issue_type' => 'invalid_integer',
                'message' => 'Invalid integer value replaced with null.',
            ];
        }

        if (!$this->isWholeNumber($numeric)) {
            return [
                'value' => null,
                'changed' => true,
                'issue_type' => 'invalid_integer',
                'message' => 'Non-integer numeric value replaced with null.',
            ];
        }

        $integerValue = (int) $numeric;
        return [
            'value' => $integerValue,
            'changed' => (string) $integerValue !== $normalized,
            'issue_type' => 'number_normalized',
            'message' => 'Normalized numeric value.',
        ];
    }

    private function normalizeNumericValue(string $normalized): array
    {
        $numeric = $this->valueParsingService->toNumeric($normalized);
        if ($numeric === null) {
            return [
                'value' => null,
                'changed' => true,
                'issue_type' => 'invalid_number',
                'message' => 'Invalid numeric value replaced with null.',
            ];
        }

        $value = $this->isWholeNumber($numeric)
            ? (int) $numeric
            : (float) $numeric;

        return [
            'value' => $value,
            'changed' => (string) $value !== $normalized,
            'issue_type' => 'number_normalized',
            'message' => 'Normalized numeric value.',
        ];
    }

    private function normalizeBooleanValue(string $normalized): array
    {
        $parsed = $this->valueParsingService->toBoolean($normalized);
        if ($parsed === null) {
            return [
                'value' => null,
                'changed' => true,
                'issue_type' => 'invalid_boolean',
                'message' => 'Invalid boolean value replaced with null.',
            ];
        }

        $normalizedLiteral = $parsed ? 'true' : 'false';
        return [
            'value' => $parsed,
            'changed' => mb_strtolower($normalized) !== $normalizedLiteral,
            'issue_type' => 'boolean_normalized',
            'message' => 'Normalized boolean value.',
        ];
    }

    private function normalizeTemporalValue(string $normalized, string $type): array
    {
        $parsed = $this->valueParsingService->parseTemporal($normalized);
        if ($parsed === null) {
            return [
                'value' => null,
                'changed' => true,
                'issue_type' => 'invalid_date',
                'message' => 'Invalid date value replaced with null.',
            ];
        }

        $format = $type === 'datetime'
            ? self::DATETIME_OUTPUT_FORMAT
            : self::DATE_OUTPUT_FORMAT;
        $normalizedTemporal = $parsed->format($format);

        return [
            'value' => $normalizedTemporal,
            'changed' => $normalizedTemporal !== $normalized,
            'issue_type' => 'date_normalized',
            'message' => $type === 'datetime'
                ? 'Normalized datetime format to YYYY-MM-DD HH:mm:ss.'
                : 'Normalized date format to YYYY-MM-DD.',
        ];
    }

    private function resolveValueIssueSeverity(string $issueType): string
    {
        if (str_starts_with($issueType, 'invalid_') || $issueType === 'row_shape') {
            return 'warning';
        }

        return 'info';
    }

    private function resolveNormalizationType(array $column): string
    {
        $physicalType = mb_strtolower(trim((string) ($column['physical_type'] ?? '')));
        if ($physicalType !== '') {
            return match ($physicalType) {
                'integer' => 'integer',
                'float', 'number' => 'number',
                'boolean' => 'boolean',
                'date' => 'date',
                'datetime' => 'datetime',
                default => 'string',
            };
        }

        return $this->mapLegacyTypeToNormalizationType((string) ($column['type'] ?? 'string'));
    }

    private function mapLegacyTypeToNormalizationType(string $legacyType): string
    {
        return match (mb_strtolower($legacyType)) {
            'integer' => 'integer',
            'float', 'number' => 'number',
            'boolean' => 'boolean',
            'date' => 'date',
            'datetime' => 'datetime',
            default => 'string',
        };
    }

    private function isWholeNumber(float $numeric): bool
    {
        return abs($numeric - round($numeric, 0)) < 0.0000001;
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

    private function printable(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $value;
    }
}
