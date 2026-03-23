<template>
  <div ref="rootEl" class="base-echart"></div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart, ScatterChart, BoxplotChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
  TransformComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  BoxplotChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
  TransformComponent,
  CanvasRenderer,
])

export default {
  name: 'BaseEChart',
  props: {
    option: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props, { expose }) {
    const rootEl = ref(null)
    let chart = null
    let resizeObserver = null

    const applyOption = () => {
      if (!chart) return
      const option = props.option && typeof props.option === 'object' ? props.option : {}
      chart.clear()
      if (Object.keys(option).length) {
        chart.setOption(option, true)
      }
    }

    const resize = () => {
      if (chart) chart.resize()
    }

    const exportPng = (filename = 'chart.png') => {
      if (!chart) return false
      const url = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#111111',
      })
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      return true
    }

    onMounted(() => {
      if (!rootEl.value) return
      chart = echarts.init(rootEl.value)
      applyOption()

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => resize())
        resizeObserver.observe(rootEl.value)
      }
    })

    watch(() => props.option, applyOption, { deep: false })

    onBeforeUnmount(() => {
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      if (chart) {
        chart.dispose()
        chart = null
      }
    })

    expose({
      resize,
      exportPng,
      getInstance: () => chart,
    })

    return { rootEl }
  },
}
</script>

<style scoped>
.base-echart {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
</style>
