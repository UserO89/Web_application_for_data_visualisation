<template>
  <div class="stats-workspace panel">
    <div class="stats-head">
      <div>
        <div class="section-title">Descriptive Statistics</div>
        <div class="section-subtitle">Select columns, choose measures, and review results.</div>
      </div>
      <div v-if="loading" class="stats-status">Refreshing...</div>
    </div>

    <div v-if="error" class="stats-error">{{ error }}</div>

    <div class="stats-groups">
      <section class="stats-group">
        <div class="stats-group-title">Numeric columns</div>
        <div v-if="groupedColumns.numeric.length" class="stats-column-list">
          <div v-for="column in groupedColumns.numeric" :key="`num-${column.id}`" class="stats-column-item">
            <label class="stats-check">
              <input type="checkbox" :checked="isSelected(column.id)" @change="toggleColumn(column.id, $event.target.checked)" />
              <span class="stats-column-name">{{ column.name }}</span>
            </label>
            <span class="stats-type-badge">{{ typeLabel(column.semanticType) }}</span>
            <button type="button" class="btn tiny" @click.stop="openAdvanced(column.id)">Advanced</button>
          </div>
        </div>
        <div v-else class="muted">No numeric columns.</div>
      </section>

      <section class="stats-group">
        <div class="stats-group-title">Category columns</div>
        <div v-if="groupedColumns.category.length" class="stats-column-list">
          <div v-for="column in groupedColumns.category" :key="`cat-${column.id}`" class="stats-column-item">
            <label class="stats-check">
              <input type="checkbox" :checked="isSelected(column.id)" @change="toggleColumn(column.id, $event.target.checked)" />
              <span class="stats-column-name">{{ column.name }}</span>
            </label>
            <span class="stats-type-badge">{{ typeLabel(column.semanticType) }}</span>
            <button type="button" class="btn tiny" @click.stop="openAdvanced(column.id)">Advanced</button>
          </div>
        </div>
        <div v-else class="muted">No category columns.</div>
      </section>

      <section class="stats-group">
        <div class="stats-group-title">Date columns</div>
        <div v-if="groupedColumns.date.length" class="stats-column-list">
          <div v-for="column in groupedColumns.date" :key="`date-${column.id}`" class="stats-column-item">
            <label class="stats-check">
              <input type="checkbox" :checked="isSelected(column.id)" @change="toggleColumn(column.id, $event.target.checked)" />
              <span class="stats-column-name">{{ column.name }}</span>
            </label>
            <span class="stats-type-badge">{{ typeLabel(column.semanticType) }}</span>
            <button type="button" class="btn tiny" @click.stop="openAdvanced(column.id)">Advanced</button>
          </div>
        </div>
        <div v-else class="muted">No date columns.</div>
      </section>

      <section class="stats-group">
        <div class="stats-group-title">Ordered columns</div>
        <div v-if="groupedColumns.ordered.length" class="stats-column-list">
          <div v-for="column in groupedColumns.ordered" :key="`ord-${column.id}`" class="stats-column-item">
            <label class="stats-check">
              <input type="checkbox" :checked="isSelected(column.id)" @change="toggleColumn(column.id, $event.target.checked)" />
              <span class="stats-column-name">{{ column.name }}</span>
            </label>
            <span class="stats-type-badge">{{ typeLabel(column.semanticType) }}</span>
            <button type="button" class="btn tiny" @click.stop="openAdvanced(column.id)">Advanced</button>
          </div>
        </div>
        <div v-else class="muted">No ordered columns.</div>
      </section>

      <details class="stats-group collapsed">
        <summary>Hidden / Excluded columns ({{ groupedColumns.hidden.length }})</summary>
        <div v-if="groupedColumns.hidden.length" class="stats-column-list">
          <div v-for="column in groupedColumns.hidden" :key="`hidden-${column.id}`" class="stats-column-item no-check">
            <span class="stats-column-name">{{ column.name }}</span>
            <span class="stats-type-badge">{{ typeLabel(column.semanticType) }}</span>
            <button type="button" class="btn tiny" @click="openAdvanced(column.id)">Advanced</button>
          </div>
        </div>
        <div v-else class="muted">No hidden columns.</div>
      </details>
    </div>

    <div class="stats-metrics">
      <div class="stats-group-title">Measures to calculate</div>

      <div class="metrics-row">
        <div class="metrics-title">Numeric</div>
        <label v-for="metric in metricOptions.numeric" :key="`mn-${metric.key}`" class="metric-item">
          <input type="checkbox" :checked="metricSelected.numeric.includes(metric.key)" @change="toggleMetric('numeric', metric.key, $event.target.checked)" />
          {{ metric.label }}
        </label>
      </div>

      <div class="metrics-row">
        <div class="metrics-title">Category</div>
        <label v-for="metric in metricOptions.category" :key="`mc-${metric.key}`" class="metric-item">
          <input type="checkbox" :checked="metricSelected.category.includes(metric.key)" @change="toggleMetric('category', metric.key, $event.target.checked)" />
          {{ metric.label }}
        </label>
      </div>

      <div class="metrics-row">
        <div class="metrics-title">Date</div>
        <label v-for="metric in metricOptions.date" :key="`md-${metric.key}`" class="metric-item">
          <input type="checkbox" :checked="metricSelected.date.includes(metric.key)" @change="toggleMetric('date', metric.key, $event.target.checked)" />
          {{ metric.label }}
        </label>
      </div>

      <div class="metrics-row">
        <div class="metrics-title">Ordered</div>
        <label v-for="metric in metricOptions.ordered" :key="`mo-${metric.key}`" class="metric-item">
          <input type="checkbox" :checked="metricSelected.ordered.includes(metric.key)" @change="toggleMetric('ordered', metric.key, $event.target.checked)" />
          {{ metric.label }}
        </label>
      </div>
    </div>

    <div class="grouped-stats">
      <div class="stats-group-title">Grouped descriptive statistics (optional)</div>
      <div class="grouped-controls">
        <label class="field-label">Group numeric columns by category</label>
        <select class="field-select" :value="groupByColumnId || ''" @change="groupByColumnId = normalizeId($event.target.value)">
          <option value="">No grouping</option>
          <option v-for="column in groupedColumns.category" :key="`group-${column.id}`" :value="column.id">{{ column.name }}</option>
        </select>
      </div>
    </div>

    <div class="results-block">
      <div class="stats-group-title">Numeric statistics</div>
      <div v-if="!selectedNumericColumns.length" class="muted">
        Select at least one numeric column and one numeric measure to see numeric statistics.
      </div>
      <div v-else-if="!selectedNumericMetricKeys.length" class="muted">
        Select at least one numeric measure to see numeric statistics.
      </div>
      <div v-else class="table-wrap">
        <table class="data-table stats-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th v-for="column in numericMatrix.columns" :key="`numeric-head-${column.id}`">{{ column.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in numericMatrix.rows" :key="`numeric-row-${row.key}`">
              <td>{{ metricLabel(row.key) }}</td>
              <td v-for="cell in row.values" :key="`numeric-cell-${row.key}-${cell.columnId}`">{{ formatValue(cell.value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="results-block">
      <div class="stats-group-title">Category summaries</div>
      <div v-if="!selectedCategoryColumns.length" class="muted">
        Select at least one category column to see category summaries.
      </div>
      <div v-else-if="!selectedCategoryMetricKeys.length" class="muted">
        Select at least one category measure to see category summaries.
      </div>
      <div v-else class="summary-grid">
        <article v-for="summary in categorySummaries" :key="`category-summary-${summary.columnId}`" class="summary-card">
          <div class="summary-title">{{ summary.columnName }}</div>
          <div v-if="hasValue(summary.distinctCount)" class="summary-line">
            Distinct categories: <strong>{{ formatValue(summary.distinctCount) }}</strong>
          </div>
          <div v-if="hasValue(summary.mode)" class="summary-line">
            Most frequent value: <strong>{{ formatValue(summary.mode) }}</strong>
          </div>
          <div v-if="hasValue(summary.count)" class="summary-line">
            Count: <strong>{{ formatValue(summary.count) }}</strong>
          </div>

          <div v-if="summary.showFrequency" class="summary-frequency">
            <div class="summary-subtitle">Top values</div>
            <div v-if="summary.frequencyRows.length" class="table-wrap compact-wrap">
              <table class="data-table compact-table">
                <thead>
                  <tr>
                    <th>Value</th>
                    <th>Count</th>
                    <th>Percent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in summary.frequencyRows" :key="`category-frequency-${summary.columnId}-${rowIndex}`">
                    <td>{{ formatValue(row.value) }}</td>
                    <td>{{ formatValue(row.count) }}</td>
                    <td>{{ hasValue(row.percent) ? formatPercent(row.percent) : '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="muted">No distribution data available.</div>
          </div>
        </article>
      </div>
    </div>

    <div class="results-block">
      <div class="stats-group-title">Date summaries</div>
      <div v-if="!selectedDateColumns.length" class="muted">
        Select at least one date column to see date summaries.
      </div>
      <div v-else-if="!selectedDateMetricKeys.length" class="muted">
        Select at least one date measure to see date summaries.
      </div>
      <div v-else class="summary-grid">
        <article v-for="summary in dateSummaries" :key="`date-summary-${summary.columnId}`" class="summary-card">
          <div class="summary-title">{{ summary.columnName }}</div>
          <div v-if="hasValue(summary.earliest)" class="summary-line">
            Earliest: <strong>{{ formatValue(summary.earliest) }}</strong>
          </div>
          <div v-if="hasValue(summary.latest)" class="summary-line">
            Latest: <strong>{{ formatValue(summary.latest) }}</strong>
          </div>
          <div v-if="hasValue(summary.rangeSeconds)" class="summary-line">
            Range: <strong>{{ formatRangeSeconds(summary.rangeSeconds) }}</strong>
          </div>
          <div v-if="hasValue(summary.count)" class="summary-line">
            Count: <strong>{{ formatValue(summary.count) }}</strong>
          </div>
        </article>
      </div>
    </div>

    <div class="results-block">
      <div class="stats-group-title">Ordered summaries</div>
      <div v-if="!selectedOrderedColumns.length" class="muted">
        Select at least one ordered column to see ordered summaries.
      </div>
      <div v-else-if="!selectedOrderedMetricKeys.length" class="muted">
        Select at least one ordered measure to see ordered summaries.
      </div>
      <div v-else class="summary-grid">
        <article v-for="summary in orderedSummaries" :key="`ordered-summary-${summary.columnId}`" class="summary-card">
          <div class="summary-title">{{ summary.columnName }}</div>
          <div v-if="hasValue(summary.mode)" class="summary-line">
            Mode: <strong>{{ formatValue(summary.mode) }}</strong>
          </div>
          <div v-if="hasValue(summary.medianRank)" class="summary-line">
            Median rank: <strong>{{ formatValue(summary.medianRank) }}</strong>
            <span v-if="hasValue(summary.medianRankLabel)">({{ formatValue(summary.medianRankLabel) }})</span>
          </div>
          <div v-if="hasValue(summary.count)" class="summary-line">
            Count: <strong>{{ formatValue(summary.count) }}</strong>
          </div>

          <div v-if="summary.showFrequency" class="summary-frequency">
            <div class="summary-subtitle">Top values</div>
            <div v-if="summary.frequencyRows.length" class="table-wrap compact-wrap">
              <table class="data-table compact-table">
                <thead>
                  <tr>
                    <th>Value</th>
                    <th>Count</th>
                    <th>Percent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in summary.frequencyRows" :key="`ordered-frequency-${summary.columnId}-${rowIndex}`">
                    <td>{{ formatValue(row.value) }}</td>
                    <td>{{ formatValue(row.count) }}</td>
                    <td>{{ hasValue(row.percent) ? formatPercent(row.percent) : '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="muted">No distribution data available.</div>
          </div>
        </article>
      </div>
    </div>

    <div class="results-block">
      <div class="stats-group-title">Grouped statistics</div>
      <div v-if="!groupByColumnId" class="muted">
        Grouped statistics will appear after you choose a grouping column.
      </div>
      <div v-else-if="!selectedNumericColumns.length" class="muted">
        Select at least one numeric column to see grouped statistics.
      </div>
      <div v-else-if="!groupedSummaryRows.length" class="muted">
        No grouped statistics available for the current selection.
      </div>
      <div v-else class="table-wrap">
        <div class="summary-subtitle">Grouped by {{ groupByColumnName }}</div>
        <table class="data-table stats-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Group</th>
              <th v-for="metric in groupedMetricKeys" :key="`grouped-head-${metric}`">{{ metricLabel(metric) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in groupedSummaryRows" :key="`grouped-row-${index}`">
              <td>{{ row.column }}</td>
              <td>{{ row.group }}</td>
              <td v-for="metric in groupedMetricKeys" :key="`grouped-cell-${index}-${metric}`">{{ formatValue(row.metrics[metric]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="advancedColumn" class="advanced-backdrop" @click.self="closeAdvanced">
      <div class="advanced-modal panel">
        <div class="advanced-head">
          <div>
            <div class="section-title">Advanced column settings</div>
            <div class="section-subtitle">{{ advancedColumn.name }}</div>
          </div>
          <button type="button" class="btn" @click="closeAdvanced">Close</button>
        </div>

        <div class="advanced-meta">
          <div>Detected type: <strong>{{ advancedColumn.detectedSemanticType || 'n/a' }}</strong></div>
          <div>Final type: <strong>{{ advancedDraft.semanticType }}</strong></div>
          <div>Confidence: <strong>{{ formatConfidence(advancedColumn.semanticConfidence) }}</strong></div>
          <div>Source: <strong>{{ advancedColumn.typeSource || 'auto' }}</strong></div>
          <div>Physical type: <strong>{{ advancedColumn.physicalType || 'unknown' }}</strong></div>
        </div>

        <div class="advanced-row">
          <label>Final type override</label>
          <select class="field-select" v-model="advancedDraft.semanticType">
            <option v-for="option in semanticOverrideOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <label class="check-row">
          <input type="checkbox" v-model="advancedDraft.isExcludedFromAnalysis" />
          Exclude from analysis
        </label>

        <div v-if="advancedDraft.semanticType === 'ordinal'" class="advanced-row">
          <label>Ordered values</label>
          <input
            class="field-input"
            type="text"
            v-model="advancedDraft.ordinalOrderText"
            placeholder="Low, Medium, High"
          />
        </div>

        <div class="advanced-actions">
          <button type="button" class="btn primary" :disabled="updatingColumnId === advancedColumn.id" @click="saveAdvanced">
            Save settings
          </button>
          <button
            v-if="advancedDraft.semanticType === 'ordinal'"
            type="button"
            class="btn"
            :disabled="updatingColumnId === advancedColumn.id"
            @click="saveOrdinalOrder"
          >
            Save order
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { SEMANTIC_TYPE_LABELS, semanticTypeToGroup } from '../charts/ui/typeLabels'
import {
  buildCategorySummaries,
  buildDateSummaries,
  buildNumericMatrix,
  buildOrderedSummaries,
} from '../statistics/presentation/buildStatisticsSections'

const METRIC_OPTIONS = {
  numeric: [
    { key: 'mean', label: 'Mean' },
    { key: 'median', label: 'Median' },
    { key: 'min', label: 'Min' },
    { key: 'max', label: 'Max' },
    { key: 'q1', label: 'Q1' },
    { key: 'q2', label: 'Q2' },
    { key: 'q3', label: 'Q3' },
    { key: 'std_dev', label: 'Std deviation' },
    { key: 'variance', label: 'Variance' },
    { key: 'range', label: 'Range' },
    { key: 'count', label: 'Count' },
    { key: 'distinct_count', label: 'Distinct count' },
  ],
  category: [
    { key: 'frequency', label: 'Frequency' },
    { key: 'mode', label: 'Mode' },
    { key: 'distinct_count', label: 'Distinct count' },
    { key: 'count', label: 'Count' },
  ],
  date: [
    { key: 'earliest', label: 'Earliest' },
    { key: 'latest', label: 'Latest' },
    { key: 'range_seconds', label: 'Range' },
    { key: 'count', label: 'Count' },
  ],
  ordered: [
    { key: 'frequency', label: 'Frequency' },
    { key: 'mode', label: 'Mode' },
    { key: 'median_rank', label: 'Median rank' },
    { key: 'count', label: 'Count' },
  ],
}

const DEFAULT_SELECTED_METRICS = {
  numeric: ['mean', 'median', 'min', 'max', 'count'],
  category: ['frequency', 'mode', 'distinct_count'],
  date: ['earliest', 'latest', 'range_seconds'],
  ordered: ['frequency', 'mode', 'median_rank'],
}

const SEMANTIC_OVERRIDE_OPTIONS = [
  { value: 'metric', label: 'Numeric' },
  { value: 'nominal', label: 'Category' },
  { value: 'ordinal', label: 'Ordered category' },
  { value: 'temporal', label: 'Date/Time' },
  { value: 'identifier', label: 'ID' },
  { value: 'binary', label: 'Category (binary)' },
  { value: 'ignored', label: 'Hidden' },
]

const toCleanString = (value) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text) return null
  return text
}

const toNumber = (value) => {
  const text = toCleanString(value)
  if (!text) return NaN
  const parsed = Number.parseFloat(text.replace(/\s+/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : NaN
}

const quantile = (sortedValues, q) => {
  if (!sortedValues.length) return null
  const position = (sortedValues.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sortedValues[lower]
  const weight = position - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

export default {
  name: 'StatisticsWorkspace',
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
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: '',
    },
    updatingColumnId: {
      type: [Number, null],
      default: null,
    },
  },
  emits: ['change-semantic', 'change-ordinal-order'],
  setup(props, { emit }) {
    const selectedColumnIds = ref([])
    const metricSelected = ref({ ...DEFAULT_SELECTED_METRICS })
    const groupByColumnId = ref(null)

    const advancedColumnId = ref(null)
    const advancedDraft = ref({
      semanticType: 'metric',
      isExcludedFromAnalysis: false,
      ordinalOrderText: '',
    })

    const groupedColumns = computed(() => {
      const grouped = {
        numeric: [],
        category: [],
        date: [],
        ordered: [],
        hidden: [],
      }
      ;(props.schemaColumns || []).forEach((column) => {
        const group = semanticTypeToGroup(column)
        grouped[group].push(column)
      })
      return grouped
    })

    const selectedColumns = computed(() => {
      const selected = new Set(selectedColumnIds.value.map((id) => Number(id)))
      return (props.schemaColumns || []).filter((column) => selected.has(Number(column.id)))
    })

    const selectedNumericColumns = computed(() =>
      selectedColumns.value.filter((column) => semanticTypeToGroup(column) === 'numeric')
    )
    const selectedCategoryColumns = computed(() =>
      selectedColumns.value.filter((column) => semanticTypeToGroup(column) === 'category')
    )
    const selectedDateColumns = computed(() =>
      selectedColumns.value.filter((column) => semanticTypeToGroup(column) === 'date')
    )
    const selectedOrderedColumns = computed(() =>
      selectedColumns.value.filter((column) => semanticTypeToGroup(column) === 'ordered')
    )

    const selectedNumericMetricKeys = computed(() => metricSelected.value.numeric || [])
    const selectedCategoryMetricKeys = computed(() => metricSelected.value.category || [])
    const selectedDateMetricKeys = computed(() => metricSelected.value.date || [])
    const selectedOrderedMetricKeys = computed(() => metricSelected.value.ordered || [])

    const statsByColumnId = computed(() => {
      const map = new Map()
      ;(props.statistics || []).forEach((item) => {
        map.set(Number(item.column_id), item)
      })
      return map
    })

    const numericMatrix = computed(() => buildNumericMatrix({
      columns: selectedNumericColumns.value,
      metricKeys: selectedNumericMetricKeys.value,
      statsByColumnId: statsByColumnId.value,
    }))

    const categorySummaries = computed(() => buildCategorySummaries({
      columns: selectedCategoryColumns.value,
      metricKeys: selectedCategoryMetricKeys.value,
      statsByColumnId: statsByColumnId.value,
    }))

    const dateSummaries = computed(() => buildDateSummaries({
      columns: selectedDateColumns.value,
      metricKeys: selectedDateMetricKeys.value,
      statsByColumnId: statsByColumnId.value,
    }))

    const orderedSummaries = computed(() => buildOrderedSummaries({
      columns: selectedOrderedColumns.value,
      metricKeys: selectedOrderedMetricKeys.value,
      statsByColumnId: statsByColumnId.value,
    }))

    const groupedMetricKeys = computed(() => {
      const numericMetrics = metricSelected.value.numeric || []
      const allowed = ['count', 'mean', 'median', 'min', 'max', 'q1', 'q2', 'q3', 'range', 'std_dev', 'variance']
      const selected = numericMetrics.filter((metric) => allowed.includes(metric))
      return selected.length ? selected : ['count', 'mean']
    })

    const groupByColumnName = computed(() =>
      (props.schemaColumns || []).find((column) => Number(column.id) === Number(groupByColumnId.value))?.name || ''
    )

    const groupedSummaryRows = computed(() => {
      if (!groupByColumnId.value) return []
      const categoryColumn = (props.schemaColumns || []).find((column) => Number(column.id) === Number(groupByColumnId.value))
      if (!categoryColumn) return []

      if (!selectedNumericColumns.value.length) return []

      const result = []
      selectedNumericColumns.value.forEach((numericColumn) => {
        const buckets = new Map()
        ;(props.rows || []).forEach((row) => {
          const groupValue = toCleanString(row?.[categoryColumn.fieldKey])
          if (!groupValue) return
          const value = toNumber(row?.[numericColumn.fieldKey])
          if (!Number.isFinite(value)) return

          if (!buckets.has(groupValue)) buckets.set(groupValue, [])
          buckets.get(groupValue).push(value)
        })

        Array.from(buckets.keys()).sort((a, b) => String(a).localeCompare(String(b))).forEach((groupValue) => {
          const values = buckets.get(groupValue) || []
          const metrics = calculateNumericMetrics(values)
          const picked = {}
          groupedMetricKeys.value.forEach((key) => {
            picked[key] = metrics[key]
          })

          result.push({
            column: numericColumn.name,
            group: groupValue,
            metrics: picked,
          })
        })
      })

      return result
    })

    const advancedColumn = computed(() =>
      (props.schemaColumns || []).find((column) => Number(column.id) === Number(advancedColumnId.value)) || null
    )

    const openAdvanced = (columnId) => {
      const column = (props.schemaColumns || []).find((item) => Number(item.id) === Number(columnId))
      if (!column) return
      advancedColumnId.value = column.id
      advancedDraft.value = {
        semanticType: column.semanticType || column.detectedSemanticType || 'ignored',
        isExcludedFromAnalysis: Boolean(column.isExcludedFromAnalysis),
        ordinalOrderText: Array.isArray(column.ordinalOrder) ? column.ordinalOrder.join(', ') : '',
      }
    }

    const closeAdvanced = () => {
      advancedColumnId.value = null
    }

    const roleFromSemantic = (semanticType) => {
      if (semanticType === 'metric') return 'measure'
      if (semanticType === 'temporal') return 'timeDimension'
      if (['nominal', 'ordinal', 'binary'].includes(semanticType)) return 'dimension'
      return 'excluded'
    }

    const saveAdvanced = () => {
      if (!advancedColumn.value) return
      const semanticType = advancedDraft.value.semanticType
      const isExcluded = Boolean(advancedDraft.value.isExcludedFromAnalysis)
      emit('change-semantic', {
        columnId: advancedColumn.value.id,
        semanticType,
        analyticalRole: isExcluded ? 'excluded' : roleFromSemantic(semanticType),
        isExcludedFromAnalysis: isExcluded,
      })
    }

    const saveOrdinalOrder = () => {
      if (!advancedColumn.value || advancedDraft.value.semanticType !== 'ordinal') return
      const ordinalOrder = advancedDraft.value.ordinalOrderText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      if (ordinalOrder.length < 2) return

      emit('change-ordinal-order', {
        columnId: advancedColumn.value.id,
        ordinalOrder,
      })
    }

    const isSelected = (columnId) => selectedColumnIds.value.includes(Number(columnId))

    const toggleColumn = (columnId, checked) => {
      const normalized = Number(columnId)
      if (checked) {
        if (!selectedColumnIds.value.includes(normalized)) {
          selectedColumnIds.value = [...selectedColumnIds.value, normalized]
        }
      } else {
        selectedColumnIds.value = selectedColumnIds.value.filter((id) => Number(id) !== normalized)
      }
    }

    const toggleMetric = (group, metricKey, checked) => {
      const current = metricSelected.value[group] || []
      if (checked) {
        if (!current.includes(metricKey)) {
          metricSelected.value = {
            ...metricSelected.value,
            [group]: [...current, metricKey],
          }
        }
      } else {
        metricSelected.value = {
          ...metricSelected.value,
          [group]: current.filter((key) => key !== metricKey),
        }
      }
    }

    const normalizeId = (value) => {
      if (!value) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    const typeLabel = (semanticType) => SEMANTIC_TYPE_LABELS[semanticType] || semanticType || 'Unknown'
    const metricLabel = (metricKey) => {
      if (metricKey === 'q1') return 'Q1'
      if (metricKey === 'q2') return 'Q2'
      if (metricKey === 'q3') return 'Q3'
      return [...METRIC_OPTIONS.numeric, ...METRIC_OPTIONS.category, ...METRIC_OPTIONS.date, ...METRIC_OPTIONS.ordered]
        .find((item) => item.key === metricKey)?.label || metricKey
    }

    const formatValue = (value) => {
      if (value === null || value === undefined) return '-'
      if (Array.isArray(value)) {
        if (!value.length) return '[]'
        if (typeof value[0] === 'object') return `${value.length} rows`
        return value.join(', ')
      }
      if (typeof value === 'object') {
        return Object.entries(value)
          .map(([key, child]) => `${key}: ${formatValue(child)}`)
          .join(', ')
      }
      if (typeof value === 'number') {
        if (Number.isInteger(value)) return value.toLocaleString()
        return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
      }
      return String(value)
    }

    const hasValue = (value) => value !== null && value !== undefined

    const formatPercent = (value) => {
      if (!Number.isFinite(Number(value))) return '-'
      const numeric = Number(value)
      return `${numeric.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
    }

    const formatRangeSeconds = (value) => {
      const seconds = Number(value)
      if (!Number.isFinite(seconds)) return '-'
      if (seconds < 60) return `${Math.round(seconds)} sec`
      if (seconds < 3600) return `${(seconds / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} min`
      if (seconds < 86400) return `${(seconds / 3600).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`
      return `${(seconds / 86400).toLocaleString(undefined, { maximumFractionDigits: 2 })} days`
    }

    const formatConfidence = (confidence) => {
      if (typeof confidence !== 'number') return 'n/a'
      return `${Math.round(confidence * 100)}%`
    }

    watch(
      () => props.schemaColumns,
      (columns) => {
        const allowedSelected = new Set(selectedColumnIds.value.map((id) => Number(id)))
        const selectable = (columns || [])
          .filter((column) => ['numeric', 'category', 'date', 'ordered'].includes(semanticTypeToGroup(column)))
          .map((column) => Number(column.id))

        const next = selectable.filter((id) => allowedSelected.has(id))
        if (!next.length) {
          selectedColumnIds.value = selectable.slice(0, Math.min(6, selectable.length))
        } else {
          selectedColumnIds.value = next
        }

        if (groupByColumnId.value && !columns.some((column) => Number(column.id) === Number(groupByColumnId.value))) {
          groupByColumnId.value = null
        }
      },
      { immediate: true, deep: true }
    )

    return {
      metricOptions: METRIC_OPTIONS,
      metricSelected,
      groupedColumns,
      selectedNumericColumns,
      selectedCategoryColumns,
      selectedDateColumns,
      selectedOrderedColumns,
      selectedNumericMetricKeys,
      selectedCategoryMetricKeys,
      selectedDateMetricKeys,
      selectedOrderedMetricKeys,
      numericMatrix,
      categorySummaries,
      dateSummaries,
      orderedSummaries,
      groupedMetricKeys,
      groupedSummaryRows,
      groupByColumnId,
      groupByColumnName,
      semanticOverrideOptions: SEMANTIC_OVERRIDE_OPTIONS,
      advancedColumn,
      advancedDraft,
      openAdvanced,
      closeAdvanced,
      saveAdvanced,
      saveOrdinalOrder,
      isSelected,
      toggleColumn,
      toggleMetric,
      normalizeId,
      typeLabel,
      metricLabel,
      hasValue,
      formatValue,
      formatPercent,
      formatRangeSeconds,
      formatConfidence,
    }
  },
}

function calculateNumericMetrics(values) {
  const finite = (values || []).filter((value) => Number.isFinite(value))
  if (!finite.length) {
    return {
      count: 0,
      mean: null,
      median: null,
      q1: null,
      q2: null,
      q3: null,
      min: null,
      max: null,
      range: null,
      std_dev: null,
      variance: null,
    }
  }

  const sorted = [...finite].sort((a, b) => a - b)
  const count = sorted.length
  const mean = sorted.reduce((acc, value) => acc + value, 0) / count
  const median = quantile(sorted, 0.5)
  const q1 = quantile(sorted, 0.25)
  const q2 = median
  const q3 = quantile(sorted, 0.75)
  const min = sorted[0]
  const max = sorted[count - 1]
  const range = max - min
  const variance = sorted.reduce((acc, value) => acc + ((value - mean) ** 2), 0) / count
  const stdDev = Math.sqrt(variance)

  return {
    count,
    mean,
    median,
    q1,
    q2,
    q3,
    min,
    max,
    range,
    std_dev: stdDev,
    variance,
  }
}
</script>

<style scoped>
.stats-workspace { display: flex; flex-direction: column; gap: 12px; }
.stats-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.stats-status { color: var(--muted); font-size: 12px; }
.stats-error { color: #ff9b9b; font-size: 13px; }

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

.stats-metrics,
.grouped-stats,
.results-block {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #171717;
  padding: 10px;
}
.metrics-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 8px; }
.metrics-title { min-width: 90px; font-size: 12px; color: var(--muted); font-weight: 700; }
.metric-item { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text); }

.grouped-controls { margin-top: 8px; display: flex; flex-direction: column; gap: 5px; max-width: 360px; }
.field-label { font-size: 12px; color: var(--muted); }
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

.table-wrap { max-height: 360px; overflow: auto; }
.stats-table { min-width: 640px; }
.summary-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
}
.summary-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #1b1b1b;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.summary-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.summary-subtitle {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
.summary-line {
  font-size: 12px;
  color: var(--text);
}
.summary-frequency {
  margin-top: 4px;
}
.compact-wrap { max-height: 220px; }
.compact-table { min-width: 340px; }

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
.check-row { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text); }
.advanced-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.tiny { padding: 4px 8px; font-size: 11px; }
.muted { color: var(--muted); font-size: 12px; }

@media (max-width: 980px) {
  .stats-groups { grid-template-columns: 1fr; }
  .advanced-meta { grid-template-columns: 1fr; }
}
</style>
