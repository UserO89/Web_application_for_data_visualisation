<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\StatisticsService;

class DatasetStatisticsController extends Controller
{
    public function __construct(
        private StatisticsService $statisticsService
    ) {}

    public function show(Project $project)
    {
        $this->authorize('view', $project);

        $dataset = $project->dataset;
        if (!$dataset) {
            return response()->json(['message' => 'No dataset found'], 404);
        }

        $statistics = $this->statisticsService->calculate($dataset);

        return response()->json(['statistics' => $statistics]);
    }
}
