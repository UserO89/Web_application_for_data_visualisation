import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import ProjectsPage from '../../src/pages/ProjectsPage.vue'

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}))

const mockProjectsStore = vi.hoisted(() => ({
  projects: [],
  loading: false,
  fetchProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}))

const mockNotifications = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}))

vi.mock('../../src/stores/projects', () => ({
  useProjectsStore: () => mockProjectsStore,
}))

vi.mock('../../src/composables/useNotifications', () => ({
  useNotifications: () => mockNotifications,
}))

const mountPage = () => mount(ProjectsPage)

describe('ProjectsPage', () => {
  beforeEach(() => {
    mockRouter.push.mockReset()

    mockProjectsStore.projects = [
      {
        id: 11,
        title: 'Revenue dashboard',
        description: 'Quarterly performance',
        dataset: { id: 3 },
      },
    ]
    mockProjectsStore.loading = false
    mockProjectsStore.fetchProjects.mockReset()
    mockProjectsStore.fetchProjects.mockResolvedValue(undefined)
    mockProjectsStore.createProject.mockReset()
    mockProjectsStore.createProject.mockResolvedValue({ id: 44 })
    mockProjectsStore.updateProject.mockReset()
    mockProjectsStore.updateProject.mockResolvedValue(undefined)
    mockProjectsStore.deleteProject.mockReset()
    mockProjectsStore.deleteProject.mockResolvedValue(undefined)

    mockNotifications.success.mockReset()
    mockNotifications.error.mockReset()
    mockNotifications.warning.mockReset()
    mockNotifications.info.mockReset()
  })

  it('loads projects on mount and navigates into a project card', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(mockProjectsStore.fetchProjects).toHaveBeenCalledTimes(1)

    await wrapper.get('.project-card').trigger('click')

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'project',
      params: { id: 11 },
    })
  })

  it('creates a project from the modal using trimmed values', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('button.btn.primary').trigger('click')
    await wrapper.get('input[name="title"]').setValue('  Retention Study  ')
    await wrapper.get('textarea[name="description"]').setValue('  Cohort analysis workspace  ')
    await wrapper.get('.modal form').trigger('submit')
    await flushPromises()

    expect(mockProjectsStore.createProject).toHaveBeenCalledWith({
      title: 'Retention Study',
      description: 'Cohort analysis workspace',
    })
    expect(mockNotifications.success).toHaveBeenCalledWith('Project created successfully.')
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'project',
      params: { id: 44 },
    })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('edits an existing project and stays on the projects page', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('.project-actions .btn').trigger('click')
    expect(wrapper.get('input[name="title"]').element.value).toBe('Revenue dashboard')

    await wrapper.get('input[name="title"]').setValue('  Revenue dashboard v2  ')
    await wrapper.get('textarea[name="description"]').setValue('  Updated notes  ')
    await wrapper.get('.modal form').trigger('submit')
    await flushPromises()

    expect(mockProjectsStore.updateProject).toHaveBeenCalledWith(11, {
      title: 'Revenue dashboard v2',
      description: 'Updated notes',
    })
    expect(mockNotifications.success).toHaveBeenCalledWith('Project updated successfully.')
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('confirms deletion and reports API errors when delete fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockProjectsStore.deleteProject.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Delete failed.',
        },
      },
    })

    const wrapper = mountPage()
    await flushPromises()

    const deleteButton = wrapper.findAll('.project-actions .btn')[1]
    await deleteButton.trigger('click')
    await flushPromises()

    expect(mockProjectsStore.deleteProject).toHaveBeenCalledWith(11)
    expect(mockNotifications.error).toHaveBeenCalledWith('Delete failed.')
  })
})
