import { computed, ref, watch } from 'vue'
import i18n, { translate } from '../../i18n'
import { semanticTypeToGroup } from '../../charts/ui/typeLabels'
import {
  buildCategorySummaries,
  buildDateSummaries,
  buildNumericMatrix,
  buildOrderedSummaries,
} from '../../statistics/presentation/buildStatisticsSections'
import {
  buildMetricOptions,
  DEFAULT_SELECTED_METRICS,
  buildSemanticOverrideOptions,
  semanticTypeLabel,
  metricLabel,
  buildGroupedSummaryRows,
} from '../../utils/statistics'

const normalizeId = (value) => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const roleFromSemantic = (semanticType) => {
  if (semanticType === 'metric') return 'measure'
  if (semanticType === 'temporal') return 'timeDimension'
  if (['nominal', 'ordinal', 'binary'].includes(semanticType)) return 'dimension'
  return 'excluded'
}

const getColumnsByGroup = (schemaColumns = []) => {
  const grouped = {
    numeric: [],
    category: [],
    date: [],
    ordered: [],
    hidden: [],
  }
  schemaColumns.forEach((column) => {
    const group = semanticTypeToGroup(column)
    grouped[group].push(column)
  })
  return grouped
}

export const useStatisticsWorkspace = ({
  schemaColumns,
  statistics,
  rows,
  onChangeSemantic,
  onChangeOrdinalOrder,
} = {}) => {
  const selectedColumnIds = ref([])
  const metricSelected = ref({ ...DEFAULT_SELECTED_METRICS })
  const groupByColumnId = ref(null)
  const currentLocale = computed(() => i18n.global.locale.value)

  const advancedColumnId = ref(null)
  const advancedDraft = ref({
    semanticType: 'metric',
    isExcludedFromAnalysis: false,
    ordinalOrderText: '',
  })

  const columns = computed(() => (Array.isArray(schemaColumns?.value) ? schemaColumns.value : []))
  const statisticsRows = computed(() => (Array.isArray(statistics?.value) ? statistics.value : []))
  const sourceRows = computed(() => (Array.isArray(rows?.value) ? rows.value : []))

  const groupedColumns = computed(() => getColumnsByGroup(columns.value))

  const selectedColumns = computed(() => {
    const selected = new Set(selectedColumnIds.value.map((id) => Number(id)))
    return columns.value.filter((column) => selected.has(Number(column.id)))
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
    statisticsRows.value.forEach((item) => {
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

  const groupByColumn = computed(() =>
    columns.value.find((column) => Number(column.id) === Number(groupByColumnId.value)) || null
  )
  const groupByColumnName = computed(() => groupByColumn.value?.name || '')

  const groupedSummaryRows = computed(() => buildGroupedSummaryRows({
    rows: sourceRows.value,
    selectedNumericColumns: selectedNumericColumns.value,
    categoryColumn: groupByColumn.value,
    groupedMetricKeys: groupedMetricKeys.value,
  }))

  const advancedColumn = computed(() =>
    columns.value.find((column) => Number(column.id) === Number(advancedColumnId.value)) || null
  )

  const isSelected = (columnId) => selectedColumnIds.value.includes(Number(columnId))

  const toggleColumn = (columnId, checked) => {
    const normalized = Number(columnId)
    if (checked) {
      if (!selectedColumnIds.value.includes(normalized)) {
        selectedColumnIds.value = [...selectedColumnIds.value, normalized]
      }
      return
    }
    selectedColumnIds.value = selectedColumnIds.value.filter((id) => Number(id) !== normalized)
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
      return
    }

    metricSelected.value = {
      ...metricSelected.value,
      [group]: current.filter((key) => key !== metricKey),
    }
  }

  const updateGroupByColumn = (value) => {
    groupByColumnId.value = normalizeId(value)
  }

  const metricOptions = computed(() => {
    currentLocale.value
    return buildMetricOptions(translate)
  })

  const semanticOverrideOptions = computed(() => {
    currentLocale.value
    return buildSemanticOverrideOptions(translate)
  })

  const typeLabel = (semanticType) => {
    currentLocale.value
    return semanticTypeLabel(semanticType, translate) || translate('statistics.columns.unknownType')
  }

  const localizedMetricLabel = (metricKey) => {
    currentLocale.value
    return metricLabel(metricKey, translate)
  }

  const openAdvanced = (columnId) => {
    const column = columns.value.find((item) => Number(item.id) === Number(columnId))
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

  const setAdvancedSemanticType = (semanticType) => {
    advancedDraft.value = {
      ...advancedDraft.value,
      semanticType,
    }
  }

  const setAdvancedExcluded = (isExcludedFromAnalysis) => {
    advancedDraft.value = {
      ...advancedDraft.value,
      isExcludedFromAnalysis: Boolean(isExcludedFromAnalysis),
    }
  }

  const setAdvancedOrdinalOrderText = (ordinalOrderText) => {
    advancedDraft.value = {
      ...advancedDraft.value,
      ordinalOrderText: String(ordinalOrderText || ''),
    }
  }

  const saveAdvanced = () => {
    if (!advancedColumn.value || typeof onChangeSemantic !== 'function') return
    const semanticType = advancedDraft.value.semanticType
    const isExcluded = Boolean(advancedDraft.value.isExcludedFromAnalysis)
    onChangeSemantic({
      columnId: advancedColumn.value.id,
      semanticType,
      analyticalRole: isExcluded ? 'excluded' : roleFromSemantic(semanticType),
      isExcludedFromAnalysis: isExcluded,
    })
  }

  const saveOrdinalOrder = () => {
    if (!advancedColumn.value || advancedDraft.value.semanticType !== 'ordinal') return
    if (typeof onChangeOrdinalOrder !== 'function') return

    const ordinalOrder = advancedDraft.value.ordinalOrderText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    if (ordinalOrder.length < 2) return

    onChangeOrdinalOrder({
      columnId: advancedColumn.value.id,
      ordinalOrder,
    })
  }

  watch(
    () => columns.value,
    (nextColumns) => {
      const allowedSelected = new Set(selectedColumnIds.value.map((id) => Number(id)))
      const selectable = nextColumns
        .filter((column) => ['numeric', 'category', 'date', 'ordered'].includes(semanticTypeToGroup(column)))
        .map((column) => Number(column.id))

      const next = selectable.filter((id) => allowedSelected.has(id))
      if (!next.length) {
        selectedColumnIds.value = selectable.slice(0, Math.min(6, selectable.length))
      } else {
        selectedColumnIds.value = next
      }

      if (groupByColumnId.value && !nextColumns.some((column) => Number(column.id) === Number(groupByColumnId.value))) {
        groupByColumnId.value = null
      }
    },
    { immediate: true, deep: true }
  )

  return {
    metricOptions,
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
    semanticOverrideOptions,
    advancedColumn,
    advancedDraft,
    isSelected,
    toggleColumn,
    toggleMetric,
    updateGroupByColumn,
    typeLabel,
    metricLabel: localizedMetricLabel,
    openAdvanced,
    closeAdvanced,
    setAdvancedSemanticType,
    setAdvancedExcluded,
    setAdvancedOrdinalOrderText,
    saveAdvanced,
    saveOrdinalOrder,
  }
}
