<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportDatasetRequest;
use App\Models\Project;
use App\Services\CsvImportService;
use App\Services\DatasetSemanticSchemaService;
use App\Services\DatasetValidation\DatasetValidationService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DatasetImportController extends Controller
{
    private const DATASET_ALREADY_EXISTS_MESSAGE = 'This project already has a dataset. Create a new project to import another file.';

    public function __construct(
        private CsvImportService $csvImportService,
        private DatasetValidationService $datasetValidationService,
        private DatasetSemanticSchemaService $datasetSemanticSchemaService
    ) {}

    public function import(ImportDatasetRequest $request, Project $project)
    {
        $this->authorize('update', $project);

        if ($project->dataset()->exists()) {
            return $this->datasetAlreadyExistsResponse();
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
        } catch (Throwable $e) {
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
            $blockingError = (array) ($importPlan['report']['blocking_error'] ?? []);
            $message = (string) ($blockingError['message'] ?? 'Import blocked due to critical file/structure errors.');
            return response()->json([
                'message' => $message,
                'validation' => $importPlan['report'],
            ], 422);
        }

        $path = $file->store('datasets', 'local');
        $dataset = null;
        $schema = [];
        $validationReport = $importPlan['report'];

        try {
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
                $validationReport = $importPlan['report'];
                if ($this->datasetsTableHasValidationColumns()) {
                    $dataset->update([
                        'import_summary_json' => $validationReport['summary'] ?? null,
                        'validation_report_json' => $validationReport,
                    ]);
                }
            });
        } catch (QueryException $e) {
            $this->deleteStoredDatasetFile($path);

            if ($this->isProjectDatasetUniqueViolation($e)) {
                return $this->datasetAlreadyExistsResponse();
            }

            throw $e;
        } catch (Throwable $e) {
            $this->deleteStoredDatasetFile($path);
            throw $e;
        }

        return response()->json([
            'dataset' => $dataset->load('columns'),
            'schema' => $schema,
            'rows_count' => count($importPlan['rows']),
            'validation' => $validationReport,
        ], 201);
    }

    private function datasetAlreadyExistsResponse()
    {
        return response()->json([
            'message' => self::DATASET_ALREADY_EXISTS_MESSAGE,
        ], 409);
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

    private function deleteStoredDatasetFile(?string $path): void
    {
        if (!$path) {
            return;
        }

        Storage::disk('local')->delete($path);
    }

    private function isProjectDatasetUniqueViolation(QueryException $exception): bool
    {
        $errorInfo = $exception->errorInfo;
        $sqlState = (string) ($errorInfo[0] ?? '');
        $driverCode = (string) ($errorInfo[1] ?? '');
        $message = strtolower($exception->getMessage());

        if (
            !in_array($sqlState, ['23000', '23505'], true)
            && !in_array($driverCode, ['19', '1062'], true)
        ) {
            return false;
        }

        if (str_contains($message, 'datasets_project_id_unique')) {
            return true;
        }

        if (str_contains($message, 'unique constraint failed: datasets.project_id')) {
            return true;
        }

        return str_contains($message, 'duplicate entry')
            && str_contains($message, 'project_id');
    }
}
