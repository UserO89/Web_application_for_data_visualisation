import { defineStore } from 'pinia'
import { projectsApi } from '../api/projects'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [],
    currentProject: null,
    loading: false,
  }),

  actions: {
    async fetchProjects() {
      this.loading = true
      try {
        const response = await projectsApi.list()
        this.projects = response.projects
      } finally {
        this.loading = false
      }
    },

    async createProject(data) {
      this.loading = true
      try {
        const response = await projectsApi.create(data)
        this.projects.push(response.project)
        return response.project
      } finally {
        this.loading = false
      }
    },

    async fetchProject(id) {
      this.loading = true
      try {
        const response = await projectsApi.get(id)
        this.currentProject = response.project
        return response.project
      } finally {
        this.loading = false
      }
    },

    async updateProject(id, data) {
      this.loading = true
      try {
        const response = await projectsApi.update(id, data)
        const updated = response.project

        this.projects = this.projects.map((project) =>
          project.id === id ? updated : project
        )

        if (this.currentProject?.id === id) {
          this.currentProject = updated
        }

        return updated
      } finally {
        this.loading = false
      }
    },

    async deleteProject(id) {
      this.loading = true
      try {
        await projectsApi.delete(id)
        this.projects = this.projects.filter(p => p.id !== id)
        if (this.currentProject?.id === id) {
          this.currentProject = null
        }
      } finally {
        this.loading = false
      }
    },
  },
})
