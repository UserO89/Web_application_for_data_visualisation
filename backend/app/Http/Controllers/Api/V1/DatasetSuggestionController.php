<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\VisualizationSuggestionService;

class DatasetSuggestionController extends Controller
{
    public function __construct(
        private VisualizationSuggestionService $suggestionService
    ) {}

    public function index(Project $project)
    {
        $this->authorize('view', $project);

        $dataset = $project->dataset;
        if (!$dataset) {
            return response()->json(['message' => 'No dataset found'], 404);
        }

        $suggestions = $this->suggestionService->suggest($dataset);

        return response()->json(['suggestions' => $suggestions]);
    }
}
