<template>
  <div class="projects-page app-content">
    <div class="panel" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <div style="font-weight: 700; font-size: 18px;">{{ $t('projects.title') }}</div>
      <button @click="openCreateModal" class="btn primary">{{ $t('projects.newProject') }}</button>
    </div>

    <div v-if="projectsStore.loading" class="loading">{{ $t('common.loading') }}</div>
    <div v-else-if="projectsStore.projects.length === 0" class="empty-state panel">
      <p>{{ $t('projects.empty') }}</p>
    </div>
    <div v-else class="projects-grid">
      <div
        v-for="project in projectsStore.projects"
        :key="project.id"
        class="project-card panel"
        @click="goToProject(project.id)"
        tabindex="0"
        role="button"
        @keyup.enter="goToProject(project.id)"
      >
        <div class="project-main">
          <div style="font-weight: 700; margin-bottom: 8px;">{{ project.title }}</div>
          <p v-if="project.description" style="color: var(--muted); font-size: 14px; margin-bottom: 12px;">{{ project.description }}</p>
          <div style="font-size: 12px; color: var(--muted);">
            {{ project.dataset ? $t('projects.withData') : $t('projects.withoutData') }}
          </div>
        </div>
        <div class="project-actions">
          <button class="btn" type="button" @click.stop="openEditModal(project)">{{ $t('common.edit') }}</button>
          <button
            class="btn danger"
            type="button"
            @click.stop="handleDelete(project)"
            :disabled="deleteBusyId === project.id"
          >
            {{ deleteBusyId === project.id ? $t('projects.deleting') : $t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showProjectModal" class="modal-overlay" @click="closeProjectModal">
      <div class="modal panel" @click.stop>
        <h2 style="margin-bottom: 16px; font-size: 18px;">
          {{ isEditing ? $t('projects.editProject') : $t('projects.createProject') }}
        </h2>
        <form @submit.prevent="handleSave">
          <div class="form-group">
            <label for="project-form-title">{{ $t('projects.projectTitle') }}</label>
            <input id="project-form-title" v-model="projectForm.title" name="title" type="text" required />
          </div>
          <div class="form-group">
            <label for="project-form-description">{{ $t('projects.projectDescription') }}</label>
            <textarea id="project-form-description" v-model="projectForm.description" name="description" rows="3"></textarea>
          </div>
          <div v-if="formError" class="form-error">
            {{ formError }}
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px;">
            <button type="button" @click="closeProjectModal" class="btn">{{ $t('common.cancel') }}</button>
            <button type="submit" class="btn primary">
              {{ isEditing ? $t('common.saveChanges') : $t('common.create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'
import { useNotifications } from '../composables/useNotifications'
import { extractApiErrorMessage } from '../utils/api/errors'

export default {
  name: 'ProjectsPage',
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const router = useRouter()
    const projectsStore = useProjectsStore()
    const notify = useNotifications()
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
        formError.value = t('projects.titleRequired')
        return
      }

      formError.value = ''

      try {
        if (isEditing.value) {
          await projectsStore.updateProject(editingProjectId.value, payload)
          closeProjectModal()
          notify.success(t('projects.updated'))
          return
        }

        const project = await projectsStore.createProject(payload)
        closeProjectModal()
        notify.success(t('projects.created'))
        goToProject(project.id)
      } catch (error) {
        formError.value = extractApiErrorMessage(error, t('projects.saveFailed'))
      }
    }

    const handleDelete = async (project) => {
      const confirmed = window.confirm(t('projects.deleteConfirm', { title: project.title }))
      if (!confirmed) return

      deleteBusyId.value = project.id

      try {
        await projectsStore.deleteProject(project.id)
        notify.success(t('projects.deleted'))
      } catch (error) {
        notify.error(extractApiErrorMessage(error, t('projects.deleteFailed')))
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
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  border: 1px solid transparent;
  transition: all 0.28s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(2, 6, 23, 0.65);
}

.project-card:focus-visible {
  outline: none;
  border-color: rgba(29, 185, 84, 0.45);
}

.project-main {
  padding: 16px;
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
