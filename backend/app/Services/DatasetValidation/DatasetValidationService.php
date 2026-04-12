<?php

namespace App\Services\DatasetValidation;

class DatasetValidationService
{
    public function __construct(
        private StructuralValidationService $structuralValidationService,
        private ValueNormalizationService $valueNormalizationService,
        private ColumnQualityAnalysisService $columnQualityAnalysisService
    ) {}

    public function buildImportPlan(array $rows, bool $hasHeader = true): array
    {
        $structural = $this->structuralValidationService->validate($rows, $hasHeader);
        if (($structural['can_proceed'] ?? false) !== true) {
            $blockingIssue = $this->extractBlockingIssue((array) ($structural['issues'] ?? []));

            return $this->failedPlan(
                code: $blockingIssue['code'],
                message: $blockingIssue['message'],
                summaryOverrides: (array) ($structural['summary_overrides'] ?? []),
                hasHeader: $hasHeader
            );
        }

        $valueNormalization = $this->valueNormalizationService->normalize(
            (array) $structural['rows'],
            (array) $structural['headers'],
            (int) $structural['expected_count']
        );

        $sanitizedRows = (array) ($valueNormalization['rows'] ?? []);
        $duplicateRows = $this->structuralValidationService->countDuplicateRows($sanitizedRows);

        // Keep quality analysis for persisted column metadata, but not as validation UX contract.
        $quality = $this->columnQualityAnalysisService->analyze(
            (array) ($valueNormalization['columns'] ?? []),
            $sanitizedRows
        );

        $problemColumns = (array) ($valueNormalization['review']['problem_columns'] ?? []);
        $rowsSkipped = (int) ($structural['row_stats']['skipped_empty_rows'] ?? 0);
        $rowShapeFixes = (int) (
            ($structural['row_stats']['rows_padded'] ?? 0)
            + ($structural['row_stats']['rows_truncated'] ?? 0)
        );
        $nullifiedCells = (int) ($valueNormalization['summary']['nullified_cells'] ?? 0);
        $fixedCells = (int) ($valueNormalization['summary']['fixed_cells'] ?? 0);
        $normalizedCells = max(0, $fixedCells - $nullifiedCells);

        $summary = [
            'import_status' => $this->resolveImportStatus(
                problemColumnCount: count($problemColumns),
                rowsSkipped: $rowsSkipped,
                rowShapeFixes: $rowShapeFixes,
                duplicateRows: $duplicateRows
            ),
            'rows_total' => (int) ($structural['data_rows_total'] ?? 0),
            'rows_checked' => (int) ($structural['data_rows_total'] ?? 0),
            'rows_imported' => count($sanitizedRows),
            'rows_skipped' => $rowsSkipped,
            'columns_detected' => (int) ($structural['expected_count'] ?? 0),
            'problematic_columns' => count($problemColumns),
            'normalized_cells' => $normalizedCells,
            'nullified_cells' => $nullifiedCells,
        ];

        return [
            'canImport' => true,
            'rows' => $sanitizedRows,
            'columns' => (array) ($quality['columns'] ?? []),
            'report' => [
                'summary' => $summary,
                'dataset' => [
                    'has_header' => $hasHeader,
                    'duplicate_rows' => $duplicateRows,
                ],
                'problem_columns' => $problemColumns,
                'blocking_error' => null,
            ],
        ];
    }

    public function buildFatalReport(
        string $code,
        string $message,
        array $metadata = [],
        array $summaryOverrides = [],
        bool $hasHeader = true
    ): array {
        return $this->failedPlan(
            code: $code,
            message: $message,
            summaryOverrides: $summaryOverrides,
            hasHeader: $hasHeader,
            metadata: $metadata
        )['report'];
    }

    public function sanitizeImportedRows(array $rows, array $columns): array
    {
        return $this->valueNormalizationService->sanitizeImportedRows($rows, $columns);
    }

    private function resolveImportStatus(
        int $problemColumnCount,
        int $rowsSkipped,
        int $rowShapeFixes,
        int $duplicateRows
    ): string {
        if ($problemColumnCount > 0 || $rowsSkipped > 0 || $rowShapeFixes > 0 || $duplicateRows > 0) {
            return 'imported_with_warnings';
        }

        return 'imported_clean';
    }

    private function failedPlan(
        string $code,
        string $message,
        array $summaryOverrides = [],
        bool $hasHeader = true,
        array $metadata = []
    ): array {
        $summary = array_replace([
            'import_status' => 'blocked',
            'rows_total' => 0,
            'rows_checked' => 0,
            'rows_imported' => 0,
            'rows_skipped' => 0,
            'columns_detected' => 0,
            'problematic_columns' => 0,
            'normalized_cells' => 0,
            'nullified_cells' => 0,
        ], $summaryOverrides);

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
                'problem_columns' => [],
                'blocking_error' => [
                    'code' => $code,
                    'message' => $message,
                    'metadata' => $metadata,
                ],
            ],
        ];
    }

    private function extractBlockingIssue(array $issues): array
    {
        foreach ($issues as $issue) {
            if (! is_array($issue)) {
                continue;
            }
            if (($issue['severity'] ?? null) === 'error') {
                return [
                    'code' => (string) ($issue['code'] ?? 'validation_blocked'),
                    'message' => (string) ($issue['message'] ?? __('api.import.validation_blocked')),
                ];
            }
        }

        return [
            'code' => 'validation_blocked',
            'message' => __('api.import.validation_blocked'),
        ];
    }
}
