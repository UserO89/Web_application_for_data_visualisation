import { http, csrf } from './http'

export const authApi = {
  async register(data) {
    await csrf()
    const response = await http.post('/auth/register', data)
    return response.data
  },

  async login(data) {
    await csrf()
    const response = await http.post('/auth/login', data)
    return response.data
  },

  async logout() {
    const response = await http.post('/auth/logout')
    return response.data
  },

  async me() {
    const response = await http.get('/auth/me')
    return response.data
  },

  async updateProfile(data) {
    const response = await http.patch('/auth/profile', data)
    return response.data
  },

  async updatePassword(data) {
    const response = await http.patch('/auth/password', data)
    return response.data
  },

  async deleteAccount(data) {
    const response = await http.delete('/auth/account', { data })
    return response.data
  },

  async uploadAvatar(file) {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await http.post('/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },
}
