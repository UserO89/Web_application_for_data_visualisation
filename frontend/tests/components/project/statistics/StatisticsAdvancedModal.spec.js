import { mount } from '@vue/test-utils'
import StatisticsAdvancedModal from '../../../../src/components/project/statistics/StatisticsAdvancedModal.vue'
import { withI18n } from '../../../support/i18n'

const buildProps = (overrides = {}) => ({
  advancedColumn: {
    id: 10,
    name: 'Priority',
    detectedSemanticType: 'ordinal',
    semanticConfidence: 0.82,
    typeSource: 'auto',
    physicalType: 'string',
  },
  advancedDraft: {
    semanticType: 'ordinal',
    isExcludedFromAnalysis: false,
    ordinalOrderText: 'Low, Medium, High',
  },
  semanticOverrideOptions: [
    { value: 'metric', label: 'Numeric' },
    { value: 'ordinal', label: 'Ordered category' },
    { value: 'nominal', label: 'Category' },
  ],
  updatingColumnId: null,
  formatConfidence: (value) => `${Math.round(value * 100)}%`,
  ...overrides,
})

describe('StatisticsAdvancedModal', () => {
  it('renders nothing when advancedColumn is null', () => {
    const wrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps({ advancedColumn: null }),
    }))

    expect(wrapper.find('.advanced-backdrop').exists()).toBe(false)
  })

  it('renders column information when advancedColumn is present', () => {
    const wrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps(),
    }))

    expect(wrapper.text()).toContain('Advanced column settings')
    expect(wrapper.text()).toContain('Priority')
    expect(wrapper.text()).toContain('Detected type:')
    expect(wrapper.text()).toContain('Confidence:')
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps(),
    }))

    await wrapper.find('button.btn').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits update-semantic-type when select value changes', async () => {
    const wrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps(),
    }))

    await wrapper.find('select.field-select').setValue('nominal')
    expect(wrapper.emitted('update-semantic-type')).toEqual([['nominal']])
  })

  it('emits update-excluded when checkbox changes', async () => {
    const wrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps(),
    }))

    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(wrapper.emitted('update-excluded')).toEqual([[true]])
  })

  it('emits update-ordinal-order-text when input changes', async () => {
    const wrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps(),
    }))

    await wrapper.find('input.field-input').setValue('Low, High')
    expect(wrapper.emitted('update-ordinal-order-text')).toEqual([['Low, High']])
  })

  it('emits save-settings when save settings button is clicked', async () => {
    const wrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps(),
    }))

    await wrapper.find('button.btn.primary').trigger('click')
    expect(wrapper.emitted('save-settings')).toHaveLength(1)
  })

  it('emits save-order only when ordinal UI is shown and button is clicked', async () => {
    const metricWrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps({
        advancedDraft: {
          semanticType: 'metric',
          isExcludedFromAnalysis: false,
          ordinalOrderText: '',
        },
      }),
    }))

    const metricSaveOrderButton = metricWrapper.findAll('button')
      .find((button) => button.text() === 'Save order')
    expect(metricSaveOrderButton).toBeUndefined()
    expect(metricWrapper.emitted('save-order')).toBeUndefined()

    const ordinalWrapper = mount(StatisticsAdvancedModal, withI18n({
      props: buildProps(),
    }))
    const ordinalSaveOrderButton = ordinalWrapper.findAll('button')
      .find((button) => button.text() === 'Save order')

    expect(ordinalSaveOrderButton).toBeDefined()
    await ordinalSaveOrderButton.trigger('click')
    expect(ordinalWrapper.emitted('save-order')).toHaveLength(1)
  })
})
