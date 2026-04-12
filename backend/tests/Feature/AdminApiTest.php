<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_stats_include_active_sessions_and_users_endpoint_supports_search(): void
    {
        if (! Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        $admin = $this->createUser('admin', ['email' => 'admin@example.test']);
        $matchedUser = $this->createUser('user', ['name' => 'Matched User', 'email' => 'matched@example.test']);
        $otherUser = $this->createUser('user', ['name' => 'Other User', 'email' => 'other@example.test']);

        $this->createProjectForUser($matchedUser, 'Matched project');
        $this->createProjectForUser($otherUser, 'Other project');

        DB::table('sessions')->insert([
            [
                'id' => 'recent-session',
                'user_id' => $matchedUser->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'PHPUnit',
                'payload' => 'payload',
                'last_activity' => now()->subHours(6)->timestamp,
            ],
            [
                'id' => 'expired-session',
                'user_id' => $otherUser->id,
                'ip_address' => '127.0.0.2',
                'user_agent' => 'PHPUnit',
                'payload' => 'payload',
                'last_activity' => now()->subDays(2)->timestamp,
            ],
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/stats')
            ->assertOk()
            ->assertJsonPath('stats.users_total', 3)
            ->assertJsonPath('stats.projects_total', 2)
            ->assertJsonPath('stats.active_sessions_24h', 1);

        $this->getJson('/api/v1/admin/users?q=matched@example')
            ->assertOk()
            ->assertJsonCount(1, 'users')
            ->assertJsonPath('users.0.email', 'matched@example.test')
            ->assertJsonPath('users.0.projects_count', 1)
            ->assertJsonPath('users.0.projects.0.title', 'Matched project');
    }

    public function test_admin_can_update_user_and_optionally_replace_password(): void
    {
        $admin = $this->createUser('admin');
        $targetUser = $this->createUser('user', ['email' => 'target@example.test']);
        $this->createProjectForUser($targetUser, 'Owned project');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/users/{$targetUser->id}", [
            'name' => 'Updated Target',
            'email' => 'updated-target@example.test',
            'role' => 'admin',
            'password' => 'updated-password123',
        ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Target')
            ->assertJsonPath('user.email', 'updated-target@example.test')
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.projects_count', 1)
            ->assertJsonPath('user.projects.0.title', 'Owned project');

        $updatedUser = $targetUser->fresh();
        $this->assertTrue(Hash::check('updated-password123', $updatedUser->password));
    }

    public function test_admin_cannot_change_own_role_or_delete_own_account_from_admin_panel(): void
    {
        $admin = $this->createUser('admin');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/users/{$admin->id}", [
            'name' => 'Admin',
            'email' => $admin->email,
            'role' => 'user',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', app('translator')->get('api.admin.cannot_change_own_role'));

        $this->deleteJson("/api/v1/admin/users/{$admin->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', app('translator')->get('api.admin.cannot_delete_own_account'));
    }

    public function test_admin_can_create_update_and_delete_user_projects_and_reject_mismatched_project_routes(): void
    {
        $admin = $this->createUser('admin');
        $targetUser = $this->createUser();
        $otherUser = $this->createUser();
        $foreignProject = $this->createProjectForUser($otherUser, 'Foreign project');

        Sanctum::actingAs($admin);

        $createResponse = $this->postJson("/api/v1/admin/users/{$targetUser->id}/projects", [
            'title' => 'Admin created project',
            'description' => 'Created by admin',
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('project.user_id', $targetUser->id)
            ->assertJsonPath('project.title', 'Admin created project');

        $projectId = (int) $createResponse->json('project.id');
        $this->assertGreaterThan(0, $projectId);

        $this->patchJson("/api/v1/admin/users/{$targetUser->id}/projects/{$projectId}", [
            'title' => 'Updated admin project',
            'description' => 'Updated by admin',
        ])
            ->assertOk()
            ->assertJsonPath('project.id', $projectId)
            ->assertJsonPath('project.title', 'Updated admin project');

        $this->patchJson("/api/v1/admin/users/{$targetUser->id}/projects/{$foreignProject->id}", [
            'title' => 'Should fail',
            'description' => 'Mismatch',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', app('translator')->get('api.admin.project_user_mismatch'));

        $this->deleteJson("/api/v1/admin/users/{$targetUser->id}/projects/{$foreignProject->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', app('translator')->get('api.admin.project_user_mismatch'));

        $this->deleteJson("/api/v1/admin/users/{$targetUser->id}/projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('projects', ['id' => $projectId]);
    }

    public function test_admin_routes_use_request_locale_for_forbidden_message(): void
    {
        Sanctum::actingAs($this->createUser('user'));

        $this->withHeader('X-Locale', 'sk')
            ->getJson('/api/v1/admin/stats')
            ->assertStatus(403)
            ->assertJsonPath('message', app('translator')->get('api.common.forbidden', [], 'sk'));
    }

    private function createProjectForUser(User $user, string $title): Project
    {
        return Project::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Admin API test project',
        ]);
    }

    private function createUser(string $role = 'user', array $overrides = []): User
    {
        return User::query()->create(array_merge([
            'name' => ucfirst($role).' User',
            'email' => $role.'-'.uniqid('', true).'@example.test',
            'role' => $role,
            'password' => 'password123',
        ], $overrides));
    }
}
