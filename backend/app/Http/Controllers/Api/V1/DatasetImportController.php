<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportDatasetRequest;
use App\Models\Project;
use App\Services\CsvImportService;
use App\Services\ColumnTypeInferenceService;

class DatasetImportController extends Controller
{
    public function __construct(
        private CsvImportService $csvImportService,
        private ColumnTypeInferenceService $typeInferenceService
    ) {}

    public function import(ImportDatasetRequest $request, Project $project)
    {
        if ($project->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $file = $request->file('file');
        $delimiter = $request->input('delimiter', ',');
        $hasHeader = $request->boolean('has_header', true);

        // Parse CSV
        $parsed = $this->csvImportService->parse($file, $delimiter, $hasHeader);

        // Store file
        $path = $file->store('datasets', 'local');

        // Replace previous dataset for this project to keep one active dataset.
        if ($project->dataset) {
            $project->dataset->delete();
        }

        // Create dataset
        $dataset = $project->dataset()->create([
            'file_path' => $path,
            'delimiter' => $delimiter,
            'has_header' => $hasHeader,
        ]);

        // Infer column types and create columns
        $columns = $this->typeInferenceService->infer($parsed['rows'], $hasHeader);

        foreach ($columns as $index => $column) {
            $dataset->columns()->create([
                'name' => $column['name'],
                'type' => $column['type'],
                'position' => $index,
            ]);
        }

        // Import rows
        $rows = $hasHeader ? array_slice($parsed['rows'], 1) : $parsed['rows'];
        foreach ($rows as $rowIndex => $row) {
            $dataset->rows()->create([
                'row_index' => $rowIndex,
                'values' => json_encode($row),
            ]);
        }

        return response()->json([
            'dataset' => $dataset->load('columns'),
            'rows_count' => count($rows),
        ], 201);
    }
}
