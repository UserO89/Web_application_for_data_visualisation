import { http } from './http'

export const projectsApi = {
  async list() {
    const response = await http.get('/projects')
    return response.data
  },

  async create(data) {
    const response = await http.post('/projects', data)
    return response.data
  },

  async get(id) {
    const response = await http.get(`/projects/${id}`)
    return response.data
  },

  async update(id, data) {
    const response = await http.patch(`/projects/${id}`, data)
    return response.data
  },

  async delete(id) {
    const response = await http.delete(`/projects/${id}`)
    return response.data
  },

  async importDataset(projectId, file, options = {}) {
    const formData = new FormData()
    formData.append('file', file)
    if (options.delimiter) formData.append('delimiter', options.delimiter)
    if (options.has_header !== undefined) formData.append('has_header', options.has_header)

    const response = await http.post(`/projects/${projectId}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async getRows(projectId, page = 1, perPage = 100) {
    const response = await http.get(`/projects/${projectId}/rows`, {
      params: { page, per_page: perPage },
    })
    return response.data
  },

  async updateRow(projectId, rowId, values) {
    const response = await http.patch(`/projects/${projectId}/rows/${rowId}`, { values })
    return response.data
  },

  async getStatistics(projectId) {
    const response = await http.get(`/projects/${projectId}/statistics`)
    return response.data
  },

  async getSuggestions(projectId) {
    const response = await http.get(`/projects/${projectId}/suggest-visualizations`)
    return response.data
  },
}
