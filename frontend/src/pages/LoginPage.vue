<template>
  <div class="login-page">
    <div class="login-container panel">
      <div class="brand" style="margin-bottom: 24px;">
        <div class="logo">DV</div>
        <div>
          <div class="title">DataVis Studio</div>
          <div class="subtitle">Log in or register</div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div v-if="isRegister" class="form-group">
          <label>Name</label>
          <input v-model="form.name" type="text" placeholder="Your name" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="your@email.com"
            required
          />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="Password"
            required
            minlength="8"
          />
        </div>
        <button type="submit" :disabled="authStore.loading" class="btn primary" style="width: 100%; padding: 12px;">
          {{ isRegister ? 'Register' : 'Log in' }}
        </button>
        <button
          type="button"
          @click="isRegister = !isRegister"
          class="btn"
          style="width: 100%; margin-top: 8px;"
        >
          {{ isRegister ? 'Already have an account? Log in' : "Don't have an account? Register" }}
        </button>
      </form>

      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'LoginPage',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
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
        } else {
          await authStore.login({
            email: form.value.email,
            password: form.value.password,
          })
        }
        router.push({ name: 'projects' })
      } catch (err) {
        const apiData = err?.response?.data

        if (apiData?.message) {
          error.value = apiData.message
        } else if (apiData?.errors) {
          error.value = Object.values(apiData.errors).flat().join(' ')
        } else if (err?.code === 'ERR_NETWORK') {
          error.value = 'Cannot connect to API. Start backend with `php artisan serve`.'
        } else {
          error.value = 'Request failed. Check backend logs and browser Network tab.'
        }
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
