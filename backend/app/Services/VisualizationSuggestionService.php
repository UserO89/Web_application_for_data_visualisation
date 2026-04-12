<?php

namespace App\Services;

use App\Models\Dataset;

class VisualizationSuggestionService
{
    public function __construct(
        private DatasetSemanticSchemaService $datasetSemanticSchemaService
    ) {}

    public function suggest(Dataset $dataset): array
    {
        $schema = $this->datasetSemanticSchemaService->getSchema($dataset);
        $columns = collect($schema['columns'] ?? [])
            ->filter(fn ($column) => ! ($column['isExcludedFromAnalysis'] ?? false))
            ->values();

        $metrics = $columns->where('semanticType', 'metric')->values();
        $nominals = $columns->where('semanticType', 'nominal')->values();
        $ordinals = $columns->where('semanticType', 'ordinal')->values();
        $temporals = $columns->where('semanticType', 'temporal')->values();

        $categorical = $nominals->concat($ordinals)->values();
        $suggestions = [];

        if ($temporals->isNotEmpty() && $metrics->isNotEmpty()) {
            $x = $temporals->first();
            $y = $metrics->first();
            $suggestions[] = [
                'type' => 'line',
                'title' => 'Time Trend',
                'description' => 'Temporal dimension + metric measure.',
                'definition' => [
                    'chartType' => 'line',
                    'bindings' => [
                        'x' => $x['id'],
                        'y' => ['field' => $y['id'], 'aggregation' => 'sum'],
                        'group' => null,
                        'value' => ['field' => null, 'aggregation' => 'none'],
                        'category' => null,
                    ],
                    'filters' => [],
                    'sort' => ['by' => 'x', 'direction' => 'asc'],
                ],
            ];
        }

        if ($categorical->isNotEmpty() && $metrics->isNotEmpty()) {
            $x = $categorical->first();
            $y = $metrics->first();
            $suggestions[] = [
                'type' => 'bar',
                'title' => 'Category Comparison',
                'description' => 'Compare category totals by selected metric.',
                'definition' => [
                    'chartType' => 'bar',
                    'bindings' => [
                        'x' => $x['id'],
                        'y' => ['field' => $y['id'], 'aggregation' => 'sum'],
                        'group' => $nominals->count() > 1 ? $nominals->values()[1]['id'] : null,
                        'value' => ['field' => null, 'aggregation' => 'none'],
                        'category' => null,
                    ],
                    'filters' => [],
                    'sort' => ['by' => 'y', 'direction' => 'desc'],
                ],
            ];
        }

        if ($nominals->isNotEmpty() && $metrics->isEmpty()) {
            $x = $nominals->first();
            $suggestions[] = [
                'type' => 'bar',
                'title' => 'Category Frequency',
                'description' => 'Count records by category.',
                'definition' => [
                    'chartType' => 'bar',
                    'bindings' => [
                        'x' => $x['id'],
                        'y' => ['field' => null, 'aggregation' => 'count'],
                        'group' => null,
                        'value' => ['field' => null, 'aggregation' => 'none'],
                        'category' => null,
                    ],
                    'filters' => [],
                    'sort' => ['by' => 'y', 'direction' => 'desc'],
                ],
            ];
        }

        if ($metrics->count() >= 2) {
            $x = $metrics->values()[0];
            $y = $metrics->values()[1];
            $suggestions[] = [
                'type' => 'scatter',
                'title' => 'Metric Relationship',
                'description' => 'Inspect relationship between two metrics.',
                'definition' => [
                    'chartType' => 'scatter',
                    'bindings' => [
                        'x' => $x['id'],
                        'y' => ['field' => $y['id'], 'aggregation' => 'none'],
                        'group' => $nominals->isNotEmpty() ? $nominals->first()['id'] : null,
                        'value' => ['field' => null, 'aggregation' => 'none'],
                        'category' => null,
                    ],
                    'filters' => [],
                    'sort' => null,
                ],
            ];
        }

        if ($metrics->isNotEmpty()) {
            $value = $metrics->first();
            $suggestions[] = [
                'type' => 'histogram',
                'title' => 'Distribution',
                'description' => 'Histogram of selected metric.',
                'definition' => [
                    'chartType' => 'histogram',
                    'bindings' => [
                        'x' => null,
                        'y' => ['field' => null, 'aggregation' => 'none'],
                        'group' => null,
                        'value' => ['field' => $value['id'], 'aggregation' => 'none'],
                        'category' => null,
                    ],
                    'filters' => [],
                    'sort' => null,
                ],
            ];

            $suggestions[] = [
                'type' => 'boxplot',
                'title' => 'Spread and Outliers',
                'description' => 'Boxplot for metric distribution.',
                'definition' => [
                    'chartType' => 'boxplot',
                    'bindings' => [
                        'x' => null,
                        'y' => ['field' => null, 'aggregation' => 'none'],
                        'group' => $categorical->isNotEmpty() ? $categorical->first()['id'] : null,
                        'value' => ['field' => $value['id'], 'aggregation' => 'none'],
                        'category' => null,
                    ],
                    'filters' => [],
                    'sort' => null,
                ],
            ];
        }

        if ($nominals->isNotEmpty()) {
            $category = $nominals->first();
            $suggestions[] = [
                'type' => 'pie',
                'title' => 'Share by Category',
                'description' => 'Category shares by count or metric.',
                'definition' => [
                    'chartType' => 'pie',
                    'bindings' => [
                        'x' => null,
                        'y' => ['field' => null, 'aggregation' => 'none'],
                        'group' => null,
                        'value' => $metrics->isNotEmpty()
                            ? ['field' => $metrics->first()['id'], 'aggregation' => 'sum']
                            : ['field' => null, 'aggregation' => 'count'],
                        'category' => $category['id'],
                    ],
                    'filters' => [],
                    'sort' => ['by' => 'value', 'direction' => 'desc'],
                ],
            ];
        }

        return $suggestions;
    }
}
