<template>
  <div class="project-page app-content">
    <div v-if="loading" class="loading panel">Loading...</div>
    <div v-else-if="!project" class="error panel">{{ projectError || 'Project not found' }}</div>

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
      Demo dataset is currently unavailable.
    </div>

    <div v-else>
      <div v-if="isReadOnly" class="panel demo-readonly-banner">
        Demo mode is public and read-only. You can view data and build charts, but table edits are disabled.
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
import { useRoute, useRouter } from 'vue-router'
import { ProjectDatasetImportSection, ProjectValidationModal, ProjectPageToolbar, ProjectWorkspaceCanvas, } from '../components/project'
import { projectsApi } from '../api/projects'
import { demoProjectsApi } from '../api/demo'
import { useDatasetSchemaStore } from '../stores/datasetSchema'
import { createDefaultChartDefinition, mergeChartDefinition } from '../charts/chartDefinitions/createUniversalChartDefinition'
import { normalizeChartDefinition } from '../charts/rules/chartDefinitionValidator'
import { cellField, buildCsvLines, buildRowUpdateValues, downloadSavedChartPng } from '../utils/project'
import { useManualDatasetBuilder, useValidationReport, useProjectDataLoader, useProjectWorkspace, useProjectChartState, } from '../composables/project'
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
    const route = useRoute()
    const router = useRouter()
    const isReadOnly = computed(() => props.mode === 'demo')
    const projectId = computed(() => (
      isReadOnly.value ? 'demo' : String(route.params.id)
    ))
    const projectApi = computed(() => (isReadOnly.value ? demoProjectsApi : projectsApi))
    const backButtonLabel = computed(() => (isReadOnly.value ? '<- Back to Home' : '<- Back to Projects'))
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
    const savedCharts = ref([])
    const savedChartsLoading = ref(false)
    const savedChartsError = ref('')

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
        subtitle: isReadOnly.value ? 'Read-only demo' : 'Editable',
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

    const formatSavedChartCreatedAt = (value) => {
      if (!value) return '-'
      const parsed = new Date(value)
      if (Number.isNaN(parsed.getTime())) return '-'
      return parsed.toLocaleString()
    }

    const normalizeSavedChart = (savedChart) => {
      const config = savedChart?.config && typeof savedChart.config === 'object' ? savedChart.config : {}
      const rendered = config?.rendered && typeof config.rendered === 'object' ? config.rendered : {}
      const chartDefinition = config?.chartDefinition && typeof config.chartDefinition === 'object'
        ? config.chartDefinition
        : createDefaultChartDefinition(savedChart?.type || rendered?.type || 'line')

      return {
        id: Number(savedChart?.id || 0),
        title: String(savedChart?.title || '').trim(),
        type: String(savedChart?.type || rendered?.type || chartDefinition?.chartType || 'line'),
        created_at: formatSavedChartCreatedAt(savedChart?.created_at),
        chartDefinition,
        labels: Array.isArray(rendered?.labels) ? rendered.labels : [],
        datasets: Array.isArray(rendered?.datasets) ? rendered.datasets : [],
        meta: rendered?.meta && typeof rendered.meta === 'object' ? rendered.meta : {},
      }
    }

    const buildSavedChartTitle = (type) =>
      `${String(type || 'chart').toUpperCase()} ${new Date().toLocaleString()}`

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

    const loadSavedCharts = async () => {
      if (savedChartsLoading.value) return
      if (isReadOnly.value) {
        savedCharts.value = []
        return
      }

      if (!project.value?.dataset) {
        savedCharts.value = []
        return
      }

      savedChartsLoading.value = true
      savedChartsError.value = ''
      try {
        const response = await projectsApi.listSavedCharts(projectId.value)
        const nextCharts = Array.isArray(response?.charts) ? response.charts.map(normalizeSavedChart) : []
        savedCharts.value = nextCharts
      } catch (e) {
        savedChartsError.value = extractApiErrorMessage(e, 'Failed to load saved charts.')
      } finally {
        savedChartsLoading.value = false
      }
    }

    const saveCurrentChart = async () => {
      if (isReadOnly.value) {
        notify.info('Demo mode is read-only. Saving charts is disabled.')
        return
      }

      if (!chartDatasets.value.length) {
        notify.warning('Build a chart before saving it to the project library.')
        return
      }

      try {
        await projectsApi.saveChart(projectId.value, {
          type: chartType.value || 'line',
          title: buildSavedChartTitle(chartType.value),
          config: {
            chartDefinition: chartDefinition.value,
            rendered: {
              type: chartType.value || 'line',
              labels: chartLabels.value || [],
              datasets: chartDatasets.value || [],
              meta: chartMeta.value || {},
            },
          },
        })
        await loadSavedCharts()
        setViewMode('library')
        notify.success('Chart saved to the project library.')
      } catch (e) {
        notify.error(extractApiErrorMessage(e, 'Failed to save chart.'))
      }
    }

    const downloadSavedChart = async (savedChart) => {
      if (!savedChart) return
      try {
        await downloadSavedChartPng(savedChart, savedChart.title || `chart-${savedChart.id}`)
      } catch (e) {
        notify.error(extractApiErrorMessage(e, 'Failed to download chart PNG.'))
      }
    }

    const renameSavedChart = async ({ chartId, title }) => {
      if (isReadOnly.value) {
        notify.info('Demo mode is read-only. Renaming is disabled.')
        return
      }
      if (!chartId) return
      const nextTitle = String(title || '').trim()
      if (!nextTitle) {
        notify.warning('Chart name cannot be empty.')
        return
      }

      try {
        const response = await projectsApi.updateSavedChart(projectId.value, chartId, {
          title: nextTitle,
        })

        const updated = normalizeSavedChart(response?.chart || {})
        savedCharts.value = savedCharts.value.map((chart) =>
          Number(chart.id) === Number(chartId)
            ? {
                ...chart,
                ...updated,
                title: updated.title || nextTitle,
              }
            : chart
        )
        notify.success('Chart renamed successfully.')
      } catch (e) {
        notify.error(extractApiErrorMessage(e, 'Failed to rename chart.'))
      }
    }

    const deleteSavedChart = async (savedChartId) => {
      if (isReadOnly.value) {
        notify.info('Demo mode is read-only. Deleting is disabled.')
        return
      }
      if (!savedChartId) return
      const confirmed = window.confirm('Delete this saved chart from the project library?')
      if (!confirmed) return

      try {
        await projectsApi.deleteSavedChart(projectId.value, savedChartId)
        await loadSavedCharts()
        notify.success('Saved chart deleted.')
      } catch (e) {
        notify.error(extractApiErrorMessage(e, 'Failed to delete chart.'))
      }
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
      savedCharts.value = []
      savedChartsLoading.value = false
      savedChartsError.value = ''
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
      notify.success('Dataset imported successfully.')
    }

    const applyImportValidationError = (error) => {
      const validation = error?.response?.data?.validation
      if (!validation) return false
      setValidationReport(validation)
      openValidationModal()
      const validationMessage = validation?.blocking_error?.message
      notify.warning(validationMessage || 'Import completed with validation issues. Please review the report.')
      return true
    }

    const handleImport = async () => {
      if (isReadOnly.value) {
        notify.info('Demo mode is read-only. Import is disabled.')
        return
      }
      if (!selectedFile.value) {
        notify.warning('Choose a file before importing.')
        return
      }
      importing.value = true
      manualError.value = ''
      try {
        const response = await projectsApi.importDataset(projectId.value, selectedFile.value, importOptions.value)
        await afterDatasetImport(response)
      } catch (e) {
        if (!applyImportValidationError(e)) {
          notify.error(extractApiErrorMessage(e, 'Import failed.'))
        }
      } finally {
        importing.value = false
      }
    }

    const handleManualImport = async () => {
      if (isReadOnly.value) {
        notify.info('Demo mode is read-only. Import is disabled.')
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
          manualError.value = extractApiErrorMessage(e, 'Failed to create table from manual data.')
          notify.error(manualError.value)
        }
      } finally {
        importing.value = false
      }
    }

    const handleCellEdit = async (data) => {
      if (isReadOnly.value) {
        notify.info('Demo mode is read-only. Table edits are disabled.')
        return
      }
      try {
        const values = buildRowUpdateValues(data.row, sortedDatasetColumns.value)
        await projectsApi.updateRow(projectId.value, data.row.id, values)
      } catch (e) {
        notify.error(extractApiErrorMessage(e, 'Failed to save row changes.'))
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
        notify.info('Demo mode is read-only. Semantic edits are disabled.')
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
        notify.error(extractApiErrorMessage(e, 'Failed to update semantic type.'))
      }
    }

    const handleOrdinalOrderChange = async ({ columnId, ordinalOrder }) => {
      if (isReadOnly.value) {
        notify.info('Demo mode is read-only. Ordinal edits are disabled.')
        return
      }
      if (!Array.isArray(ordinalOrder) || ordinalOrder.length < 2) return
      try {
        await schemaStore.setOrdinalOrder(projectId.value, columnId, ordinalOrder)
        await refreshDerivedData()
      } catch (e) {
        notify.error(extractApiErrorMessage(e, 'Failed to update ordinal order.'))
      }
    }

    const exportTableCsv = () => {
      if (!tableColumns.value.length || !tableRows.value.length) {
        notify.info('No table data to export.')
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

    const parseCssPx = (value) => {
      const parsed = Number.parseFloat(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const readViewportContentHeight = (element) => {
      if (!element) return 0

      const clientHeight = Number(element.clientHeight || 0)
      if (
        clientHeight > 0
        && typeof window !== 'undefined'
        && typeof window.getComputedStyle === 'function'
      ) {
        const style = window.getComputedStyle(element)
        const verticalPadding = parseCssPx(style?.paddingTop) + parseCssPx(style?.paddingBottom)
        const contentHeight = clientHeight - verticalPadding
        if (contentHeight > 0) return contentHeight
      }

      return Number(element.getBoundingClientRect?.().height || clientHeight || 0)
    }

    let chartViewportResizeObserver = null
    let observedChartViewportElement = null
    let chartViewportSyncFrameId = null
    let pendingChartViewportHeight = null

    const syncChartViewportHeight = (height) => {
      pendingChartViewportHeight = height
      if (chartViewportSyncFrameId !== null) return

      chartViewportSyncFrameId = requestAnimationFrame(() => {
        chartViewportSyncFrameId = null
        const nextHeight = pendingChartViewportHeight
        pendingChartViewportHeight = null
        if (!Number.isFinite(nextHeight) || nextHeight <= 0) return
        syncViewportHeightFromResize(nextHeight)
      })
    }

    const disconnectChartViewportObserver = () => {
      if (chartViewportResizeObserver) {
        chartViewportResizeObserver.disconnect()
      }
      chartViewportResizeObserver = null
      observedChartViewportElement = null
      if (chartViewportSyncFrameId !== null) {
        cancelAnimationFrame(chartViewportSyncFrameId)
        chartViewportSyncFrameId = null
      }
      pendingChartViewportHeight = null
    }

    const observeChartViewport = (element) => {
      if (typeof ResizeObserver === 'undefined') return
      if (!element) {
        disconnectChartViewportObserver()
        return
      }
      if (observedChartViewportElement === element && chartViewportResizeObserver) return

      if (!chartViewportResizeObserver) {
        chartViewportResizeObserver = new ResizeObserver((entries) => {
          const height = entries?.[0]?.contentRect?.height
          syncChartViewportHeight(height)
        })
      } else if (observedChartViewportElement) {
        chartViewportResizeObserver.unobserve(observedChartViewportElement)
      }

      chartViewportResizeObserver.observe(element)
      observedChartViewportElement = element
      const initialHeight = readViewportContentHeight(element)
      syncChartViewportHeight(initialHeight)
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
