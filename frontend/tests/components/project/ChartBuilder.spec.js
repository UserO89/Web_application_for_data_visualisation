import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ChartBuilder from '../../../src/components/project/ChartBuilder.vue'
import { createDefaultChartDefinition } from '../../../src/charts/chartDefinitions/createUniversalChartDefinition'
import { withI18n } from '../../support/i18n'

const buildSchemaColumns = () => ([
  { id: 1, name: 'Date', semanticType: 'temporal' },
  { id: 2, name: 'Revenue', semanticType: 'continuous' },
  { id: 3, name: 'Region', semanticType: 'categorical' },
])

describe('ChartBuilder', () => {
  it('does not emit update:modelValue for equivalent modelValue updates', async () => {
    const wrapper = mount(ChartBuilder, withI18n({
      props: {
        schemaColumns: buildSchemaColumns(),
        modelValue: createDefaultChartDefinition('line'),
        suggestions: [],
      },
    }))

    const equivalentValue = JSON.parse(JSON.stringify(createDefaultChartDefinition('line')))
    await wrapper.setProps({ modelValue: equivalentValue })
    await nextTick()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('emits update:modelValue when local chart type changes', async () => {
    const wrapper = mount(ChartBuilder, withI18n({
      props: {
        schemaColumns: buildSchemaColumns(),
        modelValue: createDefaultChartDefinition('line'),
        suggestions: [],
      },
    }))

    const chartTypeSelect = wrapper.find('select.field-select')
    await chartTypeSelect.setValue('bar')

    const updates = wrapper.emitted('update:modelValue') || []
    expect(updates.length).toBeGreaterThan(0)
    expect(updates.at(-1)?.[0]?.chartType).toBe('bar')
  })
})
