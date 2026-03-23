<template>
  <div class="project-page app-content">
    <div v-if="loading" class="loading panel">Loading...</div>
    <div v-else-if="!project" class="error panel">Project not found</div>

    <ProjectDatasetImportSection
      v-else-if="!project.dataset"
      :import-mode="importMode"
      :import-options="importOptions"
      :selected-file="selectedFile"
      :importing="importing"
      :manual-headers="manualHeaders"
      :manual-rows-input="manualRowsInput"
      :manual-error="manualError"
      @back="$router.push({ name: 'projects' })"
      @change-import-mode="importMode = $event"
      @change-import-options="importOptions = $event"
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

    <div v-else>
      <ProjectPageToolbar
        :view-mode="viewMode"
        :import-validation="importValidation"
        :validation-problem-column-count="validationProblemColumnCount"
        @back="$router.push({ name: 'projects' })"
        @change-view-mode="setViewMode"
        @open-validation="openValidationModal"
      />

      <ProjectWorkspaceCanvas
        :view-mode="viewMode"
        :workspace-height="workspaceHeight"
        :visible-panel-ids="visiblePanelIds"
        :panel-config="panelConfig"
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
        :analysis-rows="analysisRows"
        :schema-updating-column-id="schemaUpdatingColumnId"
        :get-series-color="getSeriesColor"
        @bring-to-front="handleBringToFront"
        @start-drag="handleStartDrag"
        @start-resize="handleStartResize"
        @cell-edit="handleCellEdit"
        @refresh-data="refreshData"
        @export-csv="exportTableCsv"
        @set-chart-height="setChartViewportHeight"
        @update-chart-definition="handleChartDefinitionUpdate"
        @build-chart="buildChart"
        @clear-chart="clearChart"
        @set-series-color="handleSetSeriesColor"
        @reset-series-colors="resetSeriesColors"
        @change-semantic="handleSemanticTypeChange"
        @change-ordinal-order="handleOrdinalOrderChange"
      />

    </div>

    <ProjectValidationModal
      :is-open="validationModalOpen"
      :summary="validationSummary"
      :summary-line="validationSummaryLine"
      :problem-columns="validationProblemColumns"
      :blocking-error="validationBlockingError"
      @close="closeValidationModal"
      @clear="clearValidationReport"
    />
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ProjectDatasetImportSection, ProjectValidationModal, ProjectPageToolbar, ProjectWorkspaceCanvas, } from '../components/project'
import { projectsApi } from '../api/projects'
import { useDatasetSchemaStore } from '../stores/datasetSchema'
import { createDefaultChartDefinition, mergeChartDefinition } from '../charts/chartDefinitions/createUniversalChartDefinition'
import { normalizeChartDefinition } from '../charts/rules/chartDefinitionValidator'
import { cellField, buildCsvLines, buildRowUpdateValues } from '../utils/project'
import { useManualDatasetBuilder, useValidationReport, useProjectDataLoader, useProjectWorkspace, useProjectChartState, } from '../composables/project'

