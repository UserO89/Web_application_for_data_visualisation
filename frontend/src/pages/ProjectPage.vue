<template>
  <div class="project-page app-content">
    <div v-if="loading" class="loading panel">Loading...</div>
    <div v-else-if="!project" class="error panel">Project not found</div>

    <div v-else-if="!project.dataset">
      <div class="top-row">
        <button class="btn" @click="$router.push({ name: 'projects' })"><- Back to Projects</button>
      </div>
      <div class="panel">
        <div class="section-title">Add Data</div>
        <div class="mode-row">
          <button type="button" :class="['btn', { primary: importMode === 'file' }]" @click="importMode = 'file'">Upload File</button>
          <button type="button" :class="['btn', { primary: importMode === 'manual' }]" @click="importMode = 'manual'">Manual Input</button>
        </div>

        <form v-if="importMode === 'file'" @submit.prevent="handleImport">
          <div class="form-group"><label>CSV File</label><input type="file" @change="handleFileSelect" accept=".csv,.txt" required /></div>
          <div class="form-group"><label><input type="checkbox" v-model="importOptions.has_header" /> First row is header</label></div>
          <div class="form-group"><label>Delimiter</label><input v-model="importOptions.delimiter" type="text" maxlength="1" /></div>
          <button type="submit" :disabled="!selectedFile || importing" class="btn primary">{{ importing ? 'Importing...' : 'Import' }}</button>
        </form>

        <div v-else class="manual-builder">
          <div class="mode-row">
            <button class="btn" type="button" @click="addManualColumn">+ Column</button>
            <button class="btn" type="button" @click="removeManualColumn" :disabled="manualHeaders.length <= 1">- Column</button>
            <button class="btn" type="button" @click="addManualRow">+ Row</button>
            <button class="btn" type="button" @click="removeManualRow" :disabled="manualRowsInput.length <= 1">- Row</button>
          </div>
          <div class="table-wrap manual-table-wrap">
            <table class="data-table manual-table">
              <thead><tr><th v-for="(h, i) in manualHeaders" :key="`h-${i}`"><input v-model="manualHeaders[i]" class="manual-input header" :placeholder="`Column ${i + 1}`" /></th></tr></thead>
              <tbody>
                <tr v-for="(row, r) in manualRowsInput" :key="`r-${r}`">
                  <td v-for="(_, c) in manualHeaders" :key="`c-${r}-${c}`"><input v-model="manualRowsInput[r][c]" class="manual-input" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="manualError" class="manual-error">{{ manualError }}</div>
          <button type="button" :disabled="importing" class="btn primary" @click="handleManualImport">{{ importing ? 'Creating...' : 'Create Table' }}</button>
        </div>
      </div>
    </div>

    <div v-else>
      <div class="top-row top-row-actions">
        <div class="top-row-left">
          <button class="btn" @click="$router.push({ name: 'projects' })"><- Back to Projects</button>
          <div class="view-mode-switch">
            <button type="button" :class="['btn', { primary: viewMode === 'table' }]" @click="setViewMode('table')">Table</button>
            <button type="button" :class="['btn', { primary: viewMode === 'visualization' }]" @click="setViewMode('visualization')">Visualization</button>
            <button type="button" :class="['btn', { primary: viewMode === 'statistics' }]" @click="setViewMode('statistics')">Statistics</button>
            <button type="button" :class="['btn', { primary: viewMode === 'workspace' }]" @click="setViewMode('workspace')">Workspace</button>
          </div>
        </div>
        <div class="top-row-right">
          <button
            v-if="importValidation"
            type="button"
            class="btn"
            @click="openValidationModal"
          >
            Validation Report
            <span class="validation-pill">{{ validationIssueCount }}</span>
          </button>
        </div>
      </div>

      <div ref="workspaceRef" class="workspace-canvas" :style="{ height: `${workspaceHeight}px` }">
        <section
          v-for="panelId in visiblePanelIds"
          :key="panelId"
          :class="['workspace-panel', 'panel', { 'swap-target': viewMode === 'workspace' && dragSwapTarget === panelId }]"
          :style="panelStyle(panelId)"
          @mousedown="viewMode === 'workspace' && bringToFront(panelId)"
        >
          <header class="drag-handle" @mousedown.left.prevent="viewMode === 'workspace' && startDrag(panelId, $event)">
            <div class="title">{{ panelConfig[panelId].title }}</div>
            <div class="sub">{{ panelConfig[panelId].subtitle }}</div>
          </header>

          <div :class="['panel-content', `${panelId}-content`]">
            <template v-if="panelId === 'table'">
              <div class="table-wrap table-fill">
                <DataTable :columns="tableColumns" :rows="tableRows" @cell-edited="handleCellEdit" />
              </div>
              <div class="table-bottom-actions">
                <button class="btn" type="button" @click="exportTableCsv">Export Table CSV</button>
              </div>
            </template>

            <template v-else-if="panelId === 'chart'">
              <div class="chart-shell">
                <div
                  ref="chartViewportRef"
                  class="chart-main chart-main-resizable"
                  :style="chartViewportStyle"
                >
                  <ChartPanel
                    embedded
                    :labels="chartLabels"
                    :datasets="chartDatasets"
                    :meta="chartMeta"
                    :type="chartType"
                    @clear="clearChart"
                  />
                </div>
                <div class="chart-tools">
                  <div class="controls">
                    <button class="btn" type="button" @click="refreshData">Refresh Data</button>
                    <button class="btn" type="button" @click="exportTableCsv">Export CSV</button>
                    <label class="chart-size-control" for="chart-height-select">Chart height</label>
                    <select
                      id="chart-height-select"
                      class="chart-size-select"
                      :value="chartViewportPresetValue"
                      @change="setChartViewportHeight($event.target.value)"
                    >
                      <option value="320">Compact</option>
                      <option value="420">Medium</option>
                      <option value="520">Tall</option>
                      <option value="620">XL</option>
                      <option v-if="chartViewportPresetValue === 'custom'" value="custom">Custom (drag)</option>
                    </select>
                  </div>
                  <ChartBuilder
                    :schema-columns="schemaColumns"
                    v-model="chartDefinition"
                    :suggestions="suggestions"
                    @build="buildChart"
                  />
                  <div v-if="chartDatasets.length" class="series-colors">
                    <div class="series-colors-head">
                      <div class="analysis-title">Series Colors</div>
                      <button type="button" class="btn" @click="resetSeriesColors">Reset Colors</button>
                    </div>
                    <div class="series-colors-grid">
                      <div v-for="(ds, i) in chartDatasets" :key="`series-color-${ds.label}-${i}`" class="series-color-item">
                        <span class="series-color-name">{{ ds.label || `Series ${i + 1}` }}</span>
                        <input
                          type="color"
                          class="series-color-input"
                          :value="getSeriesColor(ds.label, i)"
                          @input="setSeriesColor(ds.label, i, $event.target.value)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="panelId === 'stats'">
              <div class="stats-shell">
                <StatisticsWorkspace
                  :schema-columns="schemaColumns"
                  :statistics="statisticsSummary"
                  :rows="analysisRows"
                  :loading="statisticsLoading"
                  :error="statisticsError"
                  :updating-column-id="schemaUpdatingColumnId"
                  @change-semantic="handleSemanticTypeChange"
                  @change-ordinal-order="handleOrdinalOrderChange"
                />
              </div>
            </template>

          </div>

          <div
            v-if="viewMode === 'workspace'"
            v-for="d in resizeDirs"
            :key="`${panelId}-${d}`"
            :class="['resize-handle', `h-${d}`]"
            @mousedown.left.stop.prevent="startResize(panelId, d, $event)"
          ></div>
        </section>
      </div>

    </div>

    <div
      v-if="validationModalOpen && importValidation"
      class="validation-modal-backdrop"
      @click.self="closeValidationModal"
    >
      <div class="validation-modal panel" role="dialog" aria-modal="true" aria-label="Data validation report">
        <div class="validation-head">
          <div class="validation-title">Data Validation Report</div>
          <div class="validation-actions">
            <button type="button" class="btn" @click="clearValidationReport">Clear Report</button>
            <button type="button" class="btn" @click="closeValidationModal">Close</button>
          </div>
        </div>
        <div class="validation-summary">
          {{ validationSummaryLine }}
        </div>
        <div class="validation-summary validation-severity-line">
          Errors: {{ validationSummary.error_count || 0 }},
          warnings: {{ validationSummary.warning_count || 0 }},
          info: {{ validationSummary.info_count || 0 }}.
        </div>
        <div v-if="importValidation.issues?.length" class="validation-groups">
          <div v-for="severity in severityOrder" :key="`severity-${severity}`" class="validation-group">
            <div v-if="validationIssuesBySeverity[severity]?.length" class="validation-group-title">
              {{ severity.toUpperCase() }} ({{ validationIssuesBySeverity[severity].length }})
            </div>
            <div v-if="validationIssuesBySeverity[severity]?.length" class="validation-list">
              <div
                v-for="(issue, idx) in validationIssuesBySeverity[severity]"
                :key="`issue-modal-${severity}-${idx}`"
                class="validation-item"
              >
                <div class="validation-item-meta">
                  <strong>{{ formatIssueTargetLabel(issue) }}</strong>: {{ issue.message }}
                </div>
                <div class="validation-item-code">{{ issue.code }}</div>
                <div v-if="issue.original !== undefined || issue.fixed !== undefined" class="validation-diff">
                  Auto-fix: {{ formatIssueValue(issue.original) }} -> {{ formatIssueValue(issue.fixed) }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="validation-summary">No issues found.</div>
        <div v-if="validationColumnRows.length" class="validation-columns">
          <div class="validation-group-title">Column Quality Overview</div>
          <div class="table-wrap validation-columns-wrap">
            <table class="data-table validation-columns-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="column in validationColumnRows" :key="`quality-${column.name}`">
                  <td>{{ column.name }}</td>
                  <td>{{ column.type }}</td>
                  <td>{{ column.status }}</td>
                  <td>{{ column.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="editableValidationIssueCount" class="validation-footer">
          <div class="validation-save-state">{{ validationSaveState || 'Edit values and click save to update table data.' }}</div>
          <button type="button" class="btn primary" :disabled="savingValidation" @click="applyValidationEdits">
            {{ savingValidation ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ChartPanel from '../components/ChartPanel.vue'
import ChartBuilder from '../components/ChartBuilder.vue'
import DataTable from '../components/DataTable.vue'
import StatisticsWorkspace from '../components/StatisticsWorkspace.vue'
import { projectsApi } from '../api/projects'
import { useDatasetSchemaStore } from '../stores/datasetSchema'
import { buildSemanticChartData } from '../charts/chartDataTransformers/buildSemanticChartData'
import { normalizeChartDefinition, validateChartDefinition } from '../charts/rules/chartDefinitionValidator'
import { createDefaultChartDefinition, mergeChartDefinition } from '../charts/chartDefinitions/createUniversalChartDefinition'
import {
  SEVERITY_ORDER,
  formatIssueTarget,
  groupIssuesBySeverity,
  normalizeValidationReport,
  toColumnQualityRows,
} from '../utils/validationReport'

const IDS = ['table', 'chart', 'stats']
const STORAGE_PREFIX = 'dataviz.workspace.layout.v2.'
const VALIDATION_STORAGE_PREFIX = 'dataviz.validation.report.v1.'
const CHART_COLORS_STORAGE_PREFIX = 'dataviz.chart.colors.v1.'
const DEFAULT_CHART_PALETTE = [
  '#1db954', '#35c9a3', '#4cc9f0', '#4895ef', '#4361ee',
  '#3a0ca3', '#b5179e', '#f72585', '#f15bb5', '#ff8fab',
  '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590',
]
const PRESETS = [
  { key: 'wide-stack', label: 'Table+Chart Full Width' },
  { key: 'analysis-focus', label: 'Analysis Focus' },
  { key: 'quad', label: 'Top Split + Stats' },
]
const MIN = { table: { w: 420, h: 280 }, chart: { w: 360, h: 320 }, stats: { w: 300, h: 220 } }
const MIN_CHART_VIEWPORT_HEIGHT = 280
const MAX_CHART_VIEWPORT_HEIGHT = 920
const createManualRow = (n) => Array.from({ length: n }, () => '')

export default {
  name: 'ProjectPage',
  components: { DataTable, ChartPanel, ChartBuilder, StatisticsWorkspace },
  setup() {
    const route = useRoute()
    const workspaceRef = ref(null)
    const chartViewportRef = ref(null)
    const schemaStore = useDatasetSchemaStore()

    const project = ref(null)
    const loading = ref(true)
    const selectedFile = ref(null)
    const importing = ref(false)
    const importOptions = ref({ has_header: true, delimiter: ',' })
    const importMode = ref('file')
    const manualHeaders = ref(['Column 1', 'Column 2', 'Column 3'])
    const manualRowsInput = ref([createManualRow(3), createManualRow(3), createManualRow(3), createManualRow(3)])
    const manualError = ref('')
    const importValidation = ref(null)
    const validationModalOpen = ref(false)
    const validationDrafts = ref({})
    const savingValidation = ref(false)
    const validationSaveState = ref('')
    const viewMode = ref('workspace')

    const tableRows = ref([])
    const analysisRows = ref([])
    const suggestions = ref([])
    const suggestionsLoading = ref(false)
    const statisticsSummary = ref([])
    const statisticsLoading = ref(false)
    const statisticsError = ref('')
    const chartType = ref('line')
    const chartDefinition = ref(createDefaultChartDefinition('line'))
    const chartValidation = ref({ errors: [], warnings: [] })
    const chartViewportHeight = ref(320)
    const chartViewportCustom = ref(false)
    const chartLabels = ref([])
    const chartDatasets = ref([])
    const chartMeta = ref({})
    const seriesColors = ref({})

    const panelLayouts = ref({})
    const zCounter = ref(1)
    const interaction = ref(null)
    const dragSwapTarget = ref(null)
    const resizeTick = ref(0)
    const initializedForProjectId = ref(null)
    const activePreset = ref('default')

    const panelIds = IDS
    const resizeDirs = ['n', 'e', 's', 'w']
    const presetOptions = PRESETS
    const panelConfig = {
      table: { title: 'Data Table', subtitle: 'Editable' },
      chart: { title: 'Visualization', subtitle: 'Chart + controls' },
      stats: { title: 'Statistics', subtitle: 'Columns / Calculate / Visualization' },
    }
    const cellField = (position) => `col_${position}`
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
    const sortedDatasetColumns = computed(() =>
      [...(project.value?.dataset?.columns || [])].sort((a, b) => Number(a.position) - Number(b.position))
    )
    const tableColumns = computed(() =>
      sortedDatasetColumns.value.map((c) => ({
        title: c.name,
        field: cellField(c.position),
        metaType: c.type,
        editor: 'input',
        formatter: nullAwareFormatter,
      }))
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
    const buildFocusLayouts = (mode) => {
      void resizeTick.value
      const w = canvasW()
      if (mode === 'table') {
        return {
          table: { x: 0, y: 0, w, h: 720, z: 1 },
        }
      }
      if (mode === 'visualization') {
        return {
          chart: { x: 0, y: 0, w, h: 720, z: 1 },
        }
      }
      if (mode === 'statistics') {
        return {
          stats: { x: 0, y: 0, w, h: 720, z: 1 },
        }
      }
      return {}
    }

    const focusLayouts = computed(() => buildFocusLayouts(viewMode.value))

    const workspaceHeight = computed(() => {
      const ids = visiblePanelIds.value
      const layouts = viewMode.value === 'workspace' ? panelLayouts.value : focusLayouts.value
      if (!ids.every((id) => layouts[id])) return 760
      return Math.max(760, Math.max(...ids.map((id) => layouts[id].y + layouts[id].h)) + 16)
    })

    const panelStyle = (id) => {
      const layouts = viewMode.value === 'workspace' ? panelLayouts.value : focusLayouts.value
      const p = layouts[id]
      return p ? { left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${p.h}px`, zIndex: p.z } : {}
    }

    const canvasW = () => Math.max(320, workspaceRef.value?.clientWidth || 1120)
    const key = () => `${STORAGE_PREFIX}${route.params.id}`
    const validationKey = () => `${VALIDATION_STORAGE_PREFIX}${route.params.id}`
    const chartColorsKey = () => `${CHART_COLORS_STORAGE_PREFIX}${route.params.id}`

    const defaultSeriesColor = (index = 0) =>
      DEFAULT_CHART_PALETTE[index % DEFAULT_CHART_PALETTE.length]

    const visiblePanelIds = computed(() => {
      if (viewMode.value === 'table') return ['table']
      if (viewMode.value === 'visualization') return ['chart']
      if (viewMode.value === 'statistics') return ['stats']
      return panelIds
    })

    const escCsv = (v) => {
      const s = String(v ?? '')
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }

    const normalizeHeaders = () => {
      const used = new Map()
      return manualHeaders.value.map((h, i) => {
        const base = (h || '').trim() || `Column ${i + 1}`
        const n = used.get(base) || 0
        used.set(base, n + 1)
        return n === 0 ? base : `${base} (${n + 1})`
      })
    }

    const persistValidation = () => {
      try {
        if (!importValidation.value) {
          localStorage.removeItem(validationKey())
          return
        }
        localStorage.setItem(validationKey(), JSON.stringify(importValidation.value))
      } catch (_) {}
    }

    const loadValidation = () => {
      try {
        const raw = localStorage.getItem(validationKey())
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return normalizeValidationReport(parsed)
      } catch (_) {
        return null
      }
    }

    const setValidationReport = (report, open = false) => {
      importValidation.value = normalizeValidationReport(report)
      validationDrafts.value = {}
      validationSaveState.value = ''
      validationModalOpen.value = Boolean(open && importValidation.value)
      persistValidation()
    }

    const loadSeriesColors = () => {
      try {
        const raw = localStorage.getItem(chartColorsKey())
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (_) {
        return {}
      }
    }

    const persistSeriesColors = () => {
      try {
        localStorage.setItem(chartColorsKey(), JSON.stringify(seriesColors.value || {}))
      } catch (_) {}
    }

    const getSeriesColor = (label, index = 0) => {
      if (label && seriesColors.value[label]) return seriesColors.value[label]
      const indexedKey = `series_${index}`
      if (seriesColors.value[indexedKey]) return seriesColors.value[indexedKey]
      return defaultSeriesColor(index)
    }

    const applyColorsToCurrentChart = () => {
      if (!chartDatasets.value.length) return
      chartDatasets.value = chartDatasets.value.map((ds, i) => ({
        ...ds,
        color: getSeriesColor(ds.label, i),
      }))
    }

    const setSeriesColor = (label, index, color) => {
      if (!color) return
      const keyLabel = label || `series_${index}`
      seriesColors.value = { ...seriesColors.value, [keyLabel]: color }
      applyColorsToCurrentChart()
      persistSeriesColors()
    }

    const resetSeriesColors = () => {
      seriesColors.value = {}
      applyColorsToCurrentChart()
      persistSeriesColors()
    }

    const setViewMode = (mode) => {
      viewMode.value = mode
    }

    const clampChartViewportHeight = (value) =>
      Math.min(MAX_CHART_VIEWPORT_HEIGHT, Math.max(MIN_CHART_VIEWPORT_HEIGHT, Math.round(value)))

    const CHART_HEIGHT_PRESETS = [320, 420, 520, 620]
    const chartViewportPresetValue = computed(() =>
      !chartViewportCustom.value && CHART_HEIGHT_PRESETS.includes(chartViewportHeight.value)
        ? String(chartViewportHeight.value)
        : 'custom'
    )

    const chartViewportStyle = computed(() => {
      if (chartViewportCustom.value) {
        return { minHeight: `${MIN_CHART_VIEWPORT_HEIGHT}px` }
      }
      return {
        height: `${chartViewportHeight.value}px`,
        minHeight: `${MIN_CHART_VIEWPORT_HEIGHT}px`,
      }
    })

    const setChartViewportHeight = (value) => {
      if (value === 'custom') return
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return
      chartViewportHeight.value = clampChartViewportHeight(parsed)
      chartViewportCustom.value = false
      applyingChartHeightPreset = true
      requestAnimationFrame(() => {
        applyingChartHeightPreset = false
      })
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

    const normalizeDraftValue = (value) => {
      if (value === null || value === undefined) return null
      const trimmed = String(value).trim()
      return trimmed === '' ? null : trimmed
    }

    const buildPreset = (preset) => {
      const w = canvasW()
      const g = 16
      const preferredChartWidth = 500
      const resolveChartWidth = () => {
        const maxBySpace = Math.max(MIN.chart.w, w - g - MIN.table.w)
        return Math.min(preferredChartWidth, maxBySpace)
      }
      const single = () => {
        let y = 0
        const h = { table: 420, chart: 420, stats: 300 }
        const out = {}
        IDS.forEach((id, i) => { out[id] = { x: 0, y, w, h: h[id], z: i + 1 }; y += h[id] + g })
        return out
      }
      if (w < 980) return single()

      if (preset === 'wide-stack') {
        return {
          table: { x: 0, y: 0, w, h: 380, z: 1 },
          chart: { x: 0, y: 396, w, h: 360, z: 2 },
          stats: { x: 0, y: 772, w, h: 260, z: 3 },
        }
      }
      if (preset === 'analysis-focus') {
        const right = Math.floor(w * 0.4)
        const left = w - right - g
        return {
          chart: { x: 0, y: 0, w: left, h: 460, z: 1 },
          table: { x: 0, y: 476, w: left, h: 360, z: 2 },
          stats: { x: left + g, y: 0, w: right, h: 836, z: 3 },
        }
      }
      if (preset === 'quad') {
        const chartWidth = resolveChartWidth()
        const tableWidth = Math.max(MIN.table.w, w - g - chartWidth)
        const topHeight = 430
        const lowerY = topHeight + g
        return {
          table: { x: 0, y: 0, w: tableWidth, h: topHeight, z: 1 },
          chart: { x: tableWidth + g, y: 0, w: chartWidth, h: topHeight, z: 2 },
          stats: { x: 0, y: lowerY, w, h: 500, z: 3 },
        }
      }
      const right = resolveChartWidth()
      const left = Math.max(MIN.table.w, w - right - g)
      const topHeight = 430
      const statsY = topHeight + g
      return {
        table: { x: 0, y: 0, w: left, h: topHeight, z: 1 },
        chart: { x: left + g, y: 0, w: right, h: topHeight, z: 2 },
        stats: { x: 0, y: statsY, w, h: 500, z: 3 },
      }
    }

    const rectsOverlap = (a, b) =>
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y

    const hasAnyOverlap = (layouts) => {
      for (let i = 0; i < IDS.length; i += 1) {
        for (let j = i + 1; j < IDS.length; j += 1) {
          const a = layouts[IDS[i]]
          const b = layouts[IDS[j]]
          if (a && b && rectsOverlap(a, b)) return true
        }
      }
      return false
    }

    const sanitize = (layouts, savedW) => {
      if (!layouts || typeof layouts !== 'object') return null
      const cw = canvasW()
      const ratio = savedW > 0 ? cw / savedW : 1
      const out = {}
      for (const [i, id] of IDS.entries()) {
        const p = layouts[id]
        if (!p) return null
        let x = Number(p.x) * ratio
        let y = Number(p.y)
        let w = Number(p.w) * ratio
        let h = Number(p.h)
        let z = Number(p.z)
        if ([x, y, w, h].some((v) => !Number.isFinite(v))) return null
        w = Math.max(MIN[id].w, w)
        h = Math.max(MIN[id].h, h)
        if (w > cw) { w = cw; x = 0 }
        x = Math.max(0, x); y = Math.max(0, y)
        if (x + w > cw) x = Math.max(0, cw - w)
        out[id] = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z: Number.isFinite(z) ? z : i + 1 }
      }
      if (hasAnyOverlap(out)) return null
      return out
    }

    const alignPanelsToRightEdge = (layouts) => {
      if (!layouts || typeof layouts !== 'object') return layouts
      const cw = canvasW()
      const out = {}
      IDS.forEach((id) => {
        out[id] = layouts[id] ? { ...layouts[id] } : null
      })

      ;['chart', 'stats'].forEach((id) => {
        const current = out[id]
        if (!current) return

        const candidate = {
          ...current,
          w: Math.round(Math.max(MIN[id].w, cw - current.x)),
        }

        if (Math.abs((candidate.x + candidate.w) - (current.x + current.w)) < 2) return

        const hasCollision = IDS.some((otherId) => {
          if (otherId === id) return false
          const other = out[otherId]
          return other ? rectsOverlap(candidate, other) : false
        })
        if (!hasCollision) {
          out[id] = candidate
        }
      })

      return out
    }

    const setLayouts = (l, persist = true) => {
      panelLayouts.value = alignPanelsToRightEdge(l)
      zCounter.value = Math.max(...IDS.map((id) => panelLayouts.value[id].z)) + 1
      if (persist) saveLayouts()
    }

    const saveLayouts = () => {
      if (!project.value?.dataset || !IDS.every((id) => panelLayouts.value[id])) return
      try {
        localStorage.setItem(key(), JSON.stringify({ width: canvasW(), preset: activePreset.value, layouts: panelLayouts.value }))
      } catch (_) {}
    }

    const loadLayouts = () => {
      try {
        const raw = localStorage.getItem(key())
        if (!raw) return false
        const payload = JSON.parse(raw)
        const preset = payload?.preset || 'default'
        if (preset !== 'custom') {
          activePreset.value = preset
          setLayouts(buildPreset(preset), false)
          return true
        }
        const layouts = sanitize(payload.layouts, Number(payload.width))
        if (!layouts) return false
        activePreset.value = preset
        setLayouts(layouts, false)
        return true
      } catch (_) {
        return false
      }
    }

    const applyPreset = (preset) => {
      activePreset.value = preset
      setLayouts(buildPreset(preset), true)
    }

    const bringToFront = (id) => {
      if (!panelLayouts.value[id]) return
      panelLayouts.value[id].z = zCounter.value++
    }

    const clampRect = (id, rect) => {
      const cw = canvasW()
      const min = MIN[id]
      const out = { x: rect.x, y: rect.y, w: rect.w, h: rect.h }
      out.w = Math.max(min.w, out.w)
      out.h = Math.max(min.h, out.h)
      if (out.w > cw) {
        out.w = cw
        out.x = 0
      }
      if (out.x < 0) out.x = 0
      if (out.x + out.w > cw) out.x = Math.max(0, cw - out.w)
      if (out.y < 0) out.y = 0
      return out
    }

    const collides = (id, rect) =>
      IDS.some((otherId) => {
        if (otherId === id) return false
        const other = panelLayouts.value[otherId]
        return other ? rectsOverlap(rect, other) : false
      })

    const applyCandidate = (id, candidate) => {
      const next = clampRect(id, candidate)
      if (collides(id, next)) return false
      Object.assign(panelLayouts.value[id], next)
      return true
    }

    const pointerToCanvas = (e) => {
      if (!workspaceRef.value || !e) return null
      const rect = workspaceRef.value.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null
      return { x, y }
    }

    const panelAtPoint = (x, y, excludeId = null) => {
      let foundId = null
      let foundZ = -Infinity
      IDS.forEach((id) => {
        if (id === excludeId) return
        const p = panelLayouts.value[id]
        if (!p) return
        if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h && p.z >= foundZ) {
          foundId = id
          foundZ = p.z
        }
      })
      return foundId
    }

    const updateDragSwapTarget = (it, e) => {
      if (!it || it.type !== 'drag') {
        dragSwapTarget.value = null
        return
      }
      const point = pointerToCanvas(e)
      if (!point) {
        dragSwapTarget.value = null
        return
      }
      dragSwapTarget.value = panelAtPoint(point.x, point.y, it.id)
    }

    const swapPanels = (firstId, secondId) => {
      const first = panelLayouts.value[firstId]
      const second = panelLayouts.value[secondId]
      if (!first || !second) return
      const firstRect = { x: first.x, y: first.y, w: first.w, h: first.h }
      Object.assign(first, { x: second.x, y: second.y, w: second.w, h: second.h })
      Object.assign(second, firstRect)
    }

    const startDrag = (id, e) => {
      if (viewMode.value !== 'workspace') return
      const p = panelLayouts.value[id]
      if (!p) return
      bringToFront(id)
      dragSwapTarget.value = null
      interaction.value = { type: 'drag', id, sx: e.clientX, sy: e.clientY, base: { ...p } }
      document.body.style.userSelect = 'none'
    }

    const startResize = (id, dir, e) => {
      if (viewMode.value !== 'workspace') return
      const p = panelLayouts.value[id]
      if (!p) return
      bringToFront(id)
      dragSwapTarget.value = null
      interaction.value = { type: 'resize', id, dir, sx: e.clientX, sy: e.clientY, base: { ...p } }
      document.body.style.userSelect = 'none'
    }

    const onMove = (e) => {
      const it = interaction.value
      if (!it) return
      const p = panelLayouts.value[it.id]
      if (!p) return
      const dx = e.clientX - it.sx
      const dy = e.clientY - it.sy
      if (it.type === 'drag') {
        const b = it.base
        const cw = canvasW()
        applyCandidate(it.id, {
          x: Math.max(0, Math.min(b.x + dx, Math.max(0, cw - b.w))),
          y: Math.max(0, b.y + dy),
          w: b.w,
          h: b.h,
        })
        updateDragSwapTarget(it, e)
        return
      }
      dragSwapTarget.value = null
      const d = it.dir
      const b = it.base
      const min = MIN[it.id]
      const right = b.x + b.w
      const bottom = b.y + b.h
      let x = b.x, y = b.y, w = b.w, h = b.h
      if (d.includes('e')) w = Math.max(min.w, b.w + dx)
      if (d.includes('s')) h = Math.max(min.h, b.h + dy)
      if (d.includes('w')) { x = Math.min(Math.max(0, b.x + dx), right - min.w); w = right - x }
      if (d.includes('n')) { y = Math.min(Math.max(0, b.y + dy), bottom - min.h); h = bottom - y }
      applyCandidate(it.id, { x, y, w, h })
    }

    const onUp = (e) => {
      if (interaction.value) {
        if (viewMode.value === 'workspace' && interaction.value.type === 'drag') {
          updateDragSwapTarget(interaction.value, e)
          const targetId = dragSwapTarget.value
          if (targetId && targetId !== interaction.value.id) {
            swapPanels(interaction.value.id, targetId)
          }
        }
        interaction.value = null
        dragSwapTarget.value = null
        if (viewMode.value === 'workspace') {
          activePreset.value = 'custom'
          saveLayouts()
        }
      }
      document.body.style.userSelect = ''
    }

    const onResizeWindow = () => {
      resizeTick.value += 1
      if (viewMode.value !== 'workspace') return
      const next = {}
      IDS.forEach((id) => {
        if (!panelLayouts.value[id]) return
        next[id] = { ...panelLayouts.value[id], ...clampRect(id, panelLayouts.value[id]) }
      })
      if (!IDS.every((id) => next[id])) return
      const aligned = alignPanelsToRightEdge(next)
      if (hasAnyOverlap(aligned)) {
        const fallbackPreset = activePreset.value === 'custom' ? 'default' : activePreset.value
        activePreset.value = fallbackPreset
        setLayouts(buildPreset(fallbackPreset), true)
        return
      }
      IDS.forEach((id) => Object.assign(panelLayouts.value[id], aligned[id]))
      saveLayouts()
    }

    const loadProject = async () => {
      loading.value = true
      try {
        const r = await projectsApi.get(route.params.id)
        project.value = r.project
        if (project.value?.dataset) {
          seriesColors.value = loadSeriesColors()
          await Promise.all([
            loadRows(),
            loadAnalysisRows(),
            loadSemanticSchema(false),
            loadSuggestions(),
            loadStatisticsSummary(),
          ])

          if (suggestions.value.length && !chartDatasets.value.length) {
            const suggested = suggestions.value[0]?.definition
            if (suggested) {
              chartDefinition.value = normalizeChartDefinition(
                mergeChartDefinition(createDefaultChartDefinition(suggested.chartType || 'line'), suggested)
              )
              buildChart(chartDefinition.value)
            }
          } else if (!chartDatasets.value.length) {
            clearChart()
          }

          const backendValidation = normalizeValidationReport(project.value?.dataset?.validation_report_json)
          if (backendValidation) {
            setValidationReport(backendValidation, false)
          } else if (!importValidation.value) {
            importValidation.value = loadValidation()
          }
          if (initializedForProjectId.value !== String(route.params.id)) {
            await nextTick()
            if (!loadLayouts()) applyPreset('default')
            requestAnimationFrame(() => onResizeWindow())
            initializedForProjectId.value = String(route.params.id)
          }
        } else {
          setValidationReport(null)
          seriesColors.value = {}
          tableRows.value = []; analysisRows.value = []; suggestions.value = []; statisticsSummary.value = []
          chartLabels.value = []; chartDatasets.value = []; chartMeta.value = {}
          chartDefinition.value = createDefaultChartDefinition('line')
          chartValidation.value = { errors: [], warnings: [] }
          chartViewportHeight.value = 320
          chartViewportCustom.value = false
          schemaStore.applySchema(null)
        }
      } catch (e) {
        console.error(e)
      } finally {
        loading.value = false
      }
    }

    const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)
    const readRowValue = (values, position, columnName) => {
      if (Array.isArray(values)) {
        return position < values.length ? values[position] : null
      }
      if (values && typeof values === 'object') {
        if (hasOwn(values, position)) return values[position]
        if (hasOwn(values, String(position))) return values[String(position)]
        if (hasOwn(values, columnName)) return values[columnName]
      }
      return null
    }

    const mapApiRows = (rows) =>
      rows.map((row) => {
        const values = typeof row.values === 'string' ? JSON.parse(row.values) : (row.values || {})
        const mapped = { id: row.id }
        sortedDatasetColumns.value.forEach((col) => {
          const position = Number(col.position)
          const value = readRowValue(values, position, col.name)
          mapped[cellField(position)] = value === undefined ? null : value
        })
        return mapped
      })

    const loadRows = async () => {
      try {
        const response = await projectsApi.getRows(route.params.id)
        const data = response.data ?? response
        const rows = Array.isArray(data) ? data : (data.data || [])
        tableRows.value = mapApiRows(rows)
        if (validationModalOpen.value && importValidation.value) {
          initValidationDrafts()
        }
      } catch (e) {
        console.error(e)
      }
    }

    const loadAnalysisRows = async () => {
      try {
        const perPage = 500
        let page = 1
        let collected = []

        while (true) {
          const response = await projectsApi.getRows(route.params.id, page, perPage)
          const payload = response.data ?? response
          const rows = Array.isArray(payload) ? payload : (payload.data || [])
          collected = collected.concat(rows)

          if (Array.isArray(payload) || !payload.last_page || page >= payload.last_page) {
            break
          }
          page += 1
        }

        analysisRows.value = mapApiRows(collected)
      } catch (e) {
        console.error(e)
      }
    }

    const loadSemanticSchema = async (rebuild = false) => {
      try {
        await schemaStore.fetchSchema(route.params.id, { rebuild })
      } catch (e) {
        console.error(e)
      }
    }

    const loadStatisticsSummary = async () => {
      statisticsLoading.value = true
      statisticsError.value = ''
      try {
        const response = await projectsApi.getStatisticsSummary(route.params.id)
        statisticsSummary.value = response.statistics || []
      } catch (e) {
        console.error(e)
        statisticsError.value = e?.response?.data?.message || 'Failed to load statistics summary.'
      } finally {
        statisticsLoading.value = false
      }
    }

    const loadSuggestions = async () => {
      suggestionsLoading.value = true
      try {
        const response = await projectsApi.getChartSuggestions(route.params.id)
        suggestions.value = response.suggestions || []
      } catch (e) {
        console.error(e)
        suggestions.value = []
      } finally {
        suggestionsLoading.value = false
      }
    }

    const refreshData = async () => {
      await Promise.all([
        loadRows(),
        loadAnalysisRows(),
        loadSemanticSchema(true),
        loadSuggestions(),
        loadStatisticsSummary(),
      ])
      buildChart(chartDefinition.value)
    }

    const handleFileSelect = (e) => { selectedFile.value = e.target.files?.[0] || null }
    const handleImport = async () => {
      if (!selectedFile.value) return
      importing.value = true; manualError.value = ''
      try {
        const response = await projectsApi.importDataset(route.params.id, selectedFile.value, importOptions.value)
        setValidationReport(response.validation || null, false)
        await loadProject()
        openValidationModal()
      }
      catch (e) { window.alert('Import error: ' + (e.response?.data?.message || e.message)) }
      finally { importing.value = false }
    }

    const addManualColumn = () => { manualHeaders.value.push(`Column ${manualHeaders.value.length + 1}`); manualRowsInput.value = manualRowsInput.value.map((r) => [...r, '']) }
    const removeManualColumn = () => { if (manualHeaders.value.length <= 1) return; manualHeaders.value.pop(); manualRowsInput.value = manualRowsInput.value.map((r) => r.slice(0, manualHeaders.value.length)) }
    const addManualRow = () => manualRowsInput.value.push(createManualRow(manualHeaders.value.length))
    const removeManualRow = () => { if (manualRowsInput.value.length > 1) manualRowsInput.value.pop() }

    const handleManualImport = async () => {
      manualError.value = ''
      if (!manualHeaders.value.length) { manualError.value = 'Add at least one column.'; return }
      if (!manualRowsInput.value.length) { manualError.value = 'Add at least one row.'; return }
      const hasData = manualRowsInput.value.some((r) => r.some((c) => String(c || '').trim() !== ''))
      if (!hasData) { manualError.value = 'Fill at least one cell before creating the table.'; return }

      importing.value = true
      try {
        const headers = normalizeHeaders()
        const lines = [headers.map(escCsv).join(',')]
        manualRowsInput.value.forEach((row) => lines.push(headers.map((_, i) => row[i] ?? '').map(escCsv).join(',')))
        const file = new File([lines.join('\n')], 'manual_dataset.csv', { type: 'text/csv' })
        const response = await projectsApi.importDataset(route.params.id, file, { has_header: true, delimiter: ',' })
        setValidationReport(response.validation || null, false)
        await loadProject()
        openValidationModal()
      } catch (e) {
        manualError.value = e?.response?.data?.message || 'Failed to create table from manual data.'
      } finally {
        importing.value = false
      }
    }

    const handleCellEdit = async (data) => {
      try {
        const values = sortedDatasetColumns.value.map((col) => data.row[cellField(col.position)] ?? null)
        await projectsApi.updateRow(route.params.id, data.row.id, values)
      } catch (e) { console.error(e) }
    }

    const handleSemanticTypeChange = async ({ columnId, semanticType, analyticalRole, isExcludedFromAnalysis }) => {
      try {
        await schemaStore.setSemanticType(route.params.id, columnId, {
          semantic_type: semanticType,
          analytical_role: analyticalRole,
          is_excluded_from_analysis: isExcludedFromAnalysis,
        })
        await Promise.all([loadSuggestions(), loadStatisticsSummary()])
        buildChart(chartDefinition.value)
      } catch (e) {
        console.error(e)
      }
    }

    const handleOrdinalOrderChange = async ({ columnId, ordinalOrder }) => {
      if (!Array.isArray(ordinalOrder) || ordinalOrder.length < 2) return
      try {
        await schemaStore.setOrdinalOrder(route.params.id, columnId, ordinalOrder)
        await Promise.all([loadSuggestions(), loadStatisticsSummary()])
        buildChart(chartDefinition.value)
      } catch (e) {
        console.error(e)
      }
    }

    const buildChart = (nextDefinition = chartDefinition.value) => {
      const normalized = normalizeChartDefinition(nextDefinition)
      const validation = validateChartDefinition(normalized, schemaColumns.value)
      chartDefinition.value = validation.normalizedDefinition
      chartValidation.value = {
        errors: validation.errors || [],
        warnings: validation.warnings || [],
      }

      if (!validation.valid) {
        chartLabels.value = []
        chartDatasets.value = []
        chartMeta.value = {}
        chartType.value = normalized.chartType
        return
      }

      const definition = buildSemanticChartData({
        definition: validation.normalizedDefinition,
        schemaColumns: schemaColumns.value,
        rows: analysisRows.value.length ? analysisRows.value : tableRows.value,
        getSeriesColor,
      })

      chartType.value = definition.type || validation.normalizedDefinition.chartType
      chartLabels.value = definition.labels || []
      chartDatasets.value = definition.datasets || []
      chartMeta.value = definition.meta || {}
    }

    const clearChart = () => {
      chartLabels.value = []
      chartDatasets.value = []
      chartMeta.value = {}
      chartValidation.value = { errors: [], warnings: [] }
    }
    const exportTableCsv = () => {
      if (!tableColumns.value.length || !tableRows.value.length) { window.alert('No table data to export.'); return }
      const headers = tableColumns.value.map((c) => c.title)
      const lines = [headers.map(escCsv).join(',')]
      tableRows.value.forEach((row) => lines.push(tableColumns.value.map((c) => row[c.field] ?? '').map(escCsv).join(',')))
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.value?.title || 'project'}-table.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    const formatIssueValue = (value) => {
      if (value === null || value === undefined || value === '') return 'null'
      return String(value)
    }
    const formatIssueTargetLabel = (issue) => formatIssueTarget(issue)

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

    const applyValidationEdits = async () => {
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
          const values = sortedDatasetColumns.value.map((col) => {
            const value = row[cellField(col.position)]
            return value === '' ? null : (value ?? null)
          })
          await projectsApi.updateRow(route.params.id, rowId, values)
        }

        persistValidation()
        await Promise.all([loadRows(), loadAnalysisRows(), loadSemanticSchema(true), loadSuggestions(), loadStatisticsSummary()])
        buildChart(chartDefinition.value)
        initValidationDrafts()
        validationSaveState.value = `Saved ${changedCells} cell change${changedCells === 1 ? '' : 's'}.`
      } catch (e) {
        console.error(e)
        validationSaveState.value = 'Failed to save validation edits.'
      } finally {
        savingValidation.value = false
      }
    }

    const onEsc = (e) => {
      if (e.key === 'Escape' && validationModalOpen.value) {
        closeValidationModal()
      }
    }

    let chartViewportResizeObserver = null
    let applyingChartHeightPreset = false

    onMounted(() => {
      loadProject()
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      window.addEventListener('resize', onResizeWindow)
      window.addEventListener('keydown', onEsc)

      if (typeof ResizeObserver !== 'undefined' && chartViewportRef.value) {
        chartViewportResizeObserver = new ResizeObserver((entries) => {
          const height = entries?.[0]?.contentRect?.height
          if (!Number.isFinite(height)) return
          const next = clampChartViewportHeight(height)
          if (applyingChartHeightPreset) {
            chartViewportHeight.value = next
            return
          }
          if (!chartViewportCustom.value && Math.abs(next - chartViewportHeight.value) < 2) return
          if (!chartViewportCustom.value && Math.abs(next - chartViewportHeight.value) >= 2) {
            chartViewportCustom.value = true
          }
          chartViewportHeight.value = next
        })
        chartViewportResizeObserver.observe(chartViewportRef.value)
      }
    })

    onBeforeUnmount(() => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('resize', onResizeWindow)
      window.removeEventListener('keydown', onEsc)
      if (chartViewportResizeObserver) {
        chartViewportResizeObserver.disconnect()
        chartViewportResizeObserver = null
      }
      document.body.style.userSelect = ''
      saveLayouts()
    })

    watch(() => route.params.id, () => {
      initializedForProjectId.value = null
      importValidation.value = null
      validationModalOpen.value = false
      validationDrafts.value = {}
      validationSaveState.value = ''
      viewMode.value = 'workspace'
      seriesColors.value = {}
      chartLabels.value = []
      chartDatasets.value = []
      chartMeta.value = {}
      chartDefinition.value = createDefaultChartDefinition('line')
      chartValidation.value = { errors: [], warnings: [] }
      chartViewportHeight.value = 320
      chartViewportCustom.value = false
      analysisRows.value = []
      statisticsSummary.value = []
      statisticsError.value = ''
      dragSwapTarget.value = null
      schemaStore.applySchema(null)
      loadProject()
    })

    return {
      project, loading, selectedFile, importing, importOptions, importMode, manualHeaders, manualRowsInput, manualError,
      importValidation, validationModalOpen, validationDrafts, savingValidation, validationSaveState,
      openValidationModal, closeValidationModal, clearValidationReport, applyValidationEdits,
      resolveIssueTarget, formatIssueValue, formatIssueTargetLabel,
      severityOrder, validationSummary, validationSummaryLine, validationIssuesBySeverity,
      validationIssueCount, validationColumnRows, editableValidationIssueCount,
      getSeriesColor, setSeriesColor, resetSeriesColors,
      viewMode, setViewMode, visiblePanelIds,
      tableRows, tableColumns, analysisRows, schemaColumns, schemaUpdatingColumnId,
      suggestions, suggestionsLoading, statisticsSummary, statisticsLoading, statisticsError,
      chartType, chartDefinition, chartValidation,
      chartViewportHeight, chartViewportPresetValue, chartViewportStyle, setChartViewportHeight,
      chartLabels, chartDatasets, chartMeta, workspaceRef, chartViewportRef, workspaceHeight, panelIds, panelConfig, resizeDirs, panelStyle, dragSwapTarget,
      activePreset, presetOptions, applyPreset, bringToFront, startDrag, startResize, handleFileSelect, handleImport,
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
.top-row { margin-bottom: 12px; }
.top-row-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.top-row-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.top-row-right { display: flex; align-items: center; gap: 8px; }
.view-mode-switch { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.loading { text-align: center; padding: 3rem; color: var(--muted); }
.error { text-align: center; padding: 2rem; color: #fca5a5; }
.section-title { font-weight: 700; margin-bottom: 12px; }
.mode-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.manual-builder { display: flex; flex-direction: column; gap: 10px; }
.manual-table-wrap { max-height: 360px; }
.manual-table { min-width: 600px; }
.manual-input { width: 100%; min-width: 120px; padding: 7px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); font-size: 13px; }
.manual-input:focus { outline: none; border-color: var(--accent); }
.manual-input.header { font-weight: 600; }
.manual-error { color: #ff9b9b; font-size: 13px; }
.validation-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(29, 185, 84, 0.2);
  color: #93f6b3;
  font-size: 11px;
  font-weight: 700;
}
.validation-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.validation-modal {
  width: min(860px, 94vw);
  max-height: 84vh;
  overflow: auto;
}
.validation-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.validation-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.validation-title { font-size: 15px; font-weight: 700; color: #93f6b3; }
.validation-summary { color: var(--muted); font-size: 13px; line-height: 1.45; }
.validation-severity-line { margin-top: 4px; }
.validation-groups { margin-top: 10px; display: flex; flex-direction: column; gap: 12px; }
.validation-group-title { font-size: 12px; font-weight: 700; color: var(--muted); margin-bottom: 4px; }
.validation-list { display: flex; flex-direction: column; gap: 6px; max-height: 46vh; overflow: auto; padding-right: 4px; }
.validation-item { font-size: 12px; color: var(--text); line-height: 1.45; border: 1px solid var(--border); border-radius: 10px; padding: 8px; background: #161616; }
.validation-item-meta { margin-bottom: 4px; }
.validation-item-code { color: var(--muted); font-size: 11px; margin-bottom: 4px; }
.validation-diff { color: #93f6b3; }
.validation-columns { margin-top: 12px; }
.validation-columns-wrap { max-height: 240px; }
.validation-columns-table { min-width: 680px; }
.validation-footer { margin-top: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.validation-save-state { color: var(--muted); font-size: 12px; }

.layout-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.layout-controls { display: flex; gap: 8px; flex-wrap: wrap; }

.presets-panel { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.presets-title { color: var(--muted); font-size: 13px; font-weight: 700; }
.presets-row { display: flex; gap: 8px; flex-wrap: wrap; }

.workspace-canvas { position: relative; width: 100%; min-height: 760px; }
.workspace-panel { position: absolute; overflow: hidden; box-sizing: border-box; padding: 12px; }
.workspace-panel.swap-target {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px rgba(29, 185, 84, 0.5), 0 10px 24px rgba(0, 0, 0, 0.32);
}
.drag-handle { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border); cursor: move; user-select: none; }
.drag-handle .title { font-weight: 700; }
.drag-handle .sub { font-size: 12px; color: var(--muted); }

.panel-content { height: calc(100% - 44px); overflow: hidden; }
.table-content, .stats-content { overflow: auto; }
.chart-content { overflow: auto; }
.table-fill { min-height: 240px; max-height: calc(100% - 42px); }

.chart-shell { display: flex; flex-direction: column; gap: 10px; min-height: 100%; }
.chart-main { flex: 0 0 auto; min-height: 320px; }
.chart-main-resizable {
  width: 100%;
  min-width: 320px;
  max-width: 100%;
  align-self: flex-start;
  resize: both;
  overflow: auto;
  max-height: 920px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 6px;
}
.chart-tools { display: flex; flex-direction: column; gap: 10px; }
.chart-size-control { color: var(--muted); font-size: 12px; align-self: center; }
.chart-size-select {
  min-width: 120px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 7px 9px;
  font-size: 13px;
}

.stats-shell { display: flex; flex-direction: column; gap: 10px; height: 100%; overflow: auto; padding-right: 2px; }
.stats-level { border: 1px solid var(--border); border-radius: 10px; background: #171717; padding: 10px; }
.stats-level-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.stats-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.stats-button-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.stats-metric-grid { display: flex; flex-wrap: wrap; gap: 8px 14px; }
.stats-metric-item { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text); }
.stats-table-wrap { max-height: 420px; overflow: auto; }
.stats-table { min-width: 640px; }
.stats-table th:first-child,
.stats-table td:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #141414;
}
.muted { color: var(--muted); font-size: 13px; }

.controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.series-colors { border: 1px solid var(--border); border-radius: 10px; background: #171717; padding: 10px; margin-bottom: 10px; }
.series-colors-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.series-colors-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
.series-color-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--border); border-radius: 8px; background: #1c1c1c; padding: 7px 10px; }
.series-color-name { font-size: 12px; color: var(--muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.series-color-input { width: 32px; height: 22px; border: none; border-radius: 6px; background: transparent; padding: 0; cursor: pointer; }
.series-color-input::-webkit-color-swatch-wrapper { padding: 0; }
.series-color-input::-webkit-color-swatch { border: 1px solid var(--border); border-radius: 6px; }
.table-bottom-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
.analysis-box { border: 1px solid var(--border); border-radius: 10px; background: #1a1a1a; padding: 10px; }
.analysis-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.analysis-item { font-size: 12px; color: var(--muted); line-height: 1.5; margin-bottom: 6px; }
.analysis-item:last-child { margin-bottom: 0; }

.resize-handle { position: absolute; z-index: 5; }
.h-n { top: -4px; left: 12px; right: 12px; height: 8px; cursor: n-resize; }
.h-s { bottom: -4px; left: 12px; right: 12px; height: 8px; cursor: s-resize; }
.h-e { top: 12px; bottom: 12px; right: -4px; width: 8px; cursor: e-resize; }
.h-w { top: 12px; bottom: 12px; left: -4px; width: 8px; cursor: w-resize; }

@media (max-width: 980px) {
  .workspace-canvas { min-height: 980px; }
  .stats-metric-grid { flex-direction: column; gap: 6px; }
}

@media (max-width: 720px) {
  .manual-table { min-width: 520px; }
}
</style>
