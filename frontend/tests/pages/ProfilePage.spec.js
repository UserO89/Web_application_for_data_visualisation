import { RouterLinkStub, flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import ProfilePage from '../../src/pages/ProfilePage.vue'
import { withI18n } from '../support/i18n'

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}))

const mockAuthStore = vi.hoisted(() => ({
  user: null,
  loading: false,
  fetchUser: vi.fn(),
  updateProfile: vi.fn(),
  updatePreferredLocale: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
  uploadAvatar: vi.fn(),
}))

const mockProjectsStore = vi.hoisted(() => ({
  projects: [],
  loading: false,
  fetchProjects: vi.fn(),
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

vi.mock('../../src/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('../../src/stores/projects', () => ({
  useProjectsStore: () => mockProjectsStore,
}))

vi.mock('../../src/composables/useNotifications', () => ({
  useNotifications: () => mockNotifications,
}))

const mountPage = () =>
  mount(ProfilePage, withI18n({
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
      mocks: {
        $router: mockRouter,
      },
    },
  }))

describe('ProfilePage', () => {
  beforeEach(() => {
    mockRouter.push.mockReset()

    mockAuthStore.user = {
      id: 3,
      name: 'Jane Doe',
      email: 'jane@example.com',
      locale: 'en',
      avatar_url: null,
      created_at: '2026-01-15T10:20:30Z',
    }
    mockAuthStore.loading = false
    mockAuthStore.fetchUser.mockReset()
    mockAuthStore.fetchUser.mockResolvedValue(undefined)
    mockAuthStore.updateProfile.mockReset()
    mockAuthStore.updateProfile.mockResolvedValue(undefined)
    mockAuthStore.updatePreferredLocale.mockReset()
    mockAuthStore.updatePreferredLocale.mockResolvedValue(undefined)
    mockAuthStore.changePassword.mockReset()
    mockAuthStore.changePassword.mockResolvedValue(undefined)
    mockAuthStore.deleteAccount.mockReset()
    mockAuthStore.deleteAccount.mockResolvedValue(undefined)
    mockAuthStore.uploadAvatar.mockReset()
    mockAuthStore.uploadAvatar.mockResolvedValue(undefined)

    mockProjectsStore.projects = [
      { id: 11, title: 'Revenue dashboard', dataset: { id: 4 } },
    ]
    mockProjectsStore.loading = false
    mockProjectsStore.fetchProjects.mockReset()
    mockProjectsStore.fetchProjects.mockResolvedValue(undefined)

    mockNotifications.success.mockReset()
    mockNotifications.error.mockReset()
    mockNotifications.warning.mockReset()
    mockNotifications.info.mockReset()
  })

  it('loads account data on mount and hydrates the profile form', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(mockAuthStore.fetchUser).toHaveBeenCalledTimes(1)
    expect(mockProjectsStore.fetchProjects).toHaveBeenCalledTimes(1)
    expect(wrapper.get('input[name="nickname"]').element.value).toBe('Jane Doe')
    expect(wrapper.text()).toContain('JD')
    expect(wrapper.text()).toContain('jane@example.com')
  })

  it('updates the nickname using the trimmed form value', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('input[name="nickname"]').setValue('  Jane Analytics  ')
    await wrapper.get('form[data-form="profile"]').trigger('submit')
    await flushPromises()

    expect(mockAuthStore.updateProfile).toHaveBeenCalledWith({ name: 'Jane Analytics' })
    expect(mockNotifications.success).toHaveBeenCalledWith('Nickname updated successfully.')
  })

  it('updates the persisted locale preference from the profile page', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('select[name="locale"]').setValue('uk')
    await wrapper.get('form[data-form="language"]').trigger('submit')
    await flushPromises()

    expect(mockAuthStore.updatePreferredLocale).toHaveBeenCalledWith('uk')
    expect(mockNotifications.success).toHaveBeenCalledWith('Language preference updated successfully.')
  })

  it('rejects oversized avatar uploads before calling the API', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', {
      configurable: true,
      value: 6 * 1024 * 1024,
    })

    const input = wrapper.get('#profile-avatar-input')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await input.trigger('change')
    await flushPromises()

    expect(mockAuthStore.uploadAvatar).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Image is too large. Maximum size is 5MB.')
    expect(mockNotifications.warning).toHaveBeenCalledWith('Image is too large. Maximum size is 5MB.')
  })

  it('blocks password update when confirmation does not match', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('input[name="current_password"]').setValue('oldpass123')
    await wrapper.get('input[name="new_password"]').setValue('newpass123')
    await wrapper.get('input[name="new_password_confirmation"]').setValue('different123')
    await wrapper.get('form[data-form="password"]').trigger('submit')
    await flushPromises()

    expect(mockAuthStore.changePassword).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Password confirmation does not match.')
  })

  it('deletes the account after confirmation and redirects home', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('input[name="delete_current_password"]').setValue('secret123')
    await wrapper.find('.danger-zone form').trigger('submit')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalledWith('Delete your account permanently? This action cannot be undone.')
    expect(mockAuthStore.deleteAccount).toHaveBeenCalledWith({ current_password: 'secret123' })
    expect(mockNotifications.success).toHaveBeenCalledWith('Account deleted successfully.')
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'home' })
  })
})
