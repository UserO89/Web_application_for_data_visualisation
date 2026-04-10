import { chartAggregationLabel, chartCommonLabel, formatChartNumber } from '../ui/i18n'

const toCleanString = (value) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text) return null
  const lowered = text.toLowerCase()
  if (['null', 'none', 'n/a', 'na', '-'].includes(lowered)) return null
  return text
}

const toNumber = (value) => {
  const text = toCleanString(value)
  if (!text) return NaN
  const cleaned = text.replace(/\s+/g, '').replace(',', '.')
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : NaN
}

const aggregate = (values, mode) => {
  const finite = (values || []).filter((v) => Number.isFinite(v))
  if (mode === 'count') return finite.length
  if (!finite.length) return null

  if (mode === 'sum') return finite.reduce((acc, value) => acc + value, 0)
  if (mode === 'avg') return finite.reduce((acc, value) => acc + value, 0) / finite.length
  if (mode === 'min') return Math.min(...finite)
  if (mode === 'max') return Math.max(...finite)
  if (mode === 'median') {
    const sorted = [...finite].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  }
  return finite.reduce((acc, value) => acc + value, 0)
}

const sortLabels = (labels, column, categoryToValueMap = null) => {
  if (!Array.isArray(labels)) return []

  if (column?.semanticType === 'temporal') {
    return [...labels].sort((a, b) => {
      const da = Date.parse(a)
      const db = Date.parse(b)
      if (Number.isNaN(da) || Number.isNaN(db)) return String(a).localeCompare(String(b))
      return da - db
    })
  }

  if (column?.semanticType === 'ordinal' && Array.isArray(column?.ordinalOrder) && column.ordinalOrder.length) {
    const rank = Object.fromEntries(column.ordinalOrder.map((value, index) => [String(value), index]))
    return [...labels].sort((a, b) => {
      const ra = rank[String(a)]
      const rb = rank[String(b)]
      if (ra === undefined && rb === undefined) return String(a).localeCompare(String(b))
      if (ra === undefined) return 1
      if (rb === undefined) return -1
      return ra - rb
    })
  }

  if (categoryToValueMap) {
    return [...labels].sort((a, b) => {
      const va = categoryToValueMap[a] ?? 0
      const vb = categoryToValueMap[b] ?? 0
      if (vb === va) return String(a).localeCompare(String(b))
      return vb - va
    })
  }

  return [...labels]
}

const getColumnById = (schemaColumns, id) =>
  (schemaColumns || []).find((column) => Number(column.id) === Number(id))

const rowValue = (row, column) => {
  if (!column || !row) return null
  return row[column.fieldKey]
}

const buildLineOrBar = ({ type, definition, schemaColumns, rows, getSeriesColor }) => {
  const xColumn = getColumnById(schemaColumns, definition.bindings.x)
  const groupColumn = getColumnById(schemaColumns, definition.bindings.group)
  const yBinding = definition.bindings.y
  const yColumn = getColumnById(schemaColumns, yBinding.field)

  const xGroupBuckets = new Map()
  rows.forEach((row) => {
    const xRaw = rowValue(row, xColumn)
    const x = toCleanString(xRaw)
    if (!x) return

      const group = groupColumn
        ? (toCleanString(rowValue(row, groupColumn)) || chartCommonLabel('unknown', 'Unknown'))
        : chartCommonLabel('series', 'Series')
    let y = null
    if (yBinding.aggregation === 'count') {
      y = 1
    } else {
      y = toNumber(rowValue(row, yColumn))
      if (!Number.isFinite(y)) return
    }

    if (!xGroupBuckets.has(x)) {
      xGroupBuckets.set(x, new Map())
    }
    const perGroup = xGroupBuckets.get(x)
    if (!perGroup.has(group)) {
      perGroup.set(group, [])
    }
    perGroup.get(group).push(y)
  })

  const labels = sortLabels(Array.from(xGroupBuckets.keys()), xColumn)
  const groupNames = new Set()
  xGroupBuckets.forEach((perGroup) => {
    perGroup.forEach((_, name) => groupNames.add(name))
  })

  const datasets = Array.from(groupNames).map((groupName, index) => ({
    label: groupName,
    data: labels.map((label) => {
      const values = xGroupBuckets.get(label)?.get(groupName) || []
      const result = aggregate(values, yBinding.aggregation)
      return result === null ? 0 : result
    }),
    color: getSeriesColor(groupName, index),
  }))

  return {
    type,
    labels,
    datasets,
    meta: {
      xAxisLabel: xColumn?.name || '',
      yAxisLabel: yBinding.aggregation === 'count'
        ? chartAggregationLabel('count')
        : `${chartAggregationLabel(yBinding.aggregation).toUpperCase()}(${yColumn?.name || ''})`,
    },
  }
}

