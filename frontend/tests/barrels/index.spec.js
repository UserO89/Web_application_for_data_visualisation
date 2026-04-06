import { vi } from 'vitest'

vi.mock('../../src/composables/project/useManualDatasetBuilder', () => ({
  useManualDatasetBuilder: vi.fn(),
}))
vi.mock('../../src/composables/project/useProjectChartState', () => ({
  useProjectChartState: vi.fn(),
}))
vi.mock('../../src/composables/project/useProjectDataLoader', () => ({
  useProjectDataLoader: vi.fn(),
}))
vi.mock('../../src/composables/project/useProjectWorkspace', () => ({
  useProjectWorkspace: vi.fn(),
}))
vi.mock('../../src/composables/project/useStatisticsWorkspace', () => ({
  useStatisticsWorkspace: vi.fn(),
}))
vi.mock('../../src/composables/project/useValidationReport', () => ({
  useValidationReport: vi.fn(),
}))

import * as projectComponents from '../../src/components/project/index.js'
import * as projectStatisticsComponents from '../../src/components/project/statistics/index.js'
import * as projectComposables from '../../src/composables/project/index.js'
import * as adminUtils from '../../src/utils/admin/index.js'
import * as homeUtils from '../../src/utils/home/index.js'
import * as projectUtils from '../../src/utils/project/index.js'
import * as statisticsUtils from '../../src/utils/statistics/index.js'

describe('module barrels', () => {
  it('re-exports public project, utility, and statistics modules', () => {
    expect(projectComponents.ChartBuilder).toBeDefined()
    expect(projectComponents.ProjectWorkspaceCanvas).toBeDefined()
    expect(projectStatisticsComponents.StatisticsResults).toBeDefined()
    expect(projectStatisticsComponents.StatisticsAdvancedModal).toBeDefined()
    expect(projectComposables.useProjectChartState).toBeDefined()
    expect(projectComposables.useValidationReport).toBeDefined()
    expect(adminUtils.extractAdminApiError).toBeDefined()
    expect(homeUtils.buildHomeDemoChartOption).toBeDefined()
    expect(homeUtils.revealDelayStyle).toBeDefined()
    expect(projectUtils.downloadSavedChartPng).toBeDefined()
    expect(projectUtils.sanitizeLayouts).toBeDefined()
    expect(statisticsUtils.metricLabel).toBeDefined()
    expect(statisticsUtils.buildGroupedSummaryRows).toBeDefined()
  })
})
