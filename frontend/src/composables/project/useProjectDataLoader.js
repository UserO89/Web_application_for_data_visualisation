import { ref } from 'vue'
import { projectsApi } from '../../api/projects'
import { translate } from '../../i18n'
import { mapApiRows, resolveProjectId, resolveRefValue, unpackRowsPayload } from '../../utils/project'
import { extractApiErrorMessage } from '../../utils/api/errors'

export const useProjectDataLoader = ({
  projectId,
  schemaStore,
  apiClient = projectsApi,
} = {}) => {
  const project = ref(null)
  const loading = ref(true)
  const projectError = ref('')

  const tableRows = ref([])
  const tableRowsError = ref('')
  const analysisRows = ref([])
  const analysisRowsReady = ref(false)
  const analysisRowsLoading = ref(false)
  const analysisRowsError = ref('')
  const suggestions = ref([])
  const suggestionsError = ref('')
  const schemaError = ref('')
  const statisticsSummary = ref([])
  const statisticsLoading = ref(false)
  const statisticsError = ref('')

  const resolvedProjectId = () => resolveProjectId(projectId)
  const resolvedApiClient = () => resolveRefValue(apiClient) || projectsApi
  let analysisRowsPromise = null
  const unwrapRowsResponsePayload = (response) => {
    if (Array.isArray(response)) return response

    if (response && typeof response === 'object') {
      if ('last_page' in response || 'current_page' in response) {
        return response
      }

      if ('data' in response) {
        return response.data
      }
    }

    return response
  }
  const yieldToMainThread = () =>
    new Promise((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve())
        return
      }
      setTimeout(resolve, 0)
    })

  const mapRowsInBatches = async (rows, columns, batchSize = 400) => {
    if (!Array.isArray(rows) || rows.length <= batchSize) {
      return mapApiRows(Array.isArray(rows) ? rows : [], columns)
    }

    const mappedRows = []
    for (let index = 0; index < rows.length; index += batchSize) {
      const chunk = rows.slice(index, index + batchSize)
      mappedRows.push(...mapApiRows(chunk, columns))
      await yieldToMainThread()
    }
    return mappedRows
  }

  const fetchProjectRows = async ({ allPages = false, perPage = 500 } = {}) => {
    const id = resolvedProjectId()
    if (!id) return []
    const api = resolvedApiClient()

    if (!allPages) {
      const response = await api.getRows(id)
      const payload = unwrapRowsResponsePayload(response)
      return unpackRowsPayload(payload).rows
    }

    const collected = []
    let page = 1
    while (true) {
      const response = await api.getRows(id, page, perPage)
      const payload = unwrapRowsResponsePayload(response)
      const { rows, lastPage, isPaginated } = unpackRowsPayload(payload)
      collected.push(...rows)
      if (!isPaginated || !lastPage || page >= lastPage) break
      page += 1
    }
    return collected
  }

  const loadRows = async ({ columns = [], onRowsLoaded } = {}) => {
    tableRowsError.value = ''
    try {
      const rows = await fetchProjectRows()
      tableRows.value = mapApiRows(rows, columns)
      if (typeof onRowsLoaded === 'function') {
        onRowsLoaded()
      }
    } catch (e) {
      tableRows.value = []
      tableRowsError.value = extractApiErrorMessage(e, translate('project.page.loaders.tableRowsFailed'))
    }
  }

  const loadAnalysisRows = async ({ columns = [], perPage = 500, force = false } = {}) => {
    if (!force && analysisRowsReady.value) {
      return analysisRows.value
    }

    if (!force && analysisRowsPromise) {
      return analysisRowsPromise
    }

    const requestPromise = (async () => {
      analysisRowsLoading.value = true
      analysisRowsError.value = ''

      try {
        const rows = await fetchProjectRows({ allPages: true, perPage })
        analysisRows.value = await mapRowsInBatches(rows, columns)
        analysisRowsReady.value = true
        return analysisRows.value
      } catch (e) {
        analysisRows.value = []
        analysisRowsReady.value = false
        analysisRowsError.value = extractApiErrorMessage(e, translate('project.page.loaders.analysisRowsFailed'))
        return null
      } finally {
        analysisRowsLoading.value = false
        if (analysisRowsPromise === requestPromise) {
          analysisRowsPromise = null
        }
      }
    })()

    analysisRowsPromise = requestPromise
    return requestPromise
  }

  const ensureAnalysisRowsLoaded = async ({ columns = [], perPage = 500 } = {}) => {
    if (analysisRowsReady.value) {
      return analysisRows.value
    }

    return loadAnalysisRows({ columns, perPage })
  }

  const loadSemanticSchema = async (rebuild = false) => {
    const id = resolvedProjectId()
    if (!id || !schemaStore) return

    schemaError.value = ''
    try {
      const api = resolvedApiClient()
      if (api === projectsApi && typeof schemaStore.fetchSchema === 'function') {
        await schemaStore.fetchSchema(id, { rebuild })
        return
      }

      const response = await api.getSchema(id, { rebuild })
      schemaStore.applySchema(response?.schema || null)
    } catch (e) {
      schemaError.value = extractApiErrorMessage(e, translate('project.page.schema.loadFailed'))
    }
  }

  const loadStatisticsSummary = async () => {
    const id = resolvedProjectId()
    if (!id) {
      statisticsSummary.value = []
      statisticsError.value = ''
      return
    }

    statisticsLoading.value = true
    statisticsError.value = ''
    try {
      const response = await resolvedApiClient().getStatistics(id)
      statisticsSummary.value = response.statistics || []
    } catch (e) {
      statisticsError.value = extractApiErrorMessage(e, translate('project.page.loaders.statisticsFailed'))
    } finally {
      statisticsLoading.value = false
    }
  }

  const loadSuggestions = async () => {
    const id = resolvedProjectId()
    if (!id) {
      suggestions.value = []
      return
    }

    suggestionsError.value = ''
    try {
      const response = await resolvedApiClient().getChartSuggestions(id)
      suggestions.value = response.suggestions || []
    } catch (e) {
      suggestions.value = []
      suggestionsError.value = extractApiErrorMessage(e, translate('project.page.loaders.suggestionsFailed'))
    }
  }

  const reloadProjectData = async ({
    rebuildSchema = true,
    columns = [],
    onRowsLoaded,
    includeAnalysisRows = false,
  } = {}) => {
    const tasks = [
      loadRows({ columns, onRowsLoaded }),
      loadSemanticSchema(rebuildSchema),
      loadSuggestions(),
      loadStatisticsSummary(),
    ]

    if (includeAnalysisRows) {
      tasks.push(loadAnalysisRows({ columns, force: true }))
    }

    await Promise.all(tasks)
  }

  const refreshData = async ({
    columns = [],
    onRowsLoaded,
    onAfterRefresh,
    includeAnalysisRows = false,
  } = {}) => {
    await reloadProjectData({
      rebuildSchema: true,
      columns,
      onRowsLoaded,
      includeAnalysisRows,
    })
    if (typeof onAfterRefresh === 'function') {
      onAfterRefresh()
    }
  }

  const loadProject = async ({ onDatasetMissing, onDatasetLoaded } = {}) => {
    const id = resolvedProjectId()
    loading.value = true
    if (!id) {
      project.value = null
      loading.value = false
      return
    }

    projectError.value = ''
    try {
      const response = await resolvedApiClient().get(id)
      project.value = response.project

      if (!project.value?.dataset) {
        if (typeof onDatasetMissing === 'function') {
          await onDatasetMissing()
        }
        return
      }

      if (typeof onDatasetLoaded === 'function') {
        await onDatasetLoaded(project.value)
      }
    } catch (e) {
      project.value = null
      projectError.value = extractApiErrorMessage(e, translate('project.page.loaders.projectFailed'))
    } finally {
      loading.value = false
    }
  }

  const resetProjectDataState = ({ clearProject = false } = {}) => {
    if (clearProject) {
      project.value = null
    }
    tableRows.value = []
    analysisRows.value = []
    analysisRowsReady.value = false
    analysisRowsLoading.value = false
    analysisRowsPromise = null
    suggestions.value = []
    statisticsSummary.value = []
    projectError.value = ''
    tableRowsError.value = ''
    analysisRowsError.value = ''
    suggestionsError.value = ''
    schemaError.value = ''
    statisticsError.value = ''
  }

  return {
    project,
    loading,
    projectError,
    tableRows,
    tableRowsError,
    analysisRows,
    analysisRowsReady,
    analysisRowsLoading,
    analysisRowsError,
    suggestions,
    suggestionsError,
    schemaError,
    statisticsSummary,
    statisticsLoading,
    statisticsError,
    loadProject,
    loadRows,
    loadAnalysisRows,
    ensureAnalysisRowsLoaded,
    loadSemanticSchema,
    loadStatisticsSummary,
    loadSuggestions,
    reloadProjectData,
    refreshData,
    resetProjectDataState,
  }
}
