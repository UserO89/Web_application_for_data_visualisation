import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

const mockStatisticsWorkspace = vi.hoisted(() => ({
  openAdvanced: vi.fn(),
  state: null,
}))

vi.mock('../../../src/composables/project', () => ({
  useStatisticsWorkspace: () => mockStatisticsWorkspace.state,
}))

vi.mock('../../../src/components/project/statistics', async () => {
  const { defineComponent, h } = await import('vue')

  return {
    StatisticsColumnGroups: defineComponent({
      name: 'StatisticsColumnGroups',
      emits: ['toggle-column', 'open-advanced'],
      setup(_, { emit }) {
        return () => h('div', { class: 'stats-column-groups-stub' }, [
          h('button', {
            class: 'stats-toggle-column',
            onClick: () => emit('toggle-column', { columnId: 2, checked: true }),
          }, 'Toggle column'),
          h('button', {
            class: 'stats-open-advanced',
            onClick: () => emit('open-advanced', 7),
          }, 'Open advanced'),
        ])
      },
    }),
    StatisticsMetricSelector: defineComponent({
      name: 'StatisticsMetricSelector',
      emits: ['toggle-metric', 'update-group-by-column'],
      setup(_, { emit }) {
        return () => h('div', { class: 'stats-metric-selector-stub' }, [
          h('button', {
            class: 'stats-toggle-metric',
            onClick: () => emit('toggle-metric', { group: 'numeric', metricKey: 'mean', checked: true }),
          }, 'Toggle metric'),
          h('button', {
            class: 'stats-update-group',
            onClick: () => emit('update-group-by-column', '3'),
          }, 'Update group'),
        ])
      },
    }),
    StatisticsResults: defineComponent({
      name: 'StatisticsResults',
      setup() {
        return () => h('div', { class: 'stats-results-stub' }, 'Results')
      },
    }),
    StatisticsAdvancedModal: defineComponent({
      name: 'StatisticsAdvancedModal',
      emits: [
        'close',
        'update-semantic-type',
        'update-excluded',
        'update-ordinal-order-text',
        'save-settings',
        'save-order',
      ],
      setup(_, { emit }) {
        return () => h('div', { class: 'stats-advanced-modal-stub' }, [
          h('button', { class: 'stats-modal-close', onClick: () => emit('close') }, 'Close'),
          h('button', {
            class: 'stats-modal-semantic',
            onClick: () => emit('update-semantic-type', 'ordinal'),
          }, 'Semantic'),
          h('button', {
            class: 'stats-modal-excluded',
            onClick: () => emit('update-excluded', true),
          }, 'Excluded'),
          h('button', {
            class: 'stats-modal-order-text',
            onClick: () => emit('update-ordinal-order-text', 'Low, High'),
          }, 'Order text'),
          h('button', {
            class: 'stats-modal-save-settings',
            onClick: () => emit('save-settings'),
          }, 'Save settings'),
          h('button', {
            class: 'stats-modal-save-order',
            onClick: () => emit('save-order'),
          }, 'Save order'),
        ])
      },
    }),
  }
})

import StatisticsWorkspace from '../../../src/components/project/StatisticsWorkspace.vue'

const buildProps = (overrides = {}) => ({
  schemaColumns: [],
  statistics: [],
  rows: [],
  rowsReady: false,
  rowsLoading: false,
  rowsError: '',
  loading: false,
  error: '',
  updatingColumnId: null,
  readOnly: false,
  ...overrides,
})

const setMockStatisticsState = () => {
  mockStatisticsWorkspace.openAdvanced.mockReset()
  mockStatisticsWorkspace.state = {
    groupedColumns: ref([]),
    isSelected: vi.fn(() => false),
    typeLabel: vi.fn((value) => value),
    toggleColumn: vi.fn(),
    toggleMetric: vi.fn(),
    metricOptions: ref([]),
    metricSelected: ref({ numeric: [], category: [], date: [], ordered: [] }),
    groupByColumnId: ref(null),
    updateGroupByColumn: vi.fn(),
    selectedNumericColumns: ref([]),
    selectedCategoryColumns: ref([]),
    selectedDateColumns: ref([]),
    selectedOrderedColumns: ref([]),
    selectedNumericMetricKeys: ref([]),
    selectedCategoryMetricKeys: ref([]),
    selectedDateMetricKeys: ref([]),
    selectedOrderedMetricKeys: ref([]),
    numericMatrix: ref([]),
    categorySummaries: ref([]),
    dateSummaries: ref([]),
    orderedSummaries: ref([]),
    groupedMetricKeys: ref([]),
    groupedSummaryRows: ref([]),
    groupByColumnName: ref(''),
    metricLabel: vi.fn((value) => value),
    advancedColumn: ref({ id: 7, name: 'Priority' }),
    advancedDraft: ref({
      semanticType: 'nominal',
      isExcludedFromAnalysis: false,
      ordinalOrderText: '',
    }),
    semanticOverrideOptions: ref([]),
    openAdvanced: mockStatisticsWorkspace.openAdvanced,
    closeAdvanced: vi.fn(),
    setAdvancedSemanticType: vi.fn(),
    setAdvancedExcluded: vi.fn(),
    setAdvancedOrdinalOrderText: vi.fn(),
    saveAdvanced: vi.fn(),
    saveOrdinalOrder: vi.fn(),
  }
}

