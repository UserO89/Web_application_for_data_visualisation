<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiThrottlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_endpoint_is_throttled(): void
    {
        $email = 'login-throttle-'.uniqid('', true).'@example.test';
        User::query()->create([
            'name' => 'Throttle Login User',
            'email' => $email,
            'role' => 'user',
            'password' => 'password123',
        ]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $response = $this
                ->withServerVariables(['REMOTE_ADDR' => '10.10.10.1'])
                ->postJson('/api/v1/auth/login', [
                    'email' => $email,
                    'password' => 'invalid-password',
                ]);

            $response->assertStatus(422);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.10.10.1'])
            ->postJson('/api/v1/auth/login', [
                'email' => $email,
                'password' => 'invalid-password',
            ])
            ->assertStatus(429);
    }

    public function test_register_endpoint_is_throttled(): void
    {
        $email = 'register-throttle-'.uniqid('', true).'@example.test';
        $payload = [
            'name' => 'Throttle Register User',
            'email' => $email,
            'password' => 'password123',
        ];

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $response = $this
                ->withServerVariables(['REMOTE_ADDR' => '10.10.10.2'])
                ->postJson('/api/v1/auth/register', $payload);

            $this->assertNotSame(429, $response->status());
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.10.10.2'])
            ->postJson('/api/v1/auth/register', $payload)
            ->assertStatus(429);
    }

    public function test_import_endpoint_is_throttled(): void
    {
        Storage::fake('local');

        $user = User::query()->create([
            'name' => 'Throttle Import User',
            'email' => 'import-throttle-'.uniqid('', true).'@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($user);

        $project = Project::query()->create([
            'user_id' => $user->id,
            'title' => 'Throttle import project',
            'description' => 'Throttle import test project',
        ]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $response = $this
                ->withServerVariables(['REMOTE_ADDR' => '10.10.10.3'])
                ->withHeader('Accept', 'application/json')
                ->post("/api/v1/projects/{$project->id}/import", [
                    'file' => UploadedFile::fake()->createWithContent('dataset.csv', "A,B\n1,2\n"),
                    'delimiter' => ',',
                    'has_header' => true,
                ]);

            $this->assertNotSame(429, $response->status());
        }

        $this
            ->withServerVariables(['REMOTE_ADDR' => '10.10.10.3'])
            ->withHeader('Accept', 'application/json')
            ->post("/api/v1/projects/{$project->id}/import", [
                'file' => UploadedFile::fake()->createWithContent('dataset.csv', "A,B\n1,2\n"),
                'delimiter' => ',',
                'has_header' => true,
            ])
            ->assertStatus(429);
    }
}
