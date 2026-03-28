<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Project $project): void {
            $datasetFilePath = $project->dataset()->value('file_path');
            if (!$datasetFilePath) {
                return;
            }

            Storage::disk('local')->delete($datasetFilePath);
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function dataset(): HasOne
    {
        return $this->hasOne(Dataset::class);
    }

    public function charts(): HasMany
    {
        return $this->hasMany(Chart::class);
    }
}