describe('StatisticsWorkspace', () => {
  beforeEach(() => {
    setMockStatisticsState()
  })

  it('shows the load rows note and emits load-rows from the header button', async () => {
    const wrapper = mount(StatisticsWorkspace, {
      props: buildProps({
        rowsReady: false,
        rowsLoading: false,
      }),
    })

    expect(wrapper.text()).toContain('Descriptive Statistics')
    expect(wrapper.text()).toContain('Summary cards use backend statistics.')
    expect(wrapper.text()).toContain('Load full dataset')

    const loadRowsButton = wrapper.findAll('button').find((button) => button.text() === 'Load full dataset')
    await loadRowsButton.trigger('click')

    expect(wrapper.emitted('load-rows')).toHaveLength(1)
  })

  it('renders error states and loading state text from props', () => {
    const wrapper = mount(StatisticsWorkspace, {
      props: buildProps({
        loading: true,
        error: 'Backend statistics failed.',
        rowsError: 'Browser rows failed.',
      }),
    })

    expect(wrapper.text()).toContain('Refreshing...')
    expect(wrapper.text()).toContain('Backend statistics failed.')
    expect(wrapper.text()).toContain('Browser rows failed.')
    expect(wrapper.text()).not.toContain('Summary cards use backend statistics.')
  })

  it('forwards statistics child events into composable methods and parent emits', async () => {
    const wrapper = mount(StatisticsWorkspace, {
      props: buildProps({
        readOnly: false,
      }),
    })

    await wrapper.find('.stats-toggle-column').trigger('click')
    expect(mockStatisticsWorkspace.state.toggleColumn).toHaveBeenCalledWith(2, true)

    await wrapper.find('.stats-toggle-metric').trigger('click')
    expect(mockStatisticsWorkspace.state.toggleColumn).toHaveBeenCalledTimes(1)

    await wrapper.find('.stats-update-group').trigger('click')
    expect(mockStatisticsWorkspace.state.updateGroupByColumn).toHaveBeenCalledWith('3')

    await wrapper.find('.stats-open-advanced').trigger('click')
    expect(mockStatisticsWorkspace.openAdvanced).toHaveBeenCalledWith(7)

    await wrapper.find('.stats-modal-semantic').trigger('click')
    await wrapper.find('.stats-modal-excluded').trigger('click')
    await wrapper.find('.stats-modal-order-text').trigger('click')
    await wrapper.find('.stats-modal-save-settings').trigger('click')
    await wrapper.find('.stats-modal-save-order').trigger('click')
    await wrapper.find('.stats-modal-close').trigger('click')

    expect(mockStatisticsWorkspace.state.setAdvancedSemanticType).toHaveBeenCalledWith('ordinal')
    expect(mockStatisticsWorkspace.state.setAdvancedExcluded).toHaveBeenCalledWith(true)
    expect(mockStatisticsWorkspace.state.setAdvancedOrdinalOrderText).toHaveBeenCalledWith('Low, High')
    expect(mockStatisticsWorkspace.state.saveAdvanced).toHaveBeenCalledTimes(1)
    expect(mockStatisticsWorkspace.state.saveOrdinalOrder).toHaveBeenCalledTimes(1)
    expect(mockStatisticsWorkspace.state.closeAdvanced).toHaveBeenCalledTimes(1)
  })

  it('hides advanced settings in read-only mode and blocks open-advanced requests', async () => {
    const wrapper = mount(StatisticsWorkspace, {
      props: buildProps({
        readOnly: true,
      }),
    })

    expect(wrapper.find('.stats-advanced-modal-stub').exists()).toBe(false)

    await wrapper.find('.stats-open-advanced').trigger('click')
    expect(mockStatisticsWorkspace.openAdvanced).not.toHaveBeenCalled()
  })
})
