import { fallbackColor } from '../../../src/charts/chartTheme'
import { buildScatterOption } from '../../../src/charts/chartOptionBuilders/buildScatterOption'

describe('buildScatterOption', () => {
  it('filters invalid points and uses tooltip item mode for scatter charts', () => {
    const option = buildScatterOption({
      meta: {
        xAxisLabel: 'Age',
        yAxisLabel: 'Score',
      },
      datasets: [
        {
          label: 'Students',
          color: '#336699',
          data: [
            { x: '18', y: '72' },
            { x: 'invalid', y: 51 },
            { x: 21, y: null },
          ],
        },
      ],
    })

    expect(option.tooltip.trigger).toBe('item')
    expect(option.xAxis).toMatchObject({
      type: 'value',
      name: 'Age',
    })
    expect(option.yAxis).toMatchObject({
      type: 'value',
      name: 'Score',
    })
    expect(option.series[0]).toMatchObject({
      name: 'Students',
      type: 'scatter',
      data: [[18, 72], [21, 0]],
      itemStyle: {
        color: '#336699',
        borderColor: '#336699',
        borderWidth: 1,
      },
    })
  })

  it('falls back to dataset field labels and default series metadata', () => {
    const option = buildScatterOption({
      datasets: [
        {
          xField: 'Height',
          yField: 'Weight',
          data: [{ x: 170, y: 62 }],
        },
      ],
    })

    expect(option.xAxis.name).toBe('Height')
    expect(option.yAxis.name).toBe('Weight')
    expect(option.series[0].name).toBe('Series 1')
    expect(option.series[0].itemStyle.color).toBe(fallbackColor(0))
  })
})
