<template>
  <div class="profile-page app-content">
    <div class="profile-grid">
      <div class="panel">
        <div class="panel-head">
          <div style="font-weight: 700; font-size: 18px;">{{ $t('profile.title') }}</div>
          <div style="color: var(--muted); font-size: 13px;">{{ $t('profile.subtitle') }}</div>
        </div>

        <div v-if="authStore.loading && !authStore.user" class="loading">{{ $t('common.loading') }}</div>
        <div v-else-if="authStore.user" class="profile-info">
          <div class="avatar-row">
            <img
              v-if="authStore.user.avatar_url"
              :src="authStore.user.avatar_url"
              class="profile-avatar"
              :alt="$t('profile.avatar.alt')"
            />
            <div v-else class="profile-avatar profile-avatar-fallback">
              {{ initials }}
            </div>
            <div class="avatar-actions">
              <input
                id="profile-avatar-input"
                ref="avatarInput"
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden-input"
                :aria-label="$t('profile.avatar.uploadAriaLabel')"
                @change="handleAvatarChange"
              />
              <button class="btn" @click="pickAvatar" :disabled="avatarUploading">
                {{ avatarUploading ? $t('profile.avatar.uploading') : $t('profile.avatar.upload') }}
              </button>
              <div class="avatar-hint">{{ $t('profile.avatar.hint') }}</div>
              <div v-if="avatarError" class="avatar-error">{{ avatarError }}</div>
            </div>
          </div>

          <div class="stat-card" style="margin-bottom: 12px;">
            <div class="stat-title">{{ $t('profile.details.name') }}</div>
            <div class="stat-value profile-value">{{ authStore.user.name || '-' }}</div>
          </div>
          <div class="stat-card" style="margin-bottom: 12px;">
            <div class="stat-title">{{ $t('profile.details.email') }}</div>
            <div class="stat-value profile-value">{{ authStore.user.email }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">{{ $t('profile.details.registered') }}</div>
            <div class="stat-value profile-value-small">
              {{ authStore.user.created_at ? formatDate(authStore.user.created_at) : '-' }}
            </div>
          </div>

          <form class="settings-form" data-form="profile" @submit.prevent="handleProfileUpdate">
            <div style="font-weight: 700; margin-bottom: 10px;">{{ $t('profile.publicProfile.title') }}</div>
            <div class="form-group">
              <label for="profile-nickname">{{ $t('profile.publicProfile.nickname') }}</label>
              <input id="profile-nickname" v-model="profileForm.name" name="nickname" type="text" maxlength="120" required />
            </div>
            <div v-if="profileError" class="form-error">{{ profileError }}</div>
            <div class="settings-actions">
              <button class="btn primary" type="submit" :disabled="profileUpdating">
                {{ profileUpdating ? $t('profile.publicProfile.saving') : $t('profile.publicProfile.save') }}
              </button>
            </div>
          </form>

          <form class="settings-form" data-form="language" @submit.prevent="handleLocaleUpdate">
            <div style="font-weight: 700; margin-bottom: 10px;">{{ $t('profile.language.title') }}</div>
            <div class="form-hint">{{ $t('profile.language.description') }}</div>
            <div class="form-group">
              <label for="profile-locale">{{ $t('common.language') }}</label>
              <select id="profile-locale" v-model="localeForm.locale" name="locale">
                <option
                  v-for="localeOption in supportedLocales"
                  :key="localeOption.code"
                  :value="localeOption.code"
                >
                  {{ localeOption.nativeLabel }}
                </option>
              </select>
            </div>
            <div v-if="localeError" class="form-error">{{ localeError }}</div>
            <div class="settings-actions">
              <button class="btn primary" type="submit" :disabled="localeUpdating">
                {{ localeUpdating ? $t('profile.language.saving') : $t('profile.language.save') }}
              </button>
            </div>
          </form>

          <form class="settings-form" data-form="password" @submit.prevent="handlePasswordUpdate">
            <div style="font-weight: 700; margin-bottom: 10px;">{{ $t('profile.password.title') }}</div>
            <div class="form-group">
              <label for="profile-current-password">{{ $t('profile.password.currentPassword') }}</label>
              <input id="profile-current-password" v-model="passwordForm.current_password" name="current_password" type="password" required />
            </div>
            <div class="form-group">
              <label for="profile-new-password">{{ $t('profile.password.newPassword') }}</label>
              <input id="profile-new-password" v-model="passwordForm.password" name="new_password" type="password" minlength="8" required />
            </div>
            <div class="form-group">
              <label for="profile-confirm-password">{{ $t('profile.password.confirmPassword') }}</label>
              <input id="profile-confirm-password" v-model="passwordForm.password_confirmation" name="new_password_confirmation" type="password" minlength="8" required />
            </div>
            <div v-if="passwordError" class="form-error">{{ passwordError }}</div>
            <div class="settings-actions">
              <button class="btn primary" type="submit" :disabled="passwordUpdating">
                {{ passwordUpdating ? $t('profile.password.updating') : $t('profile.password.update') }}
              </button>
            </div>
          </form>

          <div class="danger-zone">
            <div class="danger-title">{{ $t('profile.danger.title') }}</div>
            <div class="danger-text">
              {{ $t('profile.danger.description') }}
            </div>
            <form @submit.prevent="handleDeleteAccount">
              <div class="form-group">
                <label for="profile-delete-current-password">{{ $t('profile.danger.currentPassword') }}</label>
                <input id="profile-delete-current-password" v-model="deleteForm.current_password" name="delete_current_password" type="password" required />
              </div>
              <div v-if="deleteError" class="form-error">{{ deleteError }}</div>
              <div class="settings-actions">
                <button class="btn danger-btn" type="submit" :disabled="deletingAccount">
                  {{ deletingAccount ? $t('profile.danger.deleting') : $t('profile.danger.delete') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="panel">
        <div style="font-weight: 700; margin-bottom: 12px;">{{ $t('profile.projects.title') }}</div>
        <div v-if="projectsStore.loading" class="loading">{{ $t('common.loading') }}</div>
        <div v-else-if="projectsStore.projects.length === 0" class="empty-state">
          {{ $t('profile.projects.emptyPrefix') }}
          <router-link :to="{ name: 'projects' }" style="color: var(--accent);">{{ $t('profile.projects.emptyAction') }}</router-link>.
        </div>
        <div v-else class="projects-preview">
          <div
            v-for="p in projectsStore.projects.slice(0, 5)"
            :key="p.id"
            class="project-preview-card"
            @click="$router.push({ name: 'project', params: { id: p.id } })"
          >
            <div style="font-weight: 600;">{{ p.title }}</div>
            <div style="font-size: 12px; color: var(--muted);">
              {{ p.dataset ? $t('projects.withData') : $t('projects.withoutData') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProjectsStore } from '../stores/projects'
import { useNotifications } from '../composables/useNotifications'
import { SUPPORTED_LOCALES } from '../i18n'
import { extractApiErrorMessage } from '../utils/api/errors'
import { getInitials } from '../utils/display'

export default {
  name: 'ProfilePage',
  setup() {
    const { locale, t } = useI18n({ useScope: 'global' })
    const router = useRouter()
    const authStore = useAuthStore()
    const projectsStore = useProjectsStore()
    const notify = useNotifications()
    const avatarInput = ref(null)
    const avatarUploading = ref(false)
    const avatarError = ref('')
    const profileUpdating = ref(false)
    const profileError = ref('')
    const localeUpdating = ref(false)
    const localeError = ref('')
    const passwordUpdating = ref(false)
    const passwordError = ref('')
    const deletingAccount = ref(false)
    const deleteError = ref('')
    const profileForm = ref({
      name: '',
    })
    const localeForm = ref({
      locale: locale.value,
    })
    const passwordForm = ref({
      current_password: '',
      password: '',
      password_confirmation: '',
    })
    const deleteForm = ref({
      current_password: '',
    })

    onMounted(async () => {
      await authStore.fetchUser()
      await projectsStore.fetchProjects()

      if (authStore.user) {
        profileForm.value.name = authStore.user.name || ''
        localeForm.value.locale = authStore.user.locale || locale.value
      }
    })

    watch(
      () => authStore.user?.name,
      (name) => {
        profileForm.value.name = name || ''
      }
    )

    watch(
      () => authStore.user?.locale,
      (nextLocale) => {
        localeForm.value.locale = nextLocale || locale.value
      }
    )

    const initials = computed(() => {
      return getInitials(authStore.user?.name || t('common.user'), t('common.user'))
    })

    const pickAvatar = () => {
      avatarInput.value?.click()
    }

    const handleAvatarChange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        avatarError.value = t('profile.avatar.tooLarge')
        notify.warning(avatarError.value)
        event.target.value = ''
        return
      }

      avatarError.value = ''
      avatarUploading.value = true

      try {
        await authStore.uploadAvatar(file)
        notify.success(t('profile.avatar.updated'))
      } catch (error) {
        avatarError.value = extractApiErrorMessage(error, t('profile.avatar.uploadFailed'))
        notify.error(avatarError.value)
      } finally {
        avatarUploading.value = false
        event.target.value = ''
      }
    }

    const handleProfileUpdate = async () => {
      const name = (profileForm.value.name || '').trim()
      if (!name) {
        profileError.value = t('profile.publicProfile.required')
        return
      }

      profileUpdating.value = true
      profileError.value = ''

      try {
        await authStore.updateProfile({ name })
        notify.success(t('profile.publicProfile.updated'))
      } catch (error) {
        notify.error(extractApiErrorMessage(error, t('profile.publicProfile.updateFailed')))
      } finally {
        profileUpdating.value = false
      }
    }

    const handlePasswordUpdate = async () => {
      if (passwordForm.value.password !== passwordForm.value.password_confirmation) {
        passwordError.value = t('profile.password.mismatch')
        return
      }

      passwordUpdating.value = true
      passwordError.value = ''

      try {
        await authStore.changePassword(passwordForm.value)
        passwordForm.value = {
          current_password: '',
          password: '',
          password_confirmation: '',
        }
        notify.success(t('profile.password.updated'))
      } catch (error) {
        notify.error(extractApiErrorMessage(error, t('profile.password.updateFailed')))
      } finally {
        passwordUpdating.value = false
      }
    }

    const handleLocaleUpdate = async () => {
      const nextLocale = localeForm.value.locale
      if (!nextLocale) {
        localeError.value = t('profile.language.required')
        return
      }

      localeUpdating.value = true
      localeError.value = ''

      try {
        await authStore.updatePreferredLocale(nextLocale)
        notify.success(t('profile.language.updated'))
      } catch (error) {
        localeError.value = extractApiErrorMessage(error, t('profile.language.updateFailed'))
        notify.error(localeError.value)
      } finally {
        localeUpdating.value = false
      }
    }

    const handleDeleteAccount = async () => {
      const currentPassword = deleteForm.value.current_password
      if (!currentPassword) {
        deleteError.value = t('profile.danger.required')
        return
      }

      const confirmed = window.confirm(t('profile.danger.confirm'))
      if (!confirmed) return

      deletingAccount.value = true
      deleteError.value = ''

      try {
        await authStore.deleteAccount({ current_password: currentPassword })
        notify.success(t('profile.danger.deleted'))
        await router.push({ name: 'home' })
      } catch (error) {
        notify.error(extractApiErrorMessage(error, t('profile.danger.deleteFailed')))
      } finally {
        deletingAccount.value = false
      }
    }

    const formatDate = (str) => {
      if (!str) return '-'
      const d = new Date(str)
      return d.toLocaleDateString(locale.value, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    return {
      authStore,
      projectsStore,
      avatarInput,
      avatarUploading,
      avatarError,
      profileUpdating,
      profileError,
      localeUpdating,
      localeError,
      passwordUpdating,
      passwordError,
      deletingAccount,
      deleteError,
      profileForm,
      localeForm,
      passwordForm,
      deleteForm,
      supportedLocales: SUPPORTED_LOCALES,
      initials,
      pickAvatar,
      handleAvatarChange,
      handleProfileUpdate,
      handleLocaleUpdate,
      handlePasswordUpdate,
      handleDeleteAccount,
      formatDate,
    }
  },
}
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.profile-info {
  display: flex;
  flex-direction: column;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.profile-avatar {
  width: 76px;
  height: 76px;
  border-radius: 999px;
  object-fit: cover;
  border: 1px solid var(--border);
  background: #202020;
}

.profile-avatar-fallback {
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--text);
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hidden-input {
  display: none;
}

.avatar-hint {
  color: var(--muted);
  font-size: 12px;
}

.avatar-error {
  color: #ff8f8f;
  font-size: 12px;
}

.profile-value {
  font-size: 16px;
}

.profile-value-small {
  font-size: 14px;
}

.settings-form {
  margin-top: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #1a1a1a;
  padding: 12px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
}

.form-hint {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 10px;
  line-height: 1.5;
}

.form-error {
  color: #ff9b9b;
  font-size: 13px;
  margin-bottom: 8px;
}

.danger-zone {
  margin-top: 14px;
  border: 1px solid #4a2323;
  border-radius: 10px;
  background: #231818;
  padding: 12px;
}

.danger-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffc2c2;
}

.danger-text {
  margin-top: 6px;
  color: #d9b7b7;
  font-size: 13px;
  line-height: 1.55;
  margin-bottom: 10px;
}

.danger-btn {
  border-color: #6d2a2a;
  background: #5a2222;
  color: #ffd9d9;
}

.danger-btn:hover {
  background: #743131;
}

.projects-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-preview-card {
  padding: 12px;
  background: var(--glass);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border);
}

.project-preview-card:hover {
  background: #2a2a2a;
  color: var(--accent);
}

.loading,
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--muted);
}

@media (max-width: 640px) {
  .avatar-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
