<template>
  <div
    :ref="setWorkspaceRef"
    :class="['workspace-canvas', { 'workspace-canvas-compact': isCompactWorkspace }]"
    :style="canvasStyle"
  >
    <section
      v-for="panelId in panelIds"
      :key="panelId"
      v-show="isPanelVisible(panelId)"
      class="workspace-panel panel"
      :style="panelInlineStyle(panelId)"
      @mousedown="viewMode === 'workspace' && !isCompactWorkspace && $emit('bring-to-front', panelId)"
    >
      <header class="drag-handle" @mousedown.left.prevent="viewMode === 'workspace' && !isCompactWorkspace && $emit('start-drag', { panelId, event: $event })">
        <div class="title">{{ panelConfig[panelId].title }}</div>
        <div class="sub">{{ panelConfig[panelId].subtitle }}</div>
      </header>

      <div :class="['panel-content', `${panelId}-content`]">
        <template v-if="panelId === 'table'">
          <div v-if="requiresLandscapeForTable" class="rotate-device-lock">
            <div class="rotate-device-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 4h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.8"/>
                <path d="M4 18a8 8 0 0 0 13 2M20 6a8 8 0 0 0-13-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="rotate-device-title">{{ $t('project.workspace.table.rotateTitle') }}</div>
            <div class="rotate-device-text">
              {{ $t('project.workspace.table.rotateText') }}
            </div>
            <button class="btn rotate-device-continue" type="button" @click="allowPortraitTable">
              {{ $t('project.workspace.table.rotateContinue') }}
            </button>
          </div>
          <template v-else>
            <div class="table-wrap table-fill">
              <DataTable
                :columns="tableColumns"
                :rows="tableRows"
                :active="isPanelVisible('table')"
                :editable="tableEditable"
                @cell-edited="$emit('cell-edit', $event)"
              />
            </div>
            <div class="table-bottom-actions">
              <button class="btn" type="button" @click="$emit('export-csv')">{{ $t('project.workspace.table.exportCsv') }}</button>
            </div>
          </template>
        </template>

        <template v-else-if="panelId === 'chart'">
          <div class="chart-shell">
            <div
              :ref="setChartViewportRef"
              class="chart-main chart-main-resizable"
              :style="chartViewportStyle"
            >
              <ChartPanel
                embedded
                :labels="chartLabels"
                :datasets="chartDatasets"
                :meta="chartMeta"
                :type="chartType"
                :quick-actions="quickActions"
                :allow-build="true"
                :build-disabled="!canBuildChart"
                :allow-save="!readOnly"
                @build="emitBuildChart"
                @quick-action="handleQuickChartAction"
                @save="$emit('save-chart')"
              />
            </div>
            <div class="chart-tools">
              <div class="controls">
                <button class="btn" type="button" @click="$emit('refresh-data')">{{ $t('project.workspace.chart.refreshData') }}</button>
                <button class="btn" type="button" @click="$emit('export-csv')">{{ $t('project.workspace.chart.exportCsv') }}</button>
                <label class="chart-size-control" for="chart-height-select">{{ $t('project.workspace.chart.heightLabel') }}</label>
                <select
                  id="chart-height-select"
                  name="chart_height"
                  class="chart-size-select"
                  :value="chartViewportPresetValue"
                  @change="$emit('set-chart-height', $event.target.value)"
                >
                  <option value="320">{{ $t('project.workspace.chart.heights.compact') }}</option>
                  <option value="420">{{ $t('project.workspace.chart.heights.medium') }}</option>
                  <option value="520">{{ $t('project.workspace.chart.heights.tall') }}</option>
                  <option value="620">{{ $t('project.workspace.chart.heights.xl') }}</option>
                  <option v-if="chartViewportPresetValue === 'custom'" value="custom">{{ $t('project.workspace.chart.heights.custom') }}</option>
                </select>
              </div>
              <ChartBuilder
                :schema-columns="schemaColumns"
                v-model="chartDefinitionModel"
                :suggestions="suggestions"
                @build="$emit('build-chart', $event)"
              />
              <div v-if="chartDatasets.length" class="series-colors">
                <div class="series-colors-head">
                  <div class="analysis-title">{{ $t('project.workspace.chart.seriesColors') }}</div>
                  <button type="button" class="btn" @click="$emit('reset-series-colors')">{{ $t('project.workspace.chart.resetColors') }}</button>
                </div>
                <div class="series-colors-grid">
                  <div v-for="(ds, i) in chartDatasets" :key="`series-color-${ds.label}-${i}`" class="series-color-item">
                    <span class="series-color-name">{{ ds.label || $t('project.workspace.chart.seriesFallback', { index: i + 1 }) }}</span>
                    <input
                      type="color"
                      class="series-color-input"
                      :name="`series_color_${i}`"
                      :aria-label="seriesColorAriaLabel(ds, i)"
                      :value="getSeriesColor(ds.label, i)"
                      @input="$emit('set-series-color', { label: ds.label, index: i, color: $event.target.value })"
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
              :rows-ready="analysisRowsReady"
              :rows-loading="analysisRowsLoading"
              :rows-error="analysisRowsError"
              :loading="statisticsLoading"
              :error="statisticsError"
              :updating-column-id="schemaUpdatingColumnId"
              :read-only="readOnly"
              @load-rows="$emit('load-analysis-rows')"
              @change-semantic="$emit('change-semantic', $event)"
              @change-ordinal-order="$emit('change-ordinal-order', $event)"
            />
          </div>
        </template>

        <template v-else-if="panelId === 'library'">
          <div class="library-shell">
            <div class="library-head">
              <div class="analysis-title">{{ $t('project.workspace.library.title') }}</div>
              <button class="btn" type="button" @click="$emit('refresh-saved-charts')">{{ $t('project.workspace.library.refresh') }}</button>
            </div>

            <div v-if="savedChartsLoading" class="library-empty">{{ $t('project.workspace.library.loading') }}</div>
            <div v-else-if="savedChartsError" class="library-empty">{{ savedChartsError }}</div>
            <div v-else-if="!savedCharts.length" class="library-empty">
              {{ $t('project.workspace.library.empty') }}
            </div>

            <div v-else class="saved-charts-grid">
              <article
                v-for="savedChart in savedCharts"
                :key="`saved-chart-${savedChart.id}`"
                class="saved-chart-card"
              >
                <div class="saved-chart-head">
                  <div class="saved-chart-name">
                    <div class="saved-chart-title-row">
                      <input
                        class="saved-chart-title-input-inline"
                        type="text"
                        :name="`saved_chart_title_${savedChart.id}`"
                        :aria-label="$t('project.workspace.library.titleAria', { id: savedChart.id })"
                        maxlength="255"
                        :value="getSavedChartTitleDraft(savedChart)"
                        @input="setSavedChartTitleDraft(savedChart.id, $event.target.value)"
                        @focus="selectAllInputText($event)"
                        @click="selectAllInputText($event)"
                        @keydown.enter.prevent="saveSavedChartTitle(savedChart)"
                      />
                      <button
                        v-if="hasSavedChartTitleChanges(savedChart)"
                        class="btn"
                        type="button"
                        @click="saveSavedChartTitle(savedChart)"
                      >
                        {{ $t('project.workspace.library.saveTitle') }}
                      </button>
                    </div>
                    <div class="saved-chart-meta">
                      {{ savedChartMeta(savedChart) }}
                    </div>
                  </div>
                </div>
                <div class="saved-chart-canvas">
                  <ChartPanel
                    embedded
                    :labels="savedChart.labels"
                    :datasets="savedChart.datasets"
                    :meta="savedChart.meta"
                    :type="savedChart.type"
                    :allow-export="false"
                  />
                </div>
                <div class="saved-chart-actions">
                  <button class="btn" type="button" @click="$emit('download-saved-chart', savedChart)">{{ $t('project.workspace.library.download') }}</button>
                  <button class="btn" type="button" @click="$emit('delete-saved-chart', savedChart.id)">{{ $t('common.delete') }}</button>
                </div>
              </article>
            </div>

          </div>
        </template>
      </div>

      <div
        v-if="viewMode === 'workspace' && !isCompactWorkspace"
        v-for="d in resizeDirs"
        :key="`${panelId}-${d}`"
        :class="['resize-handle', `h-${d}`]"
        @mousedown.left.stop.prevent="$emit('start-resize', { panelId, dir: d, event: $event })"
      ></div>
    </section>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ChartPanel from './ChartPanel.vue'
