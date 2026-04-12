<?php

namespace Tests\Unit\DatasetValidation;

use App\Services\DatasetValidation\StructuralValidationService;
use App\Services\ValueParsingService;
use Tests\TestCase;

class StructuralValidationServiceTest extends TestCase
{
    public function test_validate_blocks_empty_input(): void
    {
        $service = $this->makeService();

        $result = $service->validate([], true);

        $this->assertFalse($result['can_proceed']);
        $this->assertContains('file_no_rows', array_column($result['issues'], 'code'));
    }

    public function test_validate_normalizes_headers_rows_and_structural_issues(): void
    {
        $service = $this->makeService();
        $longHeader = str_repeat('L', 140);

        $result = $service->validate([
            [' Region ', 'Region', 'Unnamed', $longHeader],
            ['North', '10', '', 'x'],
            ['South', '20'],
            ['East', '30', 'foo', 'bar', 'extra'],
            ['', '', '', ''],
        ], true);

        $this->assertTrue($result['can_proceed']);
        $this->assertSame(4, $result['expected_count']);
        $this->assertSame(3, count($result['rows']));
        $this->assertSame('Region', $result['headers'][0]);
        $this->assertSame('Region_2', $result['headers'][1]);
        $this->assertSame('Column_3', $result['headers'][2]);
        $this->assertSame(120, mb_strlen($result['headers'][3]));

        $this->assertSame(1, (int) $result['row_stats']['rows_padded']);
        $this->assertSame(1, (int) $result['row_stats']['rows_truncated']);
        $this->assertSame(1, (int) $result['row_stats']['skipped_empty_rows']);

        $issueCodes = array_column($result['issues'], 'code');
        $this->assertContains('header_trimmed', $issueCodes);
        $this->assertContains('header_duplicates_renamed', $issueCodes);
        $this->assertContains('header_placeholder_replaced', $issueCodes);
        $this->assertContains('header_too_long', $issueCodes);
        $this->assertContains('rows_padded_with_nulls', $issueCodes);
        $this->assertContains('rows_truncated', $issueCodes);
        $this->assertContains('rows_empty_skipped', $issueCodes);
    }

    public function test_count_duplicate_rows_counts_exact_duplicates(): void
    {
        $service = $this->makeService();

        $duplicates = $service->countDuplicateRows([
            ['North', 100],
            ['South', 200],
            ['North', 100],
            ['North', 100],
        ]);

        $this->assertSame(2, $duplicates);
    }

    private function makeService(): StructuralValidationService
    {
        return new StructuralValidationService(new ValueParsingService);
    }
}
