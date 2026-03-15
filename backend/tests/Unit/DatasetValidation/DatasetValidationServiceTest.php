<?php

namespace Tests\Unit\DatasetValidation;

use App\Services\ColumnProfilingService;
use App\Services\ColumnTypeInferenceService;
use App\Services\DatasetValidation\ColumnQualityAnalysisService;
use App\Services\DatasetValidation\DatasetValidationService;
use App\Services\DatasetValidation\StructuralValidationService;
use App\Services\DatasetValidation\ValueNormalizationService;
use App\Services\ValueParsingService;
use PHPUnit\Framework\TestCase;

class DatasetValidationServiceTest extends TestCase
{
    public function test_failed_plan_preserves_real_has_header_flag(): void
    {
        $service = $this->makeService();

        $result = $service->buildImportPlan([], false);

        $this->assertFalse($result['canImport']);
        $this->assertSame(false, $result['report']['dataset']['has_header']);
        $this->assertSame('blocked', $result['report']['summary']['import_status']);
    }

    public function test_build_import_plan_assembles_structural_value_and_quality_result(): void
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
        $this->assertSame(1, $result['report']['summary']['nullified_cells']);
        $this->assertSame(1, $result['report']['dataset']['duplicate_rows']);

        $this->assertSame(
            [
                ['North', 100],
                ['north', null],
                ['South', 200],
                ['South', 200],
            ],
            $result['rows']
        );

        $issueCodes = array_column($result['report']['issues'], 'code');
        $this->assertContains('rows_empty_skipped', $issueCodes);
        $this->assertContains('cells_nullified', $issueCodes);
        $this->assertContains('value_invalid_number', $issueCodes);
        $this->assertContains('dataset_duplicate_rows', $issueCodes);
        $this->assertContains('column_case_variants', $issueCodes);

        $amountColumn = $this->findColumnReportByName($result['report']['columns'], 'Amount');
        $this->assertNotNull($amountColumn);
        $this->assertSame('ok', $amountColumn['status']);

        $regionColumn = $this->findColumnReportByName($result['report']['columns'], 'Region');
        $this->assertNotNull($regionColumn);
        $this->assertSame('warning', $regionColumn['status']);

        $invalidNumberIssue = $this->findIssueByCode($result['report']['issues'], 'value_invalid_number');
        $this->assertNotNull($invalidNumberIssue);
        $this->assertSame('bad', $invalidNumberIssue['metadata']['original'] ?? null);
        $this->assertArrayHasKey('fixed', $invalidNumberIssue['metadata']);
        $this->assertNull($invalidNumberIssue['metadata']['fixed']);
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

        $issueCodes = array_column($result['report']['issues'], 'code');
        $this->assertContains('value_invalid_number', $issueCodes);
        $this->assertNotContains('column_invalid_numeric_values', $issueCodes);

        $amountColumn = $this->findColumnReportByName($result['report']['columns'], 'Amount');
        $this->assertNotNull($amountColumn);
        $this->assertNotSame('warning', $amountColumn['status']);
    }

    private function makeService(): DatasetValidationService
    {
        $valueParsing = new ValueParsingService();
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

    private function findIssueByCode(array $issues, string $code): ?array
    {
        foreach ($issues as $issue) {
            if (($issue['code'] ?? null) === $code) {
                return $issue;
            }
        }

        return null;
    }
}