import ChartBuilder from './ChartBuilder.vue'
import DataTable from './DataTable.vue'
import StatisticsWorkspace from './StatisticsWorkspace.vue'
import { getFriendlyBuildHint } from '../../charts/ui/friendlyChartHints'
import { buildQuickChartActions } from '../../charts/ui/quickChartActions'

const noop = () => {}

export default {
  name: 'ProjectWorkspaceCanvas',
  components: {
    DataTable,
    ChartPanel,
    ChartBuilder,
    StatisticsWorkspace,
  },
  props: {
    viewMode: { type: String, default: 'workspace' },
    isCompactWorkspace: { type: Boolean, default: false },
    workspaceHeight: { type: Number, default: 760 },
    visiblePanelIds: { type: Array, default: () => [] },
    panelConfig: { type: Object, default: () => ({}) },
    resizeDirs: { type: Array, default: () => [] },
    panelStyle: { type: Function, default: () => ({}) },
    setWorkspaceRef: { type: Function, default: noop },
    setChartViewportRef: { type: Function, default: noop },
    tableColumns: { type: Array, default: () => [] },
    tableRows: { type: Array, default: () => [] },
    chartViewportStyle: { type: Object, default: () => ({}) },
    chartViewportPresetValue: { type: String, default: '320' },
    chartLabels: { type: Array, default: () => [] },
    chartDatasets: { type: Array, default: () => [] },
    chartMeta: { type: Object, default: () => ({}) },
    chartType: { type: String, default: 'line' },
    chartDefinition: { type: Object, default: () => ({}) },
    schemaColumns: { type: Array, default: () => [] },
    suggestions: { type: Array, default: () => [] },
    statisticsSummary: { type: Array, default: () => [] },
    statisticsLoading: { type: Boolean, default: false },
    statisticsError: { type: String, default: '' },
    savedCharts: { type: Array, default: () => [] },
    savedChartsLoading: { type: Boolean, default: false },
    savedChartsError: { type: String, default: '' },
    analysisRows: { type: Array, default: () => [] },
    analysisRowsReady: { type: Boolean, default: false },
    analysisRowsLoading: { type: Boolean, default: false },
    analysisRowsError: { type: String, default: '' },
    schemaUpdatingColumnId: { type: [String, Number], default: null },
    getSeriesColor: { type: Function, default: () => '#1db954' },
    readOnly: { type: Boolean, default: false },
    tableEditable: { type: Boolean, default: true },
  },
  emits: [
    'bring-to-front',
    'start-drag',
    'start-resize',
    'cell-edit',
    'refresh-data',
    'export-csv',
    'load-analysis-rows',
    'set-chart-height',
    'build-chart',
    'save-chart',
    'set-series-color',
    'reset-series-colors',
    'change-semantic',
    'change-ordinal-order',
    'refresh-saved-charts',
    'rename-saved-chart',
    'download-saved-chart',
    'delete-saved-chart',
    'update-chart-definition',
  ],
  setup(props, { emit }) {
    const { t, locale } = useI18n({ useScope: 'global' })
    const panelIds = computed(() => Object.keys(props.panelConfig || {}))
    const isPanelVisible = (panelId) => props.visiblePanelIds.includes(panelId)
    const canvasStyle = computed(() =>
      props.isCompactWorkspace ? {} : { height: `${props.workspaceHeight}px` }
    )
    const panelInlineStyle = (panelId) =>
      props.isCompactWorkspace ? {} : props.panelStyle(panelId)
    const requiresLandscapeForTable = ref(false)
    const portraitTableBypass = ref(false)
    const titleDrafts = ref({})

    const detectLandscapeRequirement = () => {
      if (typeof window === 'undefined') {
        requiresLandscapeForTable.value = false
        return
      }

      const width = window.innerWidth || 0
      const height = window.innerHeight || 0
      const isPortrait = height > width
      const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches
      const likelyPhone = width <= 820

      requiresLandscapeForTable.value = Boolean(
        hasCoarsePointer &&
        likelyPhone &&
        isPortrait &&
        !portraitTableBypass.value &&
        (props.viewMode === 'table' || props.viewMode === 'workspace')
      )
    }

    const allowPortraitTable = () => {
      portraitTableBypass.value = true
      requiresLandscapeForTable.value = false
    }

    const normalizedSavedChartTitle = (savedChart) => {
      const value = String(savedChart?.title || '').trim()
      return value || t('project.workspace.library.untitledChart')
    }

    const savedChartMeta = (savedChart) => {
      locale.value
      const typeLabel = String(savedChart?.type || '').trim() || t('project.workspace.library.chartFallback')
      return `${typeLabel} - ${savedChart?.created_at || '-'}`
    }

    const seriesColorAriaLabel = (dataset, index) => {
      const seriesLabel = dataset?.label || t('project.workspace.chart.seriesFallback', { index: index + 1 })
      return t('project.workspace.chart.seriesColorAria', { name: seriesLabel })
    }

    watch(
      () => props.savedCharts,
      (nextCharts) => {
        const nextDrafts = {}
        ;(nextCharts || []).forEach((savedChart) => {
          const id = Number(savedChart?.id || 0)
          if (!id) return
          const persistedTitle = normalizedSavedChartTitle(savedChart)
          const existingDraft = titleDrafts.value[id]
          nextDrafts[id] = typeof existingDraft === 'string' ? existingDraft : persistedTitle
        })
        titleDrafts.value = nextDrafts
      },
      { immediate: true }
    )

    const getSavedChartTitleDraft = (savedChart) => {
      const id = Number(savedChart?.id || 0)
      if (!id) return normalizedSavedChartTitle(savedChart)
      return titleDrafts.value[id] ?? normalizedSavedChartTitle(savedChart)
    }

    const setSavedChartTitleDraft = (savedChartId, value) => {
      const id = Number(savedChartId || 0)
      if (!id) return
      titleDrafts.value = {
        ...titleDrafts.value,
        [id]: String(value ?? ''),
      }
    }

    const selectAllInputText = (event) => {
      const input = event?.target
      if (!input || typeof input.select !== 'function') return
      requestAnimationFrame(() => input.select())
    }

    const hasSavedChartTitleChanges = (savedChart) => {
      const draft = String(getSavedChartTitleDraft(savedChart) || '').trim()
      const persisted = normalizedSavedChartTitle(savedChart)
      return Boolean(draft) && draft !== persisted
    }

    const saveSavedChartTitle = (savedChart) => {
      if (!savedChart?.id) return
      const draft = String(getSavedChartTitleDraft(savedChart) || '').trim()
      const persisted = normalizedSavedChartTitle(savedChart)
      if (!draft) {
        setSavedChartTitleDraft(savedChart.id, persisted)
        return
      }
      if (draft === persisted) return
      emit('rename-saved-chart', {
        chartId: Number(savedChart.id),
        title: draft,
      })
    }

    const chartDefinitionModel = computed({
      get: () => props.chartDefinition,
      set: (value) => emit('update-chart-definition', value),
    })
    const chartBuildHint = computed(() => getFriendlyBuildHint(props.chartDefinition, props.schemaColumns))
    const canBuildChart = computed(() => !chartBuildHint.value)
    const quickActions = computed(() => buildQuickChartActions(props.suggestions, props.schemaColumns))

    const emitBuildChart = () => {
      if (!canBuildChart.value) return
      emit('build-chart', chartDefinitionModel.value)
    }

    const handleQuickChartAction = (action) => {
      if (!action?.definition) return
      emit('update-chart-definition', action.definition)
      emit('build-chart', action.definition)
    }

    onMounted(() => {
      detectLandscapeRequirement()
      window.addEventListener('resize', detectLandscapeRequirement)
      window.addEventListener('orientationchange', detectLandscapeRequirement)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', detectLandscapeRequirement)
      window.removeEventListener('orientationchange', detectLandscapeRequirement)
    })

    watch(
      () => props.viewMode,
      () => detectLandscapeRequirement()
    )

    return {
      panelIds,
      isPanelVisible,
      canvasStyle,
      panelInlineStyle,
      requiresLandscapeForTable,
      allowPortraitTable,
      getSavedChartTitleDraft,
      setSavedChartTitleDraft,
      savedChartMeta,
      seriesColorAriaLabel,
      selectAllInputText,
      hasSavedChartTitleChanges,
      saveSavedChartTitle,
      chartDefinitionModel,
      canBuildChart,
      quickActions,
      emitBuildChart,
      handleQuickChartAction,
    }
  },
}
</script>

