<template>
  <div class="chart-panel panel">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div style="font-weight: 700;">Visualization</div>
      <div style="color: var(--muted); font-size: 13px;">Interactive area</div>
    </div>
    <div class="chart-canvas">
      <canvas ref="canvas"></canvas>
    </div>
    <div style="display: flex; gap: 8px; justify-content: space-between; align-items: center; margin-top: 12px;">
      <div style="color: var(--muted); font-size: 13px;">Hover over the chart for details.</div>
      <div style="display: flex; gap: 8px;">
        <button class="btn" @click="exportPNG">Export PNG</button>
        <button class="btn" @click="$emit('clear')">Clear</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default {
  name: 'ChartPanel',
  props: {
    labels: { type: Array, default: () => [] },
    datasets: { type: Array, default: () => [] },
    type: { type: String, default: 'line' },
  },
  emits: ['clear'],
  setup(props) {
    const canvas = ref(null)
    let chart = null

    const createChart = () => {
      if (!canvas.value || !props.labels?.length) {
        if (chart) {
          chart.destroy()
          chart = null
        }
        return
      }

      if (chart) chart.destroy()

      const ctx = canvas.value.getContext('2d')
      chart = new Chart(ctx, {
        type: props.type || 'line',
        data: {
          labels: props.labels,
          datasets: props.datasets.map((ds, i) => ({
            ...ds,
            borderColor: ['#6ee7b7', '#8b5cf6', '#0ea5a9'][i % 3],
            backgroundColor:
              props.type === 'pie'
                ? ['#6ee7b7', '#8b5cf6', '#0ea5a9', '#f59e0b', '#ec4899']
                : `rgba(110, 231, 183, ${props.type === 'bar' ? 0.5 : 0.2})`,
            fill: props.type === 'line',
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8' },
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 36, 0.9)',
              titleColor: '#e6eef8',
              bodyColor: '#94a3b8',
            },
          },
          scales:
            props.type !== 'pie'
              ? {
                  x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                }
              : undefined,
        },
      })
    }

    onMounted(createChart)
    watch([() => props.labels, () => props.datasets, () => props.type], createChart)

    const exportPNG = () => {
      if (chart) {
        const url = chart.toBase64Image('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = 'chart.png'
        a.click()
      }
    }

    return { canvas, exportPNG }
  },
}
</script>

<style scoped>
.chart-panel {
  height: 360px;
  display: flex;
  flex-direction: column;
}

.chart-canvas {
  flex: 1;
  min-height: 200px;
  position: relative;
}
</style>
