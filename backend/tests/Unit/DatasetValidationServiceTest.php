<?php

namespace Tests\Unit;

use App\Services\ColumnProfilingService;
use App\Services\ColumnTypeInferenceService;
use App\Services\DatasetValidationService;
use App\Services\ValueParsingService;
use PHPUnit\Framework\TestCase;

class DatasetValidationServiceTest extends TestCase
{
    public function test_build_import_plan_runs_safe_normalization_and_data_quality_checks(): void
    {
        $valueParsing = new ValueParsingService();
        $service = new DatasetValidationService(
            $valueParsing,
            new ColumnProfilingService($valueParsing),
            new ColumnTypeInferenceService($valueParsing)
        );

        $result = $service->buildImportPlan([
            [' Region ', 'RevenueUSD', 'Customer_ID', 'Region', 'Unnamed'],
            [' North ', '100', 'C001', 'North', ''],
            ['South', 'bad', 'C002', 'South', 'x'],
            ['', '', '', '', ''],
            ['West', '300', 'C003'],
            ['West', '300', 'C003', null, null],
        ], true);

        $this->assertTrue($result['canImport']);
        $this->assertSame(5, $result['report']['summary']['columns_detected']);
        $this->assertSame(4, $result['report']['summary']['rows_imported']);
        $this->assertSame(1, $result['report']['summary']['rows_skipped']);
        $this->assertSame('imported_with_warnings', $result['report']['summary']['import_status']);

        $issueCodes = array_values(array_unique(array_column($result['report']['issues'], 'code')));
        $this->assertContains('header_trimmed', $issueCodes);
        $this->assertContains('header_duplicates_renamed', $issueCodes);
        $this->assertContains('header_placeholder_replaced', $issueCodes);
        $this->assertContains('rows_empty_skipped', $issueCodes);
        $this->assertContains('rows_padded_with_nulls', $issueCodes);
        $this->assertContains('dataset_duplicate_rows', $issueCodes);
        $this->assertContains('column_invalid_numeric_values', $issueCodes);
        $this->assertContains('column_identifier_like', $issueCodes);

        $this->assertCount(5, $result['report']['columns']);
        $revenue = null;
        foreach ($result['report']['columns'] as $column) {
            if (($column['name'] ?? '') !== 'RevenueUSD') {
                continue;
            }
            $revenue = $column;
            break;
        }
        $this->assertNotNull($revenue);
        $this->assertSame('warning', $revenue['status']);
        $this->assertGreaterThan(0, $revenue['parseSuccess']['number']);
    }

    public function test_build_import_plan_blocks_import_when_no_data_rows_left_after_normalization(): void
    {
        $valueParsing = new ValueParsingService();
        $service = new DatasetValidationService(
            $valueParsing,
            new ColumnProfilingService($valueParsing),
            new ColumnTypeInferenceService($valueParsing)
        );

        $result = $service->buildImportPlan([
            ['A', 'B'],
            ['', ''],
            [' ', null],
        ], true);

        $this->assertFalse($result['canImport']);
        $this->assertSame('blocked', $result['report']['summary']['import_status']);
        $this->assertGreaterThanOrEqual(1, $result['report']['summary']['error_count']);

        $issueCodes = array_column($result['report']['issues'], 'code');
        $this->assertContains('file_no_data_rows', $issueCodes);
    }
}
