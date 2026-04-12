<?php

namespace Tests\Unit\DatasetValidation;

use App\Services\ColumnProfilingService;
use App\Services\ColumnTypeInferenceService;
use App\Services\DatasetValidation\ColumnQualityAnalysisService;
use App\Services\DatasetValidation\DatasetValidationService;
use App\Services\DatasetValidation\StructuralValidationService;
use App\Services\DatasetValidation\ValueNormalizationService;
use App\Services\ValueParsingService;
use Tests\TestCase;

class DatasetValidationServiceTest extends TestCase
{
    public function test_failed_plan_preserves_real_has_header_flag(): void
    {
        $service = $this->makeService();

        $result = $service->buildImportPlan([], false);

        $this->assertFalse($result['canImport']);
        $this->assertSame(false, $result['report']['dataset']['has_header']);
        $this->assertSame('blocked', $result['report']['summary']['import_status']);
        $this->assertSame(0, (int) ($result['report']['summary']['problematic_columns'] ?? -1));
        $this->assertSame([], $result['report']['problem_columns'] ?? null);
        $this->assertSame('file_no_rows', (string) ($result['report']['blocking_error']['code'] ?? ''));
        $this->assertArrayNotHasKey('issues', $result['report']);
        $this->assertArrayNotHasKey('columns', $result['report']);
    }

    public function test_build_import_plan_returns_review_oriented_validation_contract(): void
    {
        $service = $this->makeService();

        $result = $service->buildImportPlan([
            ['Region', 'Amount'],
            ['North', '100'],
            ['north', 'bad'],
            ['South', '200'],
            ['South', '200'],
            ['', ''],
        ], true);

        $this->assertTrue($result['canImport']);
        $this->assertSame(5, $result['report']['summary']['rows_total']);
        $this->assertSame(4, $result['report']['summary']['rows_imported']);
        $this->assertSame(1, $result['report']['summary']['rows_skipped']);
        $this->assertSame(1, $result['report']['summary']['problematic_columns']);
        $this->assertSame(0, $result['report']['summary']['normalized_cells']);
        $this->assertSame(1, $result['report']['summary']['nullified_cells']);
        $this->assertSame(1, $result['report']['dataset']['duplicate_rows']);
        $this->assertNull($result['report']['blocking_error']);
        $this->assertArrayNotHasKey('issues', $result['report']);
        $this->assertArrayNotHasKey('columns', $result['report']);

        $this->assertSame(
            [
                ['North', 100],
                ['north', null],
                ['South', 200],
                ['South', 200],
            ],
            $result['rows']
        );

        $reviewAmount = $this->findReviewColumnByName($result['report']['problem_columns'] ?? [], 'Amount');
        $this->assertNotNull($reviewAmount);
        $this->assertSame(1, (int) ($reviewAmount['issue_count'] ?? 0));
        $this->assertSame(1, (int) ($reviewAmount['nullified_count'] ?? 0));
        $this->assertSame('bad', $reviewAmount['review_samples'][0]['original_value'] ?? null);
        $this->assertSame('nullified', $reviewAmount['review_samples'][0]['action'] ?? null);
        $this->assertSame('Invalid numeric value', $reviewAmount['review_samples'][0]['reason'] ?? null);
    }

    public function test_quality_analysis_uses_sanitized_rows_regression(): void
    {
        $service = $this->makeService();

        $result = $service->buildImportPlan([
            ['Amount'],
            ['100'],
            ['bad'],
            ['200'],
            ['300'],
        ], true);

        $summary = $result['report']['summary'] ?? [];
        $this->assertSame(1, (int) ($summary['problematic_columns'] ?? 0));

        $amountColumn = $this->findColumnReportByName($result['columns'], 'Amount');
        $this->assertNotNull($amountColumn);
        $this->assertNotSame('warning', $amountColumn['quality']['status'] ?? null);

        $reviewAmount = $this->findReviewColumnByName($result['report']['problem_columns'] ?? [], 'Amount');
        $this->assertNotNull($reviewAmount);
        $this->assertSame(1, (int) ($reviewAmount['nullified_count'] ?? 0));
    }

    private function makeService(): DatasetValidationService
    {
        $valueParsing = new ValueParsingService;
        $columnTypeInference = new ColumnTypeInferenceService($valueParsing);
        $columnProfiling = new ColumnProfilingService($valueParsing);

        return new DatasetValidationService(
            new StructuralValidationService($valueParsing),
            new ValueNormalizationService($valueParsing, $columnTypeInference),
            new ColumnQualityAnalysisService($columnProfiling, $valueParsing)
        );
    }

    private function findColumnReportByName(array $columns, string $name): ?array
    {
        foreach ($columns as $column) {
            if (($column['name'] ?? null) === $name) {
                return $column;
            }
        }

        return null;
    }

    private function findReviewColumnByName(array $columns, string $name): ?array
    {
        foreach ($columns as $column) {
            if (($column['column_name'] ?? null) === $name) {
                return $column;
            }
        }

        return null;
    }
}
