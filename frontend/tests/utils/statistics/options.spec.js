import {
  DEFAULT_SELECTED_METRICS,
  METRIC_OPTIONS,
  SEMANTIC_OVERRIDE_OPTIONS,
  metricLabel,
} from '../../../src/utils/statistics/options'

describe('statistics options', () => {
  it('exposes expected default metric presets and semantic override values', () => {
    expect(METRIC_OPTIONS.numeric.map((item) => item.key)).toContain('mean')
    expect(METRIC_OPTIONS.category.map((item) => item.key)).toContain('frequency')
    expect(DEFAULT_SELECTED_METRICS.numeric).toEqual(['mean', 'median', 'min', 'max', 'count'])
    expect(DEFAULT_SELECTED_METRICS.ordered).toContain('median_rank')
    expect(SEMANTIC_OVERRIDE_OPTIONS.map((item) => item.value)).toEqual([
      'metric',
      'nominal',
      'ordinal',
      'temporal',
      'identifier',
      'binary',
      'ignored',
    ])
  })

  it('returns readable labels for special quartile metrics and unknown keys', () => {
    expect(metricLabel('q1')).toBe('Q1')
    expect(metricLabel('q2')).toBe('Q2')
    expect(metricLabel('q3')).toBe('Q3')
    expect(metricLabel('std_dev')).toBe('Std deviation')
    expect(metricLabel('custom_metric')).toBe('custom_metric')
  })
})
