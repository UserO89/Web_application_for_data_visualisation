<?php

namespace App\Services\DatasetValidation;

class DatasetValidationService
{
    use BuildsValidationIssue;

    private const MAX_ISSUES_IN_RESPONSE = 240;

    public function __construct(
        private StructuralValidationService $structuralValidationService,
        private ValueNormalizationService $valueNormalizationService,
        private ColumnQualityAnalysisService $columnQualityAnalysisService
    ) {}

    public function buildImportPlan(array $rows, bool $hasHeader = true): array
    {
        $issues = [];
        $severityCounts = $this->newSeverityCounter();

        $structural = $this->structuralValidationService->validate($rows, $hasHeader);
        $this->appendIssues($issues, $severityCounts, (array) ($structural['issues'] ?? []));

        if (($structural['can_proceed'] ?? false) !== true) {
            return $this->failedPlan(
                $issues,
                $severityCounts,
                (array) ($structural['summary_overrides'] ?? []),
                $hasHeader
            );
        }

        $valueNormalization = $this->valueNormalizationService->normalize(
            (array) $structural['rows'],
            (array) $structural['headers'],
            (int) $structural['expected_count']
        );
        $this->appendIssues($issues, $severityCounts, (array) ($valueNormalization['issues'] ?? []));

        $rows = (array) ($valueNormalization['rows'] ?? []);
        $duplicateRows = $this->structuralValidationService->countDuplicateRows($rows);
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

        $quality = $this->columnQualityAnalysisService->analyze(
            (array) ($valueNormalization['columns'] ?? []),
            $rows
        );
        $this->appendIssues($issues, $severityCounts, (array) ($quality['issues'] ?? []));

        $summary = [
            'import_status' => $this->resolveImportStatus($severityCounts),
            'rows_total' => (int) ($structural['data_rows_total'] ?? 0),
            'rows_checked' => (int) ($structural['data_rows_total'] ?? 0),
            'rows_imported' => count($rows),
            'rows_skipped' => (int) ($structural['row_stats']['skipped_empty_rows'] ?? 0),
            'columns_detected' => (int) ($structural['expected_count'] ?? 0),
            'error_count' => $severityCounts['error'],
            'warning_count' => $severityCounts['warning'],
            'info_count' => $severityCounts['info'],
            'issue_count' => array_sum($severityCounts),
            'fixed_cells' => (int) ($valueNormalization['summary']['fixed_cells'] ?? 0),
            'nullified_cells' => (int) ($valueNormalization['summary']['nullified_cells'] ?? 0),
            'row_shape_fixes' => (int) (
                ($structural['row_stats']['rows_padded'] ?? 0)
                + ($structural['row_stats']['rows_truncated'] ?? 0)
            ),
            'normalization' => [
                'headers_trimmed' => (int) ($structural['header_stats']['trimmed'] ?? 0),
                'headers_generated' => (int) ($structural['header_stats']['generated'] ?? 0),
                'headers_deduplicated' => (int) ($structural['header_stats']['deduplicated'] ?? 0),
                'placeholder_headers_replaced' => (int) ($structural['header_stats']['placeholder_replaced'] ?? 0),
                'long_headers_truncated' => (int) ($structural['header_stats']['long_truncated'] ?? 0),
                'rows_padded' => (int) ($structural['row_stats']['rows_padded'] ?? 0),
                'rows_truncated' => (int) ($structural['row_stats']['rows_truncated'] ?? 0),
                'rows_skipped_empty' => (int) ($structural['row_stats']['skipped_empty_rows'] ?? 0),
                'cells_trimmed' => (int) ($valueNormalization['summary']['fixed_cells'] ?? 0),
                'cells_whitespace_collapsed' => 0,
                'empty_markers_to_null' => (int) ($valueNormalization['summary']['nullified_cells'] ?? 0),
            ],
        ];

        return [
            'canImport' => $severityCounts['error'] === 0,
            'rows' => $rows,
            'columns' => (array) ($quality['columns'] ?? []),
            'report' => [
                'summary' => $summary,
                'dataset' => [
                    'has_header' => $hasHeader,
                    'duplicate_rows' => $duplicateRows,
                ],
                'columns' => (array) ($quality['reports'] ?? []),
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
        return $this->valueNormalizationService->sanitizeImportedRows($rows, $columns);
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

    private function failedPlan(
        array $issues,
        array $severityCounts,
        array $summaryOverrides = [],
        bool $hasHeader = true
    ): array {
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
                    'has_header' => $hasHeader,
                    'duplicate_rows' => 0,
                ],
                'columns' => [],
                'issues' => $issues,
            ],
        ];
    }

    private function appendIssues(array &$issues, array &$severityCounts, array $newIssues): void
    {
        foreach ($newIssues as $issue) {
            if (!is_array($issue)) {
                continue;
            }
            $this->appendIssue($issues, $severityCounts, $issue);
        }
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

    private function newSeverityCounter(): array
    {
        return [
            'error' => 0,
            'warning' => 0,
            'info' => 0,
        ];
    }
}
