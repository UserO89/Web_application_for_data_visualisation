<template>
  <div class="project-page app-content">
    <div v-if="loading" class="loading panel">{{ $t('common.loading') }}</div>
    <div v-else-if="!project" class="error panel">{{ projectError || $t('project.page.notFound') }}</div>

    <ProjectDatasetImportSection
      v-else-if="!project.dataset && !isReadOnly"
      :import-mode="importMode"
      :import-options="importOptions"
      :selected-file="selectedFile"
      :importing="importing"
      :manual-headers="manualHeaders"
      :manual-rows-input="manualRowsInput"
      :manual-error="manualError"
      @back="handleBack"
      @change-import-mode="importMode = $event"
      @change-import-options="importOptions = $event"
      @open-demo="openDemoProject"
      @file-select="handleFileSelect"
      @import="handleImport"
      @add-manual-column="addManualColumn"
      @remove-manual-column="removeManualColumn"
      @add-manual-row="addManualRow"
      @remove-manual-row="removeManualRow"
      @manual-import="handleManualImport"
      @change-manual-headers="manualHeaders = $event"
      @change-manual-rows="manualRowsInput = $event"
    />
    <div v-else-if="!project.dataset" class="panel demo-unavailable">
      {{ $t('project.page.demoUnavailable') }}
    </div>

    <div v-else>
      <div v-if="isReadOnly" class="panel demo-readonly-banner">
        {{ $t('project.page.demoReadonlyBanner') }}
      </div>

      <ProjectPageToolbar
        :view-mode="viewMode"
        :import-validation="importValidation"
        :validation-problem-column-count="validationProblemColumnCount"
        :read-only="isReadOnly"
        :back-label="backButtonLabel"
        @back="handleBack"
        @change-view-mode="setViewMode"
        @open-validation="openValidationModal"
      />

      <ProjectWorkspaceCanvas
        :view-mode="viewMode"
        :is-compact-workspace="isCompactWorkspace"
        :workspace-height="workspaceHeight"
        :visible-panel-ids="visiblePanelIds"
        :panel-config="workspacePanelConfig"
        :resize-dirs="resizeDirs"
        :panel-style="panelStyle"
        :set-workspace-ref="setWorkspaceCanvasRef"
        :set-chart-viewport-ref="setChartViewportElementRef"
        :table-columns="tableColumns"
        :table-rows="tableRows"
        :chart-viewport-style="chartViewportStyle"
        :chart-viewport-preset-value="chartViewportPresetValue"
        :chart-labels="chartLabels"
        :chart-datasets="chartDatasets"
        :chart-meta="chartMeta"
        :chart-type="chartType"
        :chart-definition="chartDefinition"
        :schema-columns="schemaColumns"
        :suggestions="suggestions"
        :statistics-summary="statisticsSummary"
        :statistics-loading="statisticsLoading"
        :statistics-error="statisticsError"
        :saved-charts="savedCharts"
        :saved-charts-loading="savedChartsLoading"
        :saved-charts-error="savedChartsError"
        :analysis-rows="analysisRows"
        :analysis-rows-ready="analysisRowsReady"
        :analysis-rows-loading="analysisRowsLoading"
        :analysis-rows-error="analysisRowsError"
        :schema-updating-column-id="schemaUpdatingColumnId"
        :get-series-color="getSeriesColor"
        :read-only="isReadOnly"
        :table-editable="!isReadOnly"
        @bring-to-front="handleBringToFront"
        @start-drag="handleStartDrag"
        @start-resize="handleStartResize"
        @cell-edit="handleCellEdit"
        @refresh-data="refreshData"
        @export-csv="exportTableCsv"
        @load-analysis-rows="handleLoadAnalysisRows"
        @set-chart-height="setChartViewportHeight"
        @update-chart-definition="handleChartDefinitionUpdate"
        @build-chart="handleBuildChart"
        @save-chart="saveCurrentChart"
        @set-series-color="handleSetSeriesColor"
        @reset-series-colors="resetSeriesColors"
        @change-semantic="handleSemanticTypeChange"
        @change-ordinal-order="handleOrdinalOrderChange"
        @refresh-saved-charts="loadSavedCharts"
        @rename-saved-chart="renameSavedChart"
        @download-saved-chart="downloadSavedChart"
        @delete-saved-chart="deleteSavedChart"
      />

    </div>

    <ProjectValidationModal
      :is-open="validationModalOpen"
      :summary="validationSummary"
      :summary-line="validationSummaryLine"
      :problem-columns="validationProblemColumns"
      :blocking-error="validationBlockingError"
      :show-dataset-binding-note="Boolean(project?.dataset)"
      @close="closeValidationModal"
      @clear="clearValidationReport"
    />
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ProjectDatasetImportSection, ProjectValidationModal, ProjectPageToolbar, ProjectWorkspaceCanvas, } from '../components/project'
import { projectsApi } from '../api/projects'
import { demoProjectsApi } from '../api/demo'
import { useDatasetSchemaStore } from '../stores/datasetSchema'
import { createDefaultChartDefinition, mergeChartDefinition } from '../charts/chartDefinitions/createUniversalChartDefinition'
import { normalizeChartDefinition } from '../charts/rules/chartDefinitionValidator'
import { cellField, buildCsvLines, buildRowUpdateValues } from '../utils/project'
import { useManualDatasetBuilder, useValidationReport, useProjectDataLoader, useProjectWorkspace, useProjectChartState, } from '../composables/project'
import { useProjectSavedCharts } from '../composables/project/useProjectSavedCharts'
import { useProjectChartViewportObserver } from '../composables/project/useProjectChartViewportObserver'
import { useNotifications } from '../composables/useNotifications'
import { extractApiErrorMessage } from '../utils/api/errors'

