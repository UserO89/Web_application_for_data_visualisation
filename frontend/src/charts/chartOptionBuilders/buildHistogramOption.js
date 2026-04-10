import { buildBarOption } from './buildBarOption'
import { formatChartNumber } from '../ui/i18n'

export const buildHistogramOption = (definition) => {
  const option = buildBarOption(definition)
  const markers = Array.isArray(definition?.meta?.histogramMarkers)
    ? definition.meta.histogramMarkers
    : []

  const markLine = markers.length
    ? {
        symbol: ['none', 'none'],
        lineStyle: { type: 'dashed', width: 1.2 },
        label: { formatter: '{b}', position: 'insideEndTop', color: '#d0f5dd' },
        data: markers.map((marker) => ({
          name: `${marker.name}: ${formatChartNumber(marker.value, { maximumFractionDigits: 3 })}`,
          xAxis: marker.index,
        })),
      }
    : null

  return {
    ...option,
    series: (option.series || []).map((series) => ({
      ...series,
      barGap: '0%',
      barCategoryGap: '10%',
      ...(markLine ? { markLine } : {}),
    })),
  }
}
