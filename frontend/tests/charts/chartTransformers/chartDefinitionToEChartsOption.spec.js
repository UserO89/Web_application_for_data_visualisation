import { buildEChartOption } from '../../../src/charts/chartTransformers/chartDefinitionToEChartsOption'

describe('buildEChartOption', () => {
  it('returns a fallback option for unsupported chart types', () => {
    const option = buildEChartOption({
      type: 'radar',
    })

    expect(option.animation).toBe(false)
    expect(option.title).toMatchObject({
      text: 'Unsupported chart type: radar',
      left: 'center',
      top: 'middle',
    })
  })

  it('builds histogram mark lines from semantic chart markers', () => {
    const option = buildEChartOption({
      type: 'histogram',
      labels: ['0-10', '10-20', '20-30'],
      datasets: [
        {
          label: 'Revenue density',
          data: [0.1, 0.2, 0.15],
          color: '#ff5500',
        },
      ],
      meta: {
        xAxisLabel: 'Revenue',
        yAxisLabel: 'Density',
        histogramMarkers: [
          { name: 'Mean', index: 1, value: 14.25 },
          { name: 'Median', index: 1, value: 15 },
        ],
      },
    })

    expect(option.xAxis).toMatchObject({
      type: 'category',
      data: ['0-10', '10-20', '20-30'],
      name: 'Revenue',
    })
    expect(option.yAxis).toMatchObject({
      type: 'value',
      name: 'Density',
    })
    expect(option.series).toHaveLength(1)
    expect(option.series[0]).toMatchObject({
      type: 'bar',
      name: 'Revenue density',
      data: [0.1, 0.2, 0.15],
      barGap: '0%',
      barCategoryGap: '10%',
    })
    expect(option.series[0].markLine.data).toEqual([
      { name: 'Mean: 14.25', xAxis: 1 },
      { name: 'Median: 15', xAxis: 1 },
    ])
  })

  it('builds horizontal boxplot options and respects mean or outlier toggles', () => {
    const option = buildEChartOption({
      type: 'boxplot',
      labels: ['North'],
      datasets: [
        {
          label: 'North',
          values: [10, 20, 30, 100],
          color: '#3366ff',
        },
      ],
      meta: {
        xAxisLabel: 'Revenue',
        yAxisLabel: 'Region',
        orientation: 'horizontal',
        showOutliers: false,
        showMean: true,
      },
    })

    expect(option.xAxis).toMatchObject({
      type: 'value',
      name: 'Region',
    })
    expect(option.yAxis).toMatchObject({
      type: 'category',
      data: ['North'],
      name: 'Revenue',
    })
    expect(option.series).toHaveLength(2)
    expect(option.series[0]).toMatchObject({
      name: 'Distribution',
      type: 'boxplot',
    })
    expect(option.series[0].data).toHaveLength(1)
    expect(option.series[0].data[0].value).toEqual([10, 17.5, 25, 47.5, 100])
    expect(option.series[1]).toMatchObject({
      name: 'Mean',
      type: 'scatter',
      symbolSize: 9,
    })
    expect(option.series[1].data).toEqual([
      {
        value: [40, 0],
        itemStyle: { color: '#3366ff' },
      },
    ])
  })

  it('builds multi-ring pie options for multiple visible datasets', () => {
    const option = buildEChartOption({
      type: 'pie',
      labels: ['North', 'South'],
      datasets: [
        { label: 'Revenue', data: [100, 200], color: '#ff0000' },
        { label: 'Cost', data: [60, 90], color: '#00ff00' },
      ],
    })

    expect(option.series).toHaveLength(2)
    expect(option.series[0]).toMatchObject({
      name: 'Revenue',
      type: 'pie',
      radius: ['12%', '43%'],
      center: ['50%', '56%'],
    })
    expect(option.series[1]).toMatchObject({
      name: 'Cost',
      type: 'pie',
      radius: ['45%', '76%'],
      center: ['50%', '56%'],
    })
    expect(option.series[0].label.show).toBe(false)
    expect(option.series[1].label.show).toBe(false)
    expect(option.series[0].data.map((item) => item.value)).toEqual([100, 200])
    expect(option.series[1].data.map((item) => item.value)).toEqual([60, 90])
  })
})
