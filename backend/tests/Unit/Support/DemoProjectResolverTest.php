<?php

namespace Tests\Unit\Support;

use App\Models\Project;
use App\Models\User;
use App\Support\DemoProjectResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class DemoProjectResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolve_throws_when_demo_project_is_not_configured(): void
    {
        config()->set('demo.project_id', 0);

        $this->expectException(NotFoundHttpException::class);
        $this->expectExceptionMessage('Demo project is not configured.');

        (new DemoProjectResolver())->resolve();
    }

    public function test_resolve_throws_when_demo_project_is_missing_or_has_no_dataset(): void
    {
        config()->set('demo.project_id', 999999);

        try {
            (new DemoProjectResolver())->resolve();
            $this->fail('Expected missing project exception was not thrown.');
        } catch (NotFoundHttpException $exception) {
            $this->assertSame('Demo project is unavailable.', $exception->getMessage());
        }

        $project = $this->createProject();
        config()->set('demo.project_id', $project->id);

        $this->expectException(NotFoundHttpException::class);
        $this->expectExceptionMessage('Demo project is unavailable.');

        (new DemoProjectResolver())->resolve();
    }

    public function test_resolve_returns_configured_project_with_dataset_and_columns_loaded(): void
    {
        $project = $this->createProject();
        $dataset = $project->dataset()->create([
            'file_path' => 'datasets/demo.csv',
            'delimiter' => ',',
            'has_header' => true,
        ]);
        $dataset->columns()->create([
            'name' => 'Revenue',
            'type' => 'float',
            'physical_type' => 'number',
            'position' => 0,
        ]);
        config()->set('demo.project_id', $project->id);

        $resolved = (new DemoProjectResolver())->resolve();

        $this->assertSame($project->id, $resolved->id);
        $this->assertNotNull($resolved->dataset);
        $this->assertTrue($resolved->relationLoaded('dataset'));
        $this->assertTrue($resolved->dataset->relationLoaded('columns'));
        $this->assertSame('Revenue', $resolved->dataset->columns->first()?->name);
    }

    public function test_resolve_dataset_returns_dataset_and_handles_missing_dataset_branch(): void
    {
        $project = $this->createProject();
        $dataset = $project->dataset()->create([
            'file_path' => 'datasets/demo.csv',
            'delimiter' => ',',
            'has_header' => true,
        ]);
        config()->set('demo.project_id', $project->id);

        $resolvedDataset = (new DemoProjectResolver())->resolveDataset();
        $this->assertSame($dataset->id, $resolvedDataset->id);

        $resolver = new class extends DemoProjectResolver
        {
            public function resolve(): Project
            {
                return new Project();
            }
        };

        try {
            $resolver->resolveDataset();
            $this->fail('Expected missing dataset exception was not thrown.');
        } catch (NotFoundHttpException $exception) {
            $this->assertSame('Demo dataset is unavailable.', $exception->getMessage());
        }
    }

    private function createProject(): Project
    {
        $user = User::query()->create([
            'name' => 'Demo Owner',
            'email' => 'demo-' . uniqid('', true) . '@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);

        return Project::query()->create([
            'user_id' => $user->id,
            'title' => 'Demo Project',
            'description' => 'Resolver test project',
        ]);
    }
}
