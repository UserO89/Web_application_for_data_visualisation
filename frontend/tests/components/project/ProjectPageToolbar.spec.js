import { mount } from '@vue/test-utils'
import ProjectPageToolbar from '../../../src/components/project/ProjectPageToolbar.vue'
import i18n from '../../../src/i18n'
import { withI18n } from '../../support/i18n'

const buildProps = (overrides = {}) => ({
  viewMode: 'workspace',
  importValidation: null,
  validationProblemColumnCount: 0,
  readOnly: false,
  backLabel: '<- Back to Projects',
  ...overrides,
})

describe('ProjectPageToolbar', () => {
  it('renders the back label and emits back when the back button is clicked', async () => {
    const wrapper = mount(ProjectPageToolbar, {
      ...withI18n({
        props: buildProps({
          backLabel: '<- Return',
        }),
      }),
    })

    const backButton = wrapper.findAll('button').find((button) => button.text() === '<- Return')
    expect(backButton).toBeDefined()

    await backButton.trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('emits change-view-mode for all available view buttons and marks the active view', async () => {
    const wrapper = mount(ProjectPageToolbar, {
      ...withI18n({
        props: buildProps({
          viewMode: 'statistics',
        }),
      }),
    })

    const buttons = wrapper.findAll('button')
    const tableButton = buttons.find((button) => button.text().includes(i18n.global.t('project.toolbar.table')))
    const visualizationButton = buttons.find((button) => button.text().includes(i18n.global.t('project.toolbar.visualization')))
    const statisticsButton = buttons.find((button) => button.text().includes(i18n.global.t('project.toolbar.statistics')))
    const workspaceButton = buttons.find((button) => button.text().includes(i18n.global.t('project.toolbar.workspace')))
    const libraryButton = buttons.find((button) => button.text().includes(i18n.global.t('project.toolbar.savedCharts')))

    expect(statisticsButton.classes()).toContain('primary')
    expect(tableButton.classes()).not.toContain('primary')

    await tableButton.trigger('click')
    await visualizationButton.trigger('click')
    await statisticsButton.trigger('click')
    await workspaceButton.trigger('click')
    await libraryButton.trigger('click')

    expect(wrapper.emitted('change-view-mode')).toEqual([
      ['table'],
      ['visualization'],
      ['statistics'],
      ['workspace'],
      ['library'],
    ])
  })

  it('shows import review only when validation data exists and emits open-validation', async () => {
    const hiddenWrapper = mount(ProjectPageToolbar, {
      ...withI18n({
        props: buildProps(),
      }),
    })
    expect(hiddenWrapper.text()).not.toContain(i18n.global.t('project.toolbar.importReview'))

    const visibleWrapper = mount(ProjectPageToolbar, {
      ...withI18n({
        props: buildProps({
          importValidation: { summary: {} },
          validationProblemColumnCount: 3,
        }),
      }),
    })

    expect(visibleWrapper.text()).toContain(i18n.global.t('project.toolbar.importReview'))
    expect(visibleWrapper.text()).toContain('3')

    const reviewButton = visibleWrapper.findAll('button').find((button) => button.text().includes(i18n.global.t('project.toolbar.importReview')))
    await reviewButton.trigger('click')
    expect(visibleWrapper.emitted('open-validation')).toHaveLength(1)
  })

  it('hides the saved charts button in read-only mode', () => {
    const wrapper = mount(ProjectPageToolbar, {
      ...withI18n({
        props: buildProps({
          readOnly: true,
        }),
      }),
    })

    expect(wrapper.text()).not.toContain(i18n.global.t('project.toolbar.savedCharts'))
  })
})
