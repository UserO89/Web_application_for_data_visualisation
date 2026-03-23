<template>
  <div class="chart-builder panel">
    <div class="chart-builder-head">
      <div>
        <div class="section-title">Create Visualization</div>
        <div class="section-subtitle">Choose columns first, then chart-specific options.</div>
      </div>
      <button type="button" class="btn primary" :disabled="!canBuild" @click="emitBuild">Build Chart</button>
    </div>

    <div class="chart-builder-grid">
      <div class="field-selector">
        <label>Chart type</label>
        <select class="field-select" :value="localDefinition.chartType" @change="changeChartType($event.target.value)">
          <option v-for="typeOption in chartTypeOptions" :key="typeOption.key" :value="typeOption.key">
            {{ typeOption.label }}
          </option>
        </select>
      </div>

      <template v-if="localDefinition.chartType === 'line'">
        <ChartFieldSelector
          label="X-axis (Date/Time or ordered)"
          v-model="localDefinition.bindings.x"
          :options="allowedColumns('x')"
          placeholder="Select one date/time column"
        />
        <ChartFieldSelector
          label="Y-axis (Numeric)"
          v-model="localDefinition.bindings.y.field"
          :options="allowedColumns('y')"
          placeholder="Select one numeric column"
        />
        <div class="field-selector">
          <label>Value mode</label>
          <select class="field-select" :value="localDefinition.bindings.y.aggregation" @change="changeAggregation('y', $event.target.value)">
            <option value="sum">Sum</option>
            <option value="avg">Mean</option>
            <option value="min">Min</option>
            <option value="max">Max</option>
          </select>
        </div>
        <ChartFieldSelector
          label="Breakdown (optional)"
          v-model="localDefinition.bindings.group"
          :options="allowedColumns('group')"
          placeholder="No breakdown"
        />
      </template>

      <template v-else-if="localDefinition.chartType === 'bar'">
        <ChartFieldSelector
          label="Category"
          v-model="localDefinition.bindings.x"
          :options="allowedColumns('x')"
          placeholder="Select one category column"
        />
        <div class="field-selector">
          <label>Value mode</label>
          <select class="field-select" :value="barValueMode" @change="setBarValueMode($event.target.value)">
            <option value="count">Count</option>
            <option value="sum">Sum</option>
            <option value="avg">Mean</option>
          </select>
        </div>
        <ChartFieldSelector
          v-if="barValueMode !== 'count'"
          label="Numeric column"
          v-model="localDefinition.bindings.y.field"
          :options="allowedColumns('y')"
          placeholder="Select one numeric column"
        />
        <ChartFieldSelector
          label="Breakdown (optional)"
          v-model="localDefinition.bindings.group"
          :options="allowedColumns('group')"
          placeholder="No breakdown"
        />
      </template>

      <template v-else-if="localDefinition.chartType === 'scatter'">
        <ChartFieldSelector
          label="X-axis (Numeric)"
          v-model="localDefinition.bindings.x"
          :options="allowedColumns('x')"
          placeholder="Select one numeric column"
        />
        <ChartFieldSelector
          label="Y-axis (Numeric)"
          v-model="localDefinition.bindings.y.field"
          :options="allowedColumns('y')"
          placeholder="Select one numeric column"
        />
        <ChartFieldSelector
          label="Group (optional)"
          v-model="localDefinition.bindings.group"
          :options="allowedColumns('group')"
          placeholder="No grouping"
        />
      </template>

      <template v-else-if="localDefinition.chartType === 'histogram'">
        <ChartFieldSelector
          label="Variable (Numeric)"
          v-model="localDefinition.bindings.value.field"
          :options="allowedColumns('value')"
          placeholder="Select one numeric variable"
        />
        <div class="field-selector">
          <label>Bins</label>
          <input
            class="field-input"
            type="number"
            min="3"
            max="100"
            :value="localDefinition.settings.bins"
            @input="updateHistogramSetting('bins', Number($event.target.value || 10))"
          />
        </div>
        <div class="field-selector">
          <label>Display mode</label>
          <select class="field-select" :value="localDefinition.settings.densityMode" @change="updateHistogramSetting('densityMode', $event.target.value)">
            <option value="frequency">Frequency</option>
            <option value="density">Density</option>
          </select>
        </div>
        <label class="check-row">
          <input
            type="checkbox"
            :checked="localDefinition.settings.showMeanMarker"
            @change="updateHistogramSetting('showMeanMarker', $event.target.checked)"
          />
          Show mean marker
        </label>
        <label class="check-row">
          <input
            type="checkbox"
            :checked="localDefinition.settings.showMedianMarker"
            @change="updateHistogramSetting('showMedianMarker', $event.target.checked)"
          />
          Show median marker
        </label>
      </template>

      <template v-else-if="localDefinition.chartType === 'boxplot'">
        <ChartFieldSelector
          label="Variable (Numeric)"
          v-model="localDefinition.bindings.value.field"
          :options="allowedColumns('value')"
          placeholder="Select one numeric variable"
        />
        <ChartFieldSelector
          label="Group by (optional)"
          v-model="localDefinition.bindings.group"
          :options="allowedColumns('group')"
          placeholder="No grouping"
        />
        <div class="field-selector">
          <label>Orientation</label>
          <select class="field-select" :value="localDefinition.settings.orientation" @change="updateBoxplotSetting('orientation', $event.target.value)">
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </div>
        <label class="check-row">
          <input
            type="checkbox"
            :checked="localDefinition.settings.showOutliers"
            @change="updateBoxplotSetting('showOutliers', $event.target.checked)"
          />
          Show outliers
        </label>
        <label class="check-row">
          <input
            type="checkbox"
            :checked="localDefinition.settings.showMean"
            @change="updateBoxplotSetting('showMean', $event.target.checked)"
          />
          Show mean
        </label>
      </template>

      <template v-else-if="localDefinition.chartType === 'pie'">
        <ChartFieldSelector
          label="Category"
          v-model="localDefinition.bindings.category"
          :options="allowedColumns('category')"
          placeholder="Select one category column"
        />
        <div class="field-selector">
          <label>Value mode</label>
          <select class="field-select" :value="pieValueMode" @change="setPieValueMode($event.target.value)">
            <option value="count">Count</option>
            <option value="sum">Sum</option>
            <option value="avg">Mean</option>
          </select>
        </div>
        <ChartFieldSelector
          v-if="pieValueMode !== 'count'"
          label="Numeric column"
          v-model="localDefinition.bindings.value.field"
          :options="allowedColumns('value')"
          placeholder="Select one numeric column"
        />
      </template>
    </div>

    <div class="chart-hint">{{ buildHint || 'All required fields are selected. You can build the chart.' }}</div>

    <div v-if="quickActions.length" class="suggestions">
      <div class="suggestions-title">Quick chart actions</div>
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
import ChartFieldSelector from './ChartFieldSelector.vue'
import { CHART_TYPE_OPTIONS } from '../../charts/rules/chartRules'
import { getAllowedColumnsForBinding, normalizeChartDefinition } from '../../charts/rules/chartDefinitionValidator'
import { createDefaultChartDefinition, mergeChartDefinition } from '../../charts/chartDefinitions/createUniversalChartDefinition'
import { getFriendlyBuildHint } from '../../charts/ui/friendlyChartHints'
import { buildQuickChartActions } from '../../charts/ui/quickChartActions'

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
    const normalizeDefinition = (definition) =>
      normalizeChartDefinition(definition || createDefaultChartDefinition('line'))

    const areDefinitionsEqual = (left, right) =>
      JSON.stringify(normalizeDefinition(left)) === JSON.stringify(normalizeDefinition(right))

    const localDefinition = ref(normalizeDefinition(props.modelValue))
    const chartTypeOptions = CHART_TYPE_OPTIONS

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

    const buildHint = computed(() => getFriendlyBuildHint(localDefinition.value, props.schemaColumns))
    const canBuild = computed(() => !buildHint.value)

    const quickActions = computed(() => buildQuickChartActions(props.suggestions, props.schemaColumns))

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
      { deep: true }
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
