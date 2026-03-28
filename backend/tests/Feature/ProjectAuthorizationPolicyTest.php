<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectAuthorizationPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_view_update_and_delete_own_project(): void
    {
        $owner = $this->createUser();
        $project = $this->createProjectForUser($owner, 'Owner project');
        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('project.id', $project->id);

        $this->patchJson("/api/v1/projects/{$project->id}", [
            'title' => 'Updated project title',
            'description' => 'Updated by owner',
        ])
            ->assertOk()
            ->assertJsonPath('project.title', 'Updated project title')
            ->assertJsonPath('project.description', 'Updated by owner');

        $this->deleteJson("/api/v1/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }

    public function test_non_owner_cannot_access_foreign_project_or_project_scoped_endpoints(): void
    {
        $owner = $this->createUser();
        $project = $this->createProjectForUser($owner, 'Foreign project');
        $chart = $project->charts()->create([
            'type' => 'line',
            'title' => 'Owner chart',
            'config' => ['rendered' => ['type' => 'line', 'labels' => [], 'datasets' => [], 'meta' => []]],
        ]);

        Sanctum::actingAs($this->createUser());

        $this->getJson("/api/v1/projects/{$project->id}")->assertForbidden();
        $this->patchJson("/api/v1/projects/{$project->id}", [
            'title' => 'Hijacked title',
            'description' => 'Should be blocked',
        ])->assertForbidden();
        $this->deleteJson("/api/v1/projects/{$project->id}")->assertForbidden();

        $this->withHeader('Accept', 'application/json')
            ->post("/api/v1/projects/{$project->id}/import", [
                'file' => UploadedFile::fake()->createWithContent('dataset.csv', "A,B\n1,2\n"),
                'delimiter' => ',',
                'has_header' => true,
            ])
            ->assertForbidden();

        $this->getJson("/api/v1/projects/{$project->id}/statistics")->assertForbidden();
        $this->getJson("/api/v1/projects/{$project->id}/charts")->assertForbidden();

        $this->postJson("/api/v1/projects/{$project->id}/charts", [
            'type' => 'line',
            'title' => 'Foreign chart create',
            'config' => ['rendered' => ['type' => 'line', 'labels' => [], 'datasets' => [], 'meta' => []]],
        ])->assertForbidden();

        $this->patchJson("/api/v1/projects/{$project->id}/charts/{$chart->id}", [
            'title' => 'Foreign chart update',
        ])->assertForbidden();

        $this->deleteJson("/api/v1/projects/{$project->id}/charts/{$chart->id}")
            ->assertForbidden();
    }

    public function test_admin_middleware_behavior_still_works(): void
    {
        Sanctum::actingAs($this->createUser('user'));
        $this->getJson('/api/v1/admin/stats')->assertForbidden();

        Sanctum::actingAs($this->createUser('admin'));
        $this->getJson('/api/v1/admin/stats')
            ->assertOk()
            ->assertJsonStructure([
                'stats' => [
                    'users_total',
                    'projects_total',
                    'datasets_total',
                    'dataset_rows_total',
                    'new_users_7d',
                    'new_projects_7d',
                    'active_sessions_24h',
                ],
            ]);
    }

    public function test_admin_user_cannot_access_non_owned_project_api_endpoints(): void
    {
        $owner = $this->createUser();
        $project = $this->createProjectForUser($owner, 'Owner only project');
        Sanctum::actingAs($this->createUser('admin'));

        $this->getJson("/api/v1/projects/{$project->id}")->assertForbidden();
        $this->getJson("/api/v1/projects/{$project->id}/charts")->assertForbidden();
        $this->getJson("/api/v1/projects/{$project->id}/statistics")->assertForbidden();
    }

    private function createProjectForUser(User $user, string $title): Project
    {
        return Project::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Authorization test project',
        ]);
    }

    private function createUser(string $role = 'user'): User
    {
        return User::query()->create([
            'name' => 'Test User',
            'email' => 'test-' . uniqid('', true) . '@example.test',
            'role' => $role,
            'password' => 'password123',
        ]);
    }
}
