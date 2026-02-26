<template>
  <div class="projects-page app-content">
    <div class="panel" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <div style="font-weight: 700; font-size: 18px;">My Projects</div>
      <button @click="openCreateModal" class="btn primary">+ New Project</button>
    </div>

    <div v-if="projectsStore.loading" class="loading">Loading...</div>
    <div v-else-if="projectsStore.projects.length === 0" class="empty-state panel">
      <p>No projects yet. Create your first one!</p>
    </div>
    <div v-else class="projects-grid">
      <div
        v-for="project in projectsStore.projects"
        :key="project.id"
        class="project-card panel"
      >
        <div class="project-main" @click="goToProject(project.id)">
          <div style="font-weight: 700; margin-bottom: 8px;">{{ project.title }}</div>
          <p v-if="project.description" style="color: var(--muted); font-size: 14px; margin-bottom: 12px;">{{ project.description }}</p>
          <div style="font-size: 12px; color: var(--muted);">
            {{ project.dataset ? 'With data' : 'No data' }}
          </div>
        </div>
        <div class="project-actions">
          <button class="btn" type="button" @click.stop="openEditModal(project)">Edit</button>
          <button
            class="btn danger"
            type="button"
            @click.stop="handleDelete(project)"
            :disabled="deleteBusyId === project.id"
          >
            {{ deleteBusyId === project.id ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showProjectModal" class="modal-overlay" @click="closeProjectModal">
      <div class="modal panel" @click.stop>
        <h2 style="margin-bottom: 16px; font-size: 18px;">{{ isEditing ? 'Edit Project' : 'Create Project' }}</h2>
        <form @submit.prevent="handleSave">
          <div class="form-group">
            <label>Title</label>
            <input v-model="projectForm.title" type="text" required />
          </div>
          <div class="form-group">
            <label>Description (optional)</label>
            <textarea v-model="projectForm.description" rows="3"></textarea>
          </div>
          <div v-if="formError" class="form-error">
            {{ formError }}
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px;">
            <button type="button" @click="closeProjectModal" class="btn">Cancel</button>
            <button type="submit" class="btn primary">
              {{ isEditing ? 'Save changes' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'

export default {
  name: 'ProjectsPage',
  setup() {
    const router = useRouter()
    const projectsStore = useProjectsStore()
    const showProjectModal = ref(false)
    const editingProjectId = ref(null)
    const deleteBusyId = ref(null)
    const formError = ref('')
    const projectForm = ref({
      title: '',
      description: '',
    })

    onMounted(async () => {
      await projectsStore.fetchProjects()
    })

    const isEditing = computed(() => editingProjectId.value !== null)

    const goToProject = (id) => {
      router.push({ name: 'project', params: { id } })
    }

    const openCreateModal = () => {
      editingProjectId.value = null
      projectForm.value = { title: '', description: '' }
      formError.value = ''
      showProjectModal.value = true
    }

    const openEditModal = (project) => {
      editingProjectId.value = project.id
      projectForm.value = {
        title: project.title || '',
        description: project.description || '',
      }
      formError.value = ''
      showProjectModal.value = true
    }

    const closeProjectModal = () => {
      showProjectModal.value = false
      editingProjectId.value = null
      formError.value = ''
    }

    const handleSave = async () => {
      const payload = {
        title: (projectForm.value.title || '').trim(),
        description: (projectForm.value.description || '').trim(),
      }

      if (!payload.title) {
        formError.value = 'Project title is required.'
        return
      }

      formError.value = ''

      try {
        if (isEditing.value) {
          await projectsStore.updateProject(editingProjectId.value, payload)
          closeProjectModal()
          return
        }

        const project = await projectsStore.createProject(payload)
        closeProjectModal()
        goToProject(project.id)
      } catch (error) {
        const apiData = error?.response?.data
        if (apiData?.message) {
          formError.value = apiData.message
        } else if (apiData?.errors) {
          formError.value = Object.values(apiData.errors).flat().join(' ')
        } else {
          formError.value = 'Failed to save project.'
        }
      }
    }

    const handleDelete = async (project) => {
      const confirmed = window.confirm(`Delete project "${project.title}"?`)
      if (!confirmed) return

      deleteBusyId.value = project.id

      try {
        await projectsStore.deleteProject(project.id)
      } catch (error) {
        const message = error?.response?.data?.message || 'Failed to delete project.'
        window.alert(message)
      } finally {
        deleteBusyId.value = null
      }
    }

    return {
      projectsStore,
      showProjectModal,
      projectForm,
      isEditing,
      formError,
      deleteBusyId,
      goToProject,
      openCreateModal,
      openEditModal,
      closeProjectModal,
      handleSave,
      handleDelete,
    }
  },
}
</script>

<style scoped>
.projects-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.app-content {
  flex: 1;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.project-card {
  cursor: default;
  padding: 0;
  overflow: hidden;
  transition: all 0.28s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(2, 6, 23, 0.65);
}

.project-main {
  padding: 16px;
  cursor: pointer;
}

.project-main:hover {
  background: rgba(255, 255, 255, 0.02);
}

.project-actions {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn.danger {
  color: #ff9b9b;
}

.btn.danger:hover {
  background: #382121;
  color: #ffc0c0;
}

.form-error {
  margin-top: 4px;
  color: #ff9b9b;
  font-size: 13px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}
</style>
