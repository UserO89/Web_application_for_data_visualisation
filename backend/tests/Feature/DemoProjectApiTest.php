<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemoProjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_endpoints_are_public_and_read_only(): void
    {
        Storage::fake('local');

        $owner = $this->createUser();
        $project = $this->createProjectForUser($owner, 'Public demo project');
        $dataset = $project->dataset()->create([
            'file_path' => 'datasets/demo.csv',
            'delimiter' => ',',
            'has_header' => true,
        ]);

        $dataset->columns()->createMany([
            [
                'name' => 'Region',
                'type' => 'string',
                'physical_type' => 'string',
                'position' => 0,
            ],
            [
                'name' => 'Revenue',
                'type' => 'integer',
                'physical_type' => 'number',
                'position' => 1,
            ],
        ]);

        $dataset->rows()->createMany([
            ['row_index' => 0, 'values' => json_encode(['North', '120'])],
            ['row_index' => 1, 'values' => json_encode(['South', '340'])],
        ]);

        config()->set('demo.project_id', $project->id);

        $this->getJson('/api/v1/demo/project')
            ->assertOk()
            ->assertJsonPath('project.id', $project->id)
            ->assertJsonPath('project.dataset.id', $dataset->id);

        $this->getJson('/api/v1/demo/project/rows?page=1&per_page=50')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/demo/project/schema?rebuild=0')
            ->assertOk()
            ->assertJsonStructure(['schema' => ['columns']]);

        $this->getJson('/api/v1/demo/project/statistics')
            ->assertOk()
            ->assertJsonStructure(['statistics']);

        $this->getJson('/api/v1/demo/project/chart-suggestions')
            ->assertOk()
            ->assertJsonStructure(['suggestions']);

        $this->patchJson('/api/v1/demo/project/rows/1', [
            'values' => ['No', 'Write'],
        ])->assertNotFound();
    }

    public function test_demo_endpoints_return_not_found_when_demo_project_is_not_configured(): void
    {
        config()->set('demo.project_id', null);

        $this->getJson('/api/v1/demo/project')->assertNotFound();
        $this->getJson('/api/v1/demo/project/rows')->assertNotFound();
        $this->getJson('/api/v1/demo/project/schema')->assertNotFound();
        $this->getJson('/api/v1/demo/project/statistics')->assertNotFound();
        $this->getJson('/api/v1/demo/project/chart-suggestions')->assertNotFound();
    }

    private function createProjectForUser(User $user, string $title): Project
    {
        return Project::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Demo API test project',
        ]);
    }

    private function createUser(string $role = 'user'): User
    {
        return User::query()->create([
            'name' => 'Test User',
            'email' => 'test-'.uniqid('', true).'@example.test',
            'role' => $role,
            'password' => 'password123',
        ]);
    }
}
