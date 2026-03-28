import { ref } from 'vue'
import { projectsApi } from '../../api/projects'
import { mapApiRows, resolveProjectId, unpackRowsPayload } from '../../utils/project'

export const useProjectDataLoader = ({
  projectId,
  schemaStore,
} = {}) => {
  const project = ref(null)
  const loading = ref(true)

  const tableRows = ref([])
  const analysisRows = ref([])
  const suggestions = ref([])
  const statisticsSummary = ref([])
  const statisticsLoading = ref(false)
  const statisticsError = ref('')

  const resolvedProjectId = () => resolveProjectId(projectId)

  const fetchProjectRows = async ({ allPages = false, perPage = 500 } = {}) => {
    const id = resolvedProjectId()
    if (!id) return []

    if (!allPages) {
      const response = await projectsApi.getRows(id)
      const payload = response.data ?? response
      return unpackRowsPayload(payload).rows
    }

    const collected = []
    let page = 1
    while (true) {
      const response = await projectsApi.getRows(id, page, perPage)
      const payload = response.data ?? response
      const { rows, lastPage, isPaginated } = unpackRowsPayload(payload)
      collected.push(...rows)
      if (!isPaginated || !lastPage || page >= lastPage) break
      page += 1
    }
    return collected
  }

  const loadRows = async ({ columns = [], onRowsLoaded } = {}) => {
    try {
      const rows = await fetchProjectRows()
      tableRows.value = mapApiRows(rows, columns)
      if (typeof onRowsLoaded === 'function') {
        onRowsLoaded()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadAnalysisRows = async ({ columns = [], perPage = 500 } = {}) => {
    try {
      const rows = await fetchProjectRows({ allPages: true, perPage })
      analysisRows.value = mapApiRows(rows, columns)
    } catch (e) {
      console.error(e)
    }
  }

  const loadSemanticSchema = async (rebuild = false) => {
    const id = resolvedProjectId()
    if (!id) return

    try {
      await schemaStore.fetchSchema(id, { rebuild })
    } catch (e) {
      console.error(e)
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
      const response = await projectsApi.getStatistics(id)
      statisticsSummary.value = response.statistics || []
    } catch (e) {
      console.error(e)
      statisticsError.value = e?.response?.data?.message || 'Failed to load statistics summary.'
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

    try {
      const response = await projectsApi.getChartSuggestions(id)
      suggestions.value = response.suggestions || []
    } catch (e) {
      console.error(e)
      suggestions.value = []
    }
  }

  const reloadProjectData = async ({ rebuildSchema = true, columns = [], onRowsLoaded } = {}) => {
    await Promise.all([
      loadRows({ columns, onRowsLoaded }),
      loadAnalysisRows({ columns }),
      loadSemanticSchema(rebuildSchema),
      loadSuggestions(),
      loadStatisticsSummary(),
    ])
  }

  const refreshData = async ({ columns = [], onRowsLoaded, onAfterRefresh } = {}) => {
    await reloadProjectData({ rebuildSchema: true, columns, onRowsLoaded })
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

    try {
      const response = await projectsApi.get(id)
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
      console.error(e)
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
    suggestions.value = []
    statisticsSummary.value = []
    statisticsError.value = ''
  }

  return {
    project,
    loading,
    tableRows,
    analysisRows,
    suggestions,
    statisticsSummary,
    statisticsLoading,
    statisticsError,
    loadProject,
    loadRows,
    loadAnalysisRows,
    loadSemanticSchema,
    loadStatisticsSummary,
    loadSuggestions,
    reloadProjectData,
    refreshData,
    resetProjectDataState,
  }
}
