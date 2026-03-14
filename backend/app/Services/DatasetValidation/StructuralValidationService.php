<?php

namespace App\Services\DatasetValidation;

use App\Services\ValueParsingService;

class StructuralValidationService
{
    use BuildsValidationIssue;

    private const MAX_HEADER_LENGTH = 120;

    public function __construct(
        private ValueParsingService $valueParsingService
    ) {}

    public function validate(array $rows, bool $hasHeader = true): array
    {
        $rows = array_map(
            fn($row) => is_array($row) ? array_values($row) : [],
            $rows
        );

        if (empty($rows)) {
            return [
                'can_proceed' => false,
                'summary_overrides' => [],
                'issues' => [
                    $this->makeIssue('error', 'file_no_rows', 'The uploaded file has no readable rows.', 'dataset'),
                ],
            ];
        }

        $headerRow = $hasHeader ? ($rows[0] ?? []) : [];
        $dataRows = $hasHeader ? array_slice($rows, 1) : $rows;
        $headerCount = count($headerRow);
        $expectedCount = ($hasHeader && $headerCount > 0)
            ? $headerCount
            : $this->maxColumnCount($dataRows);

        if ($expectedCount === 0) {
            return [
                'can_proceed' => false,
                'summary_overrides' => [],
                'issues' => [
                    $this->makeIssue('error', 'file_no_columns', 'No columns were detected in the uploaded file.', 'dataset'),
                ],
            ];
        }

        $issues = [];
        $headerNormalization = $this->normalizeHeaders($headerRow, $expectedCount, $hasHeader);
        $headers = $headerNormalization['headers'];
        $issues = [...$issues, ...$this->buildHeaderIssues($headerNormalization['stats'])];

        $rowsNormalization = $this->normalizeDataRows($dataRows, $expectedCount, $hasHeader);
        $normalizedRows = $rowsNormalization['rows'];
        $issues = [...$issues, ...$this->buildStructuralIssues($rowsNormalization['stats'])];

        if (empty($normalizedRows)) {
            $issues[] = $this->makeIssue(
                'error',
                'file_no_data_rows',
                'No data rows remain after safe normalization.',
                'dataset'
            );

            return [
                'can_proceed' => false,
                'summary_overrides' => [
                    'rows_total' => count($dataRows),
                    'rows_checked' => count($dataRows),
                    'columns_detected' => $expectedCount,
                ],
                'issues' => $issues,
            ];
        }

        return [
            'can_proceed' => true,
            'headers' => $headers,
            'rows' => $normalizedRows,
            'expected_count' => $expectedCount,
            'data_rows_total' => count($dataRows),
            'header_stats' => $headerNormalization['stats'],
            'row_stats' => $rowsNormalization['stats'],
            'issues' => $issues,
        ];
    }

    public function countDuplicateRows(array $rows): int
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

                $candidate = 'Column_' . ($position + 1);
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
            $cellCount = count($source);

            if ($cellCount < $expectedCount) {
                $stats['rows_padded']++;
                if (count($stats['sample_padded_rows']) < 8) {
                    $stats['sample_padded_rows'][] = $lineNumber;
                }
                $source = array_pad($source, $expectedCount, null);
            } elseif ($cellCount > $expectedCount) {
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

    private function buildHeaderIssues(array $stats): array
    {
        $issues = [];

        if (($stats['trimmed'] ?? 0) > 0) {
            $count = (int) $stats['trimmed'];
            $issues[] = $this->makeIssue(
                'info',
                'header_trimmed',
                "{$count} headers were trimmed.",
                'dataset',
                [],
                ['count' => $count]
            );
        }

        if (($stats['placeholder_replaced'] ?? 0) > 0) {
            $count = (int) $stats['placeholder_replaced'];
            $issues[] = $this->makeIssue(
                'info',
                'header_placeholder_replaced',
                "{$count} placeholder headers were replaced.",
                'dataset',
                [],
                ['count' => $count]
            );
        }

        if (($stats['deduplicated'] ?? 0) > 0) {
            $count = (int) $stats['deduplicated'];
            $issues[] = $this->makeIssue(
                'info',
                'header_duplicates_renamed',
                "{$count} duplicate headers were renamed deterministically.",
                'dataset',
                [],
                ['count' => $count]
            );
        }

        if (($stats['long_truncated'] ?? 0) > 0) {
            $count = (int) $stats['long_truncated'];
            $issues[] = $this->makeIssue(
                'warning',
                'header_too_long',
                "{$count} headers exceeded max length and were truncated.",
                'dataset',
                [],
                ['count' => $count]
            );
        }

        return $issues;
    }

    private function buildStructuralIssues(array $stats): array
    {
        $issues = [];

        if (($stats['skipped_empty_rows'] ?? 0) > 0) {
            $count = (int) $stats['skipped_empty_rows'];
            $issues[] = $this->makeIssue(
                'info',
                'rows_empty_skipped',
                "{$count} completely empty rows were skipped.",
                'dataset',
                [],
                ['count' => $count]
            );
        }

        if (($stats['rows_padded'] ?? 0) > 0) {
            $count = (int) $stats['rows_padded'];
            $issues[] = $this->makeIssue(
                'warning',
                'rows_padded_with_nulls',
                "{$count} rows had missing cells and were padded with nulls.",
                'dataset',
                [],
                [
                    'count' => $count,
                    'sampleRows' => $stats['sample_padded_rows'] ?? [],
                ]
            );
        }

        if (($stats['rows_truncated'] ?? 0) > 0) {
            $count = (int) $stats['rows_truncated'];
            $issues[] = $this->makeIssue(
                'warning',
                'rows_truncated',
                "{$count} rows had extra cells and were truncated to detected column count.",
                'dataset',
                [],
                [
                    'count' => $count,
                    'sampleRows' => $stats['sample_truncated_rows'] ?? [],
                ]
            );
        }

        return $issues;
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
            if ($this->valueParsingService->normalizeNullableString($value) !== null) {
                return false;
            }
        }

        return true;
    }

    private function maxColumnCount(array $rows): int
    {
        if (empty($rows)) {
            return 0;
        }

        return max(array_map(fn($row) => count($row), $rows));
    }

}
