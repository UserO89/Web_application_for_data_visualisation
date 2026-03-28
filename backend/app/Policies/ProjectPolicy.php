<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Project $project): bool
    {
        return $this->ownsProject($user, $project);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Project $project): bool
    {
        return $this->ownsProject($user, $project);
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->ownsProject($user, $project);
    }

    private function ownsProject(User $user, Project $project): bool
    {
        return (int) $project->user_id === (int) $user->id;
    }
}
