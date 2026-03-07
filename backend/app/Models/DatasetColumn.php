<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DatasetColumn extends Model
{
    use HasFactory;

    protected $fillable = [
        'dataset_id',
        'name',
        'type',
        'physical_type',
        'detected_semantic_type',
        'semantic_type',
        'semantic_confidence',
        'type_source',
        'analytical_role',
        'ordinal_order',
        'is_excluded_from_analysis',
        'profile_json',
        'quality_json',
        'inference_scores_json',
        'inference_reasons_json',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'ordinal_order' => 'array',
            'profile_json' => 'array',
            'quality_json' => 'array',
            'inference_scores_json' => 'array',
            'inference_reasons_json' => 'array',
            'semantic_confidence' => 'float',
            'is_excluded_from_analysis' => 'boolean',
        ];
    }

    public function dataset()
    {
        return $this->belongsTo(Dataset::class);
    }
}
