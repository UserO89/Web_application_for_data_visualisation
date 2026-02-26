<template>
  <div class="profile-page app-content">
    <div class="profile-grid">
      <div class="panel">
        <div class="panel-head">
          <div style="font-weight: 700; font-size: 18px;">Profile</div>
          <div style="color: var(--muted); font-size: 13px;">Account settings</div>
        </div>

        <div v-if="authStore.loading && !authStore.user" class="loading">Loading...</div>
        <div v-else-if="authStore.user" class="profile-info">
          <div class="avatar-row">
            <img
              v-if="authStore.user.avatar_url"
              :src="authStore.user.avatar_url"
              class="profile-avatar"
              alt="profile avatar"
            />
            <div v-else class="profile-avatar profile-avatar-fallback">
              {{ initials }}
            </div>
            <div class="avatar-actions">
              <input
                ref="avatarInput"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden-input"
                @change="handleAvatarChange"
              />
              <button class="btn" @click="pickAvatar" :disabled="avatarUploading">
                {{ avatarUploading ? 'Uploading...' : 'Upload Photo' }}
              </button>
              <div class="avatar-hint">PNG/JPG/WEBP up to 5MB</div>
              <div v-if="avatarError" class="avatar-error">{{ avatarError }}</div>
            </div>
          </div>

          <div class="stat-card" style="margin-bottom: 12px;">
            <div class="stat-title">Name</div>
            <div class="stat-value profile-value">{{ authStore.user.name || '-' }}</div>
          </div>
          <div class="stat-card" style="margin-bottom: 12px;">
            <div class="stat-title">Email</div>
            <div class="stat-value profile-value">{{ authStore.user.email }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Registered</div>
            <div class="stat-value profile-value-small">
              {{ authStore.user.created_at ? formatDate(authStore.user.created_at) : '-' }}
            </div>
          </div>

          <form class="settings-form" @submit.prevent="handleProfileUpdate">
            <div style="font-weight: 700; margin-bottom: 10px;">Public profile</div>
            <div class="form-group">
              <label>Nickname</label>
              <input v-model="profileForm.name" type="text" maxlength="120" required />
            </div>
            <div v-if="profileError" class="form-error">{{ profileError }}</div>
            <div v-if="profileSuccess" class="form-success">{{ profileSuccess }}</div>
            <div class="settings-actions">
              <button class="btn primary" type="submit" :disabled="profileUpdating">
                {{ profileUpdating ? 'Saving...' : 'Save nickname' }}
              </button>
            </div>
          </form>

          <form class="settings-form" @submit.prevent="handlePasswordUpdate">
            <div style="font-weight: 700; margin-bottom: 10px;">Change password</div>
            <div class="form-group">
              <label>Current password</label>
              <input v-model="passwordForm.current_password" type="password" required />
            </div>
            <div class="form-group">
              <label>New password</label>
              <input v-model="passwordForm.password" type="password" minlength="8" required />
            </div>
            <div class="form-group">
              <label>Confirm new password</label>
              <input v-model="passwordForm.password_confirmation" type="password" minlength="8" required />
            </div>
            <div v-if="passwordError" class="form-error">{{ passwordError }}</div>
            <div v-if="passwordSuccess" class="form-success">{{ passwordSuccess }}</div>
            <div class="settings-actions">
              <button class="btn primary" type="submit" :disabled="passwordUpdating">
                {{ passwordUpdating ? 'Updating...' : 'Update password' }}
              </button>
            </div>
          </form>

          <div class="danger-zone">
            <div class="danger-title">Danger zone</div>
            <div class="danger-text">
              Deleting your account permanently removes your profile and all projects.
            </div>
            <form @submit.prevent="handleDeleteAccount">
              <div class="form-group">
                <label>Current password</label>
                <input v-model="deleteForm.current_password" type="password" required />
              </div>
              <div v-if="deleteError" class="form-error">{{ deleteError }}</div>
              <div class="settings-actions">
                <button class="btn danger-btn" type="submit" :disabled="deletingAccount">
                  {{ deletingAccount ? 'Deleting...' : 'Delete account' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="panel">
        <div style="font-weight: 700; margin-bottom: 12px;">My Projects</div>
        <div v-if="projectsStore.loading" class="loading">Loading...</div>
        <div v-else-if="projectsStore.projects.length === 0" class="empty-state">
          No projects yet.
          <router-link :to="{ name: 'projects' }" style="color: var(--accent);">Create your first</router-link>.
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
              {{ p.dataset ? 'With data' : 'No data' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProjectsStore } from '../stores/projects'

export default {
  name: 'ProfilePage',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const projectsStore = useProjectsStore()
    const avatarInput = ref(null)
    const avatarUploading = ref(false)
    const avatarError = ref('')
    const profileUpdating = ref(false)
    const profileError = ref('')
    const profileSuccess = ref('')
    const passwordUpdating = ref(false)
    const passwordError = ref('')
    const passwordSuccess = ref('')
    const deletingAccount = ref(false)
    const deleteError = ref('')
    const profileForm = ref({
      name: '',
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
      }
    })

    watch(
      () => authStore.user?.name,
      (name) => {
        profileForm.value.name = name || ''
      }
    )

    const initials = computed(() => {
      const value = (authStore.user?.name || 'User').trim()
      if (!value) return 'U'

      const parts = value.split(/\s+/).filter(Boolean)
      const first = parts[0]?.[0] || ''
      const second = parts[1]?.[0] || ''
      return (first + second).toUpperCase()
    })

    const pickAvatar = () => {
      avatarInput.value?.click()
    }

    const handleAvatarChange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      avatarError.value = ''
      avatarUploading.value = true

      try {
        await authStore.uploadAvatar(file)
      } catch (error) {
        avatarError.value = error?.response?.data?.message || 'Failed to upload image'
      } finally {
        avatarUploading.value = false
        event.target.value = ''
      }
    }

    const formatApiError = (error, fallback) => {
      const apiData = error?.response?.data
      if (apiData?.message) return apiData.message
      if (apiData?.errors) return Object.values(apiData.errors).flat().join(' ')
      return fallback
    }

    const handleProfileUpdate = async () => {
      const name = (profileForm.value.name || '').trim()
      if (!name) {
        profileError.value = 'Nickname is required.'
        profileSuccess.value = ''
        return
      }

      profileUpdating.value = true
      profileError.value = ''
      profileSuccess.value = ''

      try {
        await authStore.updateProfile({ name })
        profileSuccess.value = 'Nickname updated successfully.'
      } catch (error) {
        profileError.value = formatApiError(error, 'Failed to update nickname.')
      } finally {
        profileUpdating.value = false
      }
    }

    const handlePasswordUpdate = async () => {
      if (passwordForm.value.password !== passwordForm.value.password_confirmation) {
        passwordError.value = 'Password confirmation does not match.'
        passwordSuccess.value = ''
        return
      }

      passwordUpdating.value = true
      passwordError.value = ''
      passwordSuccess.value = ''

      try {
        await authStore.changePassword(passwordForm.value)
        passwordForm.value = {
          current_password: '',
          password: '',
          password_confirmation: '',
        }
        passwordSuccess.value = 'Password updated successfully.'
      } catch (error) {
        passwordError.value = formatApiError(error, 'Failed to update password.')
      } finally {
        passwordUpdating.value = false
      }
    }

    const handleDeleteAccount = async () => {
      const currentPassword = deleteForm.value.current_password
      if (!currentPassword) {
        deleteError.value = 'Current password is required.'
        return
      }

      const confirmed = window.confirm('Delete your account permanently? This action cannot be undone.')
      if (!confirmed) return

      deletingAccount.value = true
      deleteError.value = ''

      try {
        await authStore.deleteAccount({ current_password: currentPassword })
        await router.push({ name: 'home' })
      } catch (error) {
        deleteError.value = formatApiError(error, 'Failed to delete account.')
      } finally {
        deletingAccount.value = false
      }
    }

    const formatDate = (str) => {
      if (!str) return '-'
      const d = new Date(str)
      return d.toLocaleDateString('en-US', {
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
      profileSuccess,
      passwordUpdating,
      passwordError,
      passwordSuccess,
      deletingAccount,
      deleteError,
      profileForm,
      passwordForm,
      deleteForm,
      initials,
      pickAvatar,
      handleAvatarChange,
      handleProfileUpdate,
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

.form-error {
  color: #ff9b9b;
  font-size: 13px;
  margin-bottom: 8px;
}

.form-success {
  color: #99d89f;
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
