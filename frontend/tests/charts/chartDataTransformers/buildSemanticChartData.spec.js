import { buildSemanticChartData } from '../../../src/charts/chartDataTransformers/buildSemanticChartData'
import { beforeEach } from 'vitest'
import { setLocale } from '../../../src/i18n'

const buildSchemaColumns = () => ([
  { id: 1, name: 'Order Date', fieldKey: 'orderDate', semanticType: 'temporal' },
  { id: 2, name: 'Stage', fieldKey: 'stage', semanticType: 'ordinal', ordinalOrder: ['Backlog', 'In Progress', 'Done'] },
  { id: 3, name: 'Region', fieldKey: 'region', semanticType: 'nominal' },
  { id: 4, name: 'Revenue', fieldKey: 'revenue', semanticType: 'metric' },
])

const getSeriesColor = (label, index) => `${label}:${index}`

describe('buildSemanticChartData', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('builds grouped line series with temporal label sorting and aggregation', () => {
    const definition = {
      chartType: 'line',
      bindings: {
        x: 1,
        y: { field: 4, aggregation: 'sum' },
        group: 3,
      },
    }
    const rows = [
      { orderDate: '2024-01-03', region: 'North', revenue: '30' },
      { orderDate: '2024-01-01', region: 'North', revenue: '10' },
      { orderDate: '2024-01-01', region: 'South', revenue: '20' },
      { orderDate: '2024-01-03', region: 'South', revenue: 'bad' },
      { orderDate: '', region: 'South', revenue: '50' },
    ]

    const result = buildSemanticChartData({
      definition,
      schemaColumns: buildSchemaColumns(),
      rows,
      getSeriesColor,
    })

    expect(result).toEqual({
      type: 'line',
      labels: ['2024-01-01', '2024-01-03'],
      datasets: [
        { label: 'North', data: [10, 30], color: 'North:0' },
        { label: 'South', data: [20, 0], color: 'South:1' },
      ],
      meta: {
        xAxisLabel: 'Order Date',
        yAxisLabel: 'SUM(Revenue)',
      },
    })
  })

  it('builds ordinal bar labels in declared order for count aggregation', () => {
    const definition = {
      chartType: 'bar',
      bindings: {
        x: 2,
        y: { field: null, aggregation: 'count' },
      },
    }
    const rows = [
      { stage: 'Done', revenue: '100' },
      { stage: 'Backlog', revenue: '200' },
      { stage: 'In Progress', revenue: '150' },
      { stage: 'In Progress', revenue: '175' },
      { stage: '-', revenue: '999' },
    ]

    const result = buildSemanticChartData({
      definition,
      schemaColumns: buildSchemaColumns(),
      rows,
      getSeriesColor,
    })

    expect(result).toEqual({
      type: 'bar',
      labels: ['Backlog', 'In Progress', 'Done'],
      datasets: [
        { label: 'Series', data: [1, 2, 1], color: 'Series:0' },
      ],
      meta: {
        xAxisLabel: 'Stage',
        yAxisLabel: 'Count',
      },
    })
  })

  it('builds histogram density output and mean or median markers', () => {
    const definition = {
      chartType: 'histogram',
      bindings: {
        value: { field: 4, aggregation: 'none' },
      },
      settings: {
        bins: 4,
        densityMode: 'density',
        showMeanMarker: true,
        showMedianMarker: true,
      },
    }
    const rows = [
      { revenue: '10' },
      { revenue: '20' },
      { revenue: '20' },
      { revenue: '40' },
      { revenue: 'bad' },
    ]

    const result = buildSemanticChartData({
      definition,
      schemaColumns: buildSchemaColumns(),
      rows,
      getSeriesColor,
    })

    expect(result.type).toBe('histogram')
    expect(result.labels).toEqual([
      '10.00-17.50',
      '17.50-25.00',
      '25.00-32.50',
      '32.50-40.00',
    ])
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0].label).toBe('Revenue density')
    expect(result.datasets[0].color).toBe('Revenue:0')
    expect(result.datasets[0].data[0]).toBeCloseTo(1 / 30, 6)
    expect(result.datasets[0].data[1]).toBeCloseTo(2 / 30, 6)
    expect(result.datasets[0].data[2]).toBeCloseTo(0, 6)
    expect(result.datasets[0].data[3]).toBeCloseTo(1 / 30, 6)
    expect(result.meta).toEqual({
      xAxisLabel: 'Revenue',
      yAxisLabel: 'Density',
      histogramMarkers: [
        { name: 'Mean', index: 1, value: 22.5 },
        { name: 'Median', index: 1, value: 20 },
      ],
    })
  })

  it('sorts pie categories by aggregated value in descending order', () => {
    const definition = {
      chartType: 'pie',
      bindings: {
        category: 3,
        value: { field: 4, aggregation: 'sum' },
      },
    }
    const rows = [
      { region: 'North', revenue: '100' },
      { region: 'South', revenue: '300' },
      { region: 'South', revenue: '100' },
      { region: 'East', revenue: 'bad' },
    ]

    const result = buildSemanticChartData({
      definition,
      schemaColumns: buildSchemaColumns(),
      rows,
      getSeriesColor,
    })

    expect(result).toEqual({
      type: 'pie',
      labels: ['South', 'North'],
      datasets: [
        { label: 'SUM(Revenue)', data: [400, 100], color: 'Region:0' },
      ],
      meta: {},
    })
  })
})
