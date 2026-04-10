import { normalizeChartDefinition } from '../rules/chartDefinitionValidator'
import { chartAggregationLabel, chartQuickActionLabel, chartTypeLabel } from './i18n'

const columnNameById = (schemaColumns, id) =>
  (schemaColumns || []).find((column) => Number(column.id) === Number(id))?.name
  || chartQuickActionLabel('unknownColumn', 'Unknown')

const metricLabel = (measureBinding, schemaColumns) => {
  const aggregation = measureBinding?.aggregation || 'sum'
  if (aggregation === 'count') return chartAggregationLabel('count')
  const fieldName = columnNameById(schemaColumns, measureBinding?.field)
  if (aggregation === 'none') return fieldName
  return `${chartAggregationLabel(aggregation)}(${fieldName})`
}

const buildActionLabel = (definition, schemaColumns) => {
  const chartType = definition?.chartType || 'line'
  const bindings = definition?.bindings || {}

  if (chartType === 'line') {
    return chartQuickActionLabel('line', 'Line: {x} vs {y}', {
      x: columnNameById(schemaColumns, bindings.x),
      y: metricLabel(bindings.y, schemaColumns),
    })
  }
  if (chartType === 'bar') {
    return chartQuickActionLabel('bar', 'Bar: {x} by {y}', {
      x: columnNameById(schemaColumns, bindings.x),
      y: metricLabel(bindings.y, schemaColumns),
    })
  }
  if (chartType === 'scatter') {
    return chartQuickActionLabel('scatter', 'Scatter: {x} vs {y}', {
      x: columnNameById(schemaColumns, bindings.x),
      y: columnNameById(schemaColumns, bindings?.y?.field),
    })
  }
  if (chartType === 'histogram') {
    return chartQuickActionLabel('histogram', 'Histogram: {value}', {
      value: columnNameById(schemaColumns, bindings?.value?.field),
    })
  }
  if (chartType === 'boxplot') {
    return bindings.group
      ? chartQuickActionLabel('boxplotGrouped', 'Box plot: {value} by {group}', {
          value: columnNameById(schemaColumns, bindings?.value?.field),
          group: columnNameById(schemaColumns, bindings.group),
        })
      : chartQuickActionLabel('boxplot', 'Box plot: {value}', {
          value: columnNameById(schemaColumns, bindings?.value?.field),
        })
  }
  if (chartType === 'pie') {
    return chartQuickActionLabel('pie', 'Pie: {category} by {value}', {
      category: columnNameById(schemaColumns, bindings.category),
      value: metricLabel(bindings.value, schemaColumns),
    })
  }
  return chartTypeLabel(chartType)
}

export const buildQuickChartActions = (suggestions, schemaColumns) =>
  (suggestions || [])
    .map((suggestion, index) => {
      if (!suggestion?.definition) return null
      const definition = normalizeChartDefinition(suggestion.definition)
      return {
        id: `${definition.chartType}-${index}`,
        label: buildActionLabel(definition, schemaColumns),
        definition,
      }
    })
    .filter(Boolean)
