<template>
  <div v-if="advancedColumn" class="advanced-backdrop" @click.self="$emit('close')">
    <div class="advanced-modal panel">
      <div class="advanced-head">
        <div>
          <div class="section-title">{{ $t('statistics.advanced.title') }}</div>
          <div class="section-subtitle">{{ advancedColumn.name }}</div>
        </div>
        <button type="button" class="btn" @click="$emit('close')">{{ $t('statistics.advanced.close') }}</button>
      </div>

      <div class="advanced-meta">
        <div>{{ $t('statistics.advanced.detectedType') }}: <strong>{{ semanticTypeLabel(advancedColumn.detectedSemanticType) }}</strong></div>
        <div>{{ $t('statistics.advanced.finalType') }}: <strong>{{ semanticTypeLabel(advancedDraft.semanticType) }}</strong></div>
        <div>{{ $t('statistics.advanced.confidence') }}: <strong>{{ confidenceLabel(advancedColumn.semanticConfidence) }}</strong></div>
        <div>{{ $t('statistics.advanced.source') }}: <strong>{{ advancedColumn.typeSource || $t('statistics.advanced.sourceAuto') }}</strong></div>
        <div>{{ $t('statistics.advanced.physicalType') }}: <strong>{{ advancedColumn.physicalType || $t('statistics.advanced.unknownPhysicalType') }}</strong></div>
      </div>

      <div class="advanced-row">
        <label for="advanced-semantic-type">{{ $t('statistics.advanced.finalTypeOverride') }}</label>
        <select
          id="advanced-semantic-type"
          name="advanced_semantic_type"
          class="field-select"
          :value="advancedDraft.semanticType"
          @change="$emit('update-semantic-type', $event.target.value)"
        >
          <option v-for="option in semanticOverrideOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <label class="check-row">
        <input
          name="advanced_excluded_from_analysis"
          type="checkbox"
          :checked="Boolean(advancedDraft.isExcludedFromAnalysis)"
          @change="$emit('update-excluded', $event.target.checked)"
        />
        {{ $t('statistics.advanced.excludeFromAnalysis') }}
      </label>

      <div v-if="advancedDraft.semanticType === 'ordinal'" class="advanced-row">
        <label for="advanced-ordinal-order">{{ $t('statistics.advanced.orderedValues') }}</label>
        <input
          id="advanced-ordinal-order"
          name="advanced_ordinal_order"
          class="field-input"
          type="text"
          :value="advancedDraft.ordinalOrderText"
          :placeholder="$t('statistics.advanced.orderedPlaceholder')"
          @input="$emit('update-ordinal-order-text', $event.target.value)"
        />
      </div>

      <div class="advanced-actions">
        <button type="button" class="btn primary" :disabled="updatingColumnId === advancedColumn.id" @click="$emit('save-settings')">
          {{ $t('statistics.advanced.saveSettings') }}
        </button>
        <button
          v-if="advancedDraft.semanticType === 'ordinal'"
          type="button"
          class="btn"
          :disabled="updatingColumnId === advancedColumn.id"
          @click="$emit('save-order')"
        >
          {{ $t('statistics.advanced.saveOrder') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
const defaultFormatter = (value) => String(value ?? '')

export default {
  name: 'StatisticsAdvancedModal',
  props: {
    advancedColumn: {
      type: Object,
      default: null,
    },
    advancedDraft: {
      type: Object,
      default: () => ({
        semanticType: 'metric',
        isExcludedFromAnalysis: false,
        ordinalOrderText: '',
      }),
    },
    semanticOverrideOptions: {
      type: Array,
      default: () => [],
    },
    updatingColumnId: {
      type: [Number, String],
      default: null,
    },
    formatConfidence: {
      type: Function,
      default: defaultFormatter,
    },
  },
  emits: [
    'close',
    'update-semantic-type',
    'update-excluded',
    'update-ordinal-order-text',
    'save-settings',
    'save-order',
  ],
  methods: {
    confidenceLabel(value) {
      return this.formatConfidence(value) || this.$t('statistics.advanced.notAvailable')
    },
    semanticTypeLabel(value) {
      if (!value) return this.$t('statistics.advanced.notAvailable')
      const translated = this.$t(`statistics.semanticTypes.${value}`)
      return translated !== `statistics.semanticTypes.${value}` ? translated : value
    },
  },
}
</script>

<style scoped>
.advanced-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.advanced-modal { width: min(620px, 94vw); display: flex; flex-direction: column; gap: 10px; max-height: 86vh; overflow: auto; }
.advanced-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.advanced-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 10px; font-size: 12px; color: var(--muted); }
.advanced-row { display: flex; flex-direction: column; gap: 5px; }
.advanced-row label { font-size: 12px; color: var(--muted); }
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
.check-row { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text); }
.advanced-actions { display: flex; flex-wrap: wrap; gap: 8px; }

@media (max-width: 980px) {
  .advanced-meta { grid-template-columns: 1fr; }
}
</style>
