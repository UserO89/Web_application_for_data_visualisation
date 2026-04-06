<?php

namespace Tests\Unit;

use App\Services\ColumnTypeInferenceService;
use App\Services\ValueParsingService;
use PHPUnit\Framework\TestCase;

class ColumnTypeInferenceServiceTest extends TestCase
{
    private ColumnTypeInferenceService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ColumnTypeInferenceService(new ValueParsingService());
    }

    public function test_infer_returns_empty_array_for_empty_input(): void
    {
        $this->assertSame([], $this->service->infer([]));
    }

    public function test_infer_detects_legacy_and_physical_types_with_header_row(): void
    {
        $columns = $this->service->infer([
            ['Revenue', 'OccurredAt', 'Active', 'Label'],
            ['10', '2024-01-01', 'yes', 'North'],
            ['20.5', '2024-01-02 10:30', 'no', 'South'],
            ['30', '2024-01-03', 'enabled', 'West'],
        ]);

        $this->assertSame([
            ['name' => 'Revenue', 'type' => 'float', 'physical_type' => 'number'],
            ['name' => 'OccurredAt', 'type' => 'date', 'physical_type' => 'datetime'],
            ['name' => 'Active', 'type' => 'string', 'physical_type' => 'boolean'],
            ['name' => 'Label', 'type' => 'string', 'physical_type' => 'string'],
        ], $columns);
    }

    public function test_infer_without_header_generates_default_column_names(): void
    {
        $columns = $this->service->infer([
            ['1', '2'],
            ['3', '4'],
        ], false);

        $this->assertSame('Column 1', $columns[0]['name']);
        $this->assertSame('integer', $columns[0]['type']);
        $this->assertSame('number', $columns[0]['physical_type']);
        $this->assertSame('Column 2', $columns[1]['name']);
    }

    public function test_numeric_year_values_stay_numeric_and_empty_columns_are_unknown(): void
    {
        $columns = $this->service->infer([
            ['YearOnly', 'EmptyColumn'],
            ['2024', ''],
            ['2025', null],
            ['2026', 'N/A'],
        ]);

        $this->assertSame('integer', $columns[0]['type']);
        $this->assertSame('number', $columns[0]['physical_type']);
        $this->assertSame('string', $columns[1]['type']);
        $this->assertSame('unknown', $columns[1]['physical_type']);
    }
}
