<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportDatasetRequest;
use App\Models\DatasetColumn;
use App\Models\DatasetRow;
use App\Models\Project;
use App\Services\CsvImportService;
use App\Services\CsvImportLimitException;
use App\Services\DatasetSemanticSchemaService;
use App\Services\DatasetValidation\DatasetValidationService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DatasetImportController extends Controller
{
    private const DATASET_ALREADY_EXISTS_MESSAGE = 'This project already has a dataset. Create a new project to import another file.';
    private const DEFAULT_COLUMN_INSERT_CHUNK_SIZE = 250;
    private const DEFAULT_ROW_INSERT_CHUNK_SIZE = 500;

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
        } catch (CsvImportLimitException $e) {
            $report = $this->datasetValidationService->buildFatalReport(
                code: $e->validationCode(),
                message: $e->getMessage(),
                metadata: $e->metadata(),
                summaryOverrides: $e->summaryOverrides(),
                hasHeader: $hasHeader
            );
            return response()->json([
                'message' => $e->getMessage(),
                'validation' => $report,
            ], 422);
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
                    'import_summary_json' => $importPlan['report']['summary'] ?? null,
                    'validation_report_json' => $importPlan['report'],
                ];
                $dataset = $project->dataset()->create($datasetPayload);

                $timestamp = now();
                $this->insertDatasetColumnsInChunks($dataset->id, (array) $importPlan['columns'], $timestamp);
                $this->insertDatasetRowsInChunks($dataset->id, (array) $importPlan['rows'], $timestamp);

                $schema = $this->datasetSemanticSchemaService->buildAndPersist($dataset);
                $validationReport = $importPlan['report'];
                $dataset->update([
                    'import_summary_json' => $validationReport['summary'] ?? null,
                    'validation_report_json' => $validationReport,
                ]);
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

    private function insertDatasetColumnsInChunks(int $datasetId, array $columns, mixed $timestamp): void
    {
        $chunkSize = $this->resolveChunkSize(
            'dataset_import.column_insert_chunk_size',
            self::DEFAULT_COLUMN_INSERT_CHUNK_SIZE
        );

        $payloadChunk = [];
        foreach ($columns as $index => $column) {
            $payloadChunk[] = [
                'dataset_id' => $datasetId,
                'name' => $column['name'],
                'type' => $column['type'],
                'physical_type' => $column['physical_type'] ?? null,
                'quality_json' => isset($column['quality']) ? json_encode($column['quality']) : null,
                'position' => $index,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];

            if (count($payloadChunk) >= $chunkSize) {
                DatasetColumn::query()->insert($payloadChunk);
                $payloadChunk = [];
            }
        }

        if ($payloadChunk !== []) {
            DatasetColumn::query()->insert($payloadChunk);
        }
    }

    private function insertDatasetRowsInChunks(int $datasetId, array $rows, mixed $timestamp): void
    {
        $chunkSize = $this->resolveChunkSize(
            'dataset_import.row_insert_chunk_size',
            self::DEFAULT_ROW_INSERT_CHUNK_SIZE
        );

        $payloadChunk = [];
        foreach ($rows as $rowIndex => $row) {
            $payloadChunk[] = [
                'dataset_id' => $datasetId,
                'row_index' => $rowIndex,
                'values' => json_encode($row),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];

            if (count($payloadChunk) >= $chunkSize) {
                DatasetRow::query()->insert($payloadChunk);
                $payloadChunk = [];
            }
        }

        if ($payloadChunk !== []) {
            DatasetRow::query()->insert($payloadChunk);
        }
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

    private function resolveChunkSize(string $configKey, int $default): int
    {
        $configured = (int) config($configKey, $default);

        return $configured > 0 ? $configured : $default;
    }
}
