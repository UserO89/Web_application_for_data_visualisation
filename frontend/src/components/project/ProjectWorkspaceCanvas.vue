<template>
  <div
    :ref="setWorkspaceRef"
    :class="[
      'workspace-canvas',
      {
        'workspace-canvas-compact': isCompactWorkspace,
        'workspace-canvas-natural-table': isStandaloneTableView,
        'workspace-canvas-natural-stats': isStandaloneStatisticsView,
      },
    ]"
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
        <ProjectWorkspaceTablePanel
          v-if="panelId === 'table'"
          :view-mode="viewMode"
          :is-compact-workspace="isCompactWorkspace"
          :table-columns="tableColumns"
          :table-rows="tableRows"
          :table-visible="isPanelVisible('table')"
          :table-editable="tableEditable"
          :read-only="readOnly"
          :table-saving="tableSaving"
          :table-has-unsaved-changes="tableHasUnsavedChanges"
          :table-editing="tableEditing"
          @cell-edit="$emit('cell-edit', $event)"
          @table-editing-state="$emit('table-editing-state', $event)"
          @export-csv="$emit('export-csv')"
          @save-table="$emit('save-table')"
        />

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
              :full-page="isStandaloneStatisticsView"
              @load-rows="$emit('load-analysis-rows')"
              @change-semantic="$emit('change-semantic', $event)"
              @change-ordinal-order="$emit('change-ordinal-order', $event)"
            />
          </div>
        </template>

        <ProjectSavedChartsLibrary
          v-else-if="panelId === 'library'"
          :saved-charts="savedCharts"
          :saved-charts-loading="savedChartsLoading"
          :saved-charts-error="savedChartsError"
          @refresh-saved-charts="$emit('refresh-saved-charts')"
          @rename-saved-chart="$emit('rename-saved-chart', $event)"
          @download-saved-chart="$emit('download-saved-chart', $event)"
          @delete-saved-chart="$emit('delete-saved-chart', $event)"
        />
      </div>

      <template v-if="viewMode === 'workspace' && !isCompactWorkspace">
        <div
          v-for="d in resizeDirs"
          :key="`${panelId}-${d}`"
          :class="['resize-handle', `h-${d}`]"
          @mousedown.left.stop.prevent="$emit('start-resize', { panelId, dir: d, event: $event })"
        ></div>
      </template>
    </section>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ChartPanel from './ChartPanel.vue'
import ChartBuilder from './ChartBuilder.vue'
import ProjectSavedChartsLibrary from './ProjectSavedChartsLibrary.vue'
import ProjectWorkspaceTablePanel from './ProjectWorkspaceTablePanel.vue'
import StatisticsWorkspace from './StatisticsWorkspace.vue'
import { getFriendlyBuildHint } from '../../charts/ui/friendlyChartHints'
import { buildQuickChartActions } from '../../charts/ui/quickChartActions'

const noop = () => {}

export default {
  name: 'ProjectWorkspaceCanvas',
  components: {
    ChartPanel,
    ChartBuilder,
    ProjectSavedChartsLibrary,
    ProjectWorkspaceTablePanel,
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
    tableSaving: { type: Boolean, default: false },
    tableHasUnsavedChanges: { type: Boolean, default: false },
    tableEditing: { type: Boolean, default: false },
  },
  emits: [
    'bring-to-front',
    'start-drag',
    'start-resize',
    'cell-edit',
    'table-editing-state',
    'save-table',
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
    const { t } = useI18n({ useScope: 'global' })
    const panelIds = computed(() => Object.keys(props.panelConfig || {}))
    const isPanelVisible = (panelId) => props.visiblePanelIds.includes(panelId)
    const isStandaloneTableView = computed(() => props.viewMode === 'table')
    const isStandaloneStatisticsView = computed(() => props.viewMode === 'statistics')
    const usesNaturalFocusLayout = computed(() =>
      isStandaloneTableView.value || isStandaloneStatisticsView.value
    )
    const canvasStyle = computed(() => {
      if (props.isCompactWorkspace || usesNaturalFocusLayout.value) return {}
      return { height: `${props.workspaceHeight}px` }
    })
    const panelInlineStyle = (panelId) =>
      props.isCompactWorkspace ? {} : props.panelStyle(panelId)

    const seriesColorAriaLabel = (dataset, index) => {
      const seriesLabel = dataset?.label || t('project.workspace.chart.seriesFallback', { index: index + 1 })
      return t('project.workspace.chart.seriesColorAria', { name: seriesLabel })
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

    return {
      panelIds,
      isPanelVisible,
      isStandaloneTableView,
      isStandaloneStatisticsView,
      canvasStyle,
      panelInlineStyle,
      seriesColorAriaLabel,
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
.controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.series-colors { border: 1px solid var(--border); border-radius: 10px; background: #171717; padding: 10px; margin-bottom: 10px; }
.series-colors-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.series-colors-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
.series-color-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--border); border-radius: 8px; background: #1c1c1c; padding: 7px 10px; }
.series-color-name { font-size: 12px; color: var(--muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.series-color-input { width: 32px; height: 22px; border: none; border-radius: 6px; background: transparent; padding: 0; cursor: pointer; }
.series-color-input::-webkit-color-swatch-wrapper { padding: 0; }
.series-color-input::-webkit-color-swatch { border: 1px solid var(--border); border-radius: 6px; }
.analysis-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; }

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

.workspace-canvas-compact .chart-main {
  min-height: 260px;
}

.workspace-canvas-compact .chart-main-resizable {
  min-width: 0;
  resize: vertical;
}

.workspace-canvas-natural-table,
.workspace-canvas-natural-stats {
  min-height: 0;
  height: auto !important;
}

.workspace-canvas-natural-table .workspace-panel,
.workspace-canvas-natural-stats .workspace-panel {
  position: relative;
  left: auto !important;
  top: auto !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0;
}

.workspace-canvas-natural-table .drag-handle,
.workspace-canvas-natural-stats .drag-handle {
  cursor: default;
}

.workspace-canvas-natural-table .panel-content,
.workspace-canvas-natural-stats .panel-content,
.workspace-canvas-natural-table .table-content,
.workspace-canvas-natural-stats .stats-content {
  height: auto;
  overflow: visible;
}

.workspace-canvas-natural-stats .stats-shell {
  height: auto;
  overflow: visible;
  padding-right: 0;
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

  .series-colors-grid {
    grid-template-columns: 1fr;
  }
}
</style>
