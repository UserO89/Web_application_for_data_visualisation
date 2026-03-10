<template>
  <div class="top-row top-row-actions">
    <div class="top-row-left">
      <button class="btn" @click="$emit('back')"><- Back to Projects</button>
      <div class="view-mode-switch">
        <button type="button" :class="['btn', { primary: viewMode === 'table' }]" @click="$emit('change-view-mode', 'table')">
          Table
        </button>
        <button type="button" :class="['btn', { primary: viewMode === 'visualization' }]" @click="$emit('change-view-mode', 'visualization')">
          Visualization
        </button>
        <button type="button" :class="['btn', { primary: viewMode === 'statistics' }]" @click="$emit('change-view-mode', 'statistics')">
          Statistics
        </button>
        <button type="button" :class="['btn', { primary: viewMode === 'workspace' }]" @click="$emit('change-view-mode', 'workspace')">
          Workspace
        </button>
      </div>
    </div>
    <div class="top-row-right">
      <button
        v-if="importValidation"
        type="button"
        class="btn"
        @click="$emit('open-validation')"
      >
        Validation Report
        <span class="validation-pill">{{ validationIssueCount }}</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectPageToolbar',
  props: {
    viewMode: { type: String, default: 'workspace' },
    importValidation: { type: Object, default: null },
    validationIssueCount: { type: Number, default: 0 },
  },
  emits: ['back', 'change-view-mode', 'open-validation'],
}
</script>

<style scoped>
.top-row { margin-bottom: 12px; }
.top-row-actions {
  width: min(1200px, 100%);
  margin-left: auto;
  margin-right: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.top-row-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.top-row-right { display: flex; align-items: center; gap: 8px; }
.view-mode-switch { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.validation-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(29, 185, 84, 0.2);
  color: #93f6b3;
  font-size: 11px;
  font-weight: 700;
}
</style>
