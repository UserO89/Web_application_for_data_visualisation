<?php

namespace App\Support;

use App\Models\Dataset;
use App\Models\Project;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DemoProjectResolver
{
    public function resolve(): Project
    {
        $projectId = (int) config('demo.project_id', 0);
        if ($projectId <= 0) {
            throw new NotFoundHttpException('Demo project is not configured.');
        }

        $project = Project::query()
            ->with('dataset.columns')
            ->find($projectId);

        if (! $project || ! $project->dataset) {
            throw new NotFoundHttpException('Demo project is unavailable.');
        }

        return $project;
    }

    public function resolveDataset(): Dataset
    {
        $dataset = $this->resolve()->dataset;
        if (! $dataset) {
            throw new NotFoundHttpException('Demo dataset is unavailable.');
        }

        return $dataset;
    }
}
