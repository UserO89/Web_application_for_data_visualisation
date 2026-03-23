<template>
  <div :ref="setWorkspaceRef" class="workspace-canvas" :style="{ height: `${workspaceHeight}px` }">
    <section
      v-for="panelId in panelIds"
      :key="panelId"
      v-show="isPanelVisible(panelId)"
      class="workspace-panel panel"
      :style="panelStyle(panelId)"
      @mousedown="viewMode === 'workspace' && $emit('bring-to-front', panelId)"
    >
      <header class="drag-handle" @mousedown.left.prevent="viewMode === 'workspace' && $emit('start-drag', { panelId, event: $event })">
        <div class="title">{{ panelConfig[panelId].title }}</div>
        <div class="sub">{{ panelConfig[panelId].subtitle }}</div>
      </header>

      <div :class="['panel-content', `${panelId}-content`]">
        <template v-if="panelId === 'table'">
          <div class="table-wrap table-fill">
            <DataTable
              :columns="tableColumns"
              :rows="tableRows"
              :active="isPanelVisible('table')"
              @cell-edited="$emit('cell-edit', $event)"
            />
          </div>
          <div class="table-bottom-actions">
            <button class="btn" type="button" @click="$emit('export-csv')">Export Table CSV</button>
          </div>
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
                @clear="$emit('clear-chart')"
              />
            </div>
            <div class="chart-tools">
              <div class="controls">
                <button class="btn" type="button" @click="$emit('refresh-data')">Refresh Data</button>
                <button class="btn" type="button" @click="$emit('export-csv')">Export CSV</button>
                <label class="chart-size-control" for="chart-height-select">Chart height</label>
                <select
                  id="chart-height-select"
                  class="chart-size-select"
                  :value="chartViewportPresetValue"
                  @change="$emit('set-chart-height', $event.target.value)"
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
                v-model="chartDefinitionModel"
                :suggestions="suggestions"
                @build="$emit('build-chart', $event)"
              />
              <div v-if="chartDatasets.length" class="series-colors">
                <div class="series-colors-head">
                  <div class="analysis-title">Series Colors</div>
                  <button type="button" class="btn" @click="$emit('reset-series-colors')">Reset Colors</button>
                </div>
                <div class="series-colors-grid">
                  <div v-for="(ds, i) in chartDatasets" :key="`series-color-${ds.label}-${i}`" class="series-color-item">
                    <span class="series-color-name">{{ ds.label || `Series ${i + 1}` }}</span>
                    <input
                      type="color"
                      class="series-color-input"
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
              :loading="statisticsLoading"
              :error="statisticsError"
              :updating-column-id="schemaUpdatingColumnId"
              @change-semantic="$emit('change-semantic', $event)"
              @change-ordinal-order="$emit('change-ordinal-order', $event)"
            />
          </div>
        </template>
      </div>

      <div
        v-if="viewMode === 'workspace'"
        v-for="d in resizeDirs"
        :key="`${panelId}-${d}`"
        :class="['resize-handle', `h-${d}`]"
        @mousedown.left.stop.prevent="$emit('start-resize', { panelId, dir: d, event: $event })"
      ></div>
    </section>
  </div>
</template>

<script>
import { computed } from 'vue'
import ChartPanel from './ChartPanel.vue'
import ChartBuilder from './ChartBuilder.vue'
import DataTable from './DataTable.vue'
import StatisticsWorkspace from './StatisticsWorkspace.vue'

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
    analysisRows: { type: Array, default: () => [] },
    schemaUpdatingColumnId: { type: [String, Number], default: null },
    getSeriesColor: { type: Function, default: () => '#1db954' },
  },
  emits: [
    'bring-to-front',
    'start-drag',
    'start-resize',
    'cell-edit',
    'refresh-data',
    'export-csv',
    'set-chart-height',
    'build-chart',
    'clear-chart',
    'set-series-color',
    'reset-series-colors',
    'change-semantic',
    'change-ordinal-order',
    'update-chart-definition',
  ],
  setup(props, { emit }) {
    const panelIds = computed(() => Object.keys(props.panelConfig || {}))
    const isPanelVisible = (panelId) => props.visiblePanelIds.includes(panelId)

    const chartDefinitionModel = computed({
      get: () => props.chartDefinition,
      set: (value) => emit('update-chart-definition', value),
    })

    return {
      panelIds,
      isPanelVisible,
      chartDefinitionModel,
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

.resize-handle { position: absolute; z-index: 5; }
.h-n { top: -4px; left: 12px; right: 12px; height: 8px; cursor: n-resize; }
.h-s { bottom: -4px; left: 12px; right: 12px; height: 8px; cursor: s-resize; }
.h-e { top: 12px; bottom: 12px; right: -4px; width: 8px; cursor: e-resize; }
.h-w { top: 12px; bottom: 12px; left: -4px; width: 8px; cursor: w-resize; }

@media (max-width: 980px) {
  .workspace-canvas { min-height: 980px; }
}
</style>
