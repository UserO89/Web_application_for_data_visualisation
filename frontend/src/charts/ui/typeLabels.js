import { chartCommonLabel, chartSemanticTypeLabel } from './i18n'

export const SEMANTIC_TYPE_LABELS = {
  metric: 'Numeric',
  nominal: 'Category',
  ordinal: 'Ordered category',
  temporal: 'Date/Time',
  identifier: 'ID',
  binary: 'Category',
  ignored: 'Hidden',
}

export const semanticTypeLabel = (semanticType) => chartSemanticTypeLabel(semanticType)

export const semanticTypeToGroup = (column) => {
  if (!column) return 'hidden'
  if (column.isExcludedFromAnalysis || ['identifier', 'ignored'].includes(column.semanticType)) return 'hidden'

  if (column.semanticType === 'metric') return 'numeric'
  if (column.semanticType === 'temporal') return 'date'
  if (column.semanticType === 'ordinal') return 'ordered'
  if (['nominal', 'binary'].includes(column.semanticType)) return 'category'
  return 'hidden'
}

export const GROUP_LABELS = {
  numeric: 'Numeric columns',
  category: 'Category columns',
  date: 'Date columns',
  ordered: 'Ordered columns',
  hidden: 'Hidden / Excluded columns',
}

export const groupLabel = (groupKey) => chartCommonLabel(`groups.${groupKey}`, GROUP_LABELS[groupKey] || groupKey)
