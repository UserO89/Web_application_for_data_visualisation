<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Services\CsvImportService;
use App\Services\StatisticsService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PDOException;
use RuntimeException;
use Tests\TestCase;

class DatasetImportControllerErrorPathsTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_returns_unreadable_report_when_csv_parser_throws_runtime_exception(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Parser error import');

        $this->app->instance(CsvImportService::class, new class extends CsvImportService
        {
            public function parse(UploadedFile $file, string $delimiter = ',', bool $hasHeader = true): array
            {
                throw new RuntimeException('Parser exploded');
            }
        });

        $this->importCsv($project->id, "Region,Revenue\nNorth,100\n")
            ->assertStatus(422)
            ->assertJsonPath('message', app('translator')->get('api.import.file_unreadable'))
            ->assertJsonPath('validation.blocking_error.code', 'file_unreadable');

        $this->assertDatabaseMissing('datasets', ['project_id' => $project->id]);
        $this->assertSame([], Storage::disk('local')->allFiles('datasets'));
    }

    public function test_import_returns_conflict_and_deletes_stored_file_for_unique_violation_query_exception(): void
    {
        Storage::fake('local');

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Unique violation import');

        $this->app->instance(StatisticsService::class, new class extends StatisticsService
        {
            public function __construct() {}

            public function buildAndPersist(\App\Models\Dataset $dataset): array
            {
                $previous = new PDOException('UNIQUE constraint failed: datasets.project_id');
                $previous->errorInfo = ['23000', '19', 'UNIQUE constraint failed: datasets.project_id'];

                throw new QueryException(
                    'sqlite',
                    'insert into "datasets" ("project_id") values (?)',
                    [$dataset->project_id],
                    $previous
                );
            }
        });

        $this->importCsv($project->id, "Region,Revenue\nNorth,100\n")
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                app('translator')->get('api.import.dataset_exists')
            );

        $this->assertDatabaseMissing('datasets', ['project_id' => $project->id]);
        $this->assertSame([], Storage::disk('local')->allFiles('datasets'));
    }

    public function test_import_rethrows_generic_post_store_exception_after_deleting_uploaded_file(): void
    {
        Storage::fake('local');
        $this->withoutExceptionHandling();

        $user = $this->authenticateUser();
        $project = $this->createProjectForUser($user, 'Generic failure import');

        $this->app->instance(StatisticsService::class, new class extends StatisticsService
        {
            public function __construct() {}

            public function buildAndPersist(\App\Models\Dataset $dataset): array
            {
                throw new RuntimeException('Statistics failed');
            }
        });

        try {
            $this->importCsv($project->id, "Region,Revenue\nNorth,100\n");
            $this->fail('Expected import to rethrow the generic statistics exception.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Statistics failed', $exception->getMessage());
        }

        $this->assertDatabaseMissing('datasets', ['project_id' => $project->id]);
        $this->assertSame([], Storage::disk('local')->allFiles('datasets'));
    }

    private function authenticateUser(): User
    {
        $user = User::query()->create([
            'name' => 'Import User',
            'email' => 'import-'.uniqid('', true).'@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);

        Sanctum::actingAs($user);

        return $user;
    }

    private function createProjectForUser(User $user, string $title): Project
    {
        return Project::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Dataset import controller error path test',
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
}
