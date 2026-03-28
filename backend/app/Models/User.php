<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'role',
        'password',
        'avatar_path',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'avatar_path',
    ];

    protected $appends = [
        'avatar_url',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (User $user): void {
            $datasetFilePaths = $user->projects()
                ->join('datasets', 'datasets.project_id', '=', 'projects.id')
                ->whereNotNull('datasets.file_path')
                ->distinct()
                ->pluck('datasets.file_path')
                ->filter(fn ($path) => is_string($path) && $path !== '')
                ->values()
                ->all();

            if ($datasetFilePaths === []) {
                return;
            }

            Storage::disk('local')->delete($datasetFilePaths);
        });
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(function () {
            if (!$this->avatar_path) {
                return null;
            }

            return url("/api/v1/users/{$this->id}/avatar");
        });
    }
}
