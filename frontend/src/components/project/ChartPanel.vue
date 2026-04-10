<template>
  <div :class="['chart-panel', { panel: !embedded, embedded }]">
    <div
      v-if="!embedded"
      style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;"
    >
      <div style="font-weight: 700;">{{ $t('charts.panel.title') }}</div>
      <div style="color: var(--muted); font-size: 13px;">{{ $t('charts.panel.subtitle') }}</div>
    </div>

    <div class="chart-canvas">
      <BaseEChart ref="chartRef" :option="chartOption" />
    </div>

    <div class="chart-footer">
      <div style="color: var(--muted); font-size: 13px;">{{ $t('charts.panel.hoverHint') }}</div>
      <div class="chart-footer-actions">
        <details v-if="quickActions.length" class="chart-quick-actions">
          <summary class="btn chart-quick-actions-toggle">{{ $t('charts.panel.quickActions') }}</summary>
          <div class="chart-quick-actions-menu">
            <button
              v-for="action in quickActions"
              :key="action.id"
              type="button"
              class="chart-quick-actions-item"
              @click="emitQuickAction(action, $event)"
            >
              {{ action.label }}
            </button>
          </div>
        </details>
        <button v-if="allowSave" class="btn" type="button" :disabled="!hasRenderableData" @click="$emit('save')">{{ $t('charts.panel.save') }}</button>
        <button v-if="allowExport" class="btn" type="button" @click="exportPNG">{{ $t('charts.panel.export') }}</button>
        <button v-if="allowBuild" class="btn primary" type="button" :disabled="buildDisabled" @click="$emit('build')">{{ $t('charts.panel.build') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import BaseEChart from '../charts/BaseEChart.vue'
import { buildEChartOption } from '../../charts/chartTransformers/chartDefinitionToEChartsOption'

export default {
  name: 'ChartPanel',
  components: { BaseEChart },
  props: {
    labels: { type: Array, default: () => [] },
    datasets: { type: Array, default: () => [] },
    meta: { type: Object, default: () => ({}) },
    type: { type: String, default: 'line' },
    embedded: { type: Boolean, default: false },
    allowSave: { type: Boolean, default: false },
    allowExport: { type: Boolean, default: true },
    allowBuild: { type: Boolean, default: false },
    buildDisabled: { type: Boolean, default: false },
    quickActions: { type: Array, default: () => [] },
  },
  emits: ['build', 'quick-action', 'save'],
  setup(props, { emit }) {
    const chartRef = ref(null)

    const chartDefinition = computed(() => ({
      type: props.type || 'line',
      labels: Array.isArray(props.labels) ? props.labels : [],
      datasets: Array.isArray(props.datasets) ? props.datasets : [],
      meta: props.meta && typeof props.meta === 'object' ? props.meta : {},
    }))

    const hasRenderableData = computed(() => {
      const definition = chartDefinition.value
      const datasets = definition.datasets
      if (!datasets.length) return false

      if (definition.type === 'scatter') {
        return datasets.some((dataset) => Array.isArray(dataset?.data) && dataset.data.length > 0)
      }

      if (definition.type === 'boxplot') {
        return datasets.some((dataset) => {
          if (Array.isArray(dataset?.values)) return dataset.values.length > 0
          return Array.isArray(dataset?.data) && dataset.data.length > 0
        })
      }

      if (definition.type === 'pie') {
        return definition.labels.length > 0 && datasets.some((dataset) => Array.isArray(dataset?.data) && dataset.data.length > 0)
      }

      return definition.labels.length > 0 && datasets.some((dataset) => Array.isArray(dataset?.data) && dataset.data.length > 0)
    })

    const chartOption = computed(() => {
      if (!hasRenderableData.value) return {}
      return buildEChartOption(chartDefinition.value)
    })

    const exportPNG = () => {
      chartRef.value?.exportPng?.('chart.png')
    }

    const emitQuickAction = (action, event) => {
      event?.currentTarget?.closest('details')?.removeAttribute('open')
      emit('quick-action', action)
    }

    return { chartRef, chartOption, hasRenderableData, exportPNG, emitQuickAction }
  },
}
</script>

<style scoped>
.chart-panel {
  display: flex;
  flex-direction: column;
  height: 360px;
  min-height: 220px;
}

.chart-panel.embedded {
  height: 100%;
  min-height: 0;
}

.chart-canvas {
  flex: 1;
  min-height: 160px;
}

.chart-footer {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.chart-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}
.chart-quick-actions {
  position: relative;
}
.chart-quick-actions-toggle {
  list-style: none;
}
.chart-quick-actions-toggle::-webkit-details-marker {
  display: none;
}
.chart-quick-actions[open] .chart-quick-actions-toggle {
  border-color: rgba(29, 185, 84, 0.5);
  color: #dfffea;
}
.chart-quick-actions-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  width: min(360px, 72vw);
  max-height: 260px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #151515;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.34);
  z-index: 10;
}
.chart-quick-actions-item {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #1a1a1a;
  color: var(--text);
  padding: 8px 10px;
  font-size: 12px;
  cursor: pointer;
}
.chart-quick-actions-item:hover {
  border-color: rgba(29, 185, 84, 0.45);
  background: #1e1e1e;
}
</style>
