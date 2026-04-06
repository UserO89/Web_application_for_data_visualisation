<?php

namespace Tests\Unit;

use App\Models\Dataset;
use App\Services\DatasetSemanticSchemaService;
use App\Services\VisualizationSuggestionService;
use PHPUnit\Framework\TestCase;

class VisualizationSuggestionServiceTest extends TestCase
{
    public function test_suggest_returns_full_chart_mix_for_temporal_metric_and_categorical_schema(): void
    {
        $service = $this->makeService([
            'columns' => [
                ['id' => 1, 'semanticType' => 'metric'],
                ['id' => 2, 'semanticType' => 'metric'],
                ['id' => 3, 'semanticType' => 'nominal'],
                ['id' => 4, 'semanticType' => 'nominal'],
                ['id' => 5, 'semanticType' => 'ordinal'],
                ['id' => 6, 'semanticType' => 'temporal'],
                ['id' => 7, 'semanticType' => 'metric', 'isExcludedFromAnalysis' => true],
            ],
        ]);

        $suggestions = $service->suggest(new Dataset());

        $this->assertSame(
            ['line', 'bar', 'scatter', 'histogram', 'boxplot', 'pie'],
            array_column($suggestions, 'type')
        );

        $this->assertSame(6, $suggestions[0]['definition']['bindings']['x']);
        $this->assertSame(['field' => 1, 'aggregation' => 'sum'], $suggestions[0]['definition']['bindings']['y']);
        $this->assertSame(4, $suggestions[1]['definition']['bindings']['group']);
        $this->assertSame(3, $suggestions[2]['definition']['bindings']['group']);
        $this->assertSame(['field' => 1, 'aggregation' => 'none'], $suggestions[3]['definition']['bindings']['value']);
        $this->assertSame(3, $suggestions[4]['definition']['bindings']['group']);
        $this->assertSame(['field' => 1, 'aggregation' => 'sum'], $suggestions[5]['definition']['bindings']['value']);
        $this->assertSame(3, $suggestions[5]['definition']['bindings']['category']);
    }

    public function test_suggest_falls_back_to_frequency_and_count_share_for_nominal_only_schema(): void
    {
        $service = $this->makeService([
            'columns' => [
                ['id' => 10, 'semanticType' => 'nominal'],
                ['id' => 11, 'semanticType' => 'nominal', 'isExcludedFromAnalysis' => true],
            ],
        ]);

        $suggestions = $service->suggest(new Dataset());

        $this->assertSame(['bar', 'pie'], array_column($suggestions, 'type'));
        $this->assertSame(['field' => null, 'aggregation' => 'count'], $suggestions[0]['definition']['bindings']['y']);
        $this->assertSame(['field' => null, 'aggregation' => 'count'], $suggestions[1]['definition']['bindings']['value']);
        $this->assertSame(10, $suggestions[1]['definition']['bindings']['category']);
    }

    private function makeService(array $schema): VisualizationSuggestionService
    {
        $schemaService = new class($schema) extends DatasetSemanticSchemaService
        {
            public function __construct(private array $schema)
            {
            }

            public function getSchema(Dataset $dataset, bool $rebuild = false): array
            {
                return $this->schema;
            }
        };

        return new VisualizationSuggestionService($schemaService);
    }
}
