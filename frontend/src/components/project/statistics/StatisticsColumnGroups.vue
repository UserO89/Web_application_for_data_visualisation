<template>
  <div class="stats-groups">
    <section v-for="section in visibleSections" :key="section.key" class="stats-group">
      <div class="stats-group-title">{{ section.title }}</div>
      <div v-if="groupedColumns[section.key]?.length" class="stats-column-list">
        <div
          v-for="column in groupedColumns[section.key]"
          :key="`${section.key}-${column.id}`"
          class="stats-column-item"
        >
          <label class="stats-check">
            <input
              :name="`stats_column_${column.id}`"
              type="checkbox"
              :checked="isSelected(column.id)"
              @change="$emit('toggle-column', { columnId: column.id, checked: $event.target.checked })"
            />
            <span class="stats-column-name">{{ column.name }}</span>
          </label>
          <span class="stats-type-badge">{{ typeLabel(column.semanticType) }}</span>
          <button
            type="button"
            class="btn tiny"
            :disabled="readOnly"
            @click.stop="$emit('open-advanced', column.id)"
          >
            {{ readOnly ? $t('statistics.columns.locked') : $t('statistics.columns.advanced') }}
          </button>
        </div>
      </div>
      <div v-else class="muted">{{ section.emptyText }}</div>
    </section>

    <details class="stats-group collapsed">
      <summary>{{ $t('statistics.columns.hiddenTitle', { count: groupedColumns.hidden?.length || 0 }) }}</summary>
      <div v-if="groupedColumns.hidden?.length" class="stats-column-list">
        <div v-for="column in groupedColumns.hidden" :key="`hidden-${column.id}`" class="stats-column-item no-check">
          <span class="stats-column-name">{{ column.name }}</span>
          <span class="stats-type-badge">{{ typeLabel(column.semanticType) }}</span>
          <button
            type="button"
            class="btn tiny"
            :disabled="readOnly"
            @click="$emit('open-advanced', column.id)"
          >
            {{ readOnly ? $t('statistics.columns.locked') : $t('statistics.columns.advanced') }}
          </button>
        </div>
      </div>
      <div v-else class="muted">{{ $t('statistics.columns.hiddenEmpty') }}</div>
    </details>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export default {
  name: 'StatisticsColumnGroups',
  props: {
    groupedColumns: {
      type: Object,
      default: () => ({
        numeric: [],
        category: [],
        date: [],
        ordered: [],
        hidden: [],
      }),
    },
    isSelected: {
      type: Function,
      default: () => false,
    },
    typeLabel: {
      type: Function,
      default: (value) => String(value || 'Unknown'),
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['toggle-column', 'open-advanced'],
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const visibleSections = computed(() => ([
      { key: 'numeric', title: t('statistics.columns.numericTitle'), emptyText: t('statistics.columns.numericEmpty') },
      { key: 'category', title: t('statistics.columns.categoryTitle'), emptyText: t('statistics.columns.categoryEmpty') },
      { key: 'date', title: t('statistics.columns.dateTitle'), emptyText: t('statistics.columns.dateEmpty') },
      { key: 'ordered', title: t('statistics.columns.orderedTitle'), emptyText: t('statistics.columns.orderedEmpty') },
    ]))

    return {
      visibleSections,
    }
  },
}
</script>

<style scoped>
.stats-groups { display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); gap: 10px; }
.stats-group {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #171717;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stats-group.collapsed summary { cursor: pointer; font-weight: 700; color: var(--text); }
.stats-group-title { font-size: 13px; font-weight: 700; }
.stats-column-list { display: flex; flex-direction: column; gap: 6px; }
.stats-column-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  background: #1b1b1b;
}
.stats-column-item.no-check { grid-template-columns: 1fr auto auto; }
.stats-check { display: inline-flex; align-items: center; gap: 7px; min-width: 0; }
.stats-column-name { font-size: 13px; color: var(--text); }
.stats-type-badge {
  font-size: 11px;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 7px;
}
.tiny { padding: 4px 8px; font-size: 11px; }
.muted { color: var(--muted); font-size: 12px; }

@media (max-width: 980px) {
  .stats-groups { grid-template-columns: 1fr; }
}
</style>
