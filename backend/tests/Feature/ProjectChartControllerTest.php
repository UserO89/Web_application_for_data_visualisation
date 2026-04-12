<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectChartControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_project_charts_in_reverse_creation_order(): void
    {
        $user = $this->createUser();
        $project = $this->createProjectForUser($user, 'Charts project');

        $olderChart = $project->charts()->create([
            'type' => 'line',
            'title' => 'Older chart',
            'config' => ['rendered' => ['type' => 'line']],
        ]);
        $olderChart->forceFill(['created_at' => now()->subMinute()])->save();

        $newerChart = $project->charts()->create([
            'type' => 'bar',
            'title' => 'Newer chart',
            'config' => ['rendered' => ['type' => 'bar']],
        ]);
        $newerChart->forceFill(['created_at' => now()])->save();

        Sanctum::actingAs($user);

        $this->getJson("/api/v1/projects/{$project->id}/charts")
            ->assertOk()
            ->assertJsonPath('charts.0.id', $newerChart->id)
            ->assertJsonPath('charts.1.id', $olderChart->id);
    }

    public function test_store_uses_default_title_when_request_title_is_blank(): void
    {
        $user = $this->createUser();
        $project = $this->createProjectForUser($user, 'Charts project');

        Sanctum::actingAs($user);

        $this->postJson("/api/v1/projects/{$project->id}/charts", [
            'type' => 'scatter',
            'title' => '   ',
            'config' => [
                'rendered' => [
                    'type' => 'scatter',
                    'datasets' => [],
                ],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('chart.type', 'scatter')
            ->assertJsonPath('chart.title', 'Scatter chart');
    }

    public function test_update_returns_validation_error_for_blank_title_and_not_found_for_foreign_chart(): void
    {
        $user = $this->createUser();
        $project = $this->createProjectForUser($user, 'Charts project');
        $chart = $project->charts()->create([
            'type' => 'line',
            'title' => 'Original title',
            'config' => ['rendered' => ['type' => 'line']],
        ]);

        $otherProject = $this->createProjectForUser($user, 'Other project');
        $foreignChart = $otherProject->charts()->create([
            'type' => 'pie',
            'title' => 'Foreign chart',
            'config' => ['rendered' => ['type' => 'pie']],
        ]);

        Sanctum::actingAs($user);
        $this->patchJson("/api/v1/projects/{$project->id}/charts/{$chart->id}", [
            'title' => '   ',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'The title field is required.')
            ->assertJsonValidationErrors(['title']);

        $this->patchJson("/api/v1/projects/{$project->id}/charts/{$foreignChart->id}", [
            'title' => 'Should fail',
        ])
            ->assertStatus(404)
            ->assertJsonPath('message', 'Chart not found for this project');
    }

    public function test_destroy_returns_not_found_for_chart_that_belongs_to_another_project(): void
    {
        $user = $this->createUser();
        $project = $this->createProjectForUser($user, 'Charts project');
        $otherProject = $this->createProjectForUser($user, 'Other project');
        $foreignChart = $otherProject->charts()->create([
            'type' => 'boxplot',
            'title' => 'Foreign chart',
            'config' => ['rendered' => ['type' => 'boxplot']],
        ]);

        Sanctum::actingAs($user);

        $this->deleteJson("/api/v1/projects/{$project->id}/charts/{$foreignChart->id}")
            ->assertStatus(404)
            ->assertJsonPath('message', 'Chart not found for this project');
    }

    private function createProjectForUser(User $user, string $title): Project
    {
        return Project::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Project chart controller test',
        ]);
    }

    private function createUser(): User
    {
        return User::query()->create([
            'name' => 'Chart User',
            'email' => 'chart-'.uniqid('', true).'@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);
    }
}
