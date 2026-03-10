import { computed, ref } from 'vue'
import { buildSemanticChartData } from '../../charts/chartDataTransformers/buildSemanticChartData'
import { createDefaultChartDefinition } from '../../charts/chartDefinitions/createUniversalChartDefinition'
import { normalizeChartDefinition, validateChartDefinition } from '../../charts/rules/chartDefinitionValidator'
import {
  clampChartViewportHeight,
  defaultSeriesColor,
  readJsonStorage,
  resolveProjectId,
  writeJsonStorage,
} from '../../utils/project'

const CHART_COLORS_STORAGE_PREFIX = 'dataviz.chart.colors.v1.'
const DEFAULT_CHART_PALETTE = [
  '#1db954', '#35c9a3', '#4cc9f0', '#4895ef', '#4361ee',
  '#3a0ca3', '#b5179e', '#f72585', '#f15bb5', '#ff8fab',
  '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590',
]
const MIN_CHART_VIEWPORT_HEIGHT = 280
const MAX_CHART_VIEWPORT_HEIGHT = 920
const CHART_HEIGHT_PRESETS = [320, 420, 520, 620]

export const useProjectChartState = ({
  projectId,
  schemaColumns,
  analysisRows,
  tableRows,
} = {}) => {
  const chartType = ref('line')
  const chartDefinition = ref(createDefaultChartDefinition('line'))
  const chartViewportHeight = ref(320)
  const chartViewportCustom = ref(false)
  const chartLabels = ref([])
  const chartDatasets = ref([])
  const chartMeta = ref({})
  const seriesColors = ref({})

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

  const chartColorsKey = () => `${CHART_COLORS_STORAGE_PREFIX}${resolveProjectId(projectId)}`

  const loadSeriesColors = () => {
    const parsed = readJsonStorage(chartColorsKey(), {})
    return parsed && typeof parsed === 'object' ? parsed : {}
  }

  const persistSeriesColors = () => {
    writeJsonStorage(chartColorsKey(), seriesColors.value || {})
  }

  const getSeriesColor = (label, index = 0) => {
    if (label && seriesColors.value[label]) return seriesColors.value[label]
    const indexedKey = `series_${index}`
    if (seriesColors.value[indexedKey]) return seriesColors.value[indexedKey]
    return defaultSeriesColor(index, DEFAULT_CHART_PALETTE)
  }

  const applyColorsToCurrentChart = () => {
    if (!chartDatasets.value.length) return
    chartDatasets.value = chartDatasets.value.map((dataset, index) => ({
      ...dataset,
      color: getSeriesColor(dataset.label, index),
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

  const chartHeightPresetApplying = ref(false)

  const setChartViewportHeight = (value) => {
    if (value === 'custom') return
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    chartViewportHeight.value = clampChartViewportHeight(
      parsed,
      MIN_CHART_VIEWPORT_HEIGHT,
      MAX_CHART_VIEWPORT_HEIGHT
    )
    chartViewportCustom.value = false
    chartHeightPresetApplying.value = true
    requestAnimationFrame(() => {
      chartHeightPresetApplying.value = false
    })
  }

  const syncViewportHeightFromResize = (height) => {
    if (!Number.isFinite(height)) return
    const next = clampChartViewportHeight(
      height,
      MIN_CHART_VIEWPORT_HEIGHT,
      MAX_CHART_VIEWPORT_HEIGHT
    )

    if (chartHeightPresetApplying.value) {
      chartViewportHeight.value = next
      return
    }

    if (!chartViewportCustom.value && Math.abs(next - chartViewportHeight.value) < 2) return
    if (!chartViewportCustom.value && Math.abs(next - chartViewportHeight.value) >= 2) {
      chartViewportCustom.value = true
    }
    chartViewportHeight.value = next
  }

  const buildChart = (nextDefinition = chartDefinition.value) => {
    const normalized = normalizeChartDefinition(nextDefinition)
    const validation = validateChartDefinition(normalized, schemaColumns.value)
    chartDefinition.value = validation.normalizedDefinition

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
  }

  return {
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
    persistSeriesColors,
    getSeriesColor,
    applyColorsToCurrentChart,
    setSeriesColor,
    resetSeriesColors,
    setChartViewportHeight,
    syncViewportHeightFromResize,
    buildChart,
    clearChart,
  }
}
