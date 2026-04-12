<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeletionCleanupTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_removes_avatar_and_owned_dataset_files(): void
    {
        Storage::fake('local');

        $user = $this->createUser('user');
        $avatarPath = 'avatars/account-delete-avatar.png';
        $datasetPath = 'datasets/account-delete-dataset.csv';

        Storage::disk('local')->put($avatarPath, 'avatar-file-content');
        Storage::disk('local')->put($datasetPath, "A,B\n1,2\n");

        $user->update(['avatar_path' => $avatarPath]);
        $project = $this->createProjectForUser($user, 'Account delete cleanup');
        $project->dataset()->create([
            'file_path' => $datasetPath,
            'delimiter' => ',',
            'has_header' => true,
        ]);

        Sanctum::actingAs($user);

        $this->deleteJson('/api/v1/auth/account', [
            'current_password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('datasets', ['project_id' => $project->id]);
        $this->assertFalse(Storage::disk('local')->exists($avatarPath));
        $this->assertFalse(Storage::disk('local')->exists($datasetPath));
    }

    public function test_admin_delete_user_removes_avatar_and_owned_dataset_files(): void
    {
        Storage::fake('local');

        $admin = $this->createUser('admin');
        $targetUser = $this->createUser('user');
        $avatarPath = 'avatars/admin-delete-target-avatar.png';
        $datasetPath = 'datasets/admin-delete-target-dataset.csv';

        Storage::disk('local')->put($avatarPath, 'avatar-file-content');
        Storage::disk('local')->put($datasetPath, "A,B\n1,2\n");

        $targetUser->update(['avatar_path' => $avatarPath]);
        $project = $this->createProjectForUser($targetUser, 'Admin delete user cleanup');
        $project->dataset()->create([
            'file_path' => $datasetPath,
            'delimiter' => ',',
            'has_header' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/admin/users/{$targetUser->id}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('users', ['id' => $targetUser->id]);
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('datasets', ['project_id' => $project->id]);
        $this->assertFalse(Storage::disk('local')->exists($avatarPath));
        $this->assertFalse(Storage::disk('local')->exists($datasetPath));
    }

    private function createProjectForUser(User $user, string $title): Project
    {
        return Project::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Delete cleanup test project',
        ]);
    }

    private function createUser(string $role): User
    {
        return User::query()->create([
            'name' => ucfirst($role).' User',
            'email' => $role.'-'.uniqid('', true).'@example.test',
            'role' => $role,
            'password' => 'password123',
        ]);
    }
}
