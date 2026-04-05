<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateDatasetColumnOrdinalOrderRequest;
use App\Http\Requests\UpdateDatasetColumnSemanticTypeRequest;
use App\Models\DatasetColumn;
use App\Models\Project;
use App\Services\DatasetSemanticSchemaService;
use App\Services\StatisticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DatasetSchemaController extends Controller
{
    public function __construct(
        private DatasetSemanticSchemaService $datasetSemanticSchemaService,
        private StatisticsService $statisticsService
    ) {}

    public function show(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        $dataset = $project->dataset;
        if (!$dataset) {
            return response()->json(['message' => 'No dataset found'], 404);
        }

        $rebuild = $request->boolean('rebuild', false);
        $schema = $this->datasetSemanticSchemaService->getSchema($dataset, $rebuild);

        return response()->json(['schema' => $schema]);
    }

    public function updateSemanticType(
        UpdateDatasetColumnSemanticTypeRequest $request,
        Project $project,
        DatasetColumn $column
    ) {
        $this->authorize('update', $project);

        $dataset = $project->dataset;
        if (!$dataset || (int) $column->dataset_id !== (int) $dataset->id) {
            return response()->json(['message' => 'Column does not belong to this project'], 403);
        }

        $payload = $request->validated();
        $updated = DB::transaction(function () use ($column, $payload, $dataset) {
            $updatedColumn = $this->datasetSemanticSchemaService->overrideSemanticType(
                $column,
                $payload['semantic_type'],
                $payload['analytical_role'] ?? null,
                $payload['is_excluded_from_analysis'] ?? null
            );

            $this->statisticsService->buildAndPersist($dataset->fresh());

            return $updatedColumn;
        });

        return response()->json([
            'column' => $this->datasetSemanticSchemaService->formatColumn($updated),
        ]);
    }

    public function updateOrdinalOrder(
        UpdateDatasetColumnOrdinalOrderRequest $request,
        Project $project,
        DatasetColumn $column
    ) {
        $this->authorize('update', $project);

        $dataset = $project->dataset;
        if (!$dataset || (int) $column->dataset_id !== (int) $dataset->id) {
            return response()->json(['message' => 'Column does not belong to this project'], 403);
        }

        $updated = DB::transaction(function () use ($column, $request, $dataset) {
            $updatedColumn = $this->datasetSemanticSchemaService->overrideOrdinalOrder(
                $column,
                $request->validated()['ordinal_order']
            );

            $this->statisticsService->buildAndPersist($dataset->fresh());

            return $updatedColumn;
        });

        return response()->json([
            'column' => $this->datasetSemanticSchemaService->formatColumn($updated),
        ]);
    }
}
