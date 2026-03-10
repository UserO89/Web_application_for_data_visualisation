import { computed, ref } from 'vue'
import { projectsApi } from '../../api/projects'
import {
  SEVERITY_ORDER,
  formatIssueTarget,
  groupIssuesBySeverity,
  normalizeValidationReport,
  toColumnQualityRows,
} from '../../utils/validationReport'
import {
  buildRowUpdateValues,
  cellField,
  formatIssueValue,
  normalizeDraftValue,
  readJsonStorage,
  removeStorageItem,
  resolveProjectId,
  writeJsonStorage,
} from '../../utils/project'

const VALIDATION_STORAGE_PREFIX = 'dataviz.validation.report.v1.'

export const useValidationReport = ({
  projectId,
  sortedDatasetColumns,
  tableRows,
} = {}) => {
  const importValidation = ref(null)
  const validationModalOpen = ref(false)
  const validationDrafts = ref({})
  const savingValidation = ref(false)
  const validationSaveState = ref('')

  const severityOrder = SEVERITY_ORDER

  const validationSummary = computed(() => importValidation.value?.summary || {})
  const validationIssuesBySeverity = computed(() =>
    groupIssuesBySeverity(importValidation.value?.issues || [])
  )
  const validationColumnRows = computed(() =>
    toColumnQualityRows(importValidation.value?.columns || [])
  )
  const validationIssueCount = computed(() => {
    const summaryCount = Number(validationSummary.value?.issue_count || 0)
    if (summaryCount > 0) return summaryCount
    return (importValidation.value?.issues || []).length
  })
  const editableValidationIssueCount = computed(() =>
    (importValidation.value?.issues || []).filter((issue) => resolveIssueTarget(issue)).length
  )
  const validationSummaryLine = computed(() => {
    const summary = validationSummary.value || {}
    return `${summary.rows_imported || 0} rows imported, ${summary.rows_skipped || 0} rows skipped, ${summary.columns_detected || 0} columns detected.`
  })

  const validationKey = () => `${VALIDATION_STORAGE_PREFIX}${resolveProjectId(projectId)}`

  const persistValidation = () => {
    if (!importValidation.value) {
      removeStorageItem(validationKey())
      return
    }
    writeJsonStorage(validationKey(), importValidation.value)
  }

  const loadValidation = () => {
    const parsed = readJsonStorage(validationKey(), null)
    return normalizeValidationReport(parsed)
  }

  const setValidationReport = (report, open = false) => {
    importValidation.value = normalizeValidationReport(report)
    validationDrafts.value = {}
    validationSaveState.value = ''
    validationModalOpen.value = Boolean(open && importValidation.value)
    persistValidation()
  }

  const resolveIssueTarget = (issue) => {
    const rowNumber = Number(issue?.target?.row ?? issue?.row)
    const columnName = issue?.target?.column || issue?.column
    if (!Number.isInteger(rowNumber) || rowNumber < 1 || !columnName) return null

    const column = sortedDatasetColumns.value.find((col) => col.name === columnName)
    if (!column) return null

    const rowIndex = rowNumber - 1
    const row = tableRows.value[rowIndex]
    if (!row?.id) return null

    return { rowNumber, rowIndex, row, field: cellField(column.position) }
  }

  const initValidationDrafts = () => {
    if (!importValidation.value?.issues?.length) {
      validationDrafts.value = {}
      return
    }

    const drafts = {}
    importValidation.value.issues.forEach((issue, idx) => {
      const target = resolveIssueTarget(issue)
      if (!target) return
      const currentValue = tableRows.value[target.rowIndex]?.[target.field]
      drafts[idx] = currentValue === null || currentValue === undefined ? '' : String(currentValue)
    })
    validationDrafts.value = drafts
  }

  const openValidationModal = () => {
    if (!importValidation.value) return
    initValidationDrafts()
    validationSaveState.value = ''
    validationModalOpen.value = true
  }

  const closeValidationModal = () => {
    validationModalOpen.value = false
  }

  const clearValidationReport = () => {
    setValidationReport(null, false)
  }

  const formatIssueTargetLabel = (issue) => formatIssueTarget(issue)

  const applyValidationReportFromProject = (reportFromProject) => {
    const backendValidation = normalizeValidationReport(reportFromProject)
    if (backendValidation) {
      setValidationReport(backendValidation, false)
      return
    }
    if (!importValidation.value) {
      importValidation.value = loadValidation()
    }
  }

  const applyValidationEdits = async ({ reloadProjectData, rebuildChart } = {}) => {
    if (!importValidation.value?.issues?.length) {
      validationSaveState.value = 'No validation issues to edit.'
      return
    }

    savingValidation.value = true
    validationSaveState.value = ''

    try {
      const rowsToUpdate = new Map()
      let changedCells = 0

      importValidation.value.issues.forEach((issue, idx) => {
        const target = resolveIssueTarget(issue)
        if (!target) return

        const nextValue = normalizeDraftValue(validationDrafts.value[idx])
        const currentValueRaw = tableRows.value[target.rowIndex]?.[target.field]
        const currentValue = currentValueRaw === '' ? null : currentValueRaw
        if (String(currentValue ?? '') === String(nextValue ?? '')) return

        tableRows.value[target.rowIndex][target.field] = nextValue
        rowsToUpdate.set(target.row.id, target.rowIndex)
        changedCells += 1

        if (importValidation.value?.issues?.[idx]) {
          importValidation.value.issues[idx].fixed = nextValue
        }
      })

      if (rowsToUpdate.size === 0) {
        validationSaveState.value = 'No changes to save.'
        return
      }

      for (const [rowId, rowIndex] of rowsToUpdate.entries()) {
        const row = tableRows.value[rowIndex]
        const values = buildRowUpdateValues(row, sortedDatasetColumns.value, { emptyStringAsNull: true })
        await projectsApi.updateRow(resolveProjectId(projectId), rowId, values)
      }

      persistValidation()
      if (typeof reloadProjectData === 'function') {
        await reloadProjectData({ rebuildSchema: true })
      }
      if (typeof rebuildChart === 'function') {
        rebuildChart()
      }
      initValidationDrafts()
      validationSaveState.value = `Saved ${changedCells} cell change${changedCells === 1 ? '' : 's'}.`
    } catch (e) {
      console.error(e)
      validationSaveState.value = 'Failed to save validation edits.'
    } finally {
      savingValidation.value = false
    }
  }

  const resetValidationRouteState = () => {
    importValidation.value = null
    validationModalOpen.value = false
    validationDrafts.value = {}
    validationSaveState.value = ''
    savingValidation.value = false
  }

  return {
    importValidation,
    validationModalOpen,
    validationDrafts,
    validationSaveState,
    savingValidation,
    severityOrder,
    validationSummary,
    validationIssueCount,
    editableValidationIssueCount,
    validationIssuesBySeverity,
    validationColumnRows,
    validationSummaryLine,
    setValidationReport,
    clearValidationReport,
    openValidationModal,
    closeValidationModal,
    initValidationDrafts,
    resolveIssueTarget,
    applyValidationEdits,
    applyValidationReportFromProject,
    persistValidation,
    loadValidation,
    formatIssueValue,
    formatIssueTargetLabel,
    resetValidationRouteState,
  }
}
