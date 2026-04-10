<template>
  <div class="top-row top-row-actions">
    <div class="top-row-left">
      <button class="btn" @click="$emit('back')">{{ backLabel }}</button>
      <div class="view-mode-switch">
        <button
          type="button"
          :class="['btn', 'mode-btn', { primary: viewMode === 'table' }]"
          :aria-label="$t('project.toolbar.table')"
          :title="$t('project.toolbar.table')"
          @click="$emit('change-view-mode', 'table')"
        >
          <span class="mode-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 5h16v14H4zM4 10h16M9 5v14M15 5v14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="mode-label">{{ $t('project.toolbar.table') }}</span>
        </button>
        <button
          type="button"
          :class="['btn', 'mode-btn', { primary: viewMode === 'visualization' }]"
          :aria-label="$t('project.toolbar.visualization')"
          :title="$t('project.toolbar.visualization')"
          @click="$emit('change-view-mode', 'visualization')"
        >
          <span class="mode-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 17l5-5 4 3 7-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="4" cy="17" r="1.2" fill="currentColor"/>
              <circle cx="9" cy="12" r="1.2" fill="currentColor"/>
              <circle cx="13" cy="15" r="1.2" fill="currentColor"/>
              <circle cx="20" cy="7" r="1.2" fill="currentColor"/>
            </svg>
          </span>
          <span class="mode-label">{{ $t('project.toolbar.visualization') }}</span>
        </button>
        <button
          type="button"
          :class="['btn', 'mode-btn', { primary: viewMode === 'statistics' }]"
          :aria-label="$t('project.toolbar.statistics')"
          :title="$t('project.toolbar.statistics')"
          @click="$emit('change-view-mode', 'statistics')"
        >
          <span class="mode-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="mode-label">{{ $t('project.toolbar.statistics') }}</span>
        </button>
        <button
          type="button"
          :class="['btn', 'mode-btn', { primary: viewMode === 'workspace' }]"
          :aria-label="$t('project.toolbar.workspace')"
          :title="$t('project.toolbar.workspace')"
          @click="$emit('change-view-mode', 'workspace')"
        >
          <span class="mode-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 4h8v8H4zM14 4h6v5h-6zM14 11h6v9h-6zM4 14h8v6H4z" stroke="currentColor" stroke-width="1.8"/>
            </svg>
          </span>
          <span class="mode-label">{{ $t('project.toolbar.workspace') }}</span>
        </button>
        <button
          v-if="!readOnly"
          type="button"
          :class="['btn', 'mode-btn', { primary: viewMode === 'library' }]"
          :aria-label="$t('project.toolbar.savedCharts')"
          :title="$t('project.toolbar.savedCharts')"
          @click="$emit('change-view-mode', 'library')"
        >
          <span class="mode-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16v12H4zM8 3v6M16 3v6M8 15h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="mode-label">{{ $t('project.toolbar.savedCharts') }}</span>
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
        {{ $t('project.toolbar.importReview') }}
        <span class="validation-pill">{{ validationProblemColumnCount }}</span>
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
    validationProblemColumnCount: { type: Number, default: 0 },
    readOnly: { type: Boolean, default: false },
    backLabel: { type: String, default: '<- Back to Projects' },
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
.mode-btn { display: inline-flex; align-items: center; gap: 7px; }
.mode-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.mode-icon svg {
  width: 16px;
  height: 16px;
  display: block;
}
.mode-label {
  line-height: 1;
}
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

@media (max-width: 760px) {
  .top-row-actions {
    gap: 8px;
  }

  .top-row-left {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .top-row-left > .btn {
    width: 100%;
  }

  .view-mode-switch {
    width: 100%;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #1c1c1c;
  }

  .view-mode-switch::-webkit-scrollbar {
    height: 0;
  }

  .view-mode-switch .mode-btn {
    flex: 0 0 auto;
    width: 42px;
    height: 42px;
    min-width: 42px;
    padding: 0;
    justify-content: center;
    border-radius: 10px;
  }

  .view-mode-switch .mode-label {
    display: none;
  }

  .top-row-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
