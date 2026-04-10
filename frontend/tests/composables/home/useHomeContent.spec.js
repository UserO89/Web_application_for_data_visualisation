import { reactive } from 'vue'
import { useHomeContent } from '../../../src/composables/home/useHomeContent'
import { setLocale } from '../../../src/i18n'

describe('useHomeContent', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('returns guest and authenticated primary actions from auth state', () => {
    const authStore = reactive({
      isAuthenticated: false,
    })

    const state = useHomeContent({ authStore })

    expect(state.primaryAction.value).toEqual({
      label: 'Start Analyzing',
      to: { name: 'login' },
    })
    expect(state.demoAction.value).toEqual({
      label: 'Try Public Demo',
      to: { name: 'project-demo' },
    })

    authStore.isAuthenticated = true

    expect(state.primaryAction.value).toEqual({
      label: 'Open Dashboard',
      to: { name: 'projects' },
    })
  })

  it('updates translated content when the locale changes', () => {
    const state = useHomeContent({
      authStore: reactive({ isAuthenticated: false }),
    })

    expect(state.primaryAction.value.label).toBe('Start Analyzing')
    expect(state.heroStages.value[0]).toBe('Import')
    expect(state.demoScenarios.value[0].label).toBe('Quality trend')

    setLocale('sk')

    expect(state.primaryAction.value.label).toBe('Zacat analyzu')
    expect(state.heroStages.value[0]).toBe('Import')
    expect(state.demoScenarios.value[0].label).toBe('Trend kvality')
  })

  it('tracks active demo scenario and chart type in computed chart state', () => {
    const state = useHomeContent({
      authStore: reactive({ isAuthenticated: false }),
    })

    expect(state.currentDemoScenario.value.key).toBe('quality')
    expect(state.activeDemoChartTypeLabel.value).toBe('Line')
    expect(state.demoChartOption.value.series[0].type).toBe('line')

    state.activeDemoScenarioKey.value = 'distribution'
    state.activeDemoChartType.value = 'pie'

    expect(state.currentDemoScenario.value.key).toBe('distribution')
    expect(state.activeDemoChartTypeLabel.value).toBe('Pie')
    expect(state.demoChartOption.value.series[0].type).toBe('pie')
    expect(state.demoChartOption.value.series[0].data[0]).toEqual({
      name: 'A',
      value: 34,
    })
  })

  it('initializes displayed stats and formats numbers for presentation', () => {
    const state = useHomeContent({
      authStore: reactive({ isAuthenticated: false }),
    })

    expect(state.displayedStats).toEqual({
      steps: 0,
      actions: 0,
      inputs: 0,
      workspace: 0,
    })
    expect(state.formatStat(12500)).toBe('12,500')
    expect(state.formatStat(null)).toBe('0')
  })
})
