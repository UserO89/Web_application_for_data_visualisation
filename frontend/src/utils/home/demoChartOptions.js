const BOXPLOT_COLOR = '#4fd788'
const COMMON_TOOLTIP_STYLE = {
  backgroundColor: '#141414',
  borderColor: '#2b2b2b',
  textStyle: { color: '#efefef' },
}

const buildBoxplotData = (values = []) => {
  return values.map((value) => {
    const center = Math.max(1, Number(value) || 0)
    const spread = Math.max(0.8, center * 0.18)
    const low = Math.max(0, center - spread * 1.55)
    const q1 = Math.max(0, center - spread * 0.72)
    const median = center
    const q3 = center + spread * 0.72
    const high = center + spread * 1.55

    return [
      Number(low.toFixed(2)),
      Number(q1.toFixed(2)),
      Number(median.toFixed(2)),
      Number(q3.toFixed(2)),
      Number(high.toFixed(2)),
    ]
  })
}

const buildPieOption = ({ labels, values }) => ({
  backgroundColor: 'transparent',
  animationDuration: 650,
  animationEasing: 'cubicOut',
  tooltip: {
    trigger: 'item',
    ...COMMON_TOOLTIP_STYLE,
  },
  series: [
    {
      type: 'pie',
      radius: ['0%', '68%'],
      center: ['50%', '52%'],
      avoidLabelOverlap: true,
      label: { color: '#d4d4d4', fontSize: 11 },
      labelLine: { lineStyle: { color: '#474747' } },
      itemStyle: {
        borderColor: '#141414',
        borderWidth: 2,
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.22)',
      },
      data: labels.map((label, index) => ({
        name: label,
        value: values[index] ?? 0,
      })),
      color: ['#34d17b', '#4ea6ff', '#f4ba53', '#bf83ff', '#72e4dd', '#ff8f7a'],
    },
  ],
})

const buildBoxplotOption = ({ labels, values }) => ({
  backgroundColor: 'transparent',
  animationDuration: 620,
  animationEasing: 'cubicOut',
  grid: { left: 38, right: 14, top: 24, bottom: 30 },
  tooltip: {
    trigger: 'item',
    ...COMMON_TOOLTIP_STYLE,
  },
  xAxis: {
    type: 'category',
    data: labels,
    axisLine: { lineStyle: { color: '#333333' } },
    axisTick: { show: false },
    axisLabel: { color: '#b7b7b7', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#272727' } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#8f8f8f', fontSize: 11 },
  },
  series: [
    {
      type: 'boxplot',
      data: buildBoxplotData(values),
      itemStyle: {
        color: 'rgba(79, 215, 136, 0.2)',
        borderColor: BOXPLOT_COLOR,
        borderWidth: 1.8,
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 16,
          shadowColor: 'rgba(79, 215, 136, 0.3)',
        },
      },
    },
  ],
})

const buildCartesianOption = ({ chartType, labels, values }) => {
  const isScatter = chartType === 'scatter'
  const seriesData = isScatter
    ? labels.map((label, index) => [label, values[index] ?? 0])
    : values

  return {
    backgroundColor: 'transparent',
    animationDuration: 580,
    animationEasing: 'cubicOut',
    grid: { left: 38, right: 14, top: 24, bottom: 30 },
    tooltip: {
      trigger: isScatter ? 'item' : 'axis',
      ...COMMON_TOOLTIP_STYLE,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#333333' } },
      axisTick: { show: false },
      axisLabel: { color: '#b7b7b7', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#272727' } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8f8f8f', fontSize: 11 },
    },
    series: [
      {
        type: chartType,
        data: seriesData,
        smooth: chartType === 'line',
        showSymbol: chartType === 'line' || isScatter,
        symbolSize: isScatter ? 10 : 7,
        lineStyle: { width: 3, color: BOXPLOT_COLOR },
        itemStyle: {
          color: BOXPLOT_COLOR,
          borderColor: 'rgba(12, 12, 12, 0.95)',
          borderWidth: 1.5,
        },
        barWidth: chartType === 'bar' ? '52%' : undefined,
        emphasis: {
          focus: 'series',
          itemStyle: { shadowBlur: 16, shadowColor: 'rgba(79, 215, 136, 0.35)' },
        },
      },
    ],
  }
}

export const buildHomeDemoChartOption = ({ chartType, scenario } = {}) => {
  const labels = scenario?.labels || []
  const values = scenario?.values || []

  if (chartType === 'pie') {
    return buildPieOption({ labels, values })
  }

  if (chartType === 'boxplot') {
    return buildBoxplotOption({ labels, values })
  }

  return buildCartesianOption({ chartType, labels, values })
}
