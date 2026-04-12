<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Dataset;
use App\Models\DatasetRow;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function stats()
    {
        $now = now();
        $activeSessions = 0;

        if (Schema::hasTable('sessions')) {
            $activeSessions = DB::table('sessions')
                ->where('last_activity', '>=', $now->copy()->subDay()->timestamp)
                ->count();
        }

        return response()->json([
            'stats' => [
                'users_total' => User::count(),
                'projects_total' => Project::count(),
                'datasets_total' => Dataset::count(),
                'dataset_rows_total' => DatasetRow::count(),
                'new_users_7d' => User::where('created_at', '>=', $now->copy()->subDays(7))->count(),
                'new_projects_7d' => Project::where('created_at', '>=', $now->copy()->subDays(7))->count(),
                'active_sessions_24h' => $activeSessions,
            ],
        ]);
    }

    public function users(Request $request)
    {
        $search = trim((string) $request->query('q', ''));

        $query = User::query()
            ->select(['id', 'name', 'email', 'role', 'avatar_path', 'created_at', 'updated_at'])
            ->withCount('projects')
            ->with([
                'projects' => function ($projects) {
                    $projects
                        ->select(['id', 'user_id', 'title', 'description', 'created_at', 'updated_at'])
                        ->orderByDesc('updated_at');
                },
            ])
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($where) use ($search) {
                $where->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json(['users' => $query->get()]);
    }

    public function updateUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::in(['user', 'admin'])],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        if ($request->user()->id === $user->id && $validated['role'] !== $request->user()->role) {
            return response()->json(['message' => __('api.admin.cannot_change_own_role')], 422);
        }

        $payload = Arr::except($validated, ['password']);

        if (! empty($validated['password'])) {
            $payload['password'] = $validated['password'];
        }

        $user->update($payload);
        $updatedUser = $user->fresh();
        $updatedUser->load([
            'projects' => function ($projects) {
                $projects
                    ->select(['id', 'user_id', 'title', 'description', 'created_at', 'updated_at'])
                    ->orderByDesc('updated_at');
            },
        ])->loadCount('projects');

        return response()->json([
            'user' => $updatedUser,
        ]);
    }

    public function destroyUser(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => __('api.admin.cannot_delete_own_account')], 422);
        }

        $avatarPath = $user->avatar_path;
        $user->delete();

        if ($avatarPath && Storage::disk('local')->exists($avatarPath)) {
            Storage::disk('local')->delete($avatarPath);
        }

        return response()->json(['ok' => true]);
    }

    public function updateUserProject(Request $request, User $user, Project $project)
    {
        $belongsToUserError = $this->projectBelongsToUserResponse($project, $user);
        if ($belongsToUserError instanceof JsonResponse) {
            return $belongsToUserError;
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $project->update($validated);

        return response()->json(['project' => $project->fresh()]);
    }

    public function storeUserProject(Request $request, User $user)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $project = Project::create([
            'user_id' => $user->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json(['project' => $project], 201);
    }

    public function destroyUserProject(User $user, Project $project)
    {
        $belongsToUserError = $this->projectBelongsToUserResponse($project, $user);
        if ($belongsToUserError instanceof JsonResponse) {
            return $belongsToUserError;
        }

        $project->delete();

        return response()->json(['ok' => true]);
    }

    private function projectBelongsToUserResponse(Project $project, User $user): ?JsonResponse
    {
        if ((int) $project->user_id === (int) $user->id) {
            return null;
        }

        return response()->json(['message' => __('api.admin.project_user_mismatch')], 422);
    }
}
