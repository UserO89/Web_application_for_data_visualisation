<template>
  <div class="chart-builder panel">
    <div class="chart-builder-head">
      <div>
        <div class="section-title">{{ $t('charts.builder.title') }}</div>
        <div class="section-subtitle">{{ $t('charts.builder.subtitle') }}</div>
      </div>
    </div>

    <div class="chart-builder-grid">
      <div class="field-selector">
        <label for="chart-builder-type">{{ $t('charts.builder.chartType') }}</label>
        <select id="chart-builder-type" name="chart_type" class="field-select" :value="localDefinition.chartType" @change="changeChartType($event.target.value)">
          <option v-for="typeOption in chartTypeOptions" :key="typeOption.key" :value="typeOption.key">
            {{ typeOption.label }}
          </option>
        </select>
      </div>

      <template v-if="localDefinition.chartType === 'line'">
        <ChartFieldSelector
          :label="$t('charts.builder.line.xLabel')"
          v-model="localDefinition.bindings.x"
          :options="allowedColumns('x')"
          :placeholder="$t('charts.builder.line.xPlaceholder')"
        />
        <ChartFieldSelector
          :label="$t('charts.builder.line.yLabel')"
          v-model="localDefinition.bindings.y.field"
          :options="allowedColumns('y')"
          :placeholder="$t('charts.builder.line.yPlaceholder')"
        />
        <div class="field-selector">
          <label for="chart-line-value-mode">{{ $t('charts.builder.valueMode') }}</label>
          <select id="chart-line-value-mode" name="line_value_mode" class="field-select" :value="localDefinition.bindings.y.aggregation" @change="changeAggregation('y', $event.target.value)">
            <option value="sum">{{ $t('charts.aggregations.sum') }}</option>
            <option value="avg">{{ $t('charts.aggregations.avg') }}</option>
            <option value="min">{{ $t('charts.aggregations.min') }}</option>
            <option value="max">{{ $t('charts.aggregations.max') }}</option>
          </select>
        </div>
        <ChartFieldSelector
          :label="$t('charts.builder.line.groupLabel')"
          v-model="localDefinition.bindings.group"
          :options="allowedColumns('group')"
          :placeholder="$t('charts.builder.groupNone')"
        />
      </template>

      <template v-else-if="localDefinition.chartType === 'bar'">
        <ChartFieldSelector
          :label="$t('charts.builder.bar.categoryLabel')"
          v-model="localDefinition.bindings.x"
          :options="allowedColumns('x')"
          :placeholder="$t('charts.builder.bar.categoryPlaceholder')"
        />
        <div class="field-selector">
          <label for="chart-bar-value-mode">{{ $t('charts.builder.valueMode') }}</label>
          <select id="chart-bar-value-mode" name="bar_value_mode" class="field-select" :value="barValueMode" @change="setBarValueMode($event.target.value)">
            <option value="count">{{ $t('charts.aggregations.count') }}</option>
            <option value="sum">{{ $t('charts.aggregations.sum') }}</option>
            <option value="avg">{{ $t('charts.aggregations.avg') }}</option>
          </select>
        </div>
        <ChartFieldSelector
          v-if="barValueMode !== 'count'"
          :label="$t('charts.builder.bar.valueLabel')"
          v-model="localDefinition.bindings.y.field"
          :options="allowedColumns('y')"
          :placeholder="$t('charts.builder.bar.valuePlaceholder')"
        />
        <ChartFieldSelector
          :label="$t('charts.builder.bar.groupLabel')"
          v-model="localDefinition.bindings.group"
          :options="allowedColumns('group')"
          :placeholder="$t('charts.builder.groupNone')"
        />
      </template>

      <template v-else-if="localDefinition.chartType === 'scatter'">
        <ChartFieldSelector
          :label="$t('charts.builder.scatter.xLabel')"
          v-model="localDefinition.bindings.x"
          :options="allowedColumns('x')"
          :placeholder="$t('charts.builder.scatter.xPlaceholder')"
        />
        <ChartFieldSelector
          :label="$t('charts.builder.scatter.yLabel')"
          v-model="localDefinition.bindings.y.field"
          :options="allowedColumns('y')"
          :placeholder="$t('charts.builder.scatter.yPlaceholder')"
        />
        <ChartFieldSelector
          :label="$t('charts.builder.scatter.groupLabel')"
          v-model="localDefinition.bindings.group"
          :options="allowedColumns('group')"
          :placeholder="$t('charts.builder.groupNone')"
        />
      </template>

      <template v-else-if="localDefinition.chartType === 'histogram'">
        <ChartFieldSelector
          :label="$t('charts.builder.histogram.valueLabel')"
          v-model="localDefinition.bindings.value.field"
          :options="allowedColumns('value')"
          :placeholder="$t('charts.builder.histogram.valuePlaceholder')"
        />
        <div class="field-selector">
          <label for="chart-histogram-bins">{{ $t('charts.builder.histogram.bins') }}</label>
          <input
            id="chart-histogram-bins"
            name="histogram_bins"
            class="field-input"
            type="number"
            min="3"
            max="100"
            :value="localDefinition.settings.bins"
            @input="updateHistogramSetting('bins', Number($event.target.value || 10))"
          />
        </div>
        <div class="field-selector">
          <label for="chart-histogram-display-mode">{{ $t('charts.builder.histogram.displayMode') }}</label>
          <select id="chart-histogram-display-mode" name="histogram_display_mode" class="field-select" :value="localDefinition.settings.densityMode" @change="updateHistogramSetting('densityMode', $event.target.value)">
            <option value="frequency">{{ $t('charts.common.frequency') }}</option>
            <option value="density">{{ $t('charts.common.density') }}</option>
          </select>
        </div>
        <label class="check-row">
          <input
            name="histogram_show_mean_marker"
            type="checkbox"
            :checked="localDefinition.settings.showMeanMarker"
            @change="updateHistogramSetting('showMeanMarker', $event.target.checked)"
          />
          {{ $t('charts.builder.histogram.showMeanMarker') }}
        </label>
        <label class="check-row">
          <input
            name="histogram_show_median_marker"
            type="checkbox"
            :checked="localDefinition.settings.showMedianMarker"
            @change="updateHistogramSetting('showMedianMarker', $event.target.checked)"
          />
          {{ $t('charts.builder.histogram.showMedianMarker') }}
        </label>
      </template>

      <template v-else-if="localDefinition.chartType === 'boxplot'">
        <ChartFieldSelector
          :label="$t('charts.builder.boxplot.valueLabel')"
          v-model="localDefinition.bindings.value.field"
          :options="allowedColumns('value')"
          :placeholder="$t('charts.builder.boxplot.valuePlaceholder')"
        />
        <ChartFieldSelector
          :label="$t('charts.builder.boxplot.groupLabel')"
          v-model="localDefinition.bindings.group"
          :options="allowedColumns('group')"
          :placeholder="$t('charts.builder.groupNone')"
        />
        <div class="field-selector">
          <label for="chart-boxplot-orientation">{{ $t('charts.builder.boxplot.orientation') }}</label>
          <select id="chart-boxplot-orientation" name="boxplot_orientation" class="field-select" :value="localDefinition.settings.orientation" @change="updateBoxplotSetting('orientation', $event.target.value)">
            <option value="vertical">{{ $t('charts.builder.boxplot.vertical') }}</option>
            <option value="horizontal">{{ $t('charts.builder.boxplot.horizontal') }}</option>
          </select>
        </div>
        <label class="check-row">
          <input
            name="boxplot_show_outliers"
            type="checkbox"
            :checked="localDefinition.settings.showOutliers"
            @change="updateBoxplotSetting('showOutliers', $event.target.checked)"
          />
          {{ $t('charts.builder.boxplot.showOutliers') }}
        </label>
        <label class="check-row">
          <input
            name="boxplot_show_mean"
            type="checkbox"
            :checked="localDefinition.settings.showMean"
            @change="updateBoxplotSetting('showMean', $event.target.checked)"
          />
          {{ $t('charts.builder.boxplot.showMean') }}
        </label>
      </template>

      <template v-else-if="localDefinition.chartType === 'pie'">
        <ChartFieldSelector
          :label="$t('charts.builder.pie.categoryLabel')"
          v-model="localDefinition.bindings.category"
          :options="allowedColumns('category')"
          :placeholder="$t('charts.builder.pie.categoryPlaceholder')"
        />
        <div class="field-selector">
          <label for="chart-pie-value-mode">{{ $t('charts.builder.valueMode') }}</label>
          <select id="chart-pie-value-mode" name="pie_value_mode" class="field-select" :value="pieValueMode" @change="setPieValueMode($event.target.value)">
            <option value="count">{{ $t('charts.aggregations.count') }}</option>
            <option value="sum">{{ $t('charts.aggregations.sum') }}</option>
            <option value="avg">{{ $t('charts.aggregations.avg') }}</option>
          </select>
        </div>
        <ChartFieldSelector
          v-if="pieValueMode !== 'count'"
          :label="$t('charts.builder.pie.valueLabel')"
          v-model="localDefinition.bindings.value.field"
          :options="allowedColumns('value')"
          :placeholder="$t('charts.builder.pie.valuePlaceholder')"
        />
      </template>
    </div>

    <div class="chart-hint">{{ buildHint || $t('charts.builder.readyHint') }}</div>

    <div v-if="quickActions.length" class="suggestions">
      <div class="suggestions-title">{{ $t('charts.builder.quickActions') }}</div>
      <div class="suggestions-list">
        <button
          v-for="action in quickActions.slice(0, 8)"
          :key="action.id"
          type="button"
          class="btn"
          @click="applyQuickAction(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ChartFieldSelector from './ChartFieldSelector.vue'
