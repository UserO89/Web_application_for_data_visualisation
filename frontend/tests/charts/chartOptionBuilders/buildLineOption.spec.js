import { fallbackColor } from '../../../src/charts/chartTheme'
import { buildLineOption } from '../../../src/charts/chartOptionBuilders/buildLineOption'

describe('buildLineOption', () => {
  it('builds a line option with axis labels, series colors, and area styles', () => {
    const option = buildLineOption({
      labels: ['Jan', 'Feb'],
      meta: {
        xAxisLabel: 'Month',
        yAxisLabel: 'Revenue',
      },
      datasets: [
        {
          label: 'Revenue',
          data: [100, 120],
          color: '#112233',
        },
        {
          data: [90, 95],
        },
      ],
    })

    expect(option.xAxis).toMatchObject({
      type: 'category',
      data: ['Jan', 'Feb'],
      name: 'Month',
    })
    expect(option.yAxis).toMatchObject({
      type: 'value',
      name: 'Revenue',
    })
    expect(option.series).toHaveLength(2)
    expect(option.series[0]).toMatchObject({
      name: 'Revenue',
      type: 'line',
      data: [100, 120],
      symbol: 'circle',
      itemStyle: { color: '#112233' },
      lineStyle: { color: '#112233', width: 2 },
      areaStyle: { color: 'rgba(17, 34, 51, 0.2)' },
    })
    expect(option.series[1].name).toBe('Series 2')
    expect(option.series[1].itemStyle.color).toBe(fallbackColor(1))
    expect(option.series[1].areaStyle.color).toBe('rgba(53, 201, 163, 0.2)')
  })

  it('falls back to empty arrays when the definition is incomplete', () => {
    const option = buildLineOption(null)

    expect(option.xAxis.data).toEqual([])
    expect(option.xAxis.name).toBe('')
    expect(option.yAxis.name).toBe('')
    expect(option.series).toEqual([])
  })
})
