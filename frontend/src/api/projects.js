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
    if (options.has_header !== undefined) {
      formData.append('has_header', options.has_header ? '1' : '0')
    }

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

  async getChartSuggestions(projectId) {
    const response = await http.get(`/projects/${projectId}/chart-suggestions`)
    return response.data
  },

  async listSavedCharts(projectId) {
    const response = await http.get(`/projects/${projectId}/charts`)
    return response.data
  },

  async saveChart(projectId, payload) {
    const response = await http.post(`/projects/${projectId}/charts`, payload)
    return response.data
  },

  async updateSavedChart(projectId, chartId, payload) {
    const response = await http.patch(`/projects/${projectId}/charts/${chartId}`, payload)
    return response.data
  },

  async deleteSavedChart(projectId, chartId) {
    const response = await http.delete(`/projects/${projectId}/charts/${chartId}`)
    return response.data
  },

  async getSchema(projectId, options = {}) {
    const response = await http.get(`/projects/${projectId}/schema`, {
      params: {
        rebuild: options.rebuild ? 1 : 0,
      },
    })
    return response.data
  },

  async updateColumnSemanticType(projectId, columnId, payload) {
    const response = await http.patch(`/projects/${projectId}/columns/${columnId}/semantic-type`, payload)
    return response.data
  },

  async updateColumnOrdinalOrder(projectId, columnId, ordinalOrder) {
    const response = await http.patch(`/projects/${projectId}/columns/${columnId}/ordinal-order`, {
      ordinal_order: ordinalOrder,
    })
    return response.data
  },
}