import { CHART_TYPE_OPTIONS } from '../../charts/rules/chartRules'
import { getAllowedColumnsForBinding, normalizeChartDefinition } from '../../charts/rules/chartDefinitionValidator'
import { createDefaultChartDefinition, mergeChartDefinition } from '../../charts/chartDefinitions/createUniversalChartDefinition'
import { getFriendlyBuildHint } from '../../charts/ui/friendlyChartHints'
import { buildQuickChartActions } from '../../charts/ui/quickChartActions'
import { chartTypeLabel } from '../../charts/ui/i18n'

export default {
  name: 'ChartBuilder',
  components: { ChartFieldSelector },
  props: {
    schemaColumns: {
      type: Array,
      default: () => [],
    },
    modelValue: {
      type: Object,
      default: () => createDefaultChartDefinition('line'),
    },
    suggestions: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue', 'build'],
  setup(props, { emit }) {
    const { locale } = useI18n({ useScope: 'global' })
    const normalizeDefinition = (definition) =>
      normalizeChartDefinition(definition || createDefaultChartDefinition('line'))

    const areDefinitionsEqual = (left, right) =>
      left === right || JSON.stringify(normalizeDefinition(left)) === JSON.stringify(normalizeDefinition(right))

    const localDefinition = ref(normalizeDefinition(props.modelValue))
    const chartTypeOptions = computed(() => {
      locale.value
      return CHART_TYPE_OPTIONS.map((option) => ({
        ...option,
        label: chartTypeLabel(option.key),
      }))
    })

    const allowedColumns = (bindingKey) =>
      getAllowedColumnsForBinding(localDefinition.value.chartType, bindingKey, props.schemaColumns)

    const changeAggregation = (bindingKey, aggregation) => {
      localDefinition.value = normalizeChartDefinition({
        ...localDefinition.value,
        bindings: {
          ...localDefinition.value.bindings,
          [bindingKey]: {
            ...localDefinition.value.bindings[bindingKey],
            aggregation,
            field: aggregation === 'count'
              ? null
              : localDefinition.value.bindings[bindingKey]?.field ?? null,
          },
        },
      })
    }

    const barValueMode = computed(() => localDefinition.value.bindings?.y?.aggregation || 'count')
    const pieValueMode = computed(() => localDefinition.value.bindings?.value?.aggregation || 'count')

    const setBarValueMode = (mode) => {
      const aggregation = mode === 'count' ? 'count' : mode
      localDefinition.value = normalizeChartDefinition({
        ...localDefinition.value,
        bindings: {
          ...localDefinition.value.bindings,
          y: {
            ...localDefinition.value.bindings.y,
            aggregation,
            field: aggregation === 'count' ? null : localDefinition.value.bindings.y?.field ?? null,
          },
        },
      })
    }

    const setPieValueMode = (mode) => {
      const aggregation = mode === 'count' ? 'count' : mode
      localDefinition.value = normalizeChartDefinition({
        ...localDefinition.value,
        bindings: {
          ...localDefinition.value.bindings,
          value: {
            ...localDefinition.value.bindings.value,
            aggregation,
            field: aggregation === 'count' ? null : localDefinition.value.bindings.value?.field ?? null,
          },
        },
      })
    }

    const updateHistogramSetting = (key, value) => {
      localDefinition.value = normalizeChartDefinition({
        ...localDefinition.value,
        settings: {
          ...(localDefinition.value.settings || {}),
          [key]: value,
        },
      })
    }

    const updateBoxplotSetting = (key, value) => {
      localDefinition.value = normalizeChartDefinition({
        ...localDefinition.value,
        settings: {
          ...(localDefinition.value.settings || {}),
          [key]: value,
        },
      })
    }

    const changeChartType = (chartType) => {
      const base = createDefaultChartDefinition(chartType)
      localDefinition.value = mergeChartDefinition(base, { chartType })
    }

    const buildHint = computed(() => {
      locale.value
      return getFriendlyBuildHint(localDefinition.value, props.schemaColumns)
    })
    const canBuild = computed(() => !buildHint.value)

    const quickActions = computed(() => {
      locale.value
      return buildQuickChartActions(props.suggestions, props.schemaColumns)
    })

    const applyQuickAction = (action) => {
      if (!action?.definition) return
      localDefinition.value = normalizeChartDefinition(action.definition)
      emit('build', localDefinition.value)
    }

    const emitBuild = () => {
      if (!canBuild.value) return
      emit('build', localDefinition.value)
    }

    watch(
      () => props.modelValue,
      (value) => {
        const normalizedIncoming = normalizeDefinition(value)
        if (areDefinitionsEqual(localDefinition.value, normalizedIncoming)) return
        localDefinition.value = normalizedIncoming
      },
      { deep: false }
    )

    watch(
      localDefinition,
      (value) => {
        const normalizedLocal = normalizeDefinition(value)
        if (areDefinitionsEqual(props.modelValue, normalizedLocal)) return
        emit('update:modelValue', normalizedLocal)
      },
      { deep: true }
    )

    return {
      localDefinition,
      chartTypeOptions,
      allowedColumns,
      barValueMode,
      pieValueMode,
      buildHint,
      canBuild,
      quickActions,
      changeChartType,
      changeAggregation,
      setBarValueMode,
      setPieValueMode,
      updateHistogramSetting,
      updateBoxplotSetting,
      applyQuickAction,
      emitBuild,
    }
  },
}
</script>

<style scoped>
.chart-builder { display: flex; flex-direction: column; gap: 10px; }
.chart-builder-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.chart-builder-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.field-selector { display: flex; flex-direction: column; gap: 4px; }
.field-selector label { font-size: 12px; color: var(--muted); }
.field-select,
.field-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 7px 9px;
  font-size: 13px;
}
.check-row {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--text);
}
.chart-hint {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #171717;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--muted);
}
.suggestions { border-top: 1px solid var(--border); padding-top: 8px; }
.suggestions-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.suggestions-list { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
