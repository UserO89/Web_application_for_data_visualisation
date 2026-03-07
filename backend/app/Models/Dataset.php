<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
    ];

    protected function casts(): array
    {
        return [
            'has_header' => 'boolean',
            'import_summary_json' => 'array',
            'validation_report_json' => 'array',
        ];
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function columns()
    {
        return $this->hasMany(DatasetColumn::class);
    }

    public function rows()
    {
        return $this->hasMany(DatasetRow::class);
    }
}
