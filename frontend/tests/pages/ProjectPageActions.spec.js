import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { vi } from 'vitest'
import ProjectPage from '../../src/pages/ProjectPage.vue'
import i18n from '../../src/i18n'
import { withI18n } from '../support/i18n'

const mockRouteState = vi.hoisted(() => ({
  id: '1',
}))

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}))

const mockSchemaStore = vi.hoisted(() => ({
  columns: [],
  updatingColumnId: null,
  applySchema: vi.fn(),
  fetchSchema: vi.fn(),
  setSemanticType: vi.fn(),
  setOrdinalOrder: vi.fn(),
}))

const mockProjectsApi = vi.hoisted(() => ({
  importDataset: vi.fn(),
  listSavedCharts: vi.fn().mockResolvedValue({ charts: [] }),
  saveChart: vi.fn(),
  updateSavedChart: vi.fn(),
  deleteSavedChart: vi.fn(),
  updateRow: vi.fn(),
}))

const mockProjectState = vi.hoisted(() => ({
  project: null,
  loading: false,
  tableRows: [],
  analysisRows: [],
  analysisRowsReady: false,
  chartType: 'line',
  chartDefinition: {
    chartType: 'line',
    bindings: {},
    settings: {},
    filters: [],
    sort: null,
  },
  chartLabels: [],
  chartDatasets: [],
  chartMeta: {},
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
  useRouter: () => mockRouter,
}))

