<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $projects = Project::where('user_id', $request->user()->id)
            ->with('dataset')
            ->get();

        return response()->json(['projects' => $projects]);
    }

    public function store(StoreProjectRequest $request)
    {
        $project = Project::create([
            'user_id' => $request->user()->id,
            'title' => $request->validated()['title'],
            'description' => $request->validated()['description'] ?? null,
        ]);

        return response()->json(['project' => $project->load('dataset')], 201);
    }

    public function show(Request $request, Project $project)
    {
        if ($project->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['project' => $project->load('dataset.columns')]);
    }

    public function update(StoreProjectRequest $request, Project $project)
    {
        if ($project->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $project->update($request->validated());

        return response()->json(['project' => $project->fresh()->load('dataset')]);
    }

    public function destroy(Request $request, Project $project)
    {
        if ($project->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $project->delete();

        return response()->json(['ok' => true]);
    }
}
