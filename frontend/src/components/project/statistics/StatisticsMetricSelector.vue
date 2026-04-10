<template>
  <div class="stats-metrics">
    <div class="stats-group-title">{{ $t('statistics.selector.title') }}</div>

    <div class="metrics-row">
      <div class="metrics-title">{{ $t('statistics.selector.groups.numeric') }}</div>
      <label v-for="metric in metricOptions.numeric" :key="`mn-${metric.key}`" class="metric-item">
        <input
          :name="`metric_numeric_${metric.key}`"
          type="checkbox"
          :checked="metricSelected.numeric.includes(metric.key)"
          @change="$emit('toggle-metric', { group: 'numeric', metricKey: metric.key, checked: $event.target.checked })"
        />
        {{ metric.label }}
      </label>
    </div>

    <div class="metrics-row">
      <div class="metrics-title">{{ $t('statistics.selector.groups.category') }}</div>
      <label v-for="metric in metricOptions.category" :key="`mc-${metric.key}`" class="metric-item">
        <input
          :name="`metric_category_${metric.key}`"
          type="checkbox"
          :checked="metricSelected.category.includes(metric.key)"
          @change="$emit('toggle-metric', { group: 'category', metricKey: metric.key, checked: $event.target.checked })"
        />
        {{ metric.label }}
      </label>
    </div>

    <div class="metrics-row">
      <div class="metrics-title">{{ $t('statistics.selector.groups.date') }}</div>
      <label v-for="metric in metricOptions.date" :key="`md-${metric.key}`" class="metric-item">
        <input
          :name="`metric_date_${metric.key}`"
          type="checkbox"
          :checked="metricSelected.date.includes(metric.key)"
          @change="$emit('toggle-metric', { group: 'date', metricKey: metric.key, checked: $event.target.checked })"
        />
        {{ metric.label }}
      </label>
    </div>

    <div class="metrics-row">
      <div class="metrics-title">{{ $t('statistics.selector.groups.ordered') }}</div>
      <label v-for="metric in metricOptions.ordered" :key="`mo-${metric.key}`" class="metric-item">
        <input
          :name="`metric_ordered_${metric.key}`"
          type="checkbox"
          :checked="metricSelected.ordered.includes(metric.key)"
          @change="$emit('toggle-metric', { group: 'ordered', metricKey: metric.key, checked: $event.target.checked })"
        />
        {{ metric.label }}
      </label>
    </div>
  </div>

  <div class="grouped-stats">
    <div class="stats-group-title">{{ $t('statistics.selector.groupedTitle') }}</div>
    <div class="grouped-controls">
      <label class="field-label" for="stats-group-by-column">{{ $t('statistics.selector.groupLabel') }}</label>
      <select
        id="stats-group-by-column"
        name="group_by_column"
        class="field-select"
        :value="groupByColumnId || ''"
        @change="$emit('update-group-by-column', $event.target.value)"
      >
        <option value="">{{ $t('statistics.selector.noGrouping') }}</option>
        <option v-for="column in groupedColumns.category" :key="`group-${column.id}`" :value="column.id">
          {{ column.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatisticsMetricSelector',
  props: {
    metricOptions: {
      type: Object,
      default: () => ({
        numeric: [],
        category: [],
        date: [],
        ordered: [],
      }),
    },
    metricSelected: {
      type: Object,
      default: () => ({
        numeric: [],
        category: [],
        date: [],
        ordered: [],
      }),
    },
    groupedColumns: {
      type: Object,
      default: () => ({
        category: [],
      }),
    },
    groupByColumnId: {
      type: [Number, String],
      default: null,
    },
  },
  emits: ['toggle-metric', 'update-group-by-column'],
}
</script>

<style scoped>
.stats-metrics,
.grouped-stats {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #171717;
  padding: 10px;
}
.stats-group-title { font-size: 13px; font-weight: 700; }
.metrics-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 8px; }
.metrics-title { min-width: 90px; font-size: 12px; color: var(--muted); font-weight: 700; }
.metric-item { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text); }

.grouped-controls { margin-top: 8px; display: flex; flex-direction: column; gap: 5px; max-width: 360px; }
.field-label { font-size: 12px; color: var(--muted); }
.field-select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 7px 9px;
  font-size: 13px;
}
</style>
