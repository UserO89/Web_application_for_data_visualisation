import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '../../../src/i18n'

vi.mock('../../../src/api/projects', () => ({
  projectsApi: {},
}))

import { useProjectDataLoader } from '../../../src/composables/project/useProjectDataLoader'

const buildApiClient = (overrides = {}) => ({
  getRows: vi.fn(),
  getChartSuggestions: vi.fn().mockResolvedValue({ suggestions: [] }),
  getStatistics: vi.fn().mockResolvedValue({ statistics: [] }),
  get: vi.fn(),
  getSchema: vi.fn(),
  ...overrides,
})

const columns = [
  { id: 1, name: 'Value', position: 0 },
]

describe('useProjectDataLoader', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('does not preload analysis rows during standard reload', async () => {
    const apiClient = buildApiClient({
      getRows: vi.fn().mockResolvedValue({
        data: [
          { id: 1, values: [10] },
          { id: 2, values: [20] },
        ],
        last_page: 3,
      }),
    })

    const state = useProjectDataLoader({
      projectId: ref('project-1'),
      apiClient,
    })

    await state.reloadProjectData({ columns })

    expect(apiClient.getRows).toHaveBeenCalledTimes(1)
    expect(apiClient.getRows).toHaveBeenCalledWith('project-1')
    expect(state.tableRows.value).toHaveLength(2)
    expect(state.analysisRows.value).toEqual([])
    expect(state.analysisRowsReady.value).toBe(false)
  })

  it('loads and caches analysis rows only when explicitly requested', async () => {
    const apiClient = buildApiClient({
      getRows: vi.fn((projectId, page = 1) => {
        if (page === 1) {
          return Promise.resolve({
            data: [
              { id: 1, values: [10] },
              { id: 2, values: [20] },
            ],
            last_page: 2,
          })
        }

        return Promise.resolve({
          data: [
            { id: 3, values: [30] },
          ],
          last_page: 2,
        })
      }),
    })

    const state = useProjectDataLoader({
      projectId: ref('project-2'),
      apiClient,
    })

    await state.ensureAnalysisRowsLoaded({ columns, perPage: 2 })
    await state.ensureAnalysisRowsLoaded({ columns, perPage: 2 })

    expect(apiClient.getRows).toHaveBeenCalledTimes(2)
    expect(apiClient.getRows).toHaveBeenNthCalledWith(1, 'project-2', 1, 2)
    expect(apiClient.getRows).toHaveBeenNthCalledWith(2, 'project-2', 2, 2)
    expect(state.analysisRowsReady.value).toBe(true)
    expect(state.analysisRows.value).toHaveLength(3)
    expect(state.analysisRows.value[2]).toMatchObject({
      id: 3,
      col_0: 30,
    })
  })

  it('uses translated fallback messages when data loading fails', async () => {
    setLocale('sk')

    const apiClient = buildApiClient({
      getRows: vi.fn().mockRejectedValue(new Error('boom')),
      get: vi.fn().mockRejectedValue(new Error('boom')),
    })

    const state = useProjectDataLoader({
      projectId: ref('project-3'),
      apiClient,
    })

    await state.loadRows({ columns })
    await state.loadProject()

    expect(state.tableRowsError.value).toBe('Riadky tabulky sa nepodarilo nacitat.')
    expect(state.projectError.value).toBe('Projekt sa nepodarilo nacitat.')
  })
})