<style scoped>
.workspace-canvas { position: relative; width: 100%; min-height: 760px; }
.workspace-panel { position: absolute; overflow: hidden; box-sizing: border-box; padding: 12px; }
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
.library-shell { display: flex; flex-direction: column; gap: 10px; height: 100%; overflow: auto; padding-right: 2px; }
.library-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.library-empty { color: var(--muted); font-size: 13px; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
.saved-charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.saved-chart-card { border: 1px solid var(--border); border-radius: 12px; background: #161616; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.saved-chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.saved-chart-name { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.saved-chart-title-row { display: flex; align-items: center; gap: 8px; }
.saved-chart-title-input-inline {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
  padding: 0;
  cursor: text;
  outline: none;
}
.saved-chart-title-input-inline:focus {
  color: var(--text);
  text-decoration: none;
}
.saved-chart-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.saved-chart-canvas { height: 320px; border: 1px solid var(--border); border-radius: 10px; padding: 6px; }
.saved-chart-actions { display: flex; flex-wrap: wrap; gap: 8px; }
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
.analysis-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.rotate-device-lock {
  min-height: 260px;
  height: 100%;
  border: 1px dashed var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  background: #151515;
  color: var(--muted);
  padding: 18px;
}
.rotate-device-icon {
  width: 34px;
  height: 34px;
  color: #93f6b3;
}
.rotate-device-icon svg {
  width: 34px;
  height: 34px;
  display: block;
}
.rotate-device-title {
  color: var(--text);
  font-weight: 700;
  font-size: 14px;
}
.rotate-device-text {
  font-size: 13px;
  line-height: 1.35;
  max-width: 240px;
}
.rotate-device-continue {
  margin-top: 4px;
}

.resize-handle { position: absolute; z-index: 5; }
.h-n { top: -4px; left: 12px; right: 12px; height: 8px; cursor: n-resize; }
.h-s { bottom: -4px; left: 12px; right: 12px; height: 8px; cursor: s-resize; }
.h-e { top: 12px; bottom: 12px; right: -4px; width: 8px; cursor: e-resize; }
.h-w { top: 12px; bottom: 12px; left: -4px; width: 8px; cursor: w-resize; }

@media (max-width: 980px) {
  .workspace-canvas { min-height: 980px; }
}

.workspace-canvas-compact {
  min-height: 0;
  height: auto !important;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workspace-canvas-compact .workspace-panel {
  position: relative;
  left: auto !important;
  top: auto !important;
  width: 100% !important;
  height: auto !important;
  min-height: 380px;
}

.workspace-canvas-compact .drag-handle {
  cursor: default;
}

.workspace-canvas-compact .panel-content {
  height: auto;
  min-height: 260px;
  overflow: visible;
}

.workspace-canvas-compact .table-fill {
  height: min(62vh, 460px);
  max-height: none;
  min-height: 260px;
}

.workspace-canvas-compact .chart-main {
  min-height: 260px;
}

.workspace-canvas-compact .chart-main-resizable {
  min-width: 0;
  resize: vertical;
}

@media (max-width: 760px) {
  .controls .btn {
    width: 100%;
  }

  .chart-size-control {
    width: 100%;
    align-self: flex-start;
  }

  .chart-size-select {
    width: 100%;
  }

  .saved-chart-actions .btn {
    width: 100%;
  }

  .series-colors-grid {
    grid-template-columns: 1fr;
  }
}
</style>