const buildScatter = ({ definition, schemaColumns, rows, getSeriesColor }) => {
  const xColumn = getColumnById(schemaColumns, definition.bindings.x)
  const yColumn = getColumnById(schemaColumns, definition.bindings.y?.field)
  const groupColumn = getColumnById(schemaColumns, definition.bindings.group)

  const grouped = new Map()
  rows.forEach((row) => {
    const x = toNumber(rowValue(row, xColumn))
    const y = toNumber(rowValue(row, yColumn))
    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    const group = groupColumn
      ? (toCleanString(rowValue(row, groupColumn)) || chartCommonLabel('unknown', 'Unknown'))
      : chartCommonLabel('series', 'Series')
    if (!grouped.has(group)) grouped.set(group, [])
    grouped.get(group).push({ x, y })
  })

  const datasets = Array.from(grouped.entries()).map(([label, data], index) => ({
    label,
    data,
    xField: xColumn?.name,
    yField: yColumn?.name,
    color: getSeriesColor(label, index),
  }))

  return {
    type: 'scatter',
    labels: [],
    datasets,
    meta: {
      xAxisLabel: xColumn?.name || '',
      yAxisLabel: yColumn?.name || '',
    },
  }
}

const buildHistogram = ({ definition, schemaColumns, rows, getSeriesColor }) => {
  const settings = definition?.settings || {}
  const valueColumn = getColumnById(schemaColumns, definition.bindings.value?.field)
  const values = rows
    .map((row) => toNumber(rowValue(row, valueColumn)))
    .filter((value) => Number.isFinite(value))

  if (!values.length) {
    return { type: 'histogram', labels: [], datasets: [] }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    return {
      type: 'histogram',
      labels: [String(min)],
      datasets: [{
        label: `${valueColumn?.name || chartCommonLabel('value', 'Value')} ${chartCommonLabel('frequency', 'frequency').toLowerCase()}`,
        data: [values.length],
        color: getSeriesColor(valueColumn?.name || chartCommonLabel('value', 'Value'), 0),
      }],
      meta: {
        xAxisLabel: valueColumn?.name || chartCommonLabel('value', 'Value'),
        yAxisLabel: settings.densityMode === 'density'
          ? chartCommonLabel('density', 'Density')
          : chartCommonLabel('frequency', 'Frequency'),
      },
    }
  }

  const requestedBins = Number(settings?.bins)
  const autoBins = Math.min(20, Math.max(5, Math.round(Math.sqrt(values.length))))
  const binCount = Number.isFinite(requestedBins) ? Math.min(100, Math.max(3, Math.round(requestedBins))) : autoBins
  const width = (max - min) / binCount
  const bins = Array(binCount).fill(0)

  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.floor((value - min) / width))
    bins[index] += 1
  })

  const labels = bins.map((_, index) => {
    const start = min + index * width
    const end = index === binCount - 1 ? max : start + width
    return `${formatChartNumber(start, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}-${formatChartNumber(end, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  })

  const densityMode = settings?.densityMode === 'density' ? 'density' : 'frequency'
  const outputValues = densityMode === 'density'
    ? bins.map((count) => count / (values.length * width))
    : bins

  const sorted = [...values].sort((a, b) => a - b)
  const mean = sorted.reduce((acc, value) => acc + value, 0) / sorted.length
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
  const markerIndex = (markerValue) => Math.min(binCount - 1, Math.max(0, Math.floor((markerValue - min) / width)))
  const markers = []
  if (settings?.showMeanMarker) {
    markers.push({ name: chartAggregationLabel('avg'), index: markerIndex(mean), value: mean })
  }
  if (settings?.showMedianMarker) {
    markers.push({ name: chartAggregationLabel('median'), index: markerIndex(median), value: median })
  }

  return {
    type: 'histogram',
    labels,
    datasets: [{
      label: `${valueColumn?.name || chartCommonLabel('value', 'Value')} ${
        densityMode === 'density'
          ? chartCommonLabel('density', 'density').toLowerCase()
          : chartCommonLabel('frequency', 'frequency').toLowerCase()
      }`,
      data: outputValues,
      color: getSeriesColor(valueColumn?.name || chartCommonLabel('value', 'Value'), 0),
    }],
    meta: {
      xAxisLabel: valueColumn?.name || chartCommonLabel('value', 'Value'),
      yAxisLabel: densityMode === 'density'
        ? chartCommonLabel('density', 'Density')
        : chartCommonLabel('frequency', 'Frequency'),
      histogramMarkers: markers,
    },
  }
}

const buildBoxplot = ({ definition, schemaColumns, rows, getSeriesColor }) => {
  const settings = definition?.settings || {}
  const valueColumn = getColumnById(schemaColumns, definition.bindings.value?.field)
  const groupColumn = getColumnById(schemaColumns, definition.bindings.group)

  const groups = new Map()
  rows.forEach((row) => {
    const value = toNumber(rowValue(row, valueColumn))
    if (!Number.isFinite(value)) return
    const key = groupColumn
      ? (toCleanString(rowValue(row, groupColumn)) || chartCommonLabel('unknown', 'Unknown'))
      : (valueColumn?.name || chartCommonLabel('values', 'Values'))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(value)
  })

  const labels = sortLabels(Array.from(groups.keys()), groupColumn)
  const datasets = labels.map((label, index) => ({
    label,
    values: groups.get(label) || [],
    color: getSeriesColor(label, index),
  }))

  return {
    type: 'boxplot',
    labels,
    datasets,
    meta: {
      xAxisLabel: groupColumn?.name || valueColumn?.name || '',
      yAxisLabel: valueColumn?.name || '',
      orientation: settings.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      showOutliers: settings.showOutliers !== false,
      showMean: Boolean(settings.showMean),
    },
  }
}

const buildPie = ({ definition, schemaColumns, rows, getSeriesColor }) => {
  const categoryColumn = getColumnById(schemaColumns, definition.bindings.category)
  const valueBinding = definition.bindings.value
  const valueColumn = getColumnById(schemaColumns, valueBinding.field)

  const bucket = new Map()
  rows.forEach((row) => {
    const category = toCleanString(rowValue(row, categoryColumn))
    if (!category) return

    let value = null
    if (valueBinding.aggregation === 'count') {
      value = 1
    } else {
      value = toNumber(rowValue(row, valueColumn))
      if (!Number.isFinite(value)) return
    }

    if (!bucket.has(category)) bucket.set(category, [])
    bucket.get(category).push(value)
  })

  const categoryToValue = {}
  bucket.forEach((values, category) => {
    categoryToValue[category] = aggregate(values, valueBinding.aggregation) || 0
  })

  const labels = sortLabels(Array.from(bucket.keys()), categoryColumn, categoryToValue)
  const data = labels.map((label) => categoryToValue[label] || 0)

  return {
    type: 'pie',
    labels,
    datasets: [{
      label: valueBinding.aggregation === 'count'
        ? chartAggregationLabel('count')
        : `${chartAggregationLabel(valueBinding.aggregation).toUpperCase()}(${valueColumn?.name || ''})`,
      data,
      color: getSeriesColor(categoryColumn?.name || chartCommonLabel('category', 'Category'), 0),
    }],
    meta: {},
  }
}

export const buildSemanticChartData = ({ definition, schemaColumns, rows, getSeriesColor }) => {
  const chartType = definition?.chartType || 'line'

  if (chartType === 'line') return buildLineOrBar({ type: 'line', definition, schemaColumns, rows, getSeriesColor })
  if (chartType === 'bar') return buildLineOrBar({ type: 'bar', definition, schemaColumns, rows, getSeriesColor })
  if (chartType === 'scatter') return buildScatter({ definition, schemaColumns, rows, getSeriesColor })
  if (chartType === 'histogram') return buildHistogram({ definition, schemaColumns, rows, getSeriesColor })
  if (chartType === 'boxplot') return buildBoxplot({ definition, schemaColumns, rows, getSeriesColor })
  if (chartType === 'pie') return buildPie({ definition, schemaColumns, rows, getSeriesColor })

  return { type: chartType, labels: [], datasets: [] }
}
