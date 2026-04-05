<?php

namespace Tests\Unit;

use App\Models\Dataset;
use App\Models\Project;
use App\Models\User;
use App\Services\StatisticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatisticsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_calculate_metric_statistics_returns_expected_values(): void
    {
        $dataset = $this->createDatasetWithSingleColumn(
            semanticType: 'metric',
            physicalType: 'number',
            analyticalRole: 'measure',
            values: [10, 20, 30, 40, null, '']
        );

        $columnStats = $this->calculateSingleColumn($dataset);
        $stats = $columnStats['statistics'];

        $this->assertSame('metric', $columnStats['semantic_type']);
        $this->assertSame(6, $stats['count']);
        $this->assertSame(4, $stats['non_null_count']);
        $this->assertSame(2, $stats['null_count']);
        $this->assertSame(4, $stats['distinct_count']);
        $this->assertEqualsWithDelta(10.0, $stats['min'], 0.00001);
        $this->assertEqualsWithDelta(40.0, $stats['max'], 0.00001);
        $this->assertEqualsWithDelta(25.0, $stats['mean'], 0.00001);
        $this->assertEqualsWithDelta(25.0, $stats['median'], 0.00001);
        $this->assertEqualsWithDelta(17.5, $stats['quartiles']['q1'], 0.00001);
        $this->assertEqualsWithDelta(25.0, $stats['quartiles']['q2'], 0.00001);
        $this->assertEqualsWithDelta(32.5, $stats['quartiles']['q3'], 0.00001);
        $this->assertEqualsWithDelta(30.0, $stats['range'], 0.00001);
        $this->assertEqualsWithDelta(11.1803398875, $stats['std_dev'], 0.00001);
        $this->assertEqualsWithDelta(125.0, $stats['variance'], 0.00001);
        $this->assertEqualsWithDelta(15.0, $stats['iqr'], 0.00001);
    }

    public function test_calculate_nominal_statistics_returns_frequency_top_categories_and_percentages(): void
    {
        $dataset = $this->createDatasetWithSingleColumn(
            semanticType: 'nominal',
            physicalType: 'string',
            analyticalRole: 'dimension',
            values: ['North', 'South', 'North', null, '']
        );

        $columnStats = $this->calculateSingleColumn($dataset);
        $stats = $columnStats['statistics'];

        $this->assertSame('nominal', $columnStats['semantic_type']);
        $this->assertSame('North', $stats['mode']);
        $this->assertSame(5, $stats['count']);
        $this->assertSame(3, $stats['non_null_count']);
        $this->assertSame(2, $stats['null_count']);
        $this->assertSame(2, $stats['distinct_count']);
        $this->assertCount(2, $stats['frequency']);
        $this->assertSame('North', $stats['frequency'][0]['value']);
        $this->assertSame(2, $stats['frequency'][0]['count']);
        $this->assertEqualsWithDelta(0.666667, $stats['frequency'][0]['percent'], 0.000001);
        $this->assertCount(2, $stats['top_categories']);
        $this->assertSame('North', $stats['top_categories'][0]['value']);
    }

    public function test_calculate_ordinal_statistics_returns_rank_fields_and_handles_missing_order(): void
    {
        $datasetWithOrder = $this->createDatasetWithSingleColumn(
            semanticType: 'ordinal',
            physicalType: 'string',
            analyticalRole: 'dimension',
            values: ['Low', 'Medium', 'High', 'Medium', null],
            ordinalOrder: ['Low', 'Medium', 'High']
        );

        $withOrder = $this->calculateSingleColumn($datasetWithOrder)['statistics'];
        $this->assertSame('Medium', $withOrder['mode']);
        $this->assertEqualsWithDelta(2.0, $withOrder['median_rank'], 0.00001);
        $this->assertSame('Medium', $withOrder['median_rank_label']);
        $this->assertSame(['Low', 'Medium', 'High'], $withOrder['ordinal_order']);

        $datasetWithoutOrder = $this->createDatasetWithSingleColumn(
            semanticType: 'ordinal',
            physicalType: 'string',
            analyticalRole: 'dimension',
            values: ['Low', 'Medium', 'High', 'Medium', null],
            ordinalOrder: null
        );

        $withoutOrder = $this->calculateSingleColumn($datasetWithoutOrder)['statistics'];
        $this->assertNull($withoutOrder['median_rank']);
        $this->assertNull($withoutOrder['median_rank_label']);
        $this->assertArrayNotHasKey('ordinal_order', $withoutOrder);
    }

    public function test_calculate_temporal_statistics_returns_temporal_fields_and_frequency_by_period(): void
    {
        $dataset = $this->createDatasetWithSingleColumn(
            semanticType: 'temporal',
            physicalType: 'date',
            analyticalRole: 'timeDimension',
            values: ['2024-01-01', '2024-01-03', '2024-01-03', null, 'invalid-date-value']
        );

        $columnStats = $this->calculateSingleColumn($dataset);
        $stats = $columnStats['statistics'];

        $this->assertSame('temporal', $columnStats['semantic_type']);
        $this->assertSame(5, $stats['count']);
        $this->assertSame(4, $stats['non_null_count']);
        $this->assertSame(1, $stats['null_count']);
        $this->assertStringStartsWith('2024-01-01T00:00:00', (string) $stats['earliest']);
        $this->assertStringStartsWith('2024-01-03T00:00:00', (string) $stats['latest']);
        $this->assertEqualsWithDelta(172800, $stats['range_seconds'], 0.00001);
        $this->assertSame('day', $stats['granularity']);
        $this->assertCount(2, $stats['frequency_by_period']);
        $this->assertSame('2024-01-03', $stats['frequency_by_period'][0]['period']);
        $this->assertSame(2, $stats['frequency_by_period'][0]['count']);
    }

    public function test_get_statistics_returns_persisted_payload_when_cache_exists(): void
    {
        $dataset = $this->createDatasetWithSingleColumn(
            semanticType: 'metric',
            physicalType: 'number',
            analyticalRole: 'measure',
            values: [10, 20, 30]
        );

        $cachedStatistics = [[
            'column_id' => 999,
            'column' => 'Cached',
            'physical_type' => 'number',
            'semantic_type' => 'metric',
            'analytical_role' => 'measure',
            'statistics' => [
                'count' => 123,
            ],
        ]];

        $dataset->update([
            'statistics_json' => $cachedStatistics,
            'statistics_generated_at' => now(),
        ]);

        /** @var StatisticsService $service */
        $service = app(StatisticsService::class);
        $statistics = $service->getStatistics($dataset->fresh());

        $this->assertSame($cachedStatistics, $statistics);
    }

    public function test_get_statistics_rebuilds_and_persists_when_requested(): void
    {
        $dataset = $this->createDatasetWithSingleColumn(
            semanticType: 'metric',
            physicalType: 'number',
            analyticalRole: 'measure',
            values: [10, 20, 30]
        );

        $dataset->update([
            'statistics_json' => [[
                'column_id' => 999,
                'column' => 'Stale',
                'physical_type' => 'number',
                'semantic_type' => 'metric',
                'analytical_role' => 'measure',
                'statistics' => [
                    'count' => 999,
                ],
            ]],
            'statistics_generated_at' => now()->subDay(),
        ]);

        /** @var StatisticsService $service */
        $service = app(StatisticsService::class);
        $statistics = $service->getStatistics($dataset->fresh(), true);

        $this->assertCount(1, $statistics);
        $this->assertSame('Value', $statistics[0]['column']);
        $this->assertSame(3, $statistics[0]['statistics']['count']);
        $this->assertEquals($statistics, $dataset->fresh()->statistics_json);
        $this->assertNotNull($dataset->fresh()->statistics_generated_at);
    }

    private function createDatasetWithSingleColumn(
        string $semanticType,
        string $physicalType,
        string $analyticalRole,
        array $values,
        ?array $ordinalOrder = null
    ): Dataset {
        $user = User::create([
            'name' => 'Statistics Unit',
            'email' => 'stats-' . uniqid('', true) . '@example.test',
            'role' => 'user',
            'password' => 'password123',
        ]);

        $project = Project::create([
            'user_id' => $user->id,
            'title' => 'Statistics service test',
            'description' => 'Unit test fixture',
        ]);

        $dataset = $project->dataset()->create([
            'file_path' => 'datasets/stats-service.csv',
            'delimiter' => ',',
            'has_header' => true,
        ]);

        $dataset->columns()->create([
            'name' => 'Value',
            'type' => 'string',
            'physical_type' => $physicalType,
            'detected_semantic_type' => $semanticType,
            'semantic_type' => $semanticType,
            'type_source' => 'user',
            'analytical_role' => $analyticalRole,
            'ordinal_order' => $ordinalOrder,
            'is_excluded_from_analysis' => false,
            'position' => 0,
        ]);

        foreach ($values as $index => $value) {
            $dataset->rows()->create([
                'row_index' => $index,
                'values' => json_encode([$value], JSON_THROW_ON_ERROR),
            ]);
        }

        return $dataset->fresh();
    }

    private function calculateSingleColumn(Dataset $dataset): array
    {
        /** @var StatisticsService $service */
        $service = app(StatisticsService::class);
        $statistics = $service->calculate($dataset);

        $this->assertCount(1, $statistics);

        return $statistics[0];
    }
}
