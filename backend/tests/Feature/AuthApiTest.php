<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_returns_user_and_persists_hashed_password(): void
    {
        $response = $this
            ->withSession([])
            ->postJson('/api/v1/auth/register', [
                'name' => 'Registered User',
                'email' => 'registered@example.test',
                'password' => 'password123',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.name', 'Registered User')
            ->assertJsonPath('user.email', 'registered@example.test');

        $user = User::query()->where('email', 'registered@example.test')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('password123', $user->password));
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_flow_returns_validation_error_then_authenticates_and_logout_clears_session(): void
    {
        $user = $this->createUser([
            'email' => 'login@example.test',
            'password' => 'password123',
        ]);

        $this
            ->withSession([])
            ->withServerVariables(['REMOTE_ADDR' => '10.20.30.40'])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid credentials');

        $this
            ->withSession([])
            ->withServerVariables(['REMOTE_ADDR' => '10.20.30.40'])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'password123',
            ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->assertAuthenticatedAs($user);

        $this
            ->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('ok', true);
    }

    public function test_authenticated_user_can_fetch_profile_update_name_and_change_password(): void
    {
        $user = $this->createUser();

        $this->actingAs($user);

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.name', $user->name);

        $this->patchJson('/api/v1/auth/profile', [
            'name' => 'Updated Name',
        ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Name');

        $this->patchJson('/api/v1/auth/password', [
            'current_password' => 'password123',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertTrue(Hash::check('new-password123', $user->fresh()->password));
    }

    public function test_password_and_account_endpoints_reject_incorrect_current_password(): void
    {
        $user = $this->createUser();

        $this->actingAs($user);

        $this->patchJson('/api/v1/auth/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        $this->deleteJson('/api/v1/auth/account', [
            'current_password' => 'wrong-password',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_destroy_account_deletes_avatar_file_and_logged_in_user(): void
    {
        Storage::fake('local');

        $user = $this->createUser();
        $avatarPath = 'avatars/destroy-account-avatar.png';
        Storage::disk('local')->put($avatarPath, 'avatar-content');
        $user->update(['avatar_path' => $avatarPath]);

        $this
            ->withSession([])
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'password123',
            ])
            ->assertOk();

        $this->deleteJson('/api/v1/auth/account', [
            'current_password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertFalse(Storage::disk('local')->exists($avatarPath));
    }

    public function test_upload_avatar_replaces_previous_file_and_returns_fresh_user(): void
    {
        Storage::fake('local');

        $user = $this->createUser();
        $oldPath = 'avatars/old-avatar.png';
        Storage::disk('local')->put($oldPath, 'old-avatar-content');
        $user->update(['avatar_path' => $oldPath]);

        $this->actingAs($user);

        $response = $this->postJson('/api/v1/auth/avatar', [
            'avatar' => UploadedFile::fake()->createWithContent(
                'avatar.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XgncAAAAASUVORK5CYII=')
            ),
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.avatar_url', url("/api/v1/users/{$user->id}/avatar"));

        $updatedUser = $user->fresh();
        $this->assertNotSame($oldPath, $updatedUser->avatar_path);
        $this->assertNotNull($updatedUser->avatar_path);
        $this->assertFalse(Storage::disk('local')->exists($oldPath));
        $this->assertTrue(Storage::disk('local')->exists($updatedUser->avatar_path));
    }

    private function createUser(array $overrides = []): User
    {
        return User::query()->create(array_merge([
            'name' => 'Test User',
            'email' => 'test-' . uniqid('', true) . '@example.test',
            'role' => 'user',
            'password' => 'password123',
        ], $overrides));
    }
}
