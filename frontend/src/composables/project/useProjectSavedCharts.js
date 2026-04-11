import { ref } from 'vue'
import { projectsApi } from '../../api/projects'
import { createDefaultChartDefinition } from '../../charts/chartDefinitions/createUniversalChartDefinition'
import { extractApiErrorMessage } from '../../utils/api/errors'
import { downloadSavedChartPng } from '../../utils/project'

export function useProjectSavedCharts({
  projectId,
  project,
  isReadOnly,
  chartType,
  chartDefinition,
  chartLabels,
  chartDatasets,
  chartMeta,
  locale,
  setViewMode,
  notify,
  t,
}) {
  const savedCharts = ref([])
  const savedChartsLoading = ref(false)
  const savedChartsError = ref('')

  const formatSavedChartCreatedAt = (value) => {
    if (!value) return '-'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'

    return parsed.toLocaleString(locale.value)
  }

  const normalizeSavedChart = (savedChart) => {
    const config = savedChart?.config && typeof savedChart.config === 'object' ? savedChart.config : {}
    const rendered = config?.rendered && typeof config.rendered === 'object' ? config.rendered : {}
    const normalizedDefinition = config?.chartDefinition && typeof config.chartDefinition === 'object'
      ? config.chartDefinition
      : createDefaultChartDefinition(savedChart?.type || rendered?.type || 'line')

    return {
      id: Number(savedChart?.id || 0),
      title: String(savedChart?.title || '').trim(),
      type: String(savedChart?.type || rendered?.type || normalizedDefinition?.chartType || 'line'),
      created_at: formatSavedChartCreatedAt(savedChart?.created_at),
      chartDefinition: normalizedDefinition,
      labels: Array.isArray(rendered?.labels) ? rendered.labels : [],
      datasets: Array.isArray(rendered?.datasets) ? rendered.datasets : [],
      meta: rendered?.meta && typeof rendered.meta === 'object' ? rendered.meta : {},
    }
  }

  const buildSavedChartTitle = (type) =>
    `${String(type || t('project.page.chartTitlePrefix')).toUpperCase()} ${new Date().toLocaleString(locale.value)}`

  const loadSavedCharts = async () => {
    if (savedChartsLoading.value) return

    if (isReadOnly.value || !project.value?.dataset) {
      savedCharts.value = []
      return
    }

    savedChartsLoading.value = true
    savedChartsError.value = ''

    try {
      const response = await projectsApi.listSavedCharts(projectId.value)
      const nextCharts = Array.isArray(response?.charts) ? response.charts.map(normalizeSavedChart) : []
      savedCharts.value = nextCharts
    } catch (error) {
      savedChartsError.value = extractApiErrorMessage(error, t('project.page.charts.loadFailed'))
    } finally {
      savedChartsLoading.value = false
    }
  }

  const saveCurrentChart = async () => {
    if (isReadOnly.value) {
      notify.info(t('project.page.readOnly.saveChartsDisabled'))
      return
    }

    if (!chartDatasets.value.length) {
      notify.warning(t('project.page.charts.buildBeforeSaving'))
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
      notify.success(t('project.page.charts.saved'))
    } catch (error) {
      notify.error(extractApiErrorMessage(error, t('project.page.charts.saveFailed')))
    }
  }

  const downloadSavedChart = async (savedChart) => {
    if (!savedChart) return

    try {
      await downloadSavedChartPng(savedChart, savedChart.title || `chart-${savedChart.id}`)
    } catch (error) {
      notify.error(extractApiErrorMessage(error, t('project.page.charts.downloadFailed')))
    }
  }

  const renameSavedChart = async ({ chartId, title }) => {
    if (isReadOnly.value) {
      notify.info(t('project.page.readOnly.renamingDisabled'))
      return
    }

    if (!chartId) return

    const nextTitle = String(title || '').trim()
    if (!nextTitle) {
      notify.warning(t('project.page.charts.nameCannotBeEmpty'))
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
      notify.success(t('project.page.charts.renamed'))
    } catch (error) {
      notify.error(extractApiErrorMessage(error, t('project.page.charts.renameFailed')))
    }
  }

  const deleteSavedChart = async (savedChartId) => {
    if (isReadOnly.value) {
      notify.info(t('project.page.readOnly.deletingDisabled'))
      return
    }

    if (!savedChartId) return

    const confirmed = window.confirm(t('project.page.charts.deleteConfirm'))
    if (!confirmed) return

    try {
      await projectsApi.deleteSavedChart(projectId.value, savedChartId)
      await loadSavedCharts()
      notify.success(t('project.page.charts.deleted'))
    } catch (error) {
      notify.error(extractApiErrorMessage(error, t('project.page.charts.deleteFailed')))
    }
  }

  const resetSavedChartsState = () => {
    savedCharts.value = []
    savedChartsLoading.value = false
    savedChartsError.value = ''
  }

  return {
    savedCharts,
    savedChartsLoading,
    savedChartsError,
    loadSavedCharts,
    saveCurrentChart,
    downloadSavedChart,
    renameSavedChart,
    deleteSavedChart,
    resetSavedChartsState,
  }
}
