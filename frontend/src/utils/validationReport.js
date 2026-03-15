const EMPTY_REVIEW_SUMMARY = {
  import_status: 'imported_clean',
  rows_total: 0,
  rows_checked: 0,
  rows_imported: 0,
  rows_skipped: 0,
  columns_detected: 0,
  problematic_columns: 0,
  normalized_cells: 0,
  nullified_cells: 0,
}

const MAX_VISIBLE_SAMPLES_PER_COLUMN = 5

export const normalizeValidationReport = (report) => {
  if (!report || typeof report !== 'object') return null

  const summary = extractValidationSummary(report)
  const problemColumns = extractProblematicColumns(report)

  if (summary.problematic_columns <= 0) {
    summary.problematic_columns = problemColumns.length
  }

  return {
    summary,
    dataset: report.dataset || {},
    problem_columns: problemColumns,
    blocking_error: normalizeBlockingError(report.blocking_error),
  }
}

export const extractValidationSummary = (reportOrSummary = {}) => {
  const rawSummary = reportOrSummary?.summary && typeof reportOrSummary.summary === 'object'
    ? reportOrSummary.summary
    : reportOrSummary
  const merged = { ...EMPTY_REVIEW_SUMMARY, ...(rawSummary || {}) }

  return {
    import_status: String(merged.import_status || 'imported_clean'),
    rows_total: numberOrZero(merged.rows_total),
    rows_checked: numberOrZero(merged.rows_checked) || numberOrZero(merged.rows_total),
    rows_imported: numberOrZero(merged.rows_imported),
    rows_skipped: numberOrZero(merged.rows_skipped),
    columns_detected: numberOrZero(merged.columns_detected),
    problematic_columns: numberOrZero(merged.problematic_columns),
    normalized_cells: numberOrZero(merged.normalized_cells),
    nullified_cells: numberOrZero(merged.nullified_cells),
  }
}

export const extractProblematicColumns = (reportOrColumns = []) => {
  const rawColumns = Array.isArray(reportOrColumns)
    ? reportOrColumns
    : reportOrColumns?.problem_columns
  if (!Array.isArray(rawColumns)) return []

  const normalized = rawColumns.map((column) => {
    const reviewSamples = normalizeReviewSamples(column?.review_samples)
    const visibleReviewSamples = selectVisibleReviewSamples(reviewSamples)

    return {
      column_index: numberOrZero(column?.column_index ?? column?.columnIndex),
      column_name: String(column?.column_name ?? column?.name ?? 'Unknown'),
      problematic_value_count: numberOrZero(
        column?.problematic_value_count ?? column?.issue_count
      ),
      normalized_count: numberOrZero(column?.normalized_count),
      nullified_count: numberOrZero(column?.nullified_count),
      review_samples: reviewSamples,
      visible_review_samples: visibleReviewSamples,
      hidden_review_sample_count: Math.max(0, reviewSamples.length - visibleReviewSamples.length),
    }
  })

  return normalized.sort((a, b) => {
    if (a.problematic_value_count !== b.problematic_value_count) {
      return b.problematic_value_count - a.problematic_value_count
    }
    if (a.nullified_count !== b.nullified_count) {
      return b.nullified_count - a.nullified_count
    }
    return a.column_name.localeCompare(b.column_name)
  })
}

export const buildValidationSummaryLine = (summaryLike = {}) => {
  const summary = extractValidationSummary(summaryLike)
  return `${summary.rows_imported} imported, ${summary.rows_skipped} skipped, ${summary.problematic_columns} problematic columns, ${summary.normalized_cells} normalized, ${summary.nullified_cells} may become null.`
}

export const formatReviewValue = (value) => {
  if (value === null || value === undefined || value === '') return 'null'
  return String(value)
}

const normalizeReviewSamples = (samples) => {
  if (!Array.isArray(samples)) return []

  return samples
    .map((sample) => ({
      row: numberOrZero(sample?.row),
      original_value: normalizeSampleValue(sample?.original_value),
      action: sample?.action === 'nullified' ? 'nullified' : 'normalized',
      new_value: normalizeSampleValue(sample?.new_value),
      reason: String(sample?.reason || 'Value normalized'),
    }))
    .filter((sample) => sample.row > 0)
}

const selectVisibleReviewSamples = (samples) => {
  if (!Array.isArray(samples) || samples.length === 0) return []

  const meaningful = samples.filter((sample) => !isEmptyMarkerSample(sample))
  return meaningful.slice(0, MAX_VISIBLE_SAMPLES_PER_COLUMN)
}

const normalizeBlockingError = (blockingError) => {
  if (!blockingError || typeof blockingError !== 'object') return null
  const code = String(blockingError.code || '').trim()
  const message = String(blockingError.message || '').trim()

  if (!code && !message) return null

  return {
    code,
    message,
    metadata: blockingError.metadata && typeof blockingError.metadata === 'object'
      ? blockingError.metadata
      : {},
  }
}

const normalizeSampleValue = (value) => {
  if (value === undefined || value === '') return null
  return value
}

const isEmptyMarkerSample = (sample) => {
  if (!sample || sample.action !== 'nullified') return false

  const reason = String(sample.reason || '').toLowerCase()
  if (reason.includes('empty marker') || reason.includes('empty value')) return true

  return isEmptyValue(sample.original_value) && sample.new_value === null
}

const isEmptyValue = (value) => value === null || value === undefined || value === ''

const numberOrZero = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export const createEmptyReviewSummary = () => ({ ...EMPTY_REVIEW_SUMMARY })
