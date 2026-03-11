<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectPageApiFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_page_critical_endpoints_require_authentication(): void
    {
        Storage::fake('local');

        $owner = $this->createUser();
        $fixture = $this->seedProjectDatasetFixture($owner);
        $projectId = $fixture['project']->id;
        $rowId = $fixture['row']->id;
        $columnId = $fixture['column']->id;

        $this->getJson("/api/v1/projects/{$projectId}")->assertUnauthorized();
        $this->getJson("/api/v1/projects/{$projectId}/rows?page=1&per_page=100")->assertUnauthorized();
        $this->getJson("/api/v1/projects/{$projectId}/schema?rebuild=0")->assertUnauthorized();
        $this->getJson("/api/v1/projects/{$projectId}/chart-suggestions")->assertUnauthorized();
        $this->getJson("/api/v1/projects/{$projectId}/statistics-summary")->assertUnauthorized();

        $this->withHeader('Accept', 'application/json')
            ->post("/api/v1/projects/{$projectId}/import", [
                'file' => UploadedFile::fake()->createWithContent('dataset.csv', "A,B\n1,2\n"),
                'delimiter' => ',',
                'has_header' => true,
            ])
            ->assertUnauthorized();

        $this->patchJson("/api/v1/projects/{$projectId}/rows/{$rowId}", [
            'values' => ['North', '150'],
        ])->assertUnauthorized();

        $this->patchJson("/api/v1/projects/{$projectId}/columns/{$columnId}/semantic-type", [
            'semantic_type' => 'nominal',
            'analytical_role' => 'dimension',
            'is_excluded_from_analysis' => false,
        ])->assertUnauthorized();

        $this->patchJson("/api/v1/projects/{$projectId}/columns/{$columnId}/ordinal-order", [
            'ordinal_order' => ['North', 'South'],
        ])->assertUnauthorized();
    }

    public function test_project_page_critical_endpoints_forbid_access_to_foreign_project(): void
    {
        Storage::fake('local');

        $owner = $this->createUser();
        $fixture = $this->seedProjectDatasetFixture($owner);
        $projectId = $fixture['project']->id;
        $rowId = $fixture['row']->id;
        $columnId = $fixture['column']->id;

        Sanctum::actingAs($this->createUser());

        $this->getJson("/api/v1/projects/{$projectId}")->assertForbidden();
        $this->getJson("/api/v1/projects/{$projectId}/rows?page=1&per_page=100")->assertForbidden();
        $this->getJson("/api/v1/projects/{$projectId}/schema?rebuild=0")->assertForbidden();
        $this->getJson("/api/v1/projects/{$projectId}/chart-suggestions")->assertForbidden();
        $this->getJson("/api/v1/projects/{$projectId}/statistics-summary")->assertForbidden();

        $this->withHeader('Accept', 'application/json')
            ->post("/api/v1/projects/{$projectId}/import", [
                'file' => UploadedFile::fake()->createWithContent('dataset.csv', "A,B\n1,2\n"),
                'delimiter' => ',',
                'has_header' => true,
            ])
            ->assertForbidden();

        $this->patchJson("/api/v1/projects/{$projectId}/rows/{$rowId}", [
            'values' => ['North', '150'],
        ])->assertForbidden();

        $this->patchJson("/api/v1/projects/{$projectId}/columns/{$columnId}/semantic-type", [
            'semantic_type' => 'nominal',
            'analytical_role' => 'dimension',
            'is_excluded_from_analysis' => false,
        ])->assertForbidden();

        $this->patchJson("/api/v1/projects/{$projectId}/columns/{$columnId}/ordinal-order", [
            'ordinal_order' => ['North', 'South'],
        ])->assertForbidden();
    }

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

    public function test_semantic_override_is_persisted_across_schema_reload(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Semantic override');

        $this->importCsv($project, <<<'CSV'
Region,Revenue
North,100
South,200
CSV
        )->assertCreated();

        $schemaResponse = $this->getJson("/api/v1/projects/{$project->id}/schema?rebuild=0");
        $schemaResponse->assertOk();
        $regionColumn = collect($schemaResponse->json('schema.columns', []))
            ->firstWhere('name', 'Region');
        $this->assertNotNull($regionColumn);

        $columnId = (int) ($regionColumn['id'] ?? 0);
        $this->assertGreaterThan(0, $columnId);

        $this->patchJson("/api/v1/projects/{$project->id}/columns/{$columnId}/semantic-type", [
            'semantic_type' => 'identifier',
            'analytical_role' => 'excluded',
            'is_excluded_from_analysis' => true,
        ])
            ->assertOk()
            ->assertJsonPath('column.semanticType', 'identifier')
            ->assertJsonPath('column.typeSource', 'user')
            ->assertJsonPath('column.isExcludedFromAnalysis', true);

        $reloadedSchemaResponse = $this->getJson("/api/v1/projects/{$project->id}/schema?rebuild=1");
        $reloadedSchemaResponse->assertOk();
        $reloadedRegionColumn = collect($reloadedSchemaResponse->json('schema.columns', []))
            ->firstWhere('id', $columnId);

        $this->assertNotNull($reloadedRegionColumn);
        $this->assertSame('identifier', $reloadedRegionColumn['semanticType']);
        $this->assertSame('user', $reloadedRegionColumn['typeSource']);
        $this->assertTrue((bool) $reloadedRegionColumn['isExcludedFromAnalysis']);

        $this->assertDatabaseHas('dataset_columns', [
            'id' => $columnId,
            'semantic_type' => 'identifier',
            'type_source' => 'user',
            'is_excluded_from_analysis' => 1,
        ]);
    }

    public function test_row_updates_are_persisted_and_returned_by_rows_endpoint(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Row updates');

        $this->importCsv($project, <<<'CSV'
Region,Revenue
North,100
South,200
CSV
        )->assertCreated();

        $rowsBeforeResponse = $this->getJson("/api/v1/projects/{$project->id}/rows?page=1&per_page=100");
        $rowsBeforeResponse->assertOk();
        $rowId = (int) $rowsBeforeResponse->json('data.0.id');
        $this->assertGreaterThan(0, $rowId);

        $newValues = ['North Updated', '999'];
        $this->patchJson("/api/v1/projects/{$project->id}/rows/{$rowId}", [
            'values' => $newValues,
        ])
            ->assertOk()
            ->assertJsonPath('row.id', $rowId);

        $storedValuesJson = DB::table('dataset_rows')
            ->where('id', $rowId)
            ->value('values');
        $this->assertNotNull($storedValuesJson);
        $this->assertSame($newValues, json_decode((string) $storedValuesJson, true));

        $rowsAfterResponse = $this->getJson("/api/v1/projects/{$project->id}/rows?page=1&per_page=100");
        $rowsAfterResponse->assertOk();
        $updatedApiValues = $this->decodeRowValues($rowsAfterResponse->json('data.0.values'));
        $this->assertSame($newValues, $updatedApiValues);
    }

    public function test_import_with_warnings_is_not_blocked(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Import with warnings');

        $response = $this->importCsv($project, <<<'CSV'
Region,Revenue
North,100
South,bad
West,300
CSV
        );

        $response
            ->assertCreated()
            ->assertJsonPath('validation.summary.import_status', 'imported_with_warnings');

        $summary = $response->json('validation.summary', []);
        $this->assertSame(0, (int) ($summary['error_count'] ?? -1));
        $this->assertGreaterThan(0, (int) ($summary['warning_count'] ?? 0));

        $issueCodes = collect($response->json('validation.issues', []))
            ->pluck('code')
            ->all();
        $this->assertContains('column_invalid_numeric_values', $issueCodes);
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
        $user = $this->createUser();
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

    private function decodeRowValues(mixed $rawValues): array
    {
        if (is_array($rawValues)) {
            return array_values($rawValues);
        }

        if (is_string($rawValues)) {
            $decoded = json_decode($rawValues, true);
            if (is_array($decoded)) {
                return array_values($decoded);
            }
        }

        return [];
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

    /**
     * @return array{project: \App\Models\Project, row: \App\Models\DatasetRow, column: \App\Models\DatasetColumn}
     */
    private function seedProjectDatasetFixture(User $owner): array
    {
        $project = $this->createProjectForUser($owner, 'Fixture project');
        $dataset = $project->dataset()->create([
            'file_path' => 'datasets/fixture.csv',
            'delimiter' => ',',
            'has_header' => true,
        ]);

        $column = $dataset->columns()->create([
            'name' => 'Region',
            'type' => 'string',
            'physical_type' => 'string',
            'position' => 0,
        ]);
        $dataset->columns()->create([
            'name' => 'Revenue',
            'type' => 'integer',
            'physical_type' => 'number',
            'position' => 1,
        ]);
        $row = $dataset->rows()->create([
            'row_index' => 0,
            'values' => json_encode(['North', '100']),
        ]);

        return [
            'project' => $project,
            'row' => $row,
            'column' => $column,
        ];
    }
}
