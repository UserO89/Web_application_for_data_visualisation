const DEFAULT_SUMMARY = {
  import_status: 'imported_clean',
  rows_total: 0,
  rows_checked: 0,
  rows_imported: 0,
  rows_skipped: 0,
  columns_detected: 0,
  error_count: 0,
  warning_count: 0,
  info_count: 0,
  issue_count: 0,
}

export const SEVERITY_ORDER = ['error', 'warning', 'info']

export const normalizeValidationReport = (report) => {
  if (!report || typeof report !== 'object') return null

  const summary = { ...DEFAULT_SUMMARY, ...(report.summary || {}) }
  const issues = Array.isArray(report.issues) ? report.issues : []
  const columns = Array.isArray(report.columns) ? report.columns : []
  summary.rows_checked = Number.isFinite(summary.rows_checked) && summary.rows_checked > 0
    ? summary.rows_checked
    : (summary.rows_total || 0)
  summary.issue_count = summary.issue_count || (summary.error_count + summary.warning_count + summary.info_count)

  return {
    ...report,
    summary,
    issues,
    columns,
  }
}

export const groupIssuesBySeverity = (issues = []) => ({
  error: issues.filter((issue) => issue?.severity === 'error'),
  warning: issues.filter((issue) => issue?.severity === 'warning'),
  info: issues.filter((issue) => !issue?.severity || issue?.severity === 'info'),
})

export const formatIssueTarget = (issue) => {
  const target = issue?.target || {}
  if (target.level === 'column' && target.column) {
    return `Column ${target.column}`
  }
  if (target.level === 'row' && Number.isInteger(target.row)) {
    if (target.column) return `Row ${target.row}, ${target.column}`
    return `Row ${target.row}`
  }
  if (issue?.column && Number.isInteger(issue?.row)) {
    return `Row ${issue.row}, ${issue.column}`
  }
  if (issue?.column) return `Column ${issue.column}`
  return 'Dataset'
}

export const toColumnQualityRows = (columns = []) =>
  columns.map((column) => ({
    name: column?.name || 'Unknown',
    type: column?.detectedPhysicalType || 'unknown',
    status: column?.status || 'ok',
    note: column?.note || 'No issues detected.',
  }))
