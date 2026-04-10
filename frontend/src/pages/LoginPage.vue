<template>
  <div class="login-page">
    <div class="login-container panel">
      <div class="login-topbar">
        <LanguageSwitcher :show-label="false" compact />
      </div>

      <div class="brand" style="margin-bottom: 24px;">
        <div class="logo">DV</div>
        <div>
          <div class="title">{{ $t('common.studioName') }}</div>
          <div class="subtitle">{{ $t('auth.subtitle') }}</div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div v-if="isRegister" class="form-group">
          <label for="auth-name">{{ $t('auth.name') }}</label>
          <input
            id="auth-name"
            v-model="form.name"
            name="name"
            type="text"
            :placeholder="$t('auth.namePlaceholder')"
            required
          />
        </div>
        <div class="form-group">
          <label for="auth-email">{{ $t('auth.email') }}</label>
          <input
            id="auth-email"
            v-model="form.email"
            name="email"
            type="email"
            :placeholder="$t('auth.emailPlaceholder')"
            required
          />
        </div>
        <div class="form-group">
          <label for="auth-password">{{ $t('auth.password') }}</label>
          <input
            id="auth-password"
            v-model="form.password"
            name="password"
            type="password"
            :placeholder="$t('auth.passwordPlaceholder')"
            required
            minlength="8"
          />
        </div>
        <button type="submit" :disabled="authStore.loading" class="btn primary" style="width: 100%; padding: 12px;">
          {{ isRegister ? $t('auth.register') : $t('auth.login') }}
        </button>
        <button
          type="button"
          @click="isRegister = !isRegister"
          class="btn"
          style="width: 100%; margin-top: 8px;"
        >
          {{ isRegister ? $t('auth.switchToLogin') : $t('auth.switchToRegister') }}
        </button>
      </form>

      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotifications } from '../composables/useNotifications'
import { extractApiErrorMessage } from '../utils/api/errors'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'

export default {
  name: 'LoginPage',
  components: { LanguageSwitcher },
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const router = useRouter()
    const authStore = useAuthStore()
    const notify = useNotifications()
    const isRegister = ref(false)
    const error = ref(null)

    const form = ref({
      name: '',
      email: '',
      password: '',
    })

    const handleSubmit = async () => {
      error.value = null
      try {
        if (isRegister.value) {
          await authStore.register(form.value)
          notify.success(t('auth.registerSuccess'))
        } else {
          await authStore.login({
            email: form.value.email,
            password: form.value.password,
          })
          notify.success(t('auth.loginSuccess'))
        }
        router.push({ name: 'projects' })
      } catch (err) {
        error.value = extractApiErrorMessage(err, t('auth.failure'))
        notify.error(error.value)
      }
    }

    return {
      isRegister,
      form,
      error,
      authStore,
      handleSubmit,
    }
  },
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.login-container {
  width: 100%;
  max-width: 420px;
}

.login-topbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border-radius: 10px;
  text-align: center;
  font-size: 14px;
}
</style>
