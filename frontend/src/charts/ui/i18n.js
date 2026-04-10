import { getLocale, translate } from '../../i18n'

const translateWithFallback = (key, fallback, params = {}) => {
  const translated = translate(key, params)
  return translated && translated !== key ? translated : fallback
}

const AGGREGATION_FALLBACKS = {
  none: 'Value',
  sum: 'Sum',
  avg: 'Mean',
  min: 'Min',
  max: 'Max',
  median: 'Median',
  count: 'Count',
}

const TYPE_FALLBACKS = {
  line: 'Line',
  bar: 'Bar',
  scatter: 'Scatter',
  histogram: 'Histogram',
  boxplot: 'Box plot',
  pie: 'Pie',
}

const SEMANTIC_TYPE_FALLBACKS = {
  metric: 'Numeric',
  nominal: 'Category',
  ordinal: 'Ordered category',
  temporal: 'Date/Time',
  identifier: 'ID',
  binary: 'Category',
  ignored: 'Hidden',
}

export const formatChartNumber = (value, options = {}) => Number(value).toLocaleString(getLocale(), options)

export const chartTypeLabel = (type) => {
  const fallback = TYPE_FALLBACKS[type] || String(type || '')
  return translateWithFallback(`charts.types.${type}`, fallback)
}

export const chartAggregationLabel = (aggregation) => {
  const fallback = AGGREGATION_FALLBACKS[aggregation] || String(aggregation || '')
  return translateWithFallback(`charts.aggregations.${aggregation}`, fallback)
}

export const chartSemanticTypeLabel = (semanticType) => {
  const fallback = SEMANTIC_TYPE_FALLBACKS[semanticType] || String(semanticType || '')
  return translateWithFallback(`charts.semanticTypes.${semanticType}`, fallback)
}

export const chartCommonLabel = (key, fallback, params = {}) => {
  return translateWithFallback(`charts.common.${key}`, fallback, params)
}

export const chartBuilderLabel = (key, fallback, params = {}) => {
  return translateWithFallback(`charts.builder.${key}`, fallback, params)
}

export const chartHintLabel = (key, fallback, params = {}) => {
  return translateWithFallback(`charts.hints.${key}`, fallback, params)
}

export const chartPanelLabel = (key, fallback, params = {}) => {
  return translateWithFallback(`charts.panel.${key}`, fallback, params)
}

export const chartQuickActionLabel = (key, fallback, params = {}) => {
  return translateWithFallback(`charts.quickActions.${key}`, fallback, params)
}
