<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateDatasetRowRequest;
use App\Models\Project;
use App\Models\DatasetRow;
use Illuminate\Http\Request;
use App\Services\StatisticsService;
use Illuminate\Support\Facades\DB;

class DatasetRowController extends Controller
{
    public function __construct(
        private StatisticsService $statisticsService
    ) {}

    public function index(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        $dataset = $project->dataset;
        if (!$dataset) {
            return response()->json(['message' => 'No dataset found'], 404);
        }

        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 100);

        $rows = $dataset->rows()
            ->orderBy('row_index')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json($rows);
    }

    public function update(UpdateDatasetRowRequest $request, Project $project, DatasetRow $row)
    {
        $this->authorize('update', $project);

        $dataset = $project->dataset;
        if (!$dataset || $row->dataset_id !== $dataset->id) {
            return response()->json(['message' => 'Row does not belong to this project'], 403);
        }

        DB::transaction(function () use ($request, $row, $dataset) {
            $row->update([
                'values' => json_encode($request->validated()['values']),
            ]);

            $this->statisticsService->buildAndPersist($dataset->fresh());
        });

        return response()->json(['row' => $row->fresh()]);
    }
}
