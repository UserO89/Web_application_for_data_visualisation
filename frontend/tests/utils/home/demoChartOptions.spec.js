import { buildHomeDemoChartOption } from '../../../src/utils/home/demoChartOptions'

describe('buildHomeDemoChartOption', () => {
  const scenario = {
    labels: ['A', 'B', 'C'],
    values: [10, 20, 30],
  }

  it('builds cartesian line and scatter demo options', () => {
    const lineOption = buildHomeDemoChartOption({
      chartType: 'line',
      scenario,
    })
    const scatterOption = buildHomeDemoChartOption({
      chartType: 'scatter',
      scenario,
    })

    expect(lineOption.series[0]).toMatchObject({
      type: 'line',
      data: [10, 20, 30],
      smooth: true,
      showSymbol: true,
      symbolSize: 7,
    })
    expect(lineOption.tooltip.trigger).toBe('axis')

    expect(scatterOption.series[0]).toMatchObject({
      type: 'scatter',
      data: [['A', 10], ['B', 20], ['C', 30]],
      symbolSize: 10,
    })
    expect(scatterOption.tooltip.trigger).toBe('item')
  })

  it('builds pie and boxplot variants for demo scenarios', () => {
    const pieOption = buildHomeDemoChartOption({
      chartType: 'pie',
      scenario,
    })
    const boxplotOption = buildHomeDemoChartOption({
      chartType: 'boxplot',
      scenario,
    })

    expect(pieOption.series[0]).toMatchObject({
      type: 'pie',
      radius: ['0%', '68%'],
    })
    expect(pieOption.series[0].data[1]).toEqual({
      name: 'B',
      value: 20,
    })

    expect(boxplotOption.series[0].type).toBe('boxplot')
    expect(boxplotOption.series[0].data).toHaveLength(3)
    expect(boxplotOption.series[0].data[0]).toEqual([7.21, 8.7, 10, 11.3, 12.79])
  })
})
