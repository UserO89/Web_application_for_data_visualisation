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
            ->assertJsonPath('validation.summary.rows_skipped', 1);

        $summary = $response->json('validation.summary') ?? [];
        $this->assertGreaterThanOrEqual(4, (int) ($summary['nullified_cells'] ?? 0));

        $issues = $response->json('validation.issues') ?? [];
        $issueCodes = array_column($issues, 'code');
        $this->assertContains('cells_nullified', $issueCodes);
        $this->assertContains('value_invalid_number', $issueCodes);
        $this->assertContains('value_invalid_date', $issueCodes);

        $invalidNumberSample = $this->findIssueByCode($issues, 'value_invalid_number');
        $this->assertIsArray($invalidNumberSample);
        $this->assertContains($invalidNumberSample['metadata']['original'] ?? null, ['bad', 'bad2']);
        $this->assertArrayHasKey('fixed', $invalidNumberSample['metadata']);
        $this->assertNull($invalidNumberSample['metadata']['fixed']);

        $columns = collect($response->json('validation.columns') ?? []);
        $problemColumns = $columns->filter(fn($column) => ($column['status'] ?? null) === 'warning');
        $this->assertGreaterThanOrEqual(1, $problemColumns->count());

        $emptySampleCount = count(array_filter($issueCodes, fn($code) => $code === 'value_empty_normalized'));
        $invalidSampleCount = count(array_filter($issueCodes, fn($code) => str_starts_with((string) $code, 'value_invalid_')));
        $this->assertGreaterThan(0, $invalidSampleCount);
        $this->assertLessThanOrEqual($invalidSampleCount, $emptySampleCount);
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

    private function createUser(): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => 'test-' . uniqid('', true) . '@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);
    }
}
