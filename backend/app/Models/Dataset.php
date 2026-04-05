<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dataset extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'file_path',
        'delimiter',
        'has_header',
        'import_summary_json',
        'validation_report_json',
        'statistics_json',
        'statistics_generated_at',
    ];

    protected $hidden = [
        'statistics_json',
        'statistics_generated_at',
    ];

    protected function casts(): array
    {
        return [
            'has_header' => 'boolean',
            'import_summary_json' => 'array',
            'validation_report_json' => 'array',
            'statistics_json' => 'array',
            'statistics_generated_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function columns(): HasMany
    {
        return $this->hasMany(DatasetColumn::class);
    }

    public function rows(): HasMany
    {
        return $this->hasMany(DatasetRow::class);
    }
}
