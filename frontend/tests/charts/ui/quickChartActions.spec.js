import { buildQuickChartActions } from '../../../src/charts/ui/quickChartActions'
import { beforeEach } from 'vitest'
import { setLocale } from '../../../src/i18n'

const buildSchemaColumns = () => ([
  { id: 1, name: 'Order Date', semanticType: 'temporal' },
  { id: 2, name: 'Stage', semanticType: 'ordinal' },
  { id: 3, name: 'Region', semanticType: 'nominal' },
  { id: 4, name: 'Revenue', semanticType: 'metric' },
  { id: 5, name: 'Cost', semanticType: 'metric' },
])

describe('buildQuickChartActions', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('builds labels for all supported chart types', () => {
    const actions = buildQuickChartActions([
      {
        definition: {
          chartType: 'line',
          bindings: {
            x: 1,
            y: { field: 4, aggregation: 'sum' },
          },
        },
      },
      {
        definition: {
          chartType: 'bar',
          bindings: {
            x: 3,
            y: { field: 4, aggregation: 'count' },
          },
        },
      },
      {
        definition: {
          chartType: 'scatter',
          bindings: {
            x: 4,
            y: { field: 5, aggregation: 'none' },
          },
        },
      },
      {
        definition: {
          chartType: 'histogram',
          bindings: {
            value: { field: 4, aggregation: 'none' },
          },
        },
      },
      {
        definition: {
          chartType: 'boxplot',
          bindings: {
            value: { field: 4, aggregation: 'none' },
            group: 2,
          },
        },
      },
      {
        definition: {
          chartType: 'pie',
          bindings: {
            category: 3,
            value: { field: 4, aggregation: 'avg' },
          },
        },
      },
    ], buildSchemaColumns())

    expect(actions.map((action) => action.label)).toEqual([
      'Line: Order Date vs Sum(Revenue)',
      'Bar: Region by Count',
      'Scatter: Revenue vs Cost',
      'Histogram: Revenue',
      'Box plot: Revenue by Stage',
      'Pie: Region by Mean(Revenue)',
    ])
    expect(actions.map((action) => action.id)).toEqual([
      'line-0',
      'bar-1',
      'scatter-2',
      'histogram-3',
      'boxplot-4',
      'pie-5',
    ])
  })

  it('normalizes suggestion definitions before returning actions', () => {
    const actions = buildQuickChartActions([
      {
        definition: {
          chartType: 'histogram',
          bindings: {
            x: 1,
            y: { field: 4, aggregation: 'avg' },
            group: 3,
            value: 4,
            category: 3,
          },
          settings: {
            bins: 999,
            densityMode: 'unexpected',
          },
        },
      },
    ], buildSchemaColumns())

    expect(actions).toHaveLength(1)
    expect(actions[0].definition).toMatchObject({
      chartType: 'histogram',
      bindings: {
        x: null,
        y: { field: null, aggregation: 'none' },
        group: null,
        value: { field: 4, aggregation: 'sum' },
        category: null,
      },
      settings: {
        bins: 100,
        densityMode: 'frequency',
      },
    })
  })

  it('filters invalid suggestions and falls back to Unknown for missing column ids', () => {
    const actions = buildQuickChartActions([
      null,
      {
        definition: {
          chartType: 'pie',
          bindings: {
            category: 999,
            value: { field: null, aggregation: 'count' },
          },
        },
      },
      {
        bad: true,
      },
    ], buildSchemaColumns())

    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      id: 'pie-1',
      label: 'Pie: Unknown by Count',
    })
  })
})
