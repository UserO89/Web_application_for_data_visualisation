<?php

namespace Tests\Unit\DatasetValidation;

use App\Services\ColumnTypeInferenceService;
use App\Services\DatasetValidation\ValueNormalizationService;
use App\Services\ValueParsingService;
use Tests\TestCase;

class ValueNormalizationServiceTest extends TestCase
{
    public function test_sanitize_imported_rows_returns_review_ready_changes_and_counters(): void
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
                ['ok', 42.5, true, '01.02.2026', 2, '2026-03-02 16:10:05'],
            ],
            $result['rows']
        );

        $this->assertSame(4, (int) $result['summary']['parse_issue_count']);
        $this->assertSame(5, (int) $result['summary']['nullified_cells']);
        $this->assertSame(9, (int) $result['summary']['fixed_cells']);

        $reviewColumns = $result['review']['problem_columns'] ?? [];
        $this->assertCount(5, $reviewColumns);
        $reviewColumnNames = array_column($reviewColumns, 'column_name');
        $this->assertNotContains('raw_text', $reviewColumnNames);

        $amountReview = $this->findReviewColumn($reviewColumns, 'amount');
        $this->assertNotNull($amountReview);
        $this->assertSame(1, (int) ($amountReview['issue_count'] ?? 0));
        $this->assertSame(1, (int) ($amountReview['nullified_count'] ?? 0));
        $this->assertSame('bad', $amountReview['review_samples'][0]['original_value'] ?? null);
        $this->assertSame('nullified', $amountReview['review_samples'][0]['action'] ?? null);
        $this->assertArrayHasKey('new_value', $amountReview['review_samples'][0]);
        $this->assertNull($amountReview['review_samples'][0]['new_value']);

        $eventDateReview = $this->findReviewColumn($reviewColumns, 'event_date');
        $this->assertNotNull($eventDateReview);
        $this->assertSame(2, (int) ($eventDateReview['issue_count'] ?? 0));
        $dateNormalizedSample = $this->findReviewSampleByAction($eventDateReview['review_samples'] ?? [], 'normalized');
        $this->assertNotNull($dateNormalizedSample);
        $this->assertSame('1.2.2026', $dateNormalizedSample['original_value'] ?? null);
        $this->assertSame('01.02.2026', $dateNormalizedSample['new_value'] ?? null);

        $countReview = $this->findReviewColumn($reviewColumns, 'count');
        $this->assertNotNull($countReview);
        $this->assertSame(1, (int) ($countReview['nullified_count'] ?? 0));
        $this->assertSame('1.7', $countReview['review_samples'][0]['original_value'] ?? null);
        $this->assertSame('nullified', $countReview['review_samples'][0]['action'] ?? null);
        $this->assertArrayHasKey('new_value', $countReview['review_samples'][0]);
        $this->assertNull($countReview['review_samples'][0]['new_value']);
    }

    public function test_normalize_limits_issue_samples_and_keeps_issue_metadata_compact(): void
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

        $this->assertLessThanOrEqual(40, count($result['issues']));

        $truncatedIssue = $this->findIssueByCode($result['issues'], 'value_issue_samples_truncated');
        $this->assertNotNull($truncatedIssue);
        $this->assertSame(1, (int) ($truncatedIssue['metadata']['omittedCount'] ?? 0));
        $nullifiedIssue = $this->findIssueByCode($result['issues'], 'cells_nullified');
        $this->assertNotNull($nullifiedIssue);
        $this->assertSame(37, (int) ($nullifiedIssue['metadata']['count'] ?? 0));

        $reviewColumns = $result['review']['problem_columns'] ?? [];
        $this->assertCount(1, $reviewColumns);
        $this->assertSame('Amount', $reviewColumns[0]['column_name'] ?? null);
        $this->assertSame(37, (int) ($reviewColumns[0]['issue_count'] ?? 0));
        $this->assertSame(37, (int) ($reviewColumns[0]['nullified_count'] ?? 0));
        $this->assertLessThanOrEqual(8, count($reviewColumns[0]['review_samples'] ?? []));
        foreach (($reviewColumns[0]['review_samples'] ?? []) as $sample) {
            $this->assertIsArray($sample);
        }
    }

    private function makeService(): ValueNormalizationService
    {
        $valueParsing = new ValueParsingService;

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

    private function findReviewColumn(array $columns, string $name): ?array
    {
        foreach ($columns as $column) {
            if (($column['column_name'] ?? null) === $name) {
                return $column;
            }
        }

        return null;
    }

    private function findReviewSampleByAction(array $samples, string $action): ?array
    {
        foreach ($samples as $sample) {
            if (($sample['action'] ?? null) === $action) {
                return $sample;
            }
        }

        return null;
    }
}
