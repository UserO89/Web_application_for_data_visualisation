import { mount } from '@vue/test-utils'
import { StatisticsMetricSelector } from '../../../../src/components/project/statistics/index.js'
import { withI18n } from '../../../support/i18n'

describe('StatisticsMetricSelector', () => {
  it('renders metric groups and emits toggle/grouping events', async () => {
    const wrapper = mount(StatisticsMetricSelector, withI18n({
      props: {
        metricOptions: {
          numeric: [{ key: 'mean', label: 'Mean' }],
          category: [{ key: 'mode', label: 'Mode' }],
          date: [{ key: 'latest', label: 'Latest' }],
          ordered: [{ key: 'median_rank', label: 'Median rank' }],
        },
        metricSelected: {
          numeric: ['mean'],
          category: [],
          date: [],
          ordered: ['median_rank'],
        },
        groupedColumns: {
          category: [{ id: 5, name: 'Region' }],
        },
        groupByColumnId: 5,
      },
    }))

    expect(wrapper.text()).toContain('Measures to calculate')
    expect(wrapper.get('input[name="metric_numeric_mean"]').element.checked).toBe(true)
    expect(wrapper.get('input[name="metric_ordered_median_rank"]').element.checked).toBe(true)
    expect(wrapper.get('select[name="group_by_column"]').element.value).toBe('5')

    await wrapper.get('input[name="metric_category_mode"]').setValue(true)
    await wrapper.get('select[name="group_by_column"]').setValue('5')

    expect(wrapper.emitted('toggle-metric')).toEqual([
      [{ group: 'category', metricKey: 'mode', checked: true }],
    ])
    expect(wrapper.emitted('update-group-by-column')).toEqual([['5']])
  })
})
