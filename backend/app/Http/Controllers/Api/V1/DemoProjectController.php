<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DatasetSemanticSchemaService;
use App\Services\StatisticsService;
use App\Services\VisualizationSuggestionService;
use App\Support\DemoProjectResolver;
use Illuminate\Http\Request;

class DemoProjectController extends Controller
{
    public function __construct(
        private DemoProjectResolver $demoProjectResolver,
        private DatasetSemanticSchemaService $datasetSemanticSchemaService,
        private StatisticsService $statisticsService,
        private VisualizationSuggestionService $suggestionService
    ) {}

    public function show()
    {
        $project = $this->demoProjectResolver->resolve();

        return response()->json(['project' => $project]);
    }

    public function rows(Request $request)
    {
        $dataset = $this->demoProjectResolver->resolveDataset();

        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 100);

        $rows = $dataset->rows()
            ->orderBy('row_index')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json($rows);
    }

    public function schema(Request $request)
    {
        $dataset = $this->demoProjectResolver->resolveDataset();
        $rebuild = $request->boolean('rebuild', false);
        $schema = $this->datasetSemanticSchemaService->getSchema($dataset, $rebuild);

        return response()->json(['schema' => $schema]);
    }

    public function statistics(Request $request)
    {
        $dataset = $this->demoProjectResolver->resolveDataset();
        $statistics = $this->statisticsService->getStatistics(
            $dataset,
            $request->boolean('rebuild', false)
        );

        return response()->json(['statistics' => $statistics]);
    }

    public function suggestions()
    {
        $dataset = $this->demoProjectResolver->resolveDataset();
        $suggestions = $this->suggestionService->suggest($dataset);

        return response()->json(['suggestions' => $suggestions]);
    }
}
