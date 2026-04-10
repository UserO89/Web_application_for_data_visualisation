import { computed, reactive, ref } from 'vue'
import {
  buildHomeHeroStages,
  buildHomeHeroHighlights,
  buildHomeCapabilities,
  buildHomeAdvantages,
  buildHomeStatsItems,
  buildHomeWorkflowSteps,
  buildHomeDemoScenarios,
  buildHomeDemoChartTypes,
  buildHomeDemoChartOption,
} from '../../utils/home'
import i18n, { getLocale, translate } from '../../i18n'

export const useHomeContent = ({ authStore } = {}) => {
  const activeDemoScenarioKey = ref('quality')
  const activeDemoChartType = ref('line')
  const currentLocale = computed(() => i18n.global.locale.value)

  const createTranslatedContent = (builder) => computed(() => {
    currentLocale.value
    return builder(translate)
  })

  const heroStages = createTranslatedContent(buildHomeHeroStages)
  const heroHighlights = createTranslatedContent(buildHomeHeroHighlights)
  const capabilities = createTranslatedContent(buildHomeCapabilities)
  const advantages = createTranslatedContent(buildHomeAdvantages)
  const statsItems = createTranslatedContent(buildHomeStatsItems)
  const workflowSteps = createTranslatedContent(buildHomeWorkflowSteps)
  const demoScenarios = createTranslatedContent(buildHomeDemoScenarios)
  const demoChartTypes = createTranslatedContent(buildHomeDemoChartTypes)

  const primaryAction = computed(() => {
    currentLocale.value
    return authStore?.isAuthenticated
      ? { label: translate('home.actions.openDashboard'), to: { name: 'projects' } }
      : { label: translate('home.actions.startAnalyzing'), to: { name: 'login' } }
  })

  const demoAction = computed(() => {
    currentLocale.value
    return {
      label: translate('home.actions.tryDemo'),
      to: { name: 'project-demo' },
    }
  })

  const currentDemoScenario = computed(() => {
    return demoScenarios.value.find((scenario) => scenario.key === activeDemoScenarioKey.value)
      || demoScenarios.value[0]
  })

  const activeDemoChartTypeLabel = computed(() => {
    const selected = demoChartTypes.value.find((item) => item.key === activeDemoChartType.value)
    return selected?.label || translate('home.demo.chartTypes.line')
  })

  const demoChartOption = computed(() => buildHomeDemoChartOption({
    chartType: activeDemoChartType.value,
    scenario: currentDemoScenario.value,
  }))

  const displayedStats = reactive(
    {
      steps: 0,
      actions: 0,
      inputs: 0,
      workspace: 0,
    }
  )

  const formatStat = (value) => Number(value || 0).toLocaleString(getLocale())

  return {
    primaryAction,
    demoAction,
    heroStages,
    heroHighlights,
    capabilities,
    advantages,
    statsItems,
    workflowSteps,
    demoScenarios,
    demoChartTypes,
    activeDemoScenarioKey,
    activeDemoChartType,
    currentDemoScenario,
    activeDemoChartTypeLabel,
    demoChartOption,
    displayedStats,
    formatStat,
  }
}