export default {
  name: 'ProjectPage',
  props: {
    mode: {
      type: String,
      default: 'project',
    },
  },
  components: {
    ProjectDatasetImportSection,
    ProjectValidationModal,
    ProjectPageToolbar,
    ProjectWorkspaceCanvas,
  },
  setup(props) {
    const { locale, t } = useI18n({ useScope: 'global' })
    const route = useRoute()
    const router = useRouter()
    const isReadOnly = computed(() => props.mode === 'demo')
    const projectId = computed(() => (
      isReadOnly.value ? 'demo' : String(route.params.id)
    ))
    const projectApi = computed(() => (isReadOnly.value ? demoProjectsApi : projectsApi))
    const backButtonLabel = computed(() => (
      isReadOnly.value ? t('project.page.backToHome') : t('project.page.backToProjects')
    ))
    const handleBack = () => {
      router.push(isReadOnly.value ? { name: 'home' } : { name: 'projects' })
    }
    const openDemoProject = () => {
      router.push({ name: 'project-demo' })
    }
    const workspaceRef = ref(null)
    const chartViewportRef = ref(null)
    const schemaStore = useDatasetSchemaStore()
    const notify = useNotifications()

    const selectedFile = ref(null)
    const importing = ref(false)
    const importOptions = ref({ has_header: true, delimiter: ',' })
    const importMode = ref('file')

    const {
      manualHeaders,
      manualRowsInput,
      manualError,
      addManualColumn,
      removeManualColumn,
      addManualRow,
      removeManualRow,
      prepareManualImportFile,
    } = useManualDatasetBuilder()

    const {
      project,
      loading,
      projectError,
      tableRows,
      analysisRows,
      analysisRowsReady,
      analysisRowsLoading,
      analysisRowsError,
      suggestions,
      statisticsSummary,
      statisticsLoading,
      statisticsError,
      loadProject,
      loadAnalysisRows,
      ensureAnalysisRowsLoaded,
      loadSuggestions,
      loadStatisticsSummary,
      reloadProjectData,
      refreshData: refreshProjectData,
      resetProjectDataState,
    } = useProjectDataLoader({
      projectId,
      schemaStore,
      apiClient: projectApi,
    })

    const sortedDatasetColumns = computed(() =>
      [...(project.value?.dataset?.columns || [])].sort((a, b) => Number(a.position) - Number(b.position))
    )
    const schemaColumns = computed(() =>
      (schemaStore.columns || [])
        .map((column) => ({
          ...column,
          fieldKey: cellField(column.position),
        }))
        .sort((a, b) => Number(a.position) - Number(b.position))
    )
    const schemaUpdatingColumnId = computed(() => schemaStore.updatingColumnId)

    const {
      importValidation,
      validationModalOpen,
      validationSummary,
      validationProblemColumnCount,
      validationProblemColumns,
      validationSummaryLine,
      validationBlockingError,
      setValidationReport,
      clearValidationReport,
      openValidationModal,
      closeValidationModal,
      applyValidationReportFromProject,
      resetValidationRouteState,
    } = useValidationReport({
      projectId,
    })

    const {
      panelConfig,
      resizeDirs,
      viewMode,
      isCompactWorkspace,
      visiblePanelIds,
      workspaceHeight,
      panelStyle,
      setViewMode,
      bringToFront,
      startDrag,
      startResize,
      saveLayouts,
      ensureWorkspaceInitializedForProject,
      resetWorkspaceRouteState,
      attachWorkspaceListeners,
      detachWorkspaceListeners,
    } = useProjectWorkspace({
      project,
      projectId,
      workspaceRef,
    })

    const workspacePanelConfig = computed(() => ({
      ...panelConfig,
      table: {
        ...(panelConfig.table || {}),
        subtitle: isReadOnly.value ? t('project.page.readOnlyDemo') : t('project.page.editable'),
      },
    }))

    const {
      chartType,
      chartDefinition,
      chartViewportHeight,
      chartViewportCustom,
      chartViewportPresetValue,
      chartViewportStyle,
      chartLabels,
      chartDatasets,
      chartMeta,
      seriesColors,
      loadSeriesColors,
      getSeriesColor,
      setSeriesColor,
      resetSeriesColors,
      setChartViewportHeight,
      syncViewportHeightFromResize,
      buildChart,
      clearChart,
    } = useProjectChartState({
      projectId,
      schemaColumns,
      analysisRows,
    })

    const {
      savedCharts,
      savedChartsLoading,
      savedChartsError,
      loadSavedCharts,
      saveCurrentChart,
      downloadSavedChart,
      renameSavedChart,
      deleteSavedChart,
      resetSavedChartsState,
    } = useProjectSavedCharts({
      projectId,
      project,
      isReadOnly,
      chartType,
      chartDefinition,
      chartLabels,
      chartDatasets,
      chartMeta,
      locale,
      setViewMode,
      notify,
      t,
    })

    const {
      observeChartViewport,
      disconnectChartViewportObserver,
    } = useProjectChartViewportObserver(syncViewportHeightFromResize)

    const nullAwareFormatter = (cell) => {
      const value = cell.getValue()
      const el = cell.getElement()
      if (value === null || value === undefined) {
        el?.classList.add('cell-null')
        return 'null'
      }
      el?.classList.remove('cell-null')
      return value
    }

    const tableColumns = computed(() =>
      sortedDatasetColumns.value.map((c) => ({
        title: c.name,
        field: cellField(c.position),
        metaType: c.type,
        editor: isReadOnly.value ? false : 'input',
        formatter: nullAwareFormatter,
      }))
    )

    const setWorkspaceCanvasRef = (element) => {
      workspaceRef.value = element
    }

    const setChartViewportElementRef = (element) => {
      chartViewportRef.value = element
    }

    const handleBringToFront = (panelId) => {
      bringToFront(panelId)
    }

    const handleStartDrag = ({ panelId, event }) => {
      startDrag(panelId, event)
    }

    const handleStartResize = ({ panelId, dir, event }) => {
      startResize(panelId, dir, event)
    }

    const areChartDefinitionsEqual = (left, right) =>
      left === right || JSON.stringify(normalizeChartDefinition(left)) === JSON.stringify(normalizeChartDefinition(right))

    const handleChartDefinitionUpdate = (nextDefinition) => {
      const normalized = normalizeChartDefinition(nextDefinition)
      if (areChartDefinitionsEqual(chartDefinition.value, normalized)) return
      chartDefinition.value = normalized
    }

    const handleSetSeriesColor = ({ label, index, color }) => {
      setSeriesColor(label, index, color)
    }

    let chartBuildFrameId = null
    let pendingChartDefinition = null

    const scheduleBuildChart = (definition = chartDefinition.value) => {
      pendingChartDefinition = definition
      if (chartBuildFrameId !== null) return

      chartBuildFrameId = requestAnimationFrame(() => {
        chartBuildFrameId = null
        const nextDefinition = pendingChartDefinition || chartDefinition.value
        pendingChartDefinition = null
        buildChart(nextDefinition)
      })
    }

    const loadAnalysisRowsForUi = async ({ force = false, notifyOnError = false } = {}) => {
      const loader = force ? loadAnalysisRows : ensureAnalysisRowsLoaded
      const rows = await loader({
        columns: sortedDatasetColumns.value,
        force,
      })

      if (!rows && notifyOnError && analysisRowsError.value) {
        notify.error(analysisRowsError.value)
      }

      return rows
    }

    const ensureAnalysisRowsForChart = async (definition = chartDefinition.value) => {
      const rows = await loadAnalysisRowsForUi({ notifyOnError: true })
      if (!rows) return false
      scheduleBuildChart(definition)
      return true
    }

    const reloadAllProjectData = async ({ rebuildSchema = true, includeAnalysisRows = false } = {}) => {
      await reloadProjectData({
        rebuildSchema,
        columns: sortedDatasetColumns.value,
        includeAnalysisRows,
      })
    }

    const resetDatasetState = ({ clearValidationReport = false } = {}) => {
      if (clearValidationReport) {
        setValidationReport(null)
      }
      seriesColors.value = {}
      resetProjectDataState()
      chartLabels.value = []
      chartDatasets.value = []
      chartMeta.value = {}
      chartDefinition.value = createDefaultChartDefinition('line')
      chartViewportHeight.value = 320
      chartViewportCustom.value = false
      resetSavedChartsState()
      schemaStore.applySchema(null)
    }

    const applySuggestedChartDefinition = () => {
      const suggested = suggestions.value[0]?.definition
      if (!suggested) {
        clearChart()
        return
      }
      chartDefinition.value = normalizeChartDefinition(
        mergeChartDefinition(createDefaultChartDefinition(suggested.chartType || 'line'), suggested)
      )
      if (analysisRowsReady.value) {
        scheduleBuildChart(chartDefinition.value)
      } else {
        clearChart()
      }
    }

    const handleProjectWithDataset = async (loadedProject) => {
      seriesColors.value = loadSeriesColors()
      await reloadAllProjectData({ rebuildSchema: false })
      if (!isReadOnly.value) {
        await loadSavedCharts()
      }
      applySuggestedChartDefinition()
      applyValidationReportFromProject(loadedProject?.dataset?.validation_report_json)
      await ensureWorkspaceInitializedForProject()
    }

    const loadProjectPage = async () => {
      await loadProject({
        onDatasetMissing: async () => {
          resetDatasetState({ clearValidationReport: true })
        },
        onDatasetLoaded: handleProjectWithDataset,
      })
    }

    const refreshData = async () => {
      const includeAnalysisRows = analysisRowsReady.value
      await refreshProjectData({
        columns: sortedDatasetColumns.value,
        includeAnalysisRows,
        onAfterRefresh: () => {
          if (includeAnalysisRows) {
            scheduleBuildChart(chartDefinition.value)
          }
        },
      })
    }

    const handleLoadAnalysisRows = async () => {
      const rows = await loadAnalysisRowsForUi({
        force: analysisRowsReady.value,
        notifyOnError: true,
      })
      if (!rows) return
      scheduleBuildChart(chartDefinition.value)
    }

    const handleBuildChart = async (definition = chartDefinition.value) => {
      await ensureAnalysisRowsForChart(definition)
    }

    const handleFileSelect = (e) => {
      selectedFile.value = e.target.files?.[0] || null
    }

    const afterDatasetImport = async (response) => {
      setValidationReport(response?.validation || null)
      await loadProjectPage()
      openValidationModal()
      notify.success(t('project.page.dataset.imported'))
    }

    const applyImportValidationError = (error) => {
      const validation = error?.response?.data?.validation
      if (!validation) return false
      setValidationReport(validation)
      openValidationModal()
      const validationMessage = validation?.blocking_error?.message
      notify.warning(validationMessage || t('project.page.dataset.importValidationIssues'))
      return true
    }

    const handleImport = async () => {
      if (isReadOnly.value) {
        notify.info(t('project.page.readOnly.importDisabled'))
        return
      }
      if (!selectedFile.value) {
        notify.warning(t('project.page.dataset.chooseFile'))
        return
      }
      importing.value = true
      manualError.value = ''
      try {
        const response = await projectsApi.importDataset(projectId.value, selectedFile.value, importOptions.value)
        await afterDatasetImport(response)
      } catch (e) {
        if (!applyImportValidationError(e)) {
          notify.error(extractApiErrorMessage(e, t('project.page.dataset.importFailed')))
        }
      } finally {
        importing.value = false
      }
    }

    const handleManualImport = async () => {
      if (isReadOnly.value) {
        notify.info(t('project.page.readOnly.importDisabled'))
        return
      }
      const file = prepareManualImportFile()
      if (!file) return

      importing.value = true
      try {
        const response = await projectsApi.importDataset(projectId.value, file, { has_header: true, delimiter: ',' })
        await afterDatasetImport(response)
      } catch (e) {
        if (applyImportValidationError(e)) {
          manualError.value = ''
        } else {
          manualError.value = extractApiErrorMessage(e, t('project.page.dataset.manualImportFailed'))
          notify.error(manualError.value)
        }
      } finally {
        importing.value = false
      }
    }

    const handleCellEdit = async (data) => {
      if (isReadOnly.value) {
        notify.info(t('project.page.readOnly.tableEditsDisabled'))
        return
      }
      try {
        const values = buildRowUpdateValues(data.row, sortedDatasetColumns.value)
        await projectsApi.updateRow(projectId.value, data.row.id, values)
      } catch (e) {
        notify.error(extractApiErrorMessage(e, t('project.page.dataset.rowSaveFailed')))
      }
    }

    const refreshDerivedData = async () => {
      await Promise.all([loadSuggestions(), loadStatisticsSummary()])
      if (analysisRowsReady.value) {
        scheduleBuildChart(chartDefinition.value)
      }
    }

    const handleSemanticTypeChange = async ({ columnId, semanticType, analyticalRole, isExcludedFromAnalysis }) => {
      if (isReadOnly.value) {
        notify.info(t('project.page.readOnly.semanticEditsDisabled'))
        return
      }
      try {
        await schemaStore.setSemanticType(projectId.value, columnId, {
          semantic_type: semanticType,
          analytical_role: analyticalRole,
          is_excluded_from_analysis: isExcludedFromAnalysis,
        })
        await refreshDerivedData()
      } catch (e) {
        notify.error(extractApiErrorMessage(e, t('project.page.schema.semanticUpdateFailed')))
      }
    }

    const handleOrdinalOrderChange = async ({ columnId, ordinalOrder }) => {
      if (isReadOnly.value) {
        notify.info(t('project.page.readOnly.ordinalEditsDisabled'))
        return
      }
      if (!Array.isArray(ordinalOrder) || ordinalOrder.length < 2) return
      try {
        await schemaStore.setOrdinalOrder(projectId.value, columnId, ordinalOrder)
        await refreshDerivedData()
      } catch (e) {
        notify.error(extractApiErrorMessage(e, t('project.page.schema.ordinalUpdateFailed')))
      }
    }

    const exportTableCsv = () => {
      if (!tableColumns.value.length || !tableRows.value.length) {
        notify.info(t('project.page.dataset.noTableData'))
        return
      }

      const headers = tableColumns.value.map((c) => c.title)
      const lines = buildCsvLines({
        headers,
        rows: tableRows.value,
        mapRowToValues: (row) => tableColumns.value.map((column) => row[column.field] ?? ''),
      })
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.value?.title || 'project'}-table.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    const resetRouteState = () => {
      resetWorkspaceRouteState()
      resetValidationRouteState()
      resetDatasetState()
    }

    const onEsc = (e) => {
      if (e.key === 'Escape' && validationModalOpen.value) {
        closeValidationModal()
      }
    }

    onMounted(() => {
      loadProjectPage()
      attachWorkspaceListeners()
      window.addEventListener('keydown', onEsc)
      observeChartViewport(chartViewportRef.value)
    })

    onBeforeUnmount(() => {
      detachWorkspaceListeners()
      window.removeEventListener('keydown', onEsc)
      disconnectChartViewportObserver()
      if (chartBuildFrameId !== null) {
        cancelAnimationFrame(chartBuildFrameId)
        chartBuildFrameId = null
      }
      pendingChartDefinition = null
      saveLayouts()
    })

    watch([projectId, isReadOnly], ([nextId, nextReadOnly], [prevId, prevReadOnly]) => {
      if (!nextId || String(nextId) === 'undefined') return
      if (String(nextId) === String(prevId) && nextReadOnly === prevReadOnly) return
      resetRouteState()
      loadProjectPage()
    })

    watch(() => viewMode.value, (mode) => {
      if (!project.value?.dataset) return

      if (!isReadOnly.value && mode === 'library') {
        loadSavedCharts()
      }

      if (mode !== 'visualization' && mode !== 'statistics') return

      loadAnalysisRowsForUi({ notifyOnError: false }).then((rows) => {
        if (!rows) return
        if (mode === 'visualization') {
          scheduleBuildChart(chartDefinition.value)
        }
      })
    })

    watch(
      () => chartViewportRef.value,
      (nextElement) => {
        observeChartViewport(nextElement)
      }
    )

    watch(
      () => project.value?.dataset?.id,
      async (datasetId) => {
        if (!datasetId) return
        await nextTick()
        observeChartViewport(chartViewportRef.value)
      }
    )

    return {
      isReadOnly, backButtonLabel, handleBack, openDemoProject,
      project, loading, projectError, selectedFile, importing, importOptions, importMode, manualHeaders, manualRowsInput, manualError,
      importValidation, validationModalOpen,
      openValidationModal, closeValidationModal, clearValidationReport,
      validationSummary, validationSummaryLine,
      validationBlockingError,
      validationProblemColumnCount, validationProblemColumns,
      getSeriesColor, setSeriesColor, resetSeriesColors,
      viewMode, setViewMode, isCompactWorkspace, visiblePanelIds,
      tableRows, tableColumns, analysisRows, analysisRowsReady, analysisRowsLoading, analysisRowsError, schemaColumns, schemaUpdatingColumnId,
      suggestions, statisticsSummary, statisticsLoading, statisticsError,
      savedCharts, savedChartsLoading, savedChartsError,
      chartType, chartDefinition,
      chartViewportPresetValue, chartViewportStyle, setChartViewportHeight,
      chartLabels, chartDatasets, chartMeta, workspaceHeight, workspacePanelConfig, resizeDirs, panelStyle,
      setWorkspaceCanvasRef, setChartViewportElementRef,
      handleBringToFront, handleStartDrag, handleStartResize, handleChartDefinitionUpdate, handleSetSeriesColor,
      handleFileSelect, handleImport, handleLoadAnalysisRows, handleBuildChart,
      addManualColumn, removeManualColumn, addManualRow, removeManualRow, handleManualImport, handleCellEdit,
      handleSemanticTypeChange, handleOrdinalOrderChange,
      loadSavedCharts, saveCurrentChart, renameSavedChart, downloadSavedChart, deleteSavedChart,
      refreshData, exportTableCsv,
    }
  },
}
</script>

<style scoped>
.project-page { display: flex; flex-direction: column; gap: 18px; }
.app-content { flex: 1; }
.loading { text-align: center; padding: 3rem; color: var(--muted); }
.error { text-align: center; padding: 2rem; color: #fca5a5; }
.demo-unavailable {
  text-align: center;
  color: var(--muted);
  padding: 1.2rem;
}
.demo-readonly-banner {
  border: 1px solid rgba(29, 185, 84, 0.4);
  background: rgba(29, 185, 84, 0.08);
  color: #b6f6cb;
  font-size: 13px;
  line-height: 1.4;
}
</style>
