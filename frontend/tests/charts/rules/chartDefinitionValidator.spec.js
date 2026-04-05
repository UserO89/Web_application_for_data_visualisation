import {
  getAllowedColumnsForBinding,
  normalizeChartDefinition,
  validateChartDefinition,
} from '../../../src/charts/rules/chartDefinitionValidator'

const buildSchemaColumns = () => ([
  { id: 1, name: 'Order Date', semanticType: 'temporal', fieldKey: 'orderDate' },
  { id: 2, name: 'Stage', semanticType: 'ordinal', fieldKey: 'stage', ordinalOrder: ['Backlog', 'In Progress', 'Done'] },
  { id: 3, name: 'Region', semanticType: 'nominal', fieldKey: 'region' },
  { id: 4, name: 'Revenue', semanticType: 'metric', fieldKey: 'revenue' },
  { id: 5, name: 'Cost', semanticType: 'metric', fieldKey: 'cost', isExcludedFromAnalysis: true },
])

describe('chartDefinitionValidator', () => {
  it('normalizes histogram settings and clears stale bindings from other chart types', () => {
    const normalized = normalizeChartDefinition({
      chartType: 'histogram',
      bindings: {
        x: 1,
        y: { field: 4, aggregation: 'avg' },
        group: 3,
        value: { field: 4, aggregation: 'sum' },
        category: 3,
      },
      settings: {
        bins: 999,
        densityMode: 'unexpected',
        showMeanMarker: 'yes',
        showMedianMarker: 0,
      },
      filters: null,
      sort: null,
    })

    expect(normalized.bindings).toEqual({
      x: null,
      y: { field: null, aggregation: 'none' },
      group: null,
      value: { field: 4, aggregation: 'sum' },
      category: null,
    })
    expect(normalized.settings).toEqual({
      bins: 100,
      densityMode: 'frequency',
      showMeanMarker: true,
      showMedianMarker: false,
    })
    expect(normalized.filters).toEqual([])
    expect(normalized.sort).toBeNull()
  })

  it('accepts count aggregation for bar charts and warns that the selected field is ignored', () => {
    const result = validateChartDefinition({
      chartType: 'bar',
      bindings: {
        x: 3,
        y: { field: 4, aggregation: 'count' },
      },
    }, buildSchemaColumns())

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('Binding "y" with count aggregation ignores selected field.')
  })

  it('warns when scatter uses the same metric column for X and Y', () => {
    const result = validateChartDefinition({
      chartType: 'scatter',
      bindings: {
        x: 4,
        y: { field: 4, aggregation: 'none' },
      },
    }, buildSchemaColumns())

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('Scatter uses the same metric for X and Y.')
  })

  it('filters allowed columns by semantic type and analysis exclusion flags', () => {
    const allowedForBarY = getAllowedColumnsForBinding('bar', 'y', buildSchemaColumns())

    expect(allowedForBarY.map((column) => column.id)).toEqual([4])
  })

  it('rejects excluded metric columns even when the semantic type matches', () => {
    const result = validateChartDefinition({
      chartType: 'bar',
      bindings: {
        x: 3,
        y: { field: 5, aggregation: 'sum' },
      },
    }, buildSchemaColumns())

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Column "Cost" is excluded from analysis.')
  })
})
