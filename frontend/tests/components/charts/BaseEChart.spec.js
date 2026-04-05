import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

const chartApiState = vi.hoisted(() => ({
  initSpy: vi.fn(),
  useSpy: vi.fn(),
  chart: null,
}))

vi.mock('echarts/core', () => ({
  init: vi.fn((element) => {
    const chart = {
      clear: vi.fn(),
      setOption: vi.fn(),
      resize: vi.fn(),
      getDataURL: vi.fn(() => 'data:image/png;base64,abc'),
      dispose: vi.fn(),
    }
    chartApiState.chart = chart
    chartApiState.initSpy(element)
    return chart
  }),
  use: chartApiState.useSpy,
}))

vi.mock('echarts/charts', () => ({
  LineChart: {},
  BarChart: {},
  PieChart: {},
  ScatterChart: {},
  BoxplotChart: {},
}))

vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
  TitleComponent: {},
  DatasetComponent: {},
  TransformComponent: {},
}))

vi.mock('echarts/features', () => ({
  LegacyGridContainLabel: {},
}))

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}))

import BaseEChart from '../../../src/components/charts/BaseEChart.vue'

const createResizeObserverMock = () => {
  const observe = vi.fn()
  const disconnect = vi.fn()
  const ResizeObserver = vi.fn(function ResizeObserver(callback) {
    this.callback = callback
    this.observe = observe
    this.disconnect = disconnect
  })

  return {
    ResizeObserver,
    observe,
    disconnect,
  }
}

describe('BaseEChart', () => {
  let resizeObserverMock
  let rafQueue

  beforeEach(() => {
    chartApiState.initSpy.mockClear()
    chartApiState.useSpy.mockClear()
    chartApiState.chart = null

    resizeObserverMock = createResizeObserverMock()
    vi.stubGlobal('ResizeObserver', resizeObserverMock.ResizeObserver)
    rafQueue = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb)
      return rafQueue.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('initializes echarts when mounted with renderable size and applies the option', async () => {
    const wrapper = mount(BaseEChart, {
      props: {
        option: {
          title: { text: 'Revenue' },
        },
      },
      attachTo: document.body,
    })

    expect(rafQueue).toHaveLength(1)
    rafQueue.shift()()

    expect(chartApiState.initSpy).toHaveBeenCalledTimes(1)
    expect(chartApiState.chart.clear).toHaveBeenCalledTimes(1)
    expect(chartApiState.chart.setOption).toHaveBeenCalledWith({
      title: { text: 'Revenue' },
    }, true)
    expect(resizeObserverMock.observe).toHaveBeenCalled()
    expect(wrapper.vm.getInstance()).toBe(chartApiState.chart)
  })

  it('updates the chart option after initialization and resizes on demand', async () => {
    const wrapper = mount(BaseEChart, {
      props: {
        option: {
          title: { text: 'Initial' },
        },
      },
      attachTo: document.body,
    })

    rafQueue.shift()()
    chartApiState.chart.clear.mockClear()
    chartApiState.chart.setOption.mockClear()

    await wrapper.setProps({
      option: {
        legend: { show: true },
      },
    })

    expect(chartApiState.chart.clear).toHaveBeenCalledTimes(1)
    expect(chartApiState.chart.setOption).toHaveBeenCalledWith({
      legend: { show: true },
    }, true)

    wrapper.vm.resize()
    expect(chartApiState.chart.resize).toHaveBeenCalledTimes(1)
  })

  it('exports PNG using the chart instance and a temporary download link', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement')
    const clickSpy = vi.fn()
    createElementSpy.mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: clickSpy,
        }
      }
      return originalCreateElement(tagName)
    })

    const wrapper = mount(BaseEChart, {
      props: {
        option: {
          title: { text: 'Exportable' },
        },
      },
      attachTo: document.body,
    })

    rafQueue.shift()()

    expect(wrapper.vm.exportPng('custom.png')).toBe(true)
    expect(chartApiState.chart.getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#111111',
    })
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('cleans up resize observers, animation frame, and chart instance on unmount', async () => {
    const wrapper = mount(BaseEChart, {
      props: {
        option: {},
      },
      attachTo: document.body,
    })

    wrapper.unmount()

    expect(resizeObserverMock.disconnect).toHaveBeenCalled()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(chartApiState.chart).toBeNull()
  })
})
