<template>
  <div class="stats-workspace panel">
    <div class="stats-head">
      <div>
        <div class="section-title">{{ $t('statistics.workspace.title') }}</div>
        <div class="section-subtitle">{{ $t('statistics.workspace.subtitle') }}</div>
      </div>
      <div class="stats-head-actions">
        <button
          type="button"
          class="btn"
          :disabled="rowsLoading"
          @click="$emit('load-rows')"
        >
          {{
            rowsLoading
              ? $t('statistics.workspace.loadingRows')
              : (rowsReady ? $t('statistics.workspace.reloadRows') : $t('statistics.workspace.loadRows'))
          }}
        </button>
        <div v-if="loading" class="stats-status">{{ $t('statistics.workspace.refreshing') }}</div>
      </div>
    </div>

    <div v-if="error" class="stats-error">{{ error }}</div>
    <div v-if="rowsError" class="stats-error">{{ rowsError }}</div>
    <div v-else-if="!rowsReady" class="stats-note">
      {{ $t('statistics.workspace.rowsNote') }}
    </div>

    <StatisticsColumnGroups
      :grouped-columns="groupedColumns"
      :is-selected="isSelected"
      :type-label="typeLabel"
      :read-only="readOnly"
      @toggle-column="toggleColumn($event.columnId, $event.checked)"
      @open-advanced="handleOpenAdvanced"
    />

    <StatisticsMetricSelector
      :metric-options="metricOptions"
      :metric-selected="metricSelected"
      :grouped-columns="groupedColumns"
      :group-by-column-id="groupByColumnId"
      @toggle-metric="toggleMetric($event.group, $event.metricKey, $event.checked)"
      @update-group-by-column="updateGroupByColumn"
    />

    <StatisticsResults
      :selected-numeric-columns="selectedNumericColumns"
      :selected-category-columns="selectedCategoryColumns"
      :selected-date-columns="selectedDateColumns"
      :selected-ordered-columns="selectedOrderedColumns"
      :selected-numeric-metric-keys="selectedNumericMetricKeys"
      :selected-category-metric-keys="selectedCategoryMetricKeys"
      :selected-date-metric-keys="selectedDateMetricKeys"
      :selected-ordered-metric-keys="selectedOrderedMetricKeys"
      :numeric-matrix="numericMatrix"
      :category-summaries="categorySummaries"
      :date-summaries="dateSummaries"
      :ordered-summaries="orderedSummaries"
      :grouped-metric-keys="groupedMetricKeys"
      :grouped-summary-rows="groupedSummaryRows"
      :group-by-column-id="groupByColumnId"
      :group-by-column-name="groupByColumnName"
      :grouped-source-ready="rowsReady"
      :grouped-source-loading="rowsLoading"
      :metric-label="metricLabel"
      :has-value="hasValue"
      :format-value="formatValue"
      :format-percent="formatPercent"
      :format-range-seconds="formatRangeSeconds"
    />

    <StatisticsAdvancedModal
      v-if="!readOnly"
      :advanced-column="advancedColumn"
      :advanced-draft="advancedDraft"
      :semantic-override-options="semanticOverrideOptions"
      :updating-column-id="updatingColumnId"
      :format-confidence="formatConfidence"
      @close="closeAdvanced"
      @update-semantic-type="setAdvancedSemanticType"
      @update-excluded="setAdvancedExcluded"
      @update-ordinal-order-text="setAdvancedOrdinalOrderText"
      @save-settings="saveAdvanced"
      @save-order="saveOrdinalOrder"
    />
  </div>
</template>

<script>
import { toRef } from 'vue'
import {
  StatisticsColumnGroups,
  StatisticsMetricSelector,
  StatisticsResults,
  StatisticsAdvancedModal,
} from './statistics'
import { useStatisticsWorkspace } from '../../composables/project'
import {
  hasValue,
  formatValue,
  formatPercent,
  formatRangeSeconds,
  formatConfidence,
} from '../../utils/statistics'

export default {
  name: 'StatisticsWorkspace',
  components: {
    StatisticsColumnGroups,
    StatisticsMetricSelector,
    StatisticsResults,
    StatisticsAdvancedModal,
  },
  props: {
    schemaColumns: {
      type: Array,
      default: () => [],
    },
    statistics: {
      type: Array,
      default: () => [],
    },
    rows: {
      type: Array,
      default: () => [],
    },
    rowsReady: {
      type: Boolean,
      default: false,
    },
    rowsLoading: {
      type: Boolean,
      default: false,
    },
    rowsError: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: '',
    },
    updatingColumnId: {
      type: [Number, String],
      default: null,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['change-semantic', 'change-ordinal-order', 'load-rows'],
  setup(props, { emit }) {
    const statisticsState = useStatisticsWorkspace({
      schemaColumns: toRef(props, 'schemaColumns'),
      statistics: toRef(props, 'statistics'),
      rows: toRef(props, 'rows'),
      onChangeSemantic: (payload) => emit('change-semantic', payload),
      onChangeOrdinalOrder: (payload) => emit('change-ordinal-order', payload),
    })

    const handleOpenAdvanced = (columnId) => {
      if (props.readOnly) return
      statisticsState.openAdvanced(columnId)
    }

    return {
      ...statisticsState,
      handleOpenAdvanced,
      hasValue,
      formatValue,
      formatPercent,
      formatRangeSeconds,
      formatConfidence,
    }
  },
}
</script>

<style scoped>
.stats-workspace { display: flex; flex-direction: column; gap: 12px; }
.stats-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.stats-head-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.stats-status { color: var(--muted); font-size: 12px; }
.stats-error { color: #ff9b9b; font-size: 13px; }
.stats-note {
  color: var(--muted);
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #171717;
  padding: 10px;
}

@media (max-width: 760px) {
  .stats-head {
    flex-direction: column;
  }

  .stats-head-actions {
    width: 100%;
    align-items: stretch;
  }

  .stats-head-actions .btn {
    width: 100%;
  }
}
</style>
