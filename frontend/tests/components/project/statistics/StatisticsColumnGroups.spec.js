import { mount } from '@vue/test-utils'
import { StatisticsColumnGroups } from '../../../../src/components/project/statistics/index.js'
import { withI18n } from '../../../support/i18n'

describe('StatisticsColumnGroups', () => {
  it('renders visible and hidden column groups and emits selection events', async () => {
    const wrapper = mount(StatisticsColumnGroups, withI18n({
      props: {
        groupedColumns: {
          numeric: [{ id: 1, name: 'Revenue', semanticType: 'metric' }],
          category: [{ id: 2, name: 'Region', semanticType: 'nominal' }],
          date: [],
          ordered: [],
          hidden: [{ id: 3, name: 'Secret', semanticType: 'ignored' }],
        },
        isSelected: (columnId) => columnId === 2,
        typeLabel: (value) => `type:${value}`,
        readOnly: false,
      },
    }))

    expect(wrapper.text()).toContain('Numeric columns')
    expect(wrapper.text()).toContain('No date columns.')
    expect(wrapper.text()).toContain('Hidden / Excluded columns (1)')
    expect(wrapper.get('input[name="stats_column_2"]').element.checked).toBe(true)

    await wrapper.get('input[name="stats_column_1"]').setValue(true)
    await wrapper.findAll('button.btn.tiny')[0].trigger('click')
    await wrapper.findAll('button.btn.tiny')[2].trigger('click')

    expect(wrapper.emitted('toggle-column')).toEqual([
      [{ columnId: 1, checked: true }],
    ])
    expect(wrapper.emitted('open-advanced')).toEqual([[1], [3]])
  })

  it('locks advanced actions in read-only mode', async () => {
    const wrapper = mount(StatisticsColumnGroups, withI18n({
      props: {
        groupedColumns: {
          numeric: [{ id: 1, name: 'Revenue', semanticType: 'metric' }],
          category: [],
          date: [],
          ordered: [],
          hidden: [],
        },
        readOnly: true,
      },
    }))

    const button = wrapper.get('button.btn.tiny')
    expect(button.text()).toBe('Locked')
    expect(button.attributes('disabled')).toBeDefined()
  })
})
