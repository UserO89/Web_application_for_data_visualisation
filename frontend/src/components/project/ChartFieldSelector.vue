<template>
  <div class="field-selector">
    <label :for="selectorId">{{ label }}</label>
    <select
      :id="selectorId"
      :name="selectorName"
      class="field-select"
      :value="modelValue ?? ''"
      :disabled="disabled"
      @change="$emit('update:modelValue', normalizeValue($event.target.value))"
    >
      <option value="">{{ placeholder || $t('charts.builder.notSelected') }}</option>
      <option
        v-for="column in options"
        :key="column.id"
        :value="column.id"
      >
        {{ column.name }} ({{ typeLabel(column.semanticType) }})
      </option>
    </select>
    <div v-if="hint" class="field-hint">{{ hint }}</div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { semanticTypeLabel } from '../../charts/ui/typeLabels'
import { chartCommonLabel } from '../../charts/ui/i18n'

let chartFieldSelectorSeed = 0

export default {
  name: 'ChartFieldSelector',
  props: {
    label: { type: String, required: true },
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    modelValue: { type: [Number, String, null], default: null },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '' },
    hint: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props) {
    const { locale } = useI18n({ useScope: 'global' })
    const selectorId = ref(props.id || `chart-field-${++chartFieldSelectorSeed}`)
    const selectorName = computed(() => props.name || selectorId.value)

    const normalizeValue = (value) => {
      if (!value) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    const typeLabel = (value) => {
      locale.value
      return semanticTypeLabel(value) || value || chartCommonLabel('unknown', 'Unknown')
    }
    return { selectorId, selectorName, normalizeValue, typeLabel }
  },
}
</script>

<style scoped>
.field-selector { display: flex; flex-direction: column; gap: 4px; }
.field-selector label { font-size: 12px; color: var(--muted); }
.field-select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 7px 9px;
  font-size: 13px;
}
.field-hint { font-size: 11px; color: var(--muted); }
</style>
