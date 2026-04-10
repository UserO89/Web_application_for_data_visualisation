import { chartCommonLabel, formatChartNumber } from '../ui/i18n'

const emptyDefinition = (type) => ({ type, labels: [], datasets: [] })

const buildNumericColumns = (rows, columns, parseNumericCell) =>
  columns
    .map((column) => ({
      field: column.field,
      name: column.title,
      values: rows
        .map((row) => parseNumericCell(row[column.field]))
        .filter((value) => Number.isFinite(value)),
    }))
    .filter((column) => column.values.length > 0)

const buildScatterDefinition = (numericColumns, rows, parseNumericCell, getSeriesColor) => {
  if (numericColumns.length < 2) return emptyDefinition('scatter')

  const xColumn = numericColumns[0]
  const yColumn = numericColumns[1]
  const label = `${yColumn.name} vs ${xColumn.name}`
  const points = rows
    .map((row) => ({
      x: parseNumericCell(row[xColumn.field]),
      y: parseNumericCell(row[yColumn.field]),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))

  if (!points.length) return emptyDefinition('scatter')

  return {
    type: 'scatter',
    labels: [],
    datasets: [{
      label,
      data: points,
      color: getSeriesColor(label, 0),
      xField: xColumn.name,
      yField: yColumn.name,
    }],
  }
}

const formatBinLabel = (value) => {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded)
    ? formatChartNumber(rounded)
    : formatChartNumber(rounded, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const buildHistogramDefinition = (numericColumns, getSeriesColor) => {
  if (!numericColumns.length) return emptyDefinition('histogram')

  const target = numericColumns[0]
  const values = target.values
  const min = Math.min(...values)
  const max = Math.max(...values)

  if (!Number.isFinite(min) || !Number.isFinite(max)) return emptyDefinition('histogram')

  if (min === max) {
    return {
      type: 'histogram',
      labels: [formatBinLabel(min)],
      datasets: [{
        label: `${target.name} frequency`,
        data: [values.length],
        color: getSeriesColor(target.name, 0),
      }],
      meta: {
        xAxisLabel: target.name,
        yAxisLabel: chartCommonLabel('frequency', 'Frequency'),
      },
    }
  }

  const binCount = Math.min(20, Math.max(5, Math.round(Math.sqrt(values.length))))
  const width = (max - min) / binCount
  const bins = Array(binCount).fill(0)

  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.floor((value - min) / width))
    bins[index] += 1
  })

  const labels = bins.map((_, index) => {
    const start = min + index * width
    const end = index === binCount - 1 ? max : start + width
    return `${formatBinLabel(start)}-${formatBinLabel(end)}`
  })

  return {
    type: 'histogram',
    labels,
    datasets: [{
      label: `${target.name} frequency`,
      data: bins,
      color: getSeriesColor(target.name, 0),
    }],
    meta: {
      xAxisLabel: target.name,
      yAxisLabel: chartCommonLabel('frequency', 'Frequency'),
    },
  }
}

const buildBoxplotDefinition = (numericColumns, getSeriesColor) => {
  if (!numericColumns.length) return emptyDefinition('boxplot')

  return {
    type: 'boxplot',
    labels: numericColumns.map((column) => column.name),
    datasets: numericColumns.map((column, index) => ({
      label: column.name,
      values: column.values,
      color: getSeriesColor(column.name, index),
    })),
  }
}

const buildCategoryDefinition = (chartType, rows, columns, parseNumericCell, getSeriesColor) => {
  const labelField = columns[0]?.field
  const labels = rows.map((row) => String(row[labelField] ?? ''))
  const datasets = []

  columns.slice(1).forEach((column) => {
    const values = rows.map((row) => parseNumericCell(row[column.field]))
    if (values.some((value) => !Number.isNaN(value))) {
      datasets.push({
        label: column.title,
        data: values.map((value) => (Number.isNaN(value) ? 0 : value)),
        color: getSeriesColor(column.title, datasets.length),
      })
    }
  })

  const fallbackDataset = {
    label: chartCommonLabel('values', 'Values'),
    data: rows.map((row) => parseNumericCell(row[labelField]) || 0),
    color: getSeriesColor(chartCommonLabel('values', 'Values'), 0),
  }

  return {
    type: chartType,
    labels,
    datasets: datasets.length ? datasets : [fallbackDataset],
  }
}

export const buildChartDefinition = ({
  chartType,
  tableRows,
  tableColumns,
  parseNumericCell,
  getSeriesColor,
}) => {
  if (!Array.isArray(tableRows) || !tableRows.length || !Array.isArray(tableColumns) || !tableColumns.length) {
    return emptyDefinition(chartType || 'line')
  }

  const type = chartType || 'line'
  const rows = tableRows
  const columns = tableColumns
  const numericColumns = buildNumericColumns(rows, columns, parseNumericCell)

  if (type === 'boxplot') return buildBoxplotDefinition(numericColumns, getSeriesColor)
  if (type === 'scatter') return buildScatterDefinition(numericColumns, rows, parseNumericCell, getSeriesColor)
  if (type === 'histogram') return buildHistogramDefinition(numericColumns, getSeriesColor)

  return buildCategoryDefinition(type, rows, columns, parseNumericCell, getSeriesColor)
}
