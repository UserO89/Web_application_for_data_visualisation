import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import ProjectPage from '../../src/pages/ProjectPage.vue'

const mockRouteState = vi.hoisted(() => ({
  id: '1',
}))

const mockProjectPageState = vi.hoisted(() => ({
  project: null,
  loading: false,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      id: mockRouteState.id,
    },
  }),
}))

vi.mock('../../src/stores/datasetSchema', () => ({
  useDatasetSchemaStore: () => ({
    columns: [],
    updatingColumnId: null,
    applySchema: vi.fn(),
    fetchSchema: vi.fn(),
    setSemanticType: vi.fn(),
    setOrdinalOrder: vi.fn(),
  }),
}))

vi.mock('../../src/api/projects', () => ({
  projectsApi: {
    importDataset: vi.fn(),
    listSavedCharts: vi.fn().mockResolvedValue({ charts: [] }),
    saveChart: vi.fn(),
    updateSavedChart: vi.fn(),
    deleteSavedChart: vi.fn(),
    updateRow: vi.fn(),
  },
}))

vi.mock('../../src/composables/project', async () => {
  const { ref } = await import('vue')

  return {
    useManualDatasetBuilder: () => ({
      manualHeaders: ref(['Column 1']),
      manualRowsInput: ref([['']]),
      manualError: ref(''),
      addManualColumn: vi.fn(),
      removeManualColumn: vi.fn(),
      addManualRow: vi.fn(),
      removeManualRow: vi.fn(),
      prepareManualImportFile: vi.fn(() => null),
    }),
    useValidationReport: () => ({
      importValidation: ref(null),
      validationModalOpen: ref(false),
      validationSummary: ref({}),
      validationProblemColumnCount: ref(0),
      validationProblemColumns: ref([]),
      validationSummaryLine: ref(''),
      validationBlockingError: ref(null),
      setValidationReport: vi.fn(),
      clearValidationReport: vi.fn(),
      openValidationModal: vi.fn(),
      closeValidationModal: vi.fn(),
      applyValidationReportFromProject: vi.fn(),
      resetValidationRouteState: vi.fn(),
    }),
    useProjectDataLoader: () => ({
      project: ref(mockProjectPageState.project),
      loading: ref(mockProjectPageState.loading),
      tableRows: ref([]),
      analysisRows: ref([]),
      suggestions: ref([]),
      statisticsSummary: ref([]),
      statisticsLoading: ref(false),
      statisticsError: ref(''),
      loadProject: vi.fn().mockResolvedValue(undefined),
      loadSuggestions: vi.fn().mockResolvedValue(undefined),
      loadStatisticsSummary: vi.fn().mockResolvedValue(undefined),
      reloadProjectData: vi.fn().mockResolvedValue(undefined),
      refreshData: vi.fn().mockResolvedValue(undefined),
      resetProjectDataState: vi.fn(),
    }),
    useProjectWorkspace: () => ({
      panelConfig: ref({}),
      resizeDirs: ref({}),
      viewMode: ref('workspace'),
      visiblePanelIds: ref([]),
      workspaceHeight: ref(720),
      panelStyle: vi.fn(() => ({})),
      setViewMode: vi.fn(),
      bringToFront: vi.fn(),
      startDrag: vi.fn(),
      startResize: vi.fn(),
      saveLayouts: vi.fn(),
      ensureWorkspaceInitializedForProject: vi.fn().mockResolvedValue(undefined),
      resetWorkspaceRouteState: vi.fn(),
      attachWorkspaceListeners: vi.fn(),
      detachWorkspaceListeners: vi.fn(),
    }),
    useProjectChartState: () => ({
      chartType: ref('line'),
      chartDefinition: ref({
        chartType: 'line',
        bindings: {},
        settings: {},
        filters: [],
        sort: null,
      }),
      chartViewportHeight: ref(320),
      chartViewportCustom: ref(false),
      chartViewportPresetValue: ref('default'),
      chartViewportStyle: ref({}),
      chartLabels: ref([]),
      chartDatasets: ref([]),
      chartMeta: ref({}),
      seriesColors: ref({}),
      loadSeriesColors: vi.fn(() => ({})),
      getSeriesColor: vi.fn(() => '#000000'),
      setSeriesColor: vi.fn(),
      resetSeriesColors: vi.fn(),
      setChartViewportHeight: vi.fn(),
      syncViewportHeightFromResize: vi.fn(),
      buildChart: vi.fn(),
      clearChart: vi.fn(),
    }),
  }
})

const mountPage = () =>
  mount(ProjectPage, {
    global: {
      stubs: {
        ProjectDatasetImportSection: { template: '<section data-test="import-section" />' },
        ProjectPageToolbar: { template: '<section data-test="dataset-toolbar" />' },
        ProjectWorkspaceCanvas: { template: '<section data-test="workspace-canvas" />' },
        ProjectValidationModal: true,
      },
      mocks: {
        $router: {
          push: vi.fn(),
        },
      },
    },
  })

describe('ProjectPage dataset architecture rule', () => {
  beforeEach(() => {
    mockRouteState.id = '1'
    mockProjectPageState.loading = false
    mockProjectPageState.project = null
  })

  it('shows import UI only when the project has no dataset', () => {
    mockProjectPageState.project = {
      id: 1,
      dataset: null,
    }

    const wrapper = mountPage()

    expect(wrapper.find('[data-test="import-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dataset-toolbar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="workspace-canvas"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('This project already contains a dataset.')
  })

  it('shows post-import workspace and hides import UI once a dataset exists', () => {
    mockProjectPageState.project = {
      id: 1,
      dataset: {
        id: 15,
        columns: [],
      },
    }

    const wrapper = mountPage()

    expect(wrapper.find('[data-test="import-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dataset-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="workspace-canvas"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('This project already contains a dataset.')
    expect(wrapper.text()).toContain('To work with another dataset, create a new project.')
  })
})
