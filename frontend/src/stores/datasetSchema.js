import { defineStore } from 'pinia'
import { projectsApi } from '../api/projects'
import { translate } from '../i18n'
import { extractApiErrorMessage } from '../utils/api/errors'

const indexColumns = (columns) => {
  const byId = {}
  const byName = {}
  const byPosition = {}
  ;(columns || []).forEach((column) => {
    byId[column.id] = column
    byName[column.name] = column
    byPosition[column.position] = column
  })
  return { byId, byName, byPosition }
}

export const useDatasetSchemaStore = defineStore('datasetSchema', {
  state: () => ({
    schema: null,
    loading: false,
    updatingColumnId: null,
    error: '',
    indexed: { byId: {}, byName: {}, byPosition: {} },
  }),

  getters: {
    columns: (state) => state.schema?.columns || [],
  },

  actions: {
    applySchema(schema) {
      this.schema = schema || null
      this.indexed = indexColumns(this.schema?.columns || [])
    },

    mergeColumn(updatedColumn) {
      if (!this.schema || !updatedColumn) return
      const nextColumns = (this.schema.columns || []).map((column) =>
        column.id === updatedColumn.id ? updatedColumn : column
      )
      this.applySchema({ ...this.schema, columns: nextColumns })
    },

    async fetchSchema(projectId, options = {}) {
      this.loading = true
      this.error = ''
      try {
        const response = await projectsApi.getSchema(projectId, options)
        this.applySchema(response.schema || null)
        return this.schema
      } catch (error) {
        this.error = extractApiErrorMessage(error, translate('project.page.schema.loadFailed'))
        throw error
      } finally {
        this.loading = false
      }
    },

    async setSemanticType(projectId, columnId, payload) {
      this.updatingColumnId = columnId
      this.error = ''
      try {
        const response = await projectsApi.updateColumnSemanticType(projectId, columnId, payload)
        this.mergeColumn(response.column)
        return response.column
      } catch (error) {
        this.error = extractApiErrorMessage(error, translate('project.page.schema.semanticUpdateFailed'))
        throw error
      } finally {
        this.updatingColumnId = null
      }
    },

    async setOrdinalOrder(projectId, columnId, ordinalOrder) {
      this.updatingColumnId = columnId
      this.error = ''
      try {
        const response = await projectsApi.updateColumnOrdinalOrder(projectId, columnId, ordinalOrder)
        this.mergeColumn(response.column)
        return response.column
      } catch (error) {
        this.error = extractApiErrorMessage(error, translate('project.page.schema.ordinalUpdateFailed'))
        throw error
      } finally {
        this.updatingColumnId = null
      }
    },
  },
})
