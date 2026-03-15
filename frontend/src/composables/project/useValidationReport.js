import { computed, ref } from 'vue'
import {
  buildValidationSummaryLine,
  createEmptyReviewSummary,
  extractProblematicColumns,
  extractValidationSummary,
  normalizeValidationReport,
} from '../../utils/validationReport'
import {
  readJsonStorage,
  removeStorageItem,
  resolveProjectId,
  writeJsonStorage,
} from '../../utils/project'

const VALIDATION_STORAGE_PREFIX = 'dataviz.validation.report.v2.'

export const useValidationReport = ({
  projectId,
} = {}) => {
  const importValidation = ref(null)
  const validationModalOpen = ref(false)
  const emptySummary = createEmptyReviewSummary()

  const hasValidationReport = computed(() => Boolean(importValidation.value))
  const validationSummary = computed(() =>
    extractValidationSummary(importValidation.value?.summary || emptySummary)
  )
  const validationProblemColumns = computed(() =>
    extractProblematicColumns(importValidation.value)
  )
  const validationBlockingError = computed(() =>
    importValidation.value?.blocking_error || null
  )
  const validationProblemColumnCount = computed(() => {
    const reviewCount = Number(validationSummary.value?.problematic_columns || 0)
    if (reviewCount > 0) return reviewCount
    return validationProblemColumns.value.length
  })
  const validationSummaryLine = computed(() => {
    return buildValidationSummaryLine(validationSummary.value)
  })

  const validationKey = () => `${VALIDATION_STORAGE_PREFIX}${resolveProjectId(projectId)}`

  const persistValidationReport = () => {
    if (!importValidation.value) {
      removeStorageItem(validationKey())
      return
    }
    writeJsonStorage(validationKey(), importValidation.value)
  }

  const loadPersistedValidationReport = () => {
    const parsed = readJsonStorage(validationKey(), null)
    return normalizeValidationReport(parsed)
  }

  const setValidationReport = (report) => {
    importValidation.value = normalizeValidationReport(report)
    persistValidationReport()
  }

  const openValidationModal = () => {
    if (!importValidation.value) return
    validationModalOpen.value = true
  }

  const closeValidationModal = () => {
    validationModalOpen.value = false
  }

  const clearValidationReport = () => {
    importValidation.value = null
    validationModalOpen.value = false
    persistValidationReport()
  }

  const applyValidationReportFromProject = (reportFromProject) => {
    const backendValidation = normalizeValidationReport(reportFromProject)
    if (backendValidation) {
      setValidationReport(backendValidation)
      return
    }
    if (!importValidation.value) {
      importValidation.value = loadPersistedValidationReport()
    }
  }

  const resetValidationRouteState = () => {
    importValidation.value = null
    validationModalOpen.value = false
  }

  return {
    importValidation,
    hasValidationReport,
    validationModalOpen,
    validationSummary,
    validationProblemColumnCount,
    validationProblemColumns,
    validationBlockingError,
    validationSummaryLine,
    setValidationReport,
    clearValidationReport,
    openValidationModal,
    closeValidationModal,
    applyValidationReportFromProject,
    resetValidationRouteState,
  }
}
