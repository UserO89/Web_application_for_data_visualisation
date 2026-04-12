<?php

namespace App\Services;

use App\Models\Dataset;
use App\Models\DatasetColumn;
use App\Models\DatasetRow;

class DatasetSemanticSchemaService
{
    public function __construct(
        private ColumnProfilingService $columnProfilingService,
        private SemanticTypeInferenceService $semanticTypeInferenceService
    ) {}

    public function getSchema(Dataset $dataset, bool $rebuild = false): array
    {
        $columns = $dataset->columns()->orderBy('position')->get();
        $hasCompleteSchema = $columns->every(
            fn (DatasetColumn $column) => ! empty($column->semantic_type) && ! empty($column->physical_type)
        );

        if ($rebuild || ! $hasCompleteSchema) {
            return $this->buildAndPersist($dataset);
        }

        return $this->formatSchema($dataset, $columns->all());
    }

    public function buildAndPersist(Dataset $dataset): array
    {
        $columns = $dataset->columns()->orderBy('position')->get();
        $rows = $dataset->rows()->select('values')->orderBy('row_index')->get();

        foreach ($columns as $column) {
            $values = $this->extractColumnValues($rows->all(), (int) $column->position, $column->name);
            $profiling = $this->columnProfilingService->profile($values, $column->name);
            $physicalType = $profiling['physicalType'] ?? $this->mapLegacyTypeToPhysicalType($column->type);

            $inference = $this->semanticTypeInferenceService->infer(
                $profiling['profile'] ?? [],
                $physicalType,
                $column->name
            );

            $currentSemanticType = $column->semantic_type;
            $isUserOverridden = $column->type_source === 'user';
            $finalSemanticType = ($isUserOverridden && ! empty($currentSemanticType))
                ? $currentSemanticType
                : $inference['detectedSemanticType'];

            $defaultRole = $this->semanticTypeInferenceService->mapAnalyticalRole($finalSemanticType);
            $analyticalRole = ($isUserOverridden && ! empty($column->analytical_role))
                ? $column->analytical_role
                : $defaultRole;

            $detectedOrdinalOrder = $inference['detectedOrdinalOrder'] ?? null;
            $ordinalOrder = ($isUserOverridden && ! empty($column->ordinal_order))
                ? $column->ordinal_order
                : ($finalSemanticType === 'ordinal' ? $detectedOrdinalOrder : null);

            $isExcluded = $isUserOverridden
                ? (bool) $column->is_excluded_from_analysis
                : in_array($finalSemanticType, ['identifier', 'ignored'], true);

            $column->update([
                'physical_type' => $physicalType,
                'detected_semantic_type' => $inference['detectedSemanticType'],
                'semantic_type' => $finalSemanticType,
                'semantic_confidence' => (float) ($inference['semanticConfidence'] ?? 0.0),
                'type_source' => $isUserOverridden ? 'user' : 'auto',
                'analytical_role' => $analyticalRole,
                'ordinal_order' => $ordinalOrder,
                'is_excluded_from_analysis' => $isExcluded,
                'profile_json' => $profiling['profile'] ?? [],
                'inference_scores_json' => $inference['inferenceScores'] ?? [],
                'inference_reasons_json' => $inference['inferenceReasons'] ?? [],
            ]);
        }

        $columns = $dataset->columns()->orderBy('position')->get()->all();

        return $this->formatSchema($dataset, $columns);
    }

    public function overrideSemanticType(
        DatasetColumn $column,
        string $semanticType,
        ?string $analyticalRole = null,
        ?bool $isExcludedFromAnalysis = null
    ): DatasetColumn {
        $resolvedRole = $analyticalRole ?: $this->semanticTypeInferenceService->mapAnalyticalRole($semanticType);
        $resolvedExclusion = $isExcludedFromAnalysis ?? in_array($semanticType, ['identifier', 'ignored'], true);

        $payload = [
            'semantic_type' => $semanticType,
            'type_source' => 'user',
            'analytical_role' => $resolvedRole,
            'is_excluded_from_analysis' => $resolvedExclusion,
        ];

        if ($semanticType !== 'ordinal') {
            $payload['ordinal_order'] = null;
        }

        $column->update($payload);

        return $column->fresh();
    }

    public function overrideOrdinalOrder(DatasetColumn $column, array $order): DatasetColumn
    {
        $normalized = array_values(array_unique(array_filter(array_map(
            fn ($value) => trim((string) $value),
            $order
        ), fn ($value) => $value !== '')));

        $column->update([
            'semantic_type' => 'ordinal',
            'type_source' => 'user',
            'analytical_role' => 'dimension',
            'ordinal_order' => $normalized,
            'is_excluded_from_analysis' => false,
        ]);

        return $column->fresh();
    }

    public function formatColumn(DatasetColumn $column): array
    {
        return [
            'id' => $column->id,
            'name' => $column->name,
            'position' => $column->position,
            'physicalType' => $column->physical_type ?: $this->mapLegacyTypeToPhysicalType($column->type),
            'detectedSemanticType' => $column->detected_semantic_type,
            'semanticType' => $column->semantic_type,
            'semanticConfidence' => $column->semantic_confidence,
            'typeSource' => $column->type_source ?: 'auto',
            'analyticalRole' => $column->analytical_role ?: 'excluded',
            'userOverridden' => $column->type_source === 'user',
            'ordinalOrder' => $column->ordinal_order,
            'isExcludedFromAnalysis' => (bool) $column->is_excluded_from_analysis,
            'profile' => $column->profile_json ?? [],
            'quality' => $column->quality_json ?? [],
            'inferenceScores' => $column->inference_scores_json ?? [],
            'inferenceReasons' => $column->inference_reasons_json ?? [],
        ];
    }

    private function formatSchema(Dataset $dataset, array $columns): array
    {
        return [
            'datasetId' => $dataset->id,
            'generatedAt' => now()->toAtomString(),
            'columns' => array_map(
                fn (DatasetColumn $column) => $this->formatColumn($column),
                $columns
            ),
        ];
    }

    private function mapLegacyTypeToPhysicalType(?string $legacyType): string
    {
        return match (mb_strtolower((string) $legacyType)) {
            'integer', 'float', 'number' => 'number',
            'date' => 'date',
            'datetime' => 'datetime',
            'boolean' => 'boolean',
            'mixed' => 'mixed',
            'unknown' => 'unknown',
            default => 'string',
        };
    }

    /**
     * @param  DatasetRow[]  $rows
     */
    private function extractColumnValues(array $rows, int $position, string $columnName): array
    {
        $values = [];
        foreach ($rows as $row) {
            $raw = is_string($row->values) ? json_decode($row->values, true) : (is_array($row->values) ? $row->values : []);
            $values[] = $this->readRowValue($raw, $position, $columnName);
        }

        return $values;
    }

    private function readRowValue(mixed $values, int $position, string $columnName): mixed
    {
        if (is_array($values)) {
            if (array_key_exists($position, $values)) {
                return $values[$position];
            }
            if (array_key_exists((string) $position, $values)) {
                return $values[(string) $position];
            }
            if (array_key_exists($columnName, $values)) {
                return $values[$columnName];
            }
        }

        return null;
    }
}
