<template>
  <div
    :class="[
      'table-panel',
      {
        'table-panel-compact': isCompactWorkspace,
        'table-panel-natural': isStandaloneTableView,
      },
    ]"
  >
    <template v-if="requiresLandscapeForTable">
      <div class="rotate-device-lock">
        <div class="rotate-device-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M9 4h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.8"/>
            <path d="M4 18a8 8 0 0 0 13 2M20 6a8 8 0 0 0-13-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="rotate-device-title">{{ t('project.workspace.table.rotateTitle') }}</div>
        <div class="rotate-device-text">
          {{ t('project.workspace.table.rotateText') }}
        </div>
        <button class="btn rotate-device-continue" type="button" @click="allowPortraitTable">
          {{ t('project.workspace.table.rotateContinue') }}
        </button>
      </div>
    </template>
    <template v-else>
      <div class="table-wrap table-fill">
        <DataTable
          :key="`table-${tableHeightMode}`"
          :columns="tableColumns"
          :rows="tableRows"
          :active="tableVisible"
          :editable="tableEditable"
          :fill-height="!isStandaloneTableView"
          @cell-edited="$emit('cell-edit', $event)"
          @cell-editing-state="$emit('table-editing-state', $event)"
        />
      </div>
      <div class="table-bottom-actions">
        <button class="btn" type="button" @click="$emit('export-csv')">{{ t('project.workspace.table.exportCsv') }}</button>
        <button
          class="btn primary"
          type="button"
          :disabled="readOnly || tableSaving || (!tableHasUnsavedChanges && !tableEditing)"
          @click="handleSaveTableClick"
        >
          {{ tableSaving ? t('project.workspace.table.saving') : t('project.workspace.table.save') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from './DataTable.vue'

export default {
  name: 'ProjectWorkspaceTablePanel',
  components: {
    DataTable,
  },
  props: {
    viewMode: { type: String, default: 'workspace' },
    isCompactWorkspace: { type: Boolean, default: false },
    tableColumns: { type: Array, default: () => [] },
    tableRows: { type: Array, default: () => [] },
    tableVisible: { type: Boolean, default: false },
    tableEditable: { type: Boolean, default: true },
    readOnly: { type: Boolean, default: false },
    tableSaving: { type: Boolean, default: false },
    tableHasUnsavedChanges: { type: Boolean, default: false },
    tableEditing: { type: Boolean, default: false },
  },
  emits: ['cell-edit', 'table-editing-state', 'export-csv', 'save-table'],
  setup(props, { emit }) {
    const { t } = useI18n({ useScope: 'global' })
    const isStandaloneTableView = computed(() => props.viewMode === 'table')
    const tableHeightMode = computed(() => (isStandaloneTableView.value ? 'natural' : 'fill'))
    const requiresLandscapeForTable = ref(false)
    const portraitTableBypass = ref(false)

    const detectLandscapeRequirement = () => {
      if (typeof window === 'undefined') {
        requiresLandscapeForTable.value = false
        return
      }

      const width = window.innerWidth || 0
      const height = window.innerHeight || 0
      const isPortrait = height > width
      const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches
      const likelyPhone = width <= 820

      requiresLandscapeForTable.value = Boolean(
        hasCoarsePointer &&
        likelyPhone &&
        isPortrait &&
        !portraitTableBypass.value &&
        (props.viewMode === 'table' || props.viewMode === 'workspace')
      )
    }

    const allowPortraitTable = () => {
      portraitTableBypass.value = true
      requiresLandscapeForTable.value = false
    }

    const handleSaveTableClick = async () => {
      const activeElement = typeof document !== 'undefined' ? document.activeElement : null
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur()
      }
      await nextTick()
      emit('save-table')
    }

    onMounted(() => {
      detectLandscapeRequirement()
      window.addEventListener('resize', detectLandscapeRequirement)
      window.addEventListener('orientationchange', detectLandscapeRequirement)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', detectLandscapeRequirement)
      window.removeEventListener('orientationchange', detectLandscapeRequirement)
    })

    watch(
      () => props.viewMode,
      () => detectLandscapeRequirement()
    )

    return {
      t,
      isStandaloneTableView,
      tableHeightMode,
      requiresLandscapeForTable,
      allowPortraitTable,
      handleSaveTableClick,
    }
  },
}
</script>

<style scoped>
.table-panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.table-fill { min-height: 240px; max-height: calc(100% - 42px); }
.table-bottom-actions { margin-top: 8px; display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.table-panel-compact .table-fill {
  height: min(62vh, 460px);
  max-height: none;
  min-height: 260px;
}
.table-panel-natural .table-fill {
  height: auto !important;
  max-height: none;
  min-height: 260px;
}
.rotate-device-lock {
  min-height: 260px;
  height: 100%;
  border: 1px dashed var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  background: #151515;
  color: var(--muted);
  padding: 18px;
}
.rotate-device-icon {
  width: 34px;
  height: 34px;
  color: #93f6b3;
}
.rotate-device-icon svg {
  width: 34px;
  height: 34px;
  display: block;
}
.rotate-device-title {
  color: var(--text);
  font-weight: 700;
  font-size: 14px;
}
.rotate-device-text {
  font-size: 13px;
  line-height: 1.35;
  max-width: 240px;
}
.rotate-device-continue {
  margin-top: 4px;
}

@media (max-width: 760px) {
  .table-bottom-actions .btn {
    width: 100%;
  }
}
</style>
