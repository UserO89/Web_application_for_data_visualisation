<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateDatasetRowRequest;
use App\Models\Project;
use App\Models\DatasetRow;
use Illuminate\Http\Request;

class DatasetRowController extends Controller
{
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

        $row->update([
            'values' => json_encode($request->validated()['values']),
        ]);

        return response()->json(['row' => $row]);
    }
}
