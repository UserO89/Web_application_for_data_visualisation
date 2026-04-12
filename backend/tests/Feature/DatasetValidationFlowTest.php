<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DatasetValidationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_review_flow_returns_problematic_columns_and_concrete_samples(): void
    {
        Storage::fake('local');

        $user = $this->createUser();
        Sanctum::actingAs($user);

        $project = Project::create([
            'user_id' => (int) $user->id,
            'title' => 'Validation review flow',
            'description' => 'Feature test project',
        ]);

        $csv = <<<'CSV'
Region,Revenue,EventDate
North,100,2026-01-01
north,110,2026-01-02
South,120,2026-01-03
West,bad,not-a-date
East,140,2026-01-05
Central,150,2026-01-06
West2,bad2,not-a-date
,,
CSV;

        $tmpPath = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($tmpPath, $csv);
        $file = new UploadedFile($tmpPath, 'validation-review.csv', 'text/csv', null, true);

        $response = $this->postJson("/api/v1/projects/{$project->id}/import", [
            'file' => $file,
            'delimiter' => ',',
            'has_header' => true,
        ]);

        @unlink($tmpPath);

        $response
            ->assertCreated()
            ->assertJsonPath('validation.summary.import_status', 'imported_with_warnings')
            ->assertJsonPath('validation.summary.rows_imported', 7)
            ->assertJsonPath('validation.summary.rows_skipped', 1)
            ->assertJsonPath('validation.summary.problematic_columns', 2);

        $summary = $response->json('validation.summary') ?? [];
        $this->assertSame(7, (int) ($summary['rows_imported'] ?? 0));
        $this->assertSame(1, (int) ($summary['rows_skipped'] ?? 0));
        $this->assertSame(2, (int) ($summary['problematic_columns'] ?? 0));
        $this->assertGreaterThanOrEqual(4, (int) ($summary['nullified_cells'] ?? 0));
        $this->assertSame(5, (int) ($summary['normalized_cells'] ?? -1));
        $this->assertNull($response->json('validation.issues'));

        $problemColumns = $response->json('validation.problem_columns') ?? [];
        $this->assertCount(2, $problemColumns);
        $names = array_column($problemColumns, 'column_name');
        $this->assertContains('Revenue', $names);
        $this->assertContains('EventDate', $names);

        $revenue = $this->findProblemColumnByName($problemColumns, 'Revenue');
        $this->assertNotNull($revenue);
        $this->assertSame(2, (int) ($revenue['issue_count'] ?? 0));
        $this->assertSame(2, (int) ($revenue['nullified_count'] ?? 0));
        $this->assertContains('bad', array_column($revenue['review_samples'] ?? [], 'original_value'));
        $this->assertContains('bad2', array_column($revenue['review_samples'] ?? [], 'original_value'));
        $this->assertContains('nullified', array_column($revenue['review_samples'] ?? [], 'action'));

        $eventDate = $this->findProblemColumnByName($problemColumns, 'EventDate');
        $this->assertNotNull($eventDate);
        $this->assertGreaterThanOrEqual(5, (int) ($eventDate['normalized_count'] ?? 0));
        $this->assertSame(2, (int) ($eventDate['nullified_count'] ?? 0));
        $normalizedDateSample = $this->findReviewSampleByAction($eventDate['review_samples'] ?? [], 'normalized');
        $this->assertNotNull($normalizedDateSample);
        $this->assertMatchesRegularExpression('/^\d{2}\.\d{2}\.\d{4}$/', (string) ($normalizedDateSample['new_value'] ?? ''));

        $dataset = $project->fresh()->dataset;
        $this->assertNotNull($dataset);
        $this->assertSame($summary, $dataset->import_summary_json);
        $this->assertSame($response->json('validation'), $dataset->validation_report_json);

        $revenueColumn = $dataset->columns()->where('name', 'Revenue')->first();
        $this->assertNotNull($revenueColumn);
        $this->assertIsArray($revenueColumn->quality_json);
        $this->assertNotEmpty($revenueColumn->quality_json);
        $this->assertArrayHasKey('status', $revenueColumn->quality_json);

        $sampleOriginalValues = [];
        foreach ($problemColumns as $column) {
            $this->assertArrayHasKey('issue_count', $column);
            $this->assertArrayHasKey('normalized_count', $column);
            $this->assertArrayHasKey('nullified_count', $column);
            $this->assertArrayHasKey('review_samples', $column);
            foreach ((array) ($column['review_samples'] ?? []) as $sample) {
                $sampleOriginalValues[] = $sample['original_value'] ?? null;
                $this->assertArrayHasKey('row', $sample);
                $this->assertArrayHasKey('action', $sample);
                $this->assertArrayHasKey('new_value', $sample);
                $this->assertArrayHasKey('reason', $sample);
            }
        }
        $emptySampleCount = count(array_filter($sampleOriginalValues, fn ($value) => $value === null || $value === ''));
        $this->assertSame(0, $emptySampleCount);
    }

    private function findProblemColumnByName(array $columns, string $name): ?array
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

    private function createUser(): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => 'test-'.uniqid('', true).'@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);
    }
}
