import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { vi } from 'vitest'
import ProjectPage from '../../src/pages/ProjectPage.vue'

const mockRouteState = vi.hoisted(() => ({
  id: '1',
}))

const mockProjectPageState = vi.hoisted(() => ({
  project: null,
  loading: false,
  analysisRows: [],
  analysisRowsReady: false,
}))

const mockProjectsApi = vi.hoisted(() => ({
  importDataset: vi.fn(),
  listSavedCharts: vi.fn().mockResolvedValue({ charts: [] }),
  saveChart: vi.fn(),
  updateSavedChart: vi.fn(),
  deleteSavedChart: vi.fn(),
  updateRow: vi.fn(),
}))

const mockManualDatasetBuilder = vi.hoisted(() => ({
  prepareManualImportFile: vi.fn(() => null),
  addManualColumn: vi.fn(),
  removeManualColumn: vi.fn(),
  addManualRow: vi.fn(),
  removeManualRow: vi.fn(),
}))

const mockValidationReport = vi.hoisted(() => ({
  setValidationReport: vi.fn(),
  clearValidationReport: vi.fn(),
  openValidationModal: vi.fn(),
  closeValidationModal: vi.fn(),
  applyValidationReportFromProject: vi.fn(),
  resetValidationRouteState: vi.fn(),
}))

const mockProjectDataLoader = vi.hoisted(() => ({
  loadProject: vi.fn().mockResolvedValue(undefined),
  loadAnalysisRows: vi.fn().mockResolvedValue([]),
  ensureAnalysisRowsLoaded: vi.fn().mockResolvedValue([]),
  loadSuggestions: vi.fn().mockResolvedValue(undefined),
  loadStatisticsSummary: vi.fn().mockResolvedValue(undefined),
  reloadProjectData: vi.fn().mockResolvedValue(undefined),
  refreshData: vi.fn().mockResolvedValue(undefined),
  resetProjectDataState: vi.fn(),
}))

const mockProjectWorkspace = vi.hoisted(() => ({
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
}))

const mockProjectChartState = vi.hoisted(() => ({
  loadSeriesColors: vi.fn(() => ({})),
  getSeriesColor: vi.fn(() => '#000000'),
  setSeriesColor: vi.fn(),
  resetSeriesColors: vi.fn(),
  setChartViewportHeight: vi.fn(),
  syncViewportHeightFromResize: vi.fn(),
  buildChart: vi.fn(),
  clearChart: vi.fn(),
}))

const mockNotifications = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      id: mockRouteState.id,
    },
  }),
  useRouter: () => ({
    push: vi.fn(),
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
  projectsApi: mockProjectsApi,
}))

vi.mock('../../src/api/demo', () => ({
  demoProjectsApi: {
    get: vi.fn(),
    getRows: vi.fn(),
    getStatistics: vi.fn(),
    getChartSuggestions: vi.fn(),
    getSchema: vi.fn(),
  },
}))

vi.mock('../../src/composables/useNotifications', () => ({
  useNotifications: () => mockNotifications,
}))

