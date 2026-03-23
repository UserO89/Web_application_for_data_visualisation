import { computed, reactive, ref } from 'vue'
import {
  HOME_HERO_STAGES,
  HOME_HERO_HIGHLIGHTS,
  HOME_CAPABILITIES,
  HOME_ADVANTAGES,
  HOME_STATS_ITEMS,
  HOME_WORKFLOW_STEPS,
  HOME_DEMO_SCENARIOS,
  HOME_DEMO_CHART_TYPES,
  buildHomeDemoChartOption,
} from '../../utils/home'

export const useHomeContent = ({ authStore } = {}) => {
  const activeDemoScenarioKey = ref(HOME_DEMO_SCENARIOS[0]?.key || 'quality')
  const activeDemoChartType = ref(HOME_DEMO_CHART_TYPES[0]?.key || 'line')

  const primaryAction = computed(() => {
    return authStore?.isAuthenticated
      ? { label: 'Open Dashboard', to: { name: 'projects' } }
      : { label: 'Start Analyzing', to: { name: 'login' } }
  })

  const currentDemoScenario = computed(() => {
    return HOME_DEMO_SCENARIOS.find((scenario) => scenario.key === activeDemoScenarioKey.value)
      || HOME_DEMO_SCENARIOS[0]
  })

  const activeDemoChartTypeLabel = computed(() => {
    const selected = HOME_DEMO_CHART_TYPES.find((item) => item.key === activeDemoChartType.value)
    return selected?.label || 'Line'
  })

  const demoChartOption = computed(() => buildHomeDemoChartOption({
    chartType: activeDemoChartType.value,
    scenario: currentDemoScenario.value,
  }))

  const displayedStats = reactive(
    HOME_STATS_ITEMS.reduce((acc, item) => {
      acc[item.key] = 0
      return acc
    }, {})
  )

  const formatStat = (value) => Number(value || 0).toLocaleString()

  return {
    primaryAction,
    heroStages: HOME_HERO_STAGES,
    heroHighlights: HOME_HERO_HIGHLIGHTS,
    capabilities: HOME_CAPABILITIES,
    advantages: HOME_ADVANTAGES,
    statsItems: HOME_STATS_ITEMS,
    workflowSteps: HOME_WORKFLOW_STEPS,
    demoScenarios: HOME_DEMO_SCENARIOS,
    demoChartTypes: HOME_DEMO_CHART_TYPES,
    activeDemoScenarioKey,
    activeDemoChartType,
    currentDemoScenario,
    activeDemoChartTypeLabel,
    demoChartOption,
    displayedStats,
    formatStat,
  }
}
