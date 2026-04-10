import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import LoginPage from '../../src/pages/LoginPage.vue'
import i18n from '../../src/i18n'
import { withI18n } from '../support/i18n'

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}))

const mockAuthStore = vi.hoisted(() => ({
  loading: false,
  register: vi.fn(),
  login: vi.fn(),
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

vi.mock('../../src/composables/useNotifications', () => ({
  useNotifications: () => mockNotifications,
}))

const mountPage = () => mount(LoginPage, withI18n())

describe('LoginPage', () => {
  beforeEach(() => {
    mockRouter.push.mockReset()
    mockAuthStore.loading = false
    mockAuthStore.register.mockReset()
    mockAuthStore.register.mockResolvedValue(undefined)
    mockAuthStore.login.mockReset()
    mockAuthStore.login.mockResolvedValue(undefined)
    mockNotifications.success.mockReset()
    mockNotifications.error.mockReset()
    mockNotifications.warning.mockReset()
    mockNotifications.info.mockReset()
  })

  it('submits login credentials and redirects to projects on success', async () => {
    const wrapper = mountPage()

    await wrapper.get('input[name="email"]').setValue('jane@example.com')
    await wrapper.get('input[name="password"]').setValue('secret123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockAuthStore.login).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'secret123',
    })
    expect(mockNotifications.success).toHaveBeenCalledWith(i18n.global.t('auth.loginSuccess'))
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'projects' })
  })

  it('switches to register mode and submits the full registration form', async () => {
    const wrapper = mountPage()

    await wrapper.get('button[type="button"]').trigger('click')
    await wrapper.get('input[name="name"]').setValue('Jane Doe')
    await wrapper.get('input[name="email"]').setValue('jane@example.com')
    await wrapper.get('input[name="password"]').setValue('secret123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockAuthStore.register).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'secret123',
    })
    expect(mockNotifications.success).toHaveBeenCalledWith(i18n.global.t('auth.registerSuccess'))
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'projects' })
  })

  it('renders API auth errors and notifies the user', async () => {
    mockAuthStore.login.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid credentials.',
        },
      },
    })

    const wrapper = mountPage()

    await wrapper.get('input[name="email"]').setValue('jane@example.com')
    await wrapper.get('input[name="password"]').setValue('wrongpass')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid credentials.')
    expect(mockNotifications.error).toHaveBeenCalledWith('Invalid credentials.')
    expect(mockRouter.push).not.toHaveBeenCalled()
  })
})