vi.mock('../../src/composables/project', async () => {
  const { ref } = await import('vue')

  return {
    useManualDatasetBuilder: () => ({
      manualHeaders: ref(['Column 1']),
      manualRowsInput: ref([['']]),
      manualError: ref(''),
      addManualColumn: mockManualDatasetBuilder.addManualColumn,
      removeManualColumn: mockManualDatasetBuilder.removeManualColumn,
      addManualRow: mockManualDatasetBuilder.addManualRow,
      removeManualRow: mockManualDatasetBuilder.removeManualRow,
      prepareManualImportFile: mockManualDatasetBuilder.prepareManualImportFile,
    }),
    useValidationReport: () => ({
      importValidation: ref(null),
      validationModalOpen: ref(false),
      validationSummary: ref({}),
      validationProblemColumnCount: ref(0),
      validationProblemColumns: ref([]),
      validationSummaryLine: ref(''),
      validationBlockingError: ref(null),
      setValidationReport: mockValidationReport.setValidationReport,
      clearValidationReport: mockValidationReport.clearValidationReport,
      openValidationModal: mockValidationReport.openValidationModal,
      closeValidationModal: mockValidationReport.closeValidationModal,
      applyValidationReportFromProject: mockValidationReport.applyValidationReportFromProject,
      resetValidationRouteState: mockValidationReport.resetValidationRouteState,
    }),
    useProjectDataLoader: () => ({
      project: ref(mockProjectPageState.project),
      loading: ref(mockProjectPageState.loading),
      projectError: ref(''),
      tableRows: ref([]),
      analysisRows: ref(mockProjectPageState.analysisRows),
      analysisRowsReady: ref(mockProjectPageState.analysisRowsReady),
      analysisRowsLoading: ref(false),
      analysisRowsError: ref(''),
      suggestions: ref([]),
      statisticsSummary: ref([]),
      statisticsLoading: ref(false),
      statisticsError: ref(''),
      loadProject: mockProjectDataLoader.loadProject,
      loadAnalysisRows: mockProjectDataLoader.loadAnalysisRows,
      ensureAnalysisRowsLoaded: mockProjectDataLoader.ensureAnalysisRowsLoaded,
      loadSuggestions: mockProjectDataLoader.loadSuggestions,
      loadStatisticsSummary: mockProjectDataLoader.loadStatisticsSummary,
      reloadProjectData: mockProjectDataLoader.reloadProjectData,
      refreshData: mockProjectDataLoader.refreshData,
      resetProjectDataState: mockProjectDataLoader.resetProjectDataState,
    }),
    useProjectWorkspace: () => ({
      panelConfig: ref({}),
      resizeDirs: ref({}),
      viewMode: ref('workspace'),
      isCompactWorkspace: ref(false),
      visiblePanelIds: ref([]),
      workspaceHeight: ref(720),
      panelStyle: mockProjectWorkspace.panelStyle,
      setViewMode: mockProjectWorkspace.setViewMode,
      bringToFront: mockProjectWorkspace.bringToFront,
      startDrag: mockProjectWorkspace.startDrag,
      startResize: mockProjectWorkspace.startResize,
      saveLayouts: mockProjectWorkspace.saveLayouts,
      ensureWorkspaceInitializedForProject: mockProjectWorkspace.ensureWorkspaceInitializedForProject,
      resetWorkspaceRouteState: mockProjectWorkspace.resetWorkspaceRouteState,
      attachWorkspaceListeners: mockProjectWorkspace.attachWorkspaceListeners,
      detachWorkspaceListeners: mockProjectWorkspace.detachWorkspaceListeners,
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
      loadSeriesColors: mockProjectChartState.loadSeriesColors,
      getSeriesColor: mockProjectChartState.getSeriesColor,
      setSeriesColor: mockProjectChartState.setSeriesColor,
      resetSeriesColors: mockProjectChartState.resetSeriesColors,
      setChartViewportHeight: mockProjectChartState.setChartViewportHeight,
      syncViewportHeightFromResize: mockProjectChartState.syncViewportHeightFromResize,
      buildChart: mockProjectChartState.buildChart,
      clearChart: mockProjectChartState.clearChart,
    }),
  }
})

const ProjectDatasetImportSectionStub = defineComponent({
  name: 'ProjectDatasetImportSection',
  emits: [
    'back',
    'change-import-mode',
    'change-import-options',
    'open-demo',
    'file-select',
    'import',
    'add-manual-column',
    'remove-manual-column',
    'add-manual-row',
    'remove-manual-row',
    'manual-import',
    'change-manual-headers',
    'change-manual-rows',
  ],
  setup() {
    return () => h('section', { 'data-test': 'import-section' })
  },
})

const ProjectPageToolbarStub = defineComponent({
  name: 'ProjectPageToolbar',
  emits: ['back', 'change-view-mode', 'open-validation'],
  setup() {
    return () => h('section', { 'data-test': 'dataset-toolbar' })
  },
})

const ProjectWorkspaceCanvasStub = defineComponent({
  name: 'ProjectWorkspaceCanvas',
  emits: [
    'bring-to-front',
    'start-drag',
    'start-resize',
    'cell-edit',
    'refresh-data',
    'export-csv',
    'load-analysis-rows',
    'set-chart-height',
    'update-chart-definition',
    'build-chart',
    'save-chart',
    'clear-chart',
    'set-series-color',
    'reset-series-colors',
    'change-semantic',
    'change-ordinal-order',
    'refresh-saved-charts',
    'rename-saved-chart',
    'download-saved-chart',
    'delete-saved-chart',
  ],
  setup() {
    return () => h('section', { 'data-test': 'workspace-canvas' })
  },
})

const ProjectValidationModalStub = defineComponent({
  name: 'ProjectValidationModal',
  props: {
    isOpen: { type: Boolean, default: false },
  },
  emits: ['close', 'clear'],
  setup(props) {
    return () => h('section', {
      'data-test': 'validation-modal',
      'data-open': String(props.isOpen),
    })
  },
})

