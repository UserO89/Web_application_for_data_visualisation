<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Chart;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectChartController extends Controller
{
    public function index(Project $project)
    {
        $this->authorize('view', $project);

        $charts = $project->charts()
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['charts' => $charts]);
    }

    public function store(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'type' => ['required', 'string', 'max:64'],
            'title' => ['nullable', 'string', 'max:255'],
            'config' => ['required', 'array'],
        ]);

        $title = trim((string) ($validated['title'] ?? ''));
        if ($title === '') {
            $title = ucfirst((string) $validated['type']) . ' chart';
        }

        $chart = $project->charts()->create([
            'type' => $validated['type'],
            'title' => $title,
            'config' => $validated['config'],
        ]);

        return response()->json(['chart' => $chart], 201);
    }

    public function destroy(Project $project, Chart $chart)
    {
        $this->authorize('update', $project);

        if ((int) $chart->project_id !== (int) $project->id) {
            return response()->json(['message' => 'Chart not found for this project'], 404);
        }

        $chart->delete();

        return response()->json(['ok' => true]);
    }

    public function update(Request $request, Project $project, Chart $chart)
    {
        $this->authorize('update', $project);

        if ((int) $chart->project_id !== (int) $project->id) {
            return response()->json(['message' => 'Chart not found for this project'], 404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $title = trim((string) $validated['title']);
        if ($title === '') {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'title' => ['Chart title is required.'],
                ],
            ], 422);
        }

        $chart->update([
            'title' => $title,
        ]);

        return response()->json(['chart' => $chart->fresh()]);
    }
}
