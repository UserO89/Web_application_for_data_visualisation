<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectPageApiFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_dataset_import_works(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Import works');

        $response = $this->importCsv($project, <<<'CSV'
Region,Revenue
North,100
South,200
West,300
CSV
        );

        $response
            ->assertCreated()
            ->assertJsonPath('dataset.project_id', $project->id)
            ->assertJsonPath('dataset.has_header', true)
            ->assertJsonPath('rows_count', 3)
            ->assertJsonStructure([
                'dataset' => ['id', 'project_id', 'file_path', 'delimiter', 'has_header', 'columns'],
                'schema' => ['datasetId', 'generatedAt', 'columns'],
                'validation' => ['summary', 'issues', 'columns'],
            ]);

        $dataset = $project->fresh()->dataset;
        $this->assertNotNull($dataset);
        $this->assertTrue(Storage::disk('local')->exists($dataset->file_path));

        $this->assertDatabaseCount('datasets', 1);
        $this->assertDatabaseCount('dataset_columns', 2);
        $this->assertDatabaseCount('dataset_rows', 3);
        $this->assertDatabaseHas('dataset_columns', [
            'dataset_id' => $dataset->id,
            'name' => 'Revenue',
        ]);
    }

    public function test_malformed_csv_produces_validation_report(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Malformed CSV');

        $response = $this->importCsv($project, <<<'CSV'
A,B
,
 ,
CSV
        );

        $response
            ->assertStatus(422)
            ->assertJsonPath('validation.summary.import_status', 'blocked')
            ->assertJsonPath('validation.summary.rows_imported', 0);

        $issueCodes = collect($response->json('validation.issues', []))
            ->pluck('code')
            ->all();

        $this->assertContains('file_no_data_rows', $issueCodes);
        $this->assertDatabaseMissing('datasets', ['project_id' => $project->id]);
    }

    public function test_descriptive_statistics_result_builds_correctly(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Statistics');

        $this->importCsv($project, <<<'CSV'
Region,Revenue
North,10
South,20
North,30
South,40
CSV
        )->assertCreated();

        $response = $this->getJson("/api/v1/projects/{$project->id}/statistics");
        $response->assertOk();

        $statistics = $response->json('statistics');
        $this->assertIsArray($statistics);

        $revenueStats = $this->findColumnStatistics($statistics, 'Revenue');
        $this->assertNotNull($revenueStats);
        $this->assertSame('metric', $revenueStats['semantic_type']);
        $this->assertSame(4, $revenueStats['statistics']['count']);
        $this->assertSame(4, $revenueStats['statistics']['non_null_count']);
        $this->assertSame(4, $revenueStats['statistics']['distinct_count']);
        $this->assertEqualsWithDelta(25.0, $revenueStats['statistics']['mean'], 0.0001);
        $this->assertEqualsWithDelta(25.0, $revenueStats['statistics']['median'], 0.0001);
        $this->assertEqualsWithDelta(17.5, $revenueStats['statistics']['quartiles']['q1'], 0.0001);
        $this->assertEqualsWithDelta(32.5, $revenueStats['statistics']['quartiles']['q3'], 0.0001);
        $this->assertEqualsWithDelta(11.1803398875, $revenueStats['statistics']['std_dev'], 0.0001);

        $categoryStats = $this->findColumnStatistics($statistics, 'Region');
        $this->assertNotNull($categoryStats);
        $this->assertSame('nominal', $categoryStats['semantic_type']);
        $this->assertSame('North', $categoryStats['statistics']['mode']);
        $this->assertSame(2, $categoryStats['statistics']['frequency'][0]['count']);
    }

    public function test_project_page_critical_api_flow_does_not_break(): void
    {
        Storage::fake('local');
        $this->authenticateUser();

        $createProjectResponse = $this->postJson('/api/v1/projects', [
            'title' => 'ProjectPage flow',
            'description' => 'Critical API flow test',
        ]);
        $createProjectResponse->assertCreated();

        $projectId = (int) $createProjectResponse->json('project.id');
        $this->assertGreaterThan(0, $projectId);

        $this->getJson("/api/v1/projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('project.id', $projectId)
            ->assertJsonPath('project.dataset', null);

        $importResponse = $this->importCsvByProjectId($projectId, <<<'CSV'
Region,Revenue,Date
North,100,2024-01-01
South,200,2024-01-02
West,300,2024-01-03
CSV
        );
        $importResponse
            ->assertCreated()
            ->assertJsonPath('rows_count', 3);

        $showResponse = $this->getJson("/api/v1/projects/{$projectId}");
        $showResponse
            ->assertOk()
            ->assertJsonPath('project.id', $projectId)
            ->assertJsonCount(3, 'project.dataset.columns');

        $rowsResponse = $this->getJson("/api/v1/projects/{$projectId}/rows?page=1&per_page=100");
        $rowsResponse->assertOk();
        $firstRowId = (int) $rowsResponse->json('data.0.id');
        $this->assertGreaterThan(0, $firstRowId);

        $schemaResponse = $this->getJson("/api/v1/projects/{$projectId}/schema?rebuild=0");
        $schemaResponse
            ->assertOk()
            ->assertJsonCount(3, 'schema.columns');
        $firstColumnId = (int) $schemaResponse->json('schema.columns.0.id');
        $this->assertGreaterThan(0, $firstColumnId);

        $this->getJson("/api/v1/projects/{$projectId}/chart-suggestions")
            ->assertOk()
            ->assertJsonStructure(['suggestions']);

        $this->getJson("/api/v1/projects/{$projectId}/statistics-summary")
            ->assertOk()
            ->assertJsonStructure(['statistics']);

        $this->patchJson("/api/v1/projects/{$projectId}/rows/{$firstRowId}", [
            'values' => ['North', '150', '2024-01-01'],
        ])->assertOk();

        $this->patchJson("/api/v1/projects/{$projectId}/columns/{$firstColumnId}/semantic-type", [
            'semantic_type' => 'nominal',
            'analytical_role' => 'dimension',
            'is_excluded_from_analysis' => false,
        ])
            ->assertOk()
            ->assertJsonPath('column.typeSource', 'user');

        $this->patchJson("/api/v1/projects/{$projectId}/columns/{$firstColumnId}/ordinal-order", [
            'ordinal_order' => ['North', 'South', 'West'],
        ])
            ->assertOk()
            ->assertJsonPath('column.semanticType', 'ordinal');

        $this->getJson("/api/v1/projects/{$projectId}/chart-suggestions")
            ->assertOk()
            ->assertJsonStructure(['suggestions']);

        $this->getJson("/api/v1/projects/{$projectId}/statistics-summary")
            ->assertOk()
            ->assertJsonStructure(['statistics']);
    }

    private function authenticateUser(): User
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test-' . uniqid('', true) . '@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);

        Sanctum::actingAs($user);

        return $user;
    }

    private function createProjectForUser(User $user, string $title): Project
    {
        return Project::create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Test project',
        ]);
    }

    private function importCsv(Project $project, string $csvContent, array $options = []): TestResponse
    {
        return $this->importCsvByProjectId($project->id, $csvContent, $options);
    }

    private function importCsvByProjectId(int $projectId, string $csvContent, array $options = []): TestResponse
    {
        $file = UploadedFile::fake()->createWithContent('dataset.csv', $csvContent);

        return $this
            ->withHeader('Accept', 'application/json')
            ->post("/api/v1/projects/{$projectId}/import", array_merge([
                'file' => $file,
                'delimiter' => ',',
                'has_header' => true,
            ], $options));
    }

    private function findColumnStatistics(array $statistics, string $columnName): ?array
    {
        foreach ($statistics as $columnStats) {
            if (($columnStats['column'] ?? null) === $columnName) {
                return $columnStats;
            }
        }

        return null;
    }
}