const mountPage = () =>
  mount(ProjectPage, {
    global: {
      stubs: {
        ProjectDatasetImportSection: ProjectDatasetImportSectionStub,
        ProjectPageToolbar: ProjectPageToolbarStub,
        ProjectWorkspaceCanvas: ProjectWorkspaceCanvasStub,
        ProjectValidationModal: ProjectValidationModalStub,
      },
    },
  })

describe('ProjectPage import and validation flow', () => {
  beforeEach(() => {
    mockRouteState.id = '1'
    mockProjectPageState.loading = false
    mockProjectPageState.project = null
    mockProjectPageState.analysisRows = []
    mockProjectPageState.analysisRowsReady = false

    mockProjectsApi.importDataset.mockReset()
    mockProjectsApi.listSavedCharts.mockClear()
    mockProjectsApi.saveChart.mockReset()
    mockProjectsApi.updateSavedChart.mockReset()
    mockProjectsApi.deleteSavedChart.mockReset()
    mockProjectsApi.updateRow.mockReset()

    mockManualDatasetBuilder.prepareManualImportFile.mockReset()
    mockManualDatasetBuilder.prepareManualImportFile.mockReturnValue(null)
    mockManualDatasetBuilder.addManualColumn.mockClear()
    mockManualDatasetBuilder.removeManualColumn.mockClear()
    mockManualDatasetBuilder.addManualRow.mockClear()
    mockManualDatasetBuilder.removeManualRow.mockClear()

    mockValidationReport.setValidationReport.mockReset()
    mockValidationReport.clearValidationReport.mockReset()
    mockValidationReport.openValidationModal.mockReset()
    mockValidationReport.closeValidationModal.mockReset()
    mockValidationReport.applyValidationReportFromProject.mockReset()
    mockValidationReport.resetValidationRouteState.mockReset()

    mockProjectDataLoader.loadProject.mockReset()
    mockProjectDataLoader.loadProject.mockResolvedValue(undefined)
    mockProjectDataLoader.loadAnalysisRows.mockReset()
    mockProjectDataLoader.loadAnalysisRows.mockResolvedValue([])
    mockProjectDataLoader.ensureAnalysisRowsLoaded.mockReset()
    mockProjectDataLoader.ensureAnalysisRowsLoaded.mockResolvedValue([])
    mockProjectDataLoader.loadSuggestions.mockReset()
    mockProjectDataLoader.loadSuggestions.mockResolvedValue(undefined)
    mockProjectDataLoader.loadStatisticsSummary.mockReset()
    mockProjectDataLoader.loadStatisticsSummary.mockResolvedValue(undefined)
    mockProjectDataLoader.reloadProjectData.mockReset()
    mockProjectDataLoader.reloadProjectData.mockResolvedValue(undefined)
    mockProjectDataLoader.refreshData.mockReset()
    mockProjectDataLoader.refreshData.mockResolvedValue(undefined)
    mockProjectDataLoader.resetProjectDataState.mockReset()

    mockProjectWorkspace.panelStyle.mockReset()
    mockProjectWorkspace.panelStyle.mockReturnValue({})
    mockProjectWorkspace.setViewMode.mockReset()
    mockProjectWorkspace.bringToFront.mockReset()
    mockProjectWorkspace.startDrag.mockReset()
    mockProjectWorkspace.startResize.mockReset()
    mockProjectWorkspace.saveLayouts.mockReset()
    mockProjectWorkspace.ensureWorkspaceInitializedForProject.mockReset()
    mockProjectWorkspace.ensureWorkspaceInitializedForProject.mockResolvedValue(undefined)
    mockProjectWorkspace.resetWorkspaceRouteState.mockReset()
    mockProjectWorkspace.attachWorkspaceListeners.mockReset()
    mockProjectWorkspace.detachWorkspaceListeners.mockReset()

    mockProjectChartState.loadSeriesColors.mockReset()
    mockProjectChartState.loadSeriesColors.mockReturnValue({})
    mockProjectChartState.getSeriesColor.mockReset()
    mockProjectChartState.getSeriesColor.mockReturnValue('#000000')
    mockProjectChartState.setSeriesColor.mockReset()
    mockProjectChartState.resetSeriesColors.mockReset()
    mockProjectChartState.setChartViewportHeight.mockReset()
    mockProjectChartState.syncViewportHeightFromResize.mockReset()
    mockProjectChartState.buildChart.mockReset()
    mockProjectChartState.clearChart.mockReset()

    mockNotifications.success.mockReset()
    mockNotifications.warning.mockReset()
    mockNotifications.error.mockReset()
    mockNotifications.info.mockReset()

    vi.stubGlobal('ResizeObserver', class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback()
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('imports a selected file and opens the validation report on success', async () => {
    mockProjectPageState.project = {
      id: 1,
      dataset: null,
    }

    const validation = { summary: { warnings: 1 } }
    const file = new File(['month,revenue'], 'dataset.csv', { type: 'text/csv' })
    mockProjectsApi.importDataset.mockResolvedValueOnce({ validation })

    const wrapper = mountPage()
    await flushPromises()

    const importSection = wrapper.getComponent(ProjectDatasetImportSectionStub)
    importSection.vm.$emit('file-select', { target: { files: [file] } })
    await flushPromises()

    importSection.vm.$emit('import')
    await flushPromises()

    expect(mockProjectsApi.importDataset).toHaveBeenCalledWith('1', file, {
      has_header: true,
      delimiter: ',',
    })
    expect(mockValidationReport.setValidationReport).toHaveBeenCalledWith(validation)
    expect(mockValidationReport.openValidationModal).toHaveBeenCalledTimes(1)
    expect(mockNotifications.success).toHaveBeenCalledWith('Dataset imported successfully.')
  })

  it('shows the validation report when file import returns validation issues', async () => {
    mockProjectPageState.project = {
      id: 1,
      dataset: null,
    }

    const validation = {
      blocking_error: {
        message: 'Invalid delimiter in header row.',
      },
    }
    const file = new File(['a,b'], 'broken.csv', { type: 'text/csv' })
    mockProjectsApi.importDataset.mockRejectedValueOnce({
      response: {
        data: {
          validation,
        },
      },
    })

    const wrapper = mountPage()
    await flushPromises()

    const importSection = wrapper.getComponent(ProjectDatasetImportSectionStub)
    importSection.vm.$emit('file-select', { target: { files: [file] } })
    await flushPromises()

    importSection.vm.$emit('import')
    await flushPromises()

    expect(mockValidationReport.setValidationReport).toHaveBeenCalledWith(validation)
    expect(mockValidationReport.openValidationModal).toHaveBeenCalledTimes(1)
    expect(mockNotifications.warning).toHaveBeenCalledWith('Invalid delimiter in header row.')
    expect(mockNotifications.error).not.toHaveBeenCalled()
  })

  it('imports manual data through the generated CSV file payload', async () => {
    mockProjectPageState.project = {
      id: 1,
      dataset: null,
    }

    const validation = { summary: { warnings: 0 } }
    const manualFile = new File(['city,population'], 'manual.csv', { type: 'text/csv' })
    mockManualDatasetBuilder.prepareManualImportFile.mockReturnValueOnce(manualFile)
    mockProjectsApi.importDataset.mockResolvedValueOnce({ validation })

    const wrapper = mountPage()
    await flushPromises()

    const importSection = wrapper.getComponent(ProjectDatasetImportSectionStub)
    importSection.vm.$emit('manual-import')
    await flushPromises()

    expect(mockManualDatasetBuilder.prepareManualImportFile).toHaveBeenCalledTimes(1)
    expect(mockProjectsApi.importDataset).toHaveBeenCalledWith('1', manualFile, {
      has_header: true,
      delimiter: ',',
    })
    expect(mockValidationReport.setValidationReport).toHaveBeenCalledWith(validation)
    expect(mockNotifications.success).toHaveBeenCalledWith('Dataset imported successfully.')
  })

  it('forwards toolbar and workspace events through the page orchestration layer', async () => {
    mockProjectPageState.project = {
      id: 1,
      dataset: {
        id: 15,
        columns: [
          { id: 4, name: 'Month', position: 1, type: 'string' },
          { id: 5, name: 'Revenue', position: 2, type: 'number' },
        ],
      },
    }
    mockProjectPageState.analysisRowsReady = false
    mockProjectDataLoader.ensureAnalysisRowsLoaded.mockResolvedValueOnce([{ id: 1 }])

    const wrapper = mountPage()
    await flushPromises()

    wrapper.getComponent(ProjectPageToolbarStub).vm.$emit('open-validation')
    wrapper.getComponent(ProjectWorkspaceCanvasStub).vm.$emit('build-chart', {
      chartType: 'bar',
      bindings: { x: 4, y: 5 },
    })
    await flushPromises()

    expect(mockValidationReport.openValidationModal).toHaveBeenCalledTimes(1)
    expect(mockProjectDataLoader.ensureAnalysisRowsLoaded).toHaveBeenCalledWith({
      columns: [
        { id: 4, name: 'Month', position: 1, type: 'string' },
        { id: 5, name: 'Revenue', position: 2, type: 'number' },
      ],
      force: false,
    })
    expect(mockProjectChartState.buildChart).toHaveBeenCalledWith({
      chartType: 'bar',
      bindings: { x: 4, y: 5 },
    })
  })
})
