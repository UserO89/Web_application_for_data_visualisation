const identity = (value) => value

const METRIC_LABEL_DEFINITIONS = {
  mean: { key: 'statistics.metricLabels.mean', fallback: 'Mean' },
  median: { key: 'statistics.metricLabels.median', fallback: 'Median' },
  min: { key: 'statistics.metricLabels.min', fallback: 'Min' },
  max: { key: 'statistics.metricLabels.max', fallback: 'Max' },
  q1: { key: 'statistics.metricLabels.q1', fallback: 'Q1' },
  q2: { key: 'statistics.metricLabels.q2', fallback: 'Q2' },
  q3: { key: 'statistics.metricLabels.q3', fallback: 'Q3' },
  std_dev: { key: 'statistics.metricLabels.stdDev', fallback: 'Std deviation' },
  variance: { key: 'statistics.metricLabels.variance', fallback: 'Variance' },
  range: { key: 'statistics.metricLabels.range', fallback: 'Range' },
  count: { key: 'statistics.metricLabels.count', fallback: 'Count' },
  distinct_count: { key: 'statistics.metricLabels.distinctCount', fallback: 'Distinct count' },
  frequency: { key: 'statistics.metricLabels.frequency', fallback: 'Frequency' },
  earliest: { key: 'statistics.metricLabels.earliest', fallback: 'Earliest' },
  latest: { key: 'statistics.metricLabels.latest', fallback: 'Latest' },
  median_rank: { key: 'statistics.metricLabels.medianRank', fallback: 'Median rank' },
}

const SEMANTIC_TYPE_LABEL_DEFINITIONS = {
  metric: { key: 'statistics.semanticTypes.metric', fallback: 'Numeric' },
  nominal: { key: 'statistics.semanticTypes.nominal', fallback: 'Category' },
  ordinal: { key: 'statistics.semanticTypes.ordinal', fallback: 'Ordered category' },
  temporal: { key: 'statistics.semanticTypes.temporal', fallback: 'Date/Time' },
  identifier: { key: 'statistics.semanticTypes.identifier', fallback: 'ID' },
  binary: { key: 'statistics.semanticTypes.binary', fallback: 'Category (binary)' },
  ignored: { key: 'statistics.semanticTypes.ignored', fallback: 'Hidden' },
}

const translateDefinition = (definition, t = identity) => {
  if (!definition) return ''

  const translated = t(definition.key)
  return translated && translated !== definition.key ? translated : definition.fallback
}

const resolveMetricLabel = (metricKey, t = identity) => {
  const definition = METRIC_LABEL_DEFINITIONS[metricKey]
  if (definition) {
    return translateDefinition(definition, t)
  }

  return metricKey
}

const buildMetricOption = (metricKey, t = identity) => ({
  key: metricKey,
  label: resolveMetricLabel(metricKey, t),
})

export const METRIC_OPTIONS = {
  numeric: [
    buildMetricOption('mean'),
    buildMetricOption('median'),
    buildMetricOption('min'),
    buildMetricOption('max'),
    buildMetricOption('q1'),
    buildMetricOption('q2'),
    buildMetricOption('q3'),
    buildMetricOption('std_dev'),
    buildMetricOption('variance'),
    buildMetricOption('range'),
    buildMetricOption('count'),
    buildMetricOption('distinct_count'),
  ],
  category: [
    buildMetricOption('frequency'),
    buildMetricOption('mode'),
    buildMetricOption('distinct_count'),
    buildMetricOption('count'),
  ],
  date: [
    buildMetricOption('earliest'),
    buildMetricOption('latest'),
    { key: 'range_seconds', label: resolveMetricLabel('range') },
    buildMetricOption('count'),
  ],
  ordered: [
    buildMetricOption('frequency'),
    buildMetricOption('mode'),
    buildMetricOption('median_rank'),
    buildMetricOption('count'),
  ],
}

export const DEFAULT_SELECTED_METRICS = {
  numeric: ['mean', 'median', 'min', 'max', 'count'],
  category: ['frequency', 'mode', 'distinct_count'],
  date: ['earliest', 'latest', 'range_seconds'],
  ordered: ['frequency', 'mode', 'median_rank'],
}

export const SEMANTIC_OVERRIDE_OPTIONS = [
  { value: 'metric', label: translateDefinition(SEMANTIC_TYPE_LABEL_DEFINITIONS.metric) },
  { value: 'nominal', label: translateDefinition(SEMANTIC_TYPE_LABEL_DEFINITIONS.nominal) },
  { value: 'ordinal', label: translateDefinition(SEMANTIC_TYPE_LABEL_DEFINITIONS.ordinal) },
  { value: 'temporal', label: translateDefinition(SEMANTIC_TYPE_LABEL_DEFINITIONS.temporal) },
  { value: 'identifier', label: translateDefinition(SEMANTIC_TYPE_LABEL_DEFINITIONS.identifier) },
  { value: 'binary', label: translateDefinition(SEMANTIC_TYPE_LABEL_DEFINITIONS.binary) },
  { value: 'ignored', label: translateDefinition(SEMANTIC_TYPE_LABEL_DEFINITIONS.ignored) },
]

export const buildMetricOptions = (t = identity) => ({
  numeric: METRIC_OPTIONS.numeric.map((item) => ({ ...item, label: resolveMetricLabel(item.key, t) })),
  category: METRIC_OPTIONS.category.map((item) => ({ ...item, label: resolveMetricLabel(item.key, t) })),
  date: METRIC_OPTIONS.date.map((item) => ({
    ...item,
    label: item.key === 'range_seconds' ? resolveMetricLabel('range', t) : resolveMetricLabel(item.key, t),
  })),
  ordered: METRIC_OPTIONS.ordered.map((item) => ({ ...item, label: resolveMetricLabel(item.key, t) })),
})

export const buildSemanticOverrideOptions = (t = identity) => (
  Object.entries(SEMANTIC_TYPE_LABEL_DEFINITIONS).map(([value, definition]) => ({
    value,
    label: translateDefinition(definition, t),
  }))
)

export const semanticTypeLabel = (semanticType, t = identity) => {
  const definition = SEMANTIC_TYPE_LABEL_DEFINITIONS[semanticType]
  if (!definition) return semanticType
  return translateDefinition(definition, t)
}

export const metricLabel = (metricKey, t = identity) => {
  return resolveMetricLabel(metricKey, t)
}
