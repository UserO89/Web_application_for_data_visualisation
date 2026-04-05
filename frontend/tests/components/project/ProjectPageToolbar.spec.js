import { mount } from '@vue/test-utils'
import ProjectPageToolbar from '../../../src/components/project/ProjectPageToolbar.vue'

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
      props: buildProps({
        backLabel: '<- Return',
      }),
    })

    const backButton = wrapper.findAll('button').find((button) => button.text() === '<- Return')
    expect(backButton).toBeDefined()

    await backButton.trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('emits change-view-mode for all available view buttons and marks the active view', async () => {
    const wrapper = mount(ProjectPageToolbar, {
      props: buildProps({
        viewMode: 'statistics',
      }),
    })

    const buttons = wrapper.findAll('button')
    const tableButton = buttons.find((button) => button.text().includes('Table'))
    const visualizationButton = buttons.find((button) => button.text().includes('Visualization'))
    const statisticsButton = buttons.find((button) => button.text().includes('Statistics'))
    const workspaceButton = buttons.find((button) => button.text().includes('Workspace'))
    const libraryButton = buttons.find((button) => button.text().includes('Saved Charts'))

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
      props: buildProps(),
    })
    expect(hiddenWrapper.text()).not.toContain('Import Review')

    const visibleWrapper = mount(ProjectPageToolbar, {
      props: buildProps({
        importValidation: { summary: {} },
        validationProblemColumnCount: 3,
      }),
    })

    expect(visibleWrapper.text()).toContain('Import Review')
    expect(visibleWrapper.text()).toContain('3')

    const reviewButton = visibleWrapper.findAll('button').find((button) => button.text().includes('Import Review'))
    await reviewButton.trigger('click')
    expect(visibleWrapper.emitted('open-validation')).toHaveLength(1)
  })

  it('hides the saved charts button in read-only mode', () => {
    const wrapper = mount(ProjectPageToolbar, {
      props: buildProps({
        readOnly: true,
      }),
    })

    expect(wrapper.text()).not.toContain('Saved Charts')
  })
})
