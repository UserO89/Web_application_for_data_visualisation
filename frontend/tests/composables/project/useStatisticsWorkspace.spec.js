import { nextTick, ref } from 'vue'
import { beforeEach, vi } from 'vitest'
import { setLocale } from '../../../src/i18n'
import { useStatisticsWorkspace } from '../../../src/composables/project/useStatisticsWorkspace'

const buildSchemaColumns = () => ([
  { id: 1, name: 'Revenue', fieldKey: 'revenue', semanticType: 'metric', isExcludedFromAnalysis: false },
  { id: 2, name: 'Region', fieldKey: 'region', semanticType: 'nominal', isExcludedFromAnalysis: false },
  { id: 3, name: 'OrderDate', fieldKey: 'orderDate', semanticType: 'temporal', isExcludedFromAnalysis: false },
  {
    id: 4,
    name: 'Priority',
    fieldKey: 'priority',
    semanticType: 'ordinal',
    ordinalOrder: ['Low', 'Medium', 'High'],
    isExcludedFromAnalysis: false,
  },
  { id: 5, name: 'CustomerId', fieldKey: 'customerId', semanticType: 'identifier', isExcludedFromAnalysis: false },
])

const createWorkspace = (overrides = {}) => {
  const schemaColumns = ref(overrides.schemaColumns ?? buildSchemaColumns())
  const statistics = ref(overrides.statistics ?? [])
  const rows = ref(overrides.rows ?? [])
  const onChangeSemantic = overrides.onChangeSemantic ?? vi.fn()
  const onChangeOrdinalOrder = overrides.onChangeOrdinalOrder ?? vi.fn()

  const state = useStatisticsWorkspace({
    schemaColumns,
    statistics,
    rows,
    onChangeSemantic,
    onChangeOrdinalOrder,
  })

  return {
    schemaColumns,
    statistics,
    rows,
    onChangeSemantic,
    onChangeOrdinalOrder,
    state,
  }
}

describe('useStatisticsWorkspace', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('auto-selects valid statistic-compatible columns on initial schema load', async () => {
    const { state } = createWorkspace()
    await nextTick()

    expect(state.isSelected(1)).toBe(true)
    expect(state.isSelected(2)).toBe(true)
    expect(state.isSelected(3)).toBe(true)
    expect(state.isSelected(4)).toBe(true)
    expect(state.isSelected(5)).toBe(false)
  })

  it('toggleColumn adds and removes selected columns, and isSelected reflects current selection', async () => {
    const { state } = createWorkspace()
    await nextTick()

    state.toggleColumn(1, false)
    expect(state.isSelected(1)).toBe(false)

    state.toggleColumn(1, true)
    expect(state.isSelected(1)).toBe(true)
  })

  it('toggleMetric adds/removes metric keys without duplication', async () => {
    const { state } = createWorkspace()
    await nextTick()

    state.toggleMetric('numeric', 'variance', true)
    state.toggleMetric('numeric', 'variance', true)

    const varianceKeys = state.metricSelected.value.numeric.filter((key) => key === 'variance')
    expect(varianceKeys).toHaveLength(1)

    state.toggleMetric('numeric', 'variance', false)
    expect(state.metricSelected.value.numeric.includes('variance')).toBe(false)
  })

  it('updateGroupByColumn normalizes ids correctly', async () => {
    const { state } = createWorkspace()
    await nextTick()

    state.updateGroupByColumn('2')
    expect(state.groupByColumnId.value).toBe(2)

    state.updateGroupByColumn('abc')
    expect(state.groupByColumnId.value).toBeNull()

    state.updateGroupByColumn('')
    expect(state.groupByColumnId.value).toBeNull()
  })

  it('clears groupByColumnId when selected group column disappears from schema', async () => {
    const { state, schemaColumns } = createWorkspace()
    await nextTick()

    state.updateGroupByColumn('2')
    expect(state.groupByColumnId.value).toBe(2)

    schemaColumns.value = schemaColumns.value.filter((column) => column.id !== 2)
    await nextTick()

    expect(state.groupByColumnId.value).toBeNull()
  })

  it('openAdvanced loads correct column draft state', async () => {
    const { state } = createWorkspace()
    await nextTick()

    state.openAdvanced(4)

    expect(state.advancedColumn.value?.id).toBe(4)
    expect(state.advancedDraft.value.semanticType).toBe('ordinal')
    expect(state.advancedDraft.value.isExcludedFromAnalysis).toBe(false)
    expect(state.advancedDraft.value.ordinalOrderText).toBe('Low, Medium, High')
  })

  it('saveAdvanced calls onChangeSemantic with correct payload', async () => {
    const onChangeSemantic = vi.fn()
    const { state } = createWorkspace({ onChangeSemantic })
    await nextTick()

    state.openAdvanced(1)
    state.setAdvancedSemanticType('nominal')
    state.setAdvancedExcluded(true)
    state.saveAdvanced()

    expect(onChangeSemantic).toHaveBeenCalledTimes(1)
    expect(onChangeSemantic).toHaveBeenCalledWith({
      columnId: 1,
      semanticType: 'nominal',
      analyticalRole: 'excluded',
      isExcludedFromAnalysis: true,
    })
  })

  it('saveOrdinalOrder calls onChangeOrdinalOrder only for ordinal semantic type with at least 2 values', async () => {
    const onChangeOrdinalOrder = vi.fn()
    const { state } = createWorkspace({ onChangeOrdinalOrder })
    await nextTick()

    state.openAdvanced(4)
    state.setAdvancedSemanticType('ordinal')
    state.setAdvancedOrdinalOrderText('Low, Medium, High')
    state.saveOrdinalOrder()

    expect(onChangeOrdinalOrder).toHaveBeenCalledTimes(1)
    expect(onChangeOrdinalOrder).toHaveBeenCalledWith({
      columnId: 4,
      ordinalOrder: ['Low', 'Medium', 'High'],
    })
  })

  it('saveOrdinalOrder does nothing for invalid ordinal input', async () => {
    const onChangeOrdinalOrder = vi.fn()
    const { state } = createWorkspace({ onChangeOrdinalOrder })
    await nextTick()

    state.openAdvanced(4)
    state.setAdvancedSemanticType('ordinal')
    state.setAdvancedOrdinalOrderText('SingleValue')
    state.saveOrdinalOrder()

    state.setAdvancedSemanticType('nominal')
    state.setAdvancedOrdinalOrderText('Low, Medium')
    state.saveOrdinalOrder()

    expect(onChangeOrdinalOrder).not.toHaveBeenCalled()
  })

  it('updates localized metric and semantic labels when the locale changes', async () => {
    const { state } = createWorkspace()
    await nextTick()

    expect(state.metricOptions.value.numeric[0].label).toBe('Mean')
    expect(state.typeLabel('metric')).toBe('Numeric')

    setLocale('sk')
    await nextTick()

    expect(state.metricOptions.value.numeric[0].label).toBe('Priemer')
    expect(state.typeLabel('metric')).toBe('Numericke')
  })
})