export default {
  name: 'ProjectPage',
  components: {
    ProjectDatasetImportSection,
    ProjectValidationModal,
    ProjectPageToolbar,
    ProjectWorkspaceCanvas,
  },
  setup() {
    const route = useRoute()
    const projectId = computed(() => String(route.params.id))
    const workspaceRef = ref(null)
    const chartViewportRef = ref(null)
    const schemaStore = useDatasetSchemaStore()

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
      tableRows,
      analysisRows,
      suggestions,
      statisticsSummary,
      statisticsLoading,
      statisticsError,
      loadProject,
      loadSuggestions,
      loadStatisticsSummary,
      reloadProjectData,
      refreshData: refreshProjectData,
      resetProjectDataState,
    } = useProjectDataLoader({
      projectId,
      schemaStore,
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
      tableRows,
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
        editor: 'input',
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
      JSON.stringify(normalizeChartDefinition(left)) === JSON.stringify(normalizeChartDefinition(right))

    const handleChartDefinitionUpdate = (nextDefinition) => {
      const normalized = normalizeChartDefinition(nextDefinition)
      if (areChartDefinitionsEqual(chartDefinition.value, normalized)) return
      chartDefinition.value = normalized
    }

    const handleSetSeriesColor = ({ label, index, color }) => {
      setSeriesColor(label, index, color)
    }

    const reloadAllProjectData = async ({ rebuildSchema = true } = {}) => {
      await reloadProjectData({
        rebuildSchema,
        columns: sortedDatasetColumns.value,
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
      schemaStore.applySchema(null)
    }

    const applySuggestedChartDefinition = () => {
      if (chartDatasets.value.length) return
      const suggested = suggestions.value[0]?.definition
      if (!suggested) {
        clearChart()
        return
      }
      chartDefinition.value = normalizeChartDefinition(
        mergeChartDefinition(createDefaultChartDefinition(suggested.chartType || 'line'), suggested)
      )
      buildChart(chartDefinition.value)
    }

    const handleProjectWithDataset = async (loadedProject) => {
      seriesColors.value = loadSeriesColors()
      await reloadAllProjectData({ rebuildSchema: false })
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
      await refreshProjectData({
        columns: sortedDatasetColumns.value,
        onAfterRefresh: () => buildChart(chartDefinition.value),
      })
    }

    const handleFileSelect = (e) => {
      selectedFile.value = e.target.files?.[0] || null
    }

    const afterDatasetImport = async (response) => {
      setValidationReport(response?.validation || null)
      await loadProjectPage()
      openValidationModal()
    }

    const applyImportValidationError = (error) => {
      const validation = error?.response?.data?.validation
      if (!validation) return false
      setValidationReport(validation)
      openValidationModal()
      return true
    }

    const handleImport = async () => {
      if (!selectedFile.value) return
      importing.value = true
      manualError.value = ''
      try {
        const response = await projectsApi.importDataset(projectId.value, selectedFile.value, importOptions.value)
        await afterDatasetImport(response)
      } catch (e) {
        if (!applyImportValidationError(e)) {
          window.alert('Import error: ' + (e.response?.data?.message || e.message))
        }
      } finally {
        importing.value = false
      }
    }

    const handleManualImport = async () => {
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
          manualError.value = e?.response?.data?.message || 'Failed to create table from manual data.'
        }
      } finally {
        importing.value = false
      }
    }

    const handleCellEdit = async (data) => {
      try {
        const values = buildRowUpdateValues(data.row, sortedDatasetColumns.value)
        await projectsApi.updateRow(projectId.value, data.row.id, values)
      } catch (e) {
        console.error(e)
      }
    }

    const refreshDerivedData = async () => {
      await Promise.all([loadSuggestions(), loadStatisticsSummary()])
      buildChart(chartDefinition.value)
    }

    const handleSemanticTypeChange = async ({ columnId, semanticType, analyticalRole, isExcludedFromAnalysis }) => {
      try {
        await schemaStore.setSemanticType(projectId.value, columnId, {
          semantic_type: semanticType,
          analytical_role: analyticalRole,
          is_excluded_from_analysis: isExcludedFromAnalysis,
        })
        await refreshDerivedData()
      } catch (e) {
        console.error(e)
      }
    }

    const handleOrdinalOrderChange = async ({ columnId, ordinalOrder }) => {
      if (!Array.isArray(ordinalOrder) || ordinalOrder.length < 2) return
      try {
        await schemaStore.setOrdinalOrder(projectId.value, columnId, ordinalOrder)
        await refreshDerivedData()
      } catch (e) {
        console.error(e)
      }
    }

    const exportTableCsv = () => {
      if (!tableColumns.value.length || !tableRows.value.length) {
        window.alert('No table data to export.')
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

    let chartViewportResizeObserver = null

    onMounted(() => {
      loadProjectPage()
      attachWorkspaceListeners()
      window.addEventListener('keydown', onEsc)

      if (typeof ResizeObserver !== 'undefined' && chartViewportRef.value) {
        chartViewportResizeObserver = new ResizeObserver((entries) => {
          const height = entries?.[0]?.contentRect?.height
          syncViewportHeightFromResize(height)
        })
        chartViewportResizeObserver.observe(chartViewportRef.value)
      }
    })

    onBeforeUnmount(() => {
      detachWorkspaceListeners()
      window.removeEventListener('keydown', onEsc)
      if (chartViewportResizeObserver) {
        chartViewportResizeObserver.disconnect()
        chartViewportResizeObserver = null
      }
      saveLayouts()
    })

    watch(() => route.params.id, (nextId, prevId) => {
      if (!nextId || String(nextId) === 'undefined') return
      if (String(nextId) === String(prevId)) return
      resetRouteState()
      loadProjectPage()
    })

    return {
      project, loading, selectedFile, importing, importOptions, importMode, manualHeaders, manualRowsInput, manualError,
      importValidation, validationModalOpen,
      openValidationModal, closeValidationModal, clearValidationReport,
      validationSummary, validationSummaryLine,
      validationBlockingError,
      validationProblemColumnCount, validationProblemColumns,
      getSeriesColor, setSeriesColor, resetSeriesColors,
      viewMode, setViewMode, visiblePanelIds,
      tableRows, tableColumns, analysisRows, schemaColumns, schemaUpdatingColumnId,
      suggestions, statisticsSummary, statisticsLoading, statisticsError,
      chartType, chartDefinition,
      chartViewportPresetValue, chartViewportStyle, setChartViewportHeight,
      chartLabels, chartDatasets, chartMeta, workspaceHeight, panelConfig, resizeDirs, panelStyle,
      setWorkspaceCanvasRef, setChartViewportElementRef,
      handleBringToFront, handleStartDrag, handleStartResize, handleChartDefinitionUpdate, handleSetSeriesColor,
      handleFileSelect, handleImport,
      addManualColumn, removeManualColumn, addManualRow, removeManualRow, handleManualImport, handleCellEdit,
      handleSemanticTypeChange, handleOrdinalOrderChange,
      buildChart, clearChart, refreshData, exportTableCsv,
    }
  },
}
</script>

<style scoped>
.project-page { display: flex; flex-direction: column; gap: 18px; }
.app-content { flex: 1; }
.loading { text-align: center; padding: 3rem; color: var(--muted); }
.error { text-align: center; padding: 2rem; color: #fca5a5; }
</style>
