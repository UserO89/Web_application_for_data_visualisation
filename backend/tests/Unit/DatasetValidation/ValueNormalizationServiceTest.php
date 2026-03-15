<?php

namespace Tests\Unit\DatasetValidation;

use App\Services\ColumnTypeInferenceService;
use App\Services\DatasetValidation\ValueNormalizationService;
use App\Services\ValueParsingService;
use PHPUnit\Framework\TestCase;

class ValueNormalizationServiceTest extends TestCase
{
    public function test_sanitize_imported_rows_normalizes_values_and_tracks_counters(): void
    {
        $service = $this->makeService();

        $result = $service->sanitizeImportedRows(
            [
                [' n/a ', 'bad', 'maybe', '32.13.2026', '1.7', '2026-03-01 14:05'],
                ['ok', '42.5', 'yes', '1.2.2026', '2', '2026-03-02T16:10:05'],
            ],
            [
                ['name' => 'raw_text', 'type' => 'string', 'physical_type' => 'string'],
                ['name' => 'amount', 'type' => 'string', 'physical_type' => 'number'],
                ['name' => 'active', 'type' => 'string', 'physical_type' => 'boolean'],
                ['name' => 'event_date', 'type' => 'string', 'physical_type' => 'date'],
                ['name' => 'count', 'type' => 'integer', 'physical_type' => 'integer'],
                ['name' => 'event_time', 'type' => 'string', 'physical_type' => 'datetime'],
            ]
        );

        $this->assertSame(
            [
                [null, null, null, null, null, '2026-03-01 14:05:00'],
                ['ok', 42.5, true, '2026-02-01', 2, '2026-03-02 16:10:05'],
            ],
            $result['rows']
        );

        $this->assertSame(4, (int) $result['summary']['parse_issue_count']);
        $this->assertSame(5, (int) $result['summary']['nullified_cells']);
        $this->assertSame(9, (int) $result['summary']['fixed_cells']);

        $issueCodes = array_column($result['issues'], 'code');
        $this->assertContains('value_empty_normalized', $issueCodes);
        $this->assertContains('value_invalid_number', $issueCodes);
        $this->assertContains('value_invalid_boolean', $issueCodes);
        $this->assertContains('value_invalid_date', $issueCodes);
        $this->assertContains('value_invalid_integer', $issueCodes);
        $this->assertContains('value_date_normalized', $issueCodes);
        $this->assertContains('value_boolean_normalized', $issueCodes);
    }

    public function test_normalize_limits_issue_samples_and_exposes_truncation_metadata(): void
    {
        $service = $this->makeService();

        $rows = [];
        for ($i = 0; $i < 90; $i++) {
            $rows[] = ['100'];
        }
        for ($i = 0; $i < 37; $i++) {
            $rows[] = ['bad'];
        }

        $result = $service->normalize($rows, ['Amount'], 1);

        $summary = $result['summary'];
        $this->assertSame(37, (int) $summary['nullified_cells']);
        $this->assertSame(37, (int) $summary['parse_issue_count']);
        $this->assertSame(36, (int) $summary['sampled_issue_count']);
        $this->assertSame(1, (int) $summary['omitted_issue_count']);

        $issueCodes = array_column($result['issues'], 'code');
        $this->assertContains('cells_nullified', $issueCodes);
        $this->assertContains('value_invalid_number', $issueCodes);
        $this->assertContains('value_issue_samples_truncated', $issueCodes);

        $truncatedIssue = $this->findIssueByCode($result['issues'], 'value_issue_samples_truncated');
        $this->assertIsArray($truncatedIssue);
        $this->assertSame(1, (int) ($truncatedIssue['metadata']['omittedCount'] ?? 0));
    }

    private function makeService(): ValueNormalizationService
    {
        $valueParsing = new ValueParsingService();

        return new ValueNormalizationService(
            $valueParsing,
            new ColumnTypeInferenceService($valueParsing)
        );
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
