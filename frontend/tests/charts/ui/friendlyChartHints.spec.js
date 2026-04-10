import { getFriendlyBuildHint } from '../../../src/charts/ui/friendlyChartHints'
import { beforeEach } from 'vitest'
import { setLocale } from '../../../src/i18n'

const buildSchemaColumns = () => ([
  { id: 1, name: 'Order Date', semanticType: 'temporal' },
  { id: 2, name: 'Stage', semanticType: 'ordinal' },
  { id: 3, name: 'Region', semanticType: 'nominal' },
  { id: 4, name: 'Revenue', semanticType: 'metric' },
  { id: 5, name: 'Cost', semanticType: 'metric' },
])

describe('getFriendlyBuildHint', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('returns the line X-axis hint when X is missing', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'line',
      bindings: {
        x: null,
        y: { field: 4, aggregation: 'sum' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('Select one date/time or ordered column for X-axis.')
  })

  it('returns the line Y-axis hint when Y is missing', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'line',
      bindings: {
        x: 1,
        y: { field: null, aggregation: 'sum' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('Select one numeric column for Y-axis.')
  })

  it('returns the bar value-mode hint when the metric field is missing', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'bar',
      bindings: {
        x: 3,
        y: { field: null, aggregation: 'sum' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('Select one numeric column for value mode.')
  })

  it('returns no hint for bar count mode when X is valid and Y field is empty', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'bar',
      bindings: {
        x: 3,
        y: { field: null, aggregation: 'count' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('')
  })

  it('returns the scatter Y-axis hint when X is valid but Y is missing', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'scatter',
      bindings: {
        x: 4,
        y: { field: null, aggregation: 'none' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('Select one numeric column for Y-axis.')
  })

  it('returns the histogram hint when the value field is missing', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'histogram',
      bindings: {
        value: { field: null, aggregation: 'none' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('Select one numeric variable.')
  })

  it('returns the boxplot hint when the value field is missing', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'boxplot',
      bindings: {
        value: { field: null, aggregation: 'none' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('Select one numeric variable.')
  })

  it('returns the pie category hint before checking pie values', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'pie',
      bindings: {
        category: null,
        value: { field: null, aggregation: 'sum' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('Select one category column.')
  })

  it('returns the pie value hint when category is valid but value is missing', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'pie',
      bindings: {
        category: 3,
        value: { field: null, aggregation: 'sum' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('Select one numeric column for pie values.')
  })

  it('returns an empty hint when the definition is already valid', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'line',
      bindings: {
        x: 1,
        y: { field: 4, aggregation: 'sum' },
      },
    }, buildSchemaColumns())

    expect(hint).toBe('')
  })

  it('returns the fallback hint for unknown chart types', () => {
    const hint = getFriendlyBuildHint({
      chartType: 'radar',
      bindings: {},
    }, buildSchemaColumns())

    expect(hint).toBe('Complete required fields to build chart.')
  })
})
