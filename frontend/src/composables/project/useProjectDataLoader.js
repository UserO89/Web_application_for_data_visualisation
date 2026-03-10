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

  const fetchProjectRows = async ({ allPages = false, perPage = 500 } = {}) => {
    if (!allPages) {
      const response = await projectsApi.getRows(resolveProjectId(projectId))
      const payload = response.data ?? response
      return unpackRowsPayload(payload).rows
    }

    const collected = []
    let page = 1
    while (true) {
      const response = await projectsApi.getRows(resolveProjectId(projectId), page, perPage)
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
    try {
      await schemaStore.fetchSchema(resolveProjectId(projectId), { rebuild })
    } catch (e) {
      console.error(e)
    }
  }

  const loadStatisticsSummary = async () => {
    statisticsLoading.value = true
    statisticsError.value = ''
    try {
      const response = await projectsApi.getStatisticsSummary(resolveProjectId(projectId))
      statisticsSummary.value = response.statistics || []
    } catch (e) {
      console.error(e)
      statisticsError.value = e?.response?.data?.message || 'Failed to load statistics summary.'
    } finally {
      statisticsLoading.value = false
    }
  }

  const loadSuggestions = async () => {
    try {
      const response = await projectsApi.getChartSuggestions(resolveProjectId(projectId))
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
    loading.value = true
    try {
      const response = await projectsApi.get(resolveProjectId(projectId))
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
