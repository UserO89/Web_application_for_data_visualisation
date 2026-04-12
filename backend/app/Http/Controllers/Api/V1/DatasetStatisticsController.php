<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\StatisticsService;
use Illuminate\Http\Request;

class DatasetStatisticsController extends Controller
{
    public function __construct(
        private StatisticsService $statisticsService
    ) {}

    public function show(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        $dataset = $project->dataset;
        if (! $dataset) {
            return response()->json(['message' => __('api.datasets.no_dataset')], 404);
        }

        $statistics = $this->statisticsService->getStatistics(
            $dataset,
            $request->boolean('rebuild', false)
        );

        return response()->json(['statistics' => $statistics]);
    }
}
