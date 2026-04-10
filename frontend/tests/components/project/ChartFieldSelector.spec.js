import { mount } from '@vue/test-utils'
import ChartFieldSelector from '../../../src/components/project/ChartFieldSelector.vue'
import { withI18n } from '../../support/i18n'

const buildProps = (overrides = {}) => ({
  label: 'X axis',
  modelValue: null,
  options: [
    { id: 1, name: 'Order Date', semanticType: 'temporal' },
    { id: 2, name: 'Revenue', semanticType: 'metric' },
  ],
  placeholder: 'Pick a column',
  hint: '',
  disabled: false,
  ...overrides,
})

describe('ChartFieldSelector', () => {
  it('renders label, placeholder, semantic labels, and hint text', () => {
    const wrapper = mount(ChartFieldSelector, withI18n({
      props: buildProps({
        hint: 'Select a supported field.',
      }),
    }))

    expect(wrapper.text()).toContain('X axis')
    expect(wrapper.text()).toContain('Pick a column')
    expect(wrapper.text()).toContain('Order Date (Date/Time)')
    expect(wrapper.text()).toContain('Revenue (Numeric)')
    expect(wrapper.text()).toContain('Select a supported field.')
  })

  it('emits normalized numeric values and null for empty selections', async () => {
    const wrapper = mount(ChartFieldSelector, withI18n({
      props: buildProps(),
    }))

    const select = wrapper.find('select')
    await select.setValue('2')
    await select.setValue('')

    expect(wrapper.emitted('update:modelValue')).toEqual([[2], [null]])
  })

  it('uses provided id and name and supports disabled mode', () => {
    const wrapper = mount(ChartFieldSelector, withI18n({
      props: buildProps({
        id: 'chart-x',
        name: 'chart_x',
        disabled: true,
      }),
    }))

    const label = wrapper.find('label')
    const select = wrapper.find('select')

    expect(label.attributes('for')).toBe('chart-x')
    expect(select.attributes('id')).toBe('chart-x')
    expect(select.attributes('name')).toBe('chart_x')
    expect(select.attributes('disabled')).toBeDefined()
  })
})
