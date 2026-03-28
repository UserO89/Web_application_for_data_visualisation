<?php

namespace Tests\Feature;

use App\Models\Dataset;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectDatasetLifecycleRuleTest extends TestCase
{
    use RefreshDatabase;

    private const DATASET_EXISTS_MESSAGE = 'This project already has a dataset. Create a new project to import another file.';

    public function test_import_succeeds_when_project_has_no_dataset(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'One dataset rule');

        $this->importCsv($project->id, <<<'CSV'
Region,Revenue
North,100
South,200
CSV
        )
            ->assertCreated()
            ->assertJsonPath('dataset.project_id', $project->id)
            ->assertJsonPath('rows_count', 2);

        $this->assertSame(1, Dataset::query()->where('project_id', $project->id)->count());
    }

    public function test_import_fails_when_project_already_has_dataset(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Reject re-import');

        $this->importCsv($project->id, <<<'CSV'
Region,Revenue
North,100
CSV
        )->assertCreated();

        $this->importCsv($project->id, <<<'CSV'
Region,Revenue
East,300
CSV
        )
            ->assertStatus(409)
            ->assertJsonPath('message', self::DATASET_EXISTS_MESSAGE);

        $this->assertSame(1, Dataset::query()->where('project_id', $project->id)->count());
    }

    public function test_project_cannot_store_multiple_datasets_in_database(): void
    {
        $project = $this->createProjectForUser($this->createUser(), 'DB uniqueness');

        $project->dataset()->create([
            'file_path' => 'datasets/first.csv',
            'delimiter' => ',',
            'has_header' => true,
        ]);

        try {
            $project->dataset()->create([
                'file_path' => 'datasets/second.csv',
                'delimiter' => ',',
                'has_header' => true,
            ]);

            $this->fail('Expected unique constraint violation when creating a second dataset for one project.');
        } catch (QueryException $exception) {
            $this->assertSame(1, Dataset::query()->where('project_id', $project->id)->count());
        }
    }

    public function test_project_delete_cleans_dataset_children_charts_and_uploaded_file(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Delete lifecycle');

        $this->importCsv($project->id, <<<'CSV'
Region,Revenue
North,100
South,200
CSV
        )->assertCreated();

        $dataset = $project->fresh()->dataset;
        $this->assertNotNull($dataset);
        $datasetId = (int) $dataset->id;
        $datasetPath = (string) $dataset->file_path;
        $projectId = (int) $project->id;

        $chartId = (int) $project->charts()->create([
            'type' => 'line',
            'title' => 'Lifecycle chart',
            'config' => [
                'rendered' => [
                    'type' => 'line',
                    'labels' => ['North', 'South'],
                    'datasets' => [['label' => 'Revenue', 'data' => [100, 200]]],
                    'meta' => [],
                ],
            ],
        ])->id;

        $this->assertTrue(Storage::disk('local')->exists($datasetPath));

        $this->deleteJson("/api/v1/projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('projects', ['id' => $projectId]);
        $this->assertDatabaseMissing('datasets', ['id' => $datasetId]);
        $this->assertDatabaseMissing('dataset_columns', ['dataset_id' => $datasetId]);
        $this->assertDatabaseMissing('dataset_rows', ['dataset_id' => $datasetId]);
        $this->assertDatabaseMissing('charts', ['id' => $chartId]);
        $this->assertFalse(Storage::disk('local')->exists($datasetPath));
    }

    private function authenticateUser(): User
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);

        return $user;
    }

    private function createProjectForUser(User $user, string $title): Project
    {
        return Project::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Test project',
        ]);
    }

    private function importCsv(int $projectId, string $csv): \Illuminate\Testing\TestResponse
    {
        return $this
            ->withHeader('Accept', 'application/json')
            ->post("/api/v1/projects/{$projectId}/import", [
                'file' => UploadedFile::fake()->createWithContent('dataset.csv', $csv),
                'delimiter' => ',',
                'has_header' => true,
            ]);
    }

    private function createUser(): User
    {
        return User::query()->create([
            'name' => 'Test User',
            'email' => 'test-' . uniqid('', true) . '@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);
    }
}
