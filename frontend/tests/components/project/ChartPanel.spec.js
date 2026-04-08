import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import ChartPanel from '../../../src/components/project/ChartPanel.vue'

const buildEChartOptionSpy = vi.hoisted(() => vi.fn())
const exportPngSpy = vi.hoisted(() => vi.fn())

vi.mock('../../../src/charts/chartTransformers/chartDefinitionToEChartsOption', () => ({
  buildEChartOption: buildEChartOptionSpy,
}))

vi.mock('../../../src/components/charts/BaseEChart.vue', () => ({
  default: defineComponent({
    name: 'BaseEChart',
    props: {
      option: {
        type: Object,
        default: () => ({}),
      },
    },
    setup(props, { expose }) {
      expose({
        exportPng: exportPngSpy,
      })

      return () => h('div', {
        class: 'base-echart-stub',
        'data-option-keys': Object.keys(props.option || {}).join(','),
      })
    },
  }),
}))

const buildProps = (overrides = {}) => ({
  labels: [],
  datasets: [],
  meta: {},
  type: 'line',
  embedded: false,
  allowSave: false,
  allowExport: true,
  allowBuild: false,
  buildDisabled: false,
  quickActions: [],
  ...overrides,
})

describe('ChartPanel', () => {
  beforeEach(() => {
    buildEChartOptionSpy.mockReset()
    exportPngSpy.mockReset()
  })

  it('does not build chart options and disables save when no renderable data exists', () => {
    const wrapper = mount(ChartPanel, {
      props: buildProps({
        allowSave: true,
      }),
    })

    expect(wrapper.text()).toContain('Visualization')
    expect(wrapper.text()).toContain('Interactive area')
    expect(buildEChartOptionSpy).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'BaseEChart' }).props('option')).toEqual({})

    const saveButton = wrapper.findAll('button').find((button) => button.text() === 'Save Chart')
    expect(saveButton.attributes('disabled')).toBeDefined()
  })

  it('builds ECharts options for renderable line data and emits save, build, and quick-action events', async () => {
    const builtOption = {
      xAxis: { type: 'category' },
      series: [{ type: 'line', data: [100] }],
    }
    buildEChartOptionSpy.mockReturnValue(builtOption)

    const wrapper = mount(ChartPanel, {
      props: buildProps({
        labels: ['Jan'],
        datasets: [{ label: 'Revenue', data: [100], color: '#123456' }],
        meta: { xAxisLabel: 'Month', yAxisLabel: 'Revenue' },
        type: 'line',
        allowSave: true,
        allowBuild: true,
        quickActions: [
          {
            id: 'line-0',
            label: 'Line: Month vs sum(Revenue)',
            definition: { chartType: 'line', bindings: { x: 1, y: { field: 2, aggregation: 'sum' } } },
          },
        ],
      }),
    })

    expect(buildEChartOptionSpy).toHaveBeenCalledTimes(1)
    expect(buildEChartOptionSpy).toHaveBeenCalledWith({
      type: 'line',
      labels: ['Jan'],
      datasets: [{ label: 'Revenue', data: [100], color: '#123456' }],
      meta: { xAxisLabel: 'Month', yAxisLabel: 'Revenue' },
    })
    expect(wrapper.findComponent({ name: 'BaseEChart' }).props('option')).toEqual(builtOption)

    const saveButton = wrapper.findAll('button').find((button) => button.text() === 'Save Chart')
    expect(saveButton.attributes('disabled')).toBeUndefined()
    await saveButton.trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)

    const buildButton = wrapper.findAll('button').find((button) => button.text() === 'Build Chart')
    expect(buildButton.attributes('disabled')).toBeUndefined()
    await buildButton.trigger('click')
    expect(wrapper.emitted('build')).toHaveLength(1)

    expect(wrapper.text()).toContain('Quick Actions')
    const quickActionButton = wrapper.find('.chart-quick-actions-item')
    await quickActionButton.trigger('click')
    expect(wrapper.emitted('quick-action')).toEqual([[
      {
        id: 'line-0',
        label: 'Line: Month vs sum(Revenue)',
        definition: { chartType: 'line', bindings: { x: 1, y: { field: 2, aggregation: 'sum' } } },
      },
    ]])
  })

  it('treats boxplot values as renderable data and delegates PNG export to BaseEChart', async () => {
    buildEChartOptionSpy.mockReturnValue({
      series: [{ type: 'boxplot', data: [] }],
    })

    const wrapper = mount(ChartPanel, {
      props: buildProps({
        type: 'boxplot',
        embedded: true,
        datasets: [{ label: 'Revenue', values: [10, 20, 30] }],
      }),
    })

    expect(wrapper.classes()).toContain('embedded')
    expect(wrapper.text()).not.toContain('Visualization')
    expect(buildEChartOptionSpy).toHaveBeenCalledWith({
      type: 'boxplot',
      labels: [],
      datasets: [{ label: 'Revenue', values: [10, 20, 30] }],
      meta: {},
    })

    const exportButton = wrapper.findAll('button').find((button) => button.text() === 'Export PNG')
    await exportButton.trigger('click')
    expect(exportPngSpy).toHaveBeenCalledTimes(1)
    expect(exportPngSpy).toHaveBeenCalledWith('chart.png')
  })

  it('treats scatter points as renderable even without labels', () => {
    buildEChartOptionSpy.mockReturnValue({
      series: [{ type: 'scatter', data: [[1, 2]] }],
    })

    const wrapper = mount(ChartPanel, {
      props: buildProps({
        type: 'scatter',
        allowSave: true,
        datasets: [{ label: 'Revenue vs Cost', data: [{ x: 1, y: 2 }] }],
      }),
    })

    expect(buildEChartOptionSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent({ name: 'BaseEChart' }).props('option')).toEqual({
      series: [{ type: 'scatter', data: [[1, 2]] }],
    })

    const saveButton = wrapper.findAll('button').find((button) => button.text() === 'Save Chart')
    expect(saveButton.attributes('disabled')).toBeUndefined()
  })

  it('renders a disabled build button when build action is blocked', () => {
    const wrapper = mount(ChartPanel, {
      props: buildProps({
        allowBuild: true,
        buildDisabled: true,
      }),
    })

    const buildButton = wrapper.findAll('button').find((button) => button.text() === 'Build Chart')
    expect(buildButton.attributes('disabled')).toBeDefined()
  })
})