vi.mock('../../src/stores/datasetSchema', () => ({
  useDatasetSchemaStore: () => mockSchemaStore,
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
      setValidationReport: mockValidationReport.setValidationReport,
      clearValidationReport: mockValidationReport.clearValidationReport,
      openValidationModal: mockValidationReport.openValidationModal,
      closeValidationModal: mockValidationReport.closeValidationModal,
      applyValidationReportFromProject: mockValidationReport.applyValidationReportFromProject,
      resetValidationRouteState: mockValidationReport.resetValidationRouteState,
    }),
    useProjectDataLoader: () => ({
      project: ref(mockProjectState.project),
      loading: ref(mockProjectState.loading),
      projectError: ref(''),
      tableRows: ref(mockProjectState.tableRows),
      analysisRows: ref(mockProjectState.analysisRows),
      analysisRowsReady: ref(mockProjectState.analysisRowsReady),
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
      chartType: ref(mockProjectState.chartType),
      chartDefinition: ref(mockProjectState.chartDefinition),
      chartViewportHeight: ref(320),
      chartViewportCustom: ref(false),
      chartViewportPresetValue: ref('default'),
      chartViewportStyle: ref({}),
      chartLabels: ref(mockProjectState.chartLabels),
      chartDatasets: ref(mockProjectState.chartDatasets),
      chartMeta: ref(mockProjectState.chartMeta),
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
  setup() {
    return () => h('section', { 'data-test': 'import-section' })
  },
})

const ProjectPageToolbarStub = defineComponent({
  name: 'ProjectPageToolbar',
  setup() {
    return () => h('section', { 'data-test': 'dataset-toolbar' })
  },
})

const ProjectWorkspaceCanvasStub = defineComponent({
  name: 'ProjectWorkspaceCanvas',
  setup() {
    return () => h('section', { 'data-test': 'workspace-canvas' })
  },
})

const ProjectValidationModalStub = defineComponent({
  name: 'ProjectValidationModal',
  setup() {
    return () => h('section', { 'data-test': 'validation-modal' })
  },
})

const mountPage = (props = {}) =>
  mount(ProjectPage, withI18n({
    props,
    global: {
      stubs: {
        ProjectDatasetImportSection: ProjectDatasetImportSectionStub,
        ProjectPageToolbar: ProjectPageToolbarStub,
        ProjectWorkspaceCanvas: ProjectWorkspaceCanvasStub,
        ProjectValidationModal: ProjectValidationModalStub,
      },
    },
  }))

describe('ProjectPage actions', () => {
  beforeEach(() => {
    mockRouteState.id = '1'
    mockRouter.push.mockReset()

    mockSchemaStore.columns = []
    mockSchemaStore.updatingColumnId = null
    mockSchemaStore.applySchema.mockReset()
    mockSchemaStore.fetchSchema.mockReset()
    mockSchemaStore.setSemanticType.mockReset()
    mockSchemaStore.setSemanticType.mockResolvedValue(undefined)
    mockSchemaStore.setOrdinalOrder.mockReset()
    mockSchemaStore.setOrdinalOrder.mockResolvedValue(undefined)

    mockProjectState.project = {
      id: 1,
      title: 'Analytics',
      dataset: {
        id: 15,
        columns: [
          { id: 11, name: 'Month', position: 1, type: 'string' },
          { id: 12, name: 'Revenue', position: 2, type: 'number' },
        ],
      },
    }
    mockProjectState.loading = false
    mockProjectState.tableRows = [{ id: 7, col_1: 'Jan', col_2: 100 }]
    mockProjectState.analysisRows = [{ id: 7, Month: 'Jan', Revenue: 100 }]
    mockProjectState.analysisRowsReady = true
    mockProjectState.chartType = 'line'
    mockProjectState.chartDefinition = {
      chartType: 'line',
      bindings: { x: 11, y: 12 },
      settings: {},
      filters: [],
      sort: null,
    }
    mockProjectState.chartLabels = []
    mockProjectState.chartDatasets = []
    mockProjectState.chartMeta = { yAxisLabel: 'Revenue' }

    mockProjectsApi.importDataset.mockReset()
    mockProjectsApi.listSavedCharts.mockReset()
    mockProjectsApi.listSavedCharts.mockResolvedValue({ charts: [] })
    mockProjectsApi.saveChart.mockReset()
    mockProjectsApi.saveChart.mockResolvedValue(undefined)
    mockProjectsApi.updateSavedChart.mockReset()
    mockProjectsApi.updateSavedChart.mockResolvedValue({
      chart: {
        id: 9,
        title: 'Revenue Trend',
        type: 'line',
        created_at: '2026-01-01T00:00:00Z',
        config: {
          rendered: {
            labels: ['Jan'],
            datasets: [{ label: 'Revenue', data: [100] }],
            meta: {},
          },
        },
      },
    })
    mockProjectsApi.deleteSavedChart.mockReset()
    mockProjectsApi.deleteSavedChart.mockResolvedValue(undefined)
    mockProjectsApi.updateRow.mockReset()
    mockProjectsApi.updateRow.mockResolvedValue(undefined)

    mockValidationReport.setValidationReport.mockReset()
    mockValidationReport.clearValidationReport.mockReset()
    mockValidationReport.openValidationModal.mockReset()
    mockValidationReport.closeValidationModal.mockReset()
    mockValidationReport.applyValidationReportFromProject.mockReset()
    mockValidationReport.resetValidationRouteState.mockReset()

    mockProjectDataLoader.loadProject.mockReset()
    mockProjectDataLoader.loadProject.mockResolvedValue(undefined)
    mockProjectDataLoader.loadAnalysisRows.mockReset()
    mockProjectDataLoader.loadAnalysisRows.mockResolvedValue(mockProjectState.analysisRows)
    mockProjectDataLoader.ensureAnalysisRowsLoaded.mockReset()
    mockProjectDataLoader.ensureAnalysisRowsLoaded.mockResolvedValue(mockProjectState.analysisRows)
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
    vi.stubGlobal('Blob', Blob)
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

  it('warns when saving without chart data and saves a rendered chart to the library', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.vm.saveCurrentChart()
    expect(mockNotifications.warning).toHaveBeenCalledWith(i18n.global.t('project.page.charts.buildBeforeSaving'))

    mockProjectState.chartLabels = ['Jan']
    mockProjectState.chartDatasets = [{ label: 'Revenue', data: [100] }]

    const saveWrapper = mountPage()
    await flushPromises()
    await saveWrapper.vm.saveCurrentChart()
    await flushPromises()

    expect(mockProjectsApi.saveChart).toHaveBeenCalledWith('1', expect.objectContaining({
      type: 'line',
      title: expect.any(String),
      config: {
        chartDefinition: mockProjectState.chartDefinition,
        rendered: {
          type: 'line',
          labels: ['Jan'],
          datasets: [{ label: 'Revenue', data: [100] }],
          meta: { yAxisLabel: 'Revenue' },
        },
      },
    }))
    expect(mockProjectsApi.listSavedCharts).toHaveBeenCalledWith('1')
    expect(mockProjectWorkspace.setViewMode).toHaveBeenCalledWith('library')
    expect(mockNotifications.success).toHaveBeenCalledWith(i18n.global.t('project.page.charts.saved'))
  })

  it('updates rows and schema semantics, then refreshes derived analytics', async () => {
    mockSchemaStore.columns = [
      { id: 11, name: 'Month', position: 1 },
      { id: 12, name: 'Revenue', position: 2 },
    ]

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.vm.handleCellEdit({
      row: {
        id: 7,
        col_1: 'Jan',
        col_2: 100,
      },
    })
    await wrapper.vm.handleSemanticTypeChange({
      columnId: 12,
      semanticType: 'metric',
      analyticalRole: 'measure',
      isExcludedFromAnalysis: false,
    })
    await wrapper.vm.handleOrdinalOrderChange({
      columnId: 11,
      ordinalOrder: ['Jan', 'Feb'],
    })
    await flushPromises()

    expect(mockProjectsApi.updateRow).toHaveBeenCalledWith('1', 7, ['Jan', 100])
    expect(mockSchemaStore.setSemanticType).toHaveBeenCalledWith('1', 12, {
      semantic_type: 'metric',
      analytical_role: 'measure',
      is_excluded_from_analysis: false,
    })
    expect(mockSchemaStore.setOrdinalOrder).toHaveBeenCalledWith('1', 11, ['Jan', 'Feb'])
    expect(mockProjectDataLoader.loadSuggestions).toHaveBeenCalled()
    expect(mockProjectDataLoader.loadStatisticsSummary).toHaveBeenCalled()
    expect(mockProjectChartState.buildChart).toHaveBeenCalledWith(mockProjectState.chartDefinition)
  })

  it('loads, renames, deletes, and exports project data through page actions', async () => {
    mockProjectsApi.listSavedCharts.mockResolvedValue({
      charts: [
        {
          id: 9,
          title: 'Saved chart',
          type: 'line',
          created_at: '2026-01-01T00:00:00Z',
          config: {
            rendered: {
              labels: ['Jan'],
              datasets: [{ label: 'Revenue', data: [100] }],
              meta: {},
            },
          },
        },
      ],
    })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:table')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const originalCreateElement = document.createElement.bind(document)
    let anchor = null
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement(tagName)
      if (String(tagName).toLowerCase() === 'a') {
        anchor = element
        element.click = vi.fn()
      }
      return element
    })

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.vm.loadSavedCharts()
    await wrapper.vm.renameSavedChart({ chartId: 9, title: 'Revenue Trend' })
    await wrapper.vm.deleteSavedChart(9)
    wrapper.vm.exportTableCsv()
    await flushPromises()

    expect(mockProjectsApi.listSavedCharts).toHaveBeenCalledWith('1')
    expect(mockProjectsApi.updateSavedChart).toHaveBeenCalledWith('1', 9, {
      title: 'Revenue Trend',
    })
    expect(confirmSpy).toHaveBeenCalledWith(i18n.global.t('project.page.charts.deleteConfirm'))
    expect(mockProjectsApi.deleteSavedChart).toHaveBeenCalledWith('1', 9)
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(anchor.download).toBe('Analytics-table.csv')
    expect(anchor.click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:table')
    expect(mockNotifications.success).toHaveBeenCalledWith(i18n.global.t('project.page.charts.renamed'))
    expect(mockNotifications.success).toHaveBeenCalledWith(i18n.global.t('project.page.charts.deleted'))

    createElementSpy.mockRestore()
  })

  it('uses read-only demo guards for navigation and mutating actions', async () => {
    mockProjectState.chartDatasets = [{ label: 'Revenue', data: [100] }]

    const wrapper = mountPage({ mode: 'demo' })
    await flushPromises()

    wrapper.vm.handleBack()
    wrapper.vm.openDemoProject()
    await wrapper.vm.loadSavedCharts()
    await wrapper.vm.saveCurrentChart()
    await wrapper.vm.handleCellEdit({ row: { id: 7, col_1: 'Jan', col_2: 100 } })
    await wrapper.vm.handleSemanticTypeChange({
      columnId: 12,
      semanticType: 'metric',
      analyticalRole: 'measure',
      isExcludedFromAnalysis: false,
    })
    await wrapper.vm.handleOrdinalOrderChange({
      columnId: 11,
      ordinalOrder: ['Jan', 'Feb'],
    })
    await wrapper.vm.renameSavedChart({ chartId: 9, title: 'Demo chart' })
    await wrapper.vm.deleteSavedChart(9)

    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'home' })
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'project-demo' })
    expect(mockProjectsApi.listSavedCharts).not.toHaveBeenCalled()
    expect(mockNotifications.info).toHaveBeenCalledWith(i18n.global.t('project.page.readOnly.saveChartsDisabled'))
    expect(mockNotifications.info).toHaveBeenCalledWith(i18n.global.t('project.page.readOnly.tableEditsDisabled'))
    expect(mockNotifications.info).toHaveBeenCalledWith(i18n.global.t('project.page.readOnly.semanticEditsDisabled'))
    expect(mockNotifications.info).toHaveBeenCalledWith(i18n.global.t('project.page.readOnly.ordinalEditsDisabled'))
    expect(mockNotifications.info).toHaveBeenCalledWith(i18n.global.t('project.page.readOnly.renamingDisabled'))
    expect(mockNotifications.info).toHaveBeenCalledWith(i18n.global.t('project.page.readOnly.deletingDisabled'))
  })
})
