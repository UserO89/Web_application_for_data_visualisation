<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportDatasetRequest;
use App\Models\Project;
use App\Services\CsvImportService;
use App\Services\DatasetSemanticSchemaService;
use App\Services\DatasetValidationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DatasetImportController extends Controller
{
    public function __construct(
        private CsvImportService $csvImportService,
        private DatasetValidationService $datasetValidationService,
        private DatasetSemanticSchemaService $datasetSemanticSchemaService
    ) {}

    public function import(ImportDatasetRequest $request, Project $project)
    {
        if ($project->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $file = $request->file('file');
        if (!$file) {
            $report = $this->datasetValidationService->buildFatalReport(
                'file_missing',
                'No file was uploaded.'
            );
            return response()->json([
                'message' => 'No file was uploaded.',
                'validation' => $report,
            ], 422);
        }

        $delimiter = $request->input('delimiter', ',');
        $delimiter = $delimiter === '' ? ',' : $delimiter;
        $hasHeader = $request->boolean('has_header', true);

        if (($file->getSize() ?? 0) <= 0) {
            $report = $this->datasetValidationService->buildFatalReport(
                'file_empty',
                'Uploaded file is empty.'
            );
            return response()->json([
                'message' => 'Uploaded file is empty.',
                'validation' => $report,
            ], 422);
        }

        try {
            $parsed = $this->csvImportService->parse($file, $delimiter, $hasHeader);
        } catch (\Throwable $e) {
            $report = $this->datasetValidationService->buildFatalReport(
                'file_unreadable',
                'Could not parse uploaded file.'
            );
            return response()->json([
                'message' => 'Could not parse uploaded file.',
                'validation' => $report,
            ], 422);
        }

        $importPlan = $this->datasetValidationService->buildImportPlan($parsed['rows'], $hasHeader);
        if (!$importPlan['canImport']) {
            $errorIssue = collect($importPlan['report']['issues'] ?? [])
                ->first(fn($issue) => ($issue['severity'] ?? '') === 'error');
            $message = (string) ($errorIssue['message'] ?? 'Import blocked due to critical file/structure errors.');
            return response()->json([
                'message' => $message,
                'validation' => $importPlan['report'],
            ], 422);
        }

        $path = $file->store('datasets', 'local');
        $dataset = null;
        $schema = [];
        $validationReport = $importPlan['report'];

        DB::transaction(function () use (
            $project,
            $path,
            $delimiter,
            $hasHeader,
            $importPlan,
            &$dataset,
            &$schema,
            &$validationReport
        ) {
            // Keep only one active dataset per project.
            if ($project->dataset) {
                $project->dataset->delete();
            }

            $datasetPayload = [
                'file_path' => $path,
                'delimiter' => $delimiter,
                'has_header' => $hasHeader,
            ];
            if ($this->datasetsTableHasValidationColumns()) {
                $datasetPayload['import_summary_json'] = $importPlan['report']['summary'] ?? null;
                $datasetPayload['validation_report_json'] = $importPlan['report'];
            }
            $dataset = $project->dataset()->create($datasetPayload);

            foreach ($importPlan['columns'] as $index => $column) {
                $columnPayload = [
                    'name' => $column['name'],
                    'type' => $column['type'],
                    'physical_type' => $column['physical_type'] ?? null,
                    'position' => $index,
                ];
                if ($this->datasetColumnsTableHasQualityColumn()) {
                    $columnPayload['quality_json'] = $column['quality'] ?? null;
                }
                $dataset->columns()->create($columnPayload);
            }

            foreach ($importPlan['rows'] as $rowIndex => $row) {
                $dataset->rows()->create([
                    'row_index' => $rowIndex,
                    'values' => json_encode($row),
                ]);
            }

            $schema = $this->datasetSemanticSchemaService->buildAndPersist($dataset);
            $validationReport = $this->attachSemanticTypesToValidationReport($importPlan['report'], $schema);
            if ($this->datasetsTableHasValidationColumns()) {
                $dataset->update([
                    'import_summary_json' => $validationReport['summary'] ?? null,
                    'validation_report_json' => $validationReport,
                ]);
            }
        });

        return response()->json([
            'dataset' => $dataset->load('columns'),
            'schema' => $schema,
            'rows_count' => count($importPlan['rows']),
            'validation' => $validationReport,
        ], 201);
    }

    private function attachSemanticTypesToValidationReport(array $report, array $schema): array
    {
        $schemaByName = [];
        foreach (($schema['columns'] ?? []) as $column) {
            $name = $column['name'] ?? null;
            if (!$name) {
                continue;
            }
            $schemaByName[$name] = $column;
        }

        $updatedColumns = [];
        foreach (($report['columns'] ?? []) as $columnReport) {
            $name = $columnReport['name'] ?? null;
            $schemaColumn = $name ? ($schemaByName[$name] ?? null) : null;
            $columnReport['detectedSemanticType'] = $schemaColumn['detectedSemanticType'] ?? null;
            $columnReport['semanticType'] = $schemaColumn['semanticType'] ?? null;
            $updatedColumns[] = $columnReport;
        }
        $report['columns'] = $updatedColumns;

        return $report;
    }

    private function datasetsTableHasValidationColumns(): bool
    {
        return Schema::hasColumn('datasets', 'import_summary_json')
            && Schema::hasColumn('datasets', 'validation_report_json');
    }

    private function datasetColumnsTableHasQualityColumn(): bool
    {
        return Schema::hasColumn('dataset_columns', 'quality_json');
    }
}
