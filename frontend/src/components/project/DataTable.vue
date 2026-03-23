<template>
  <div ref="el" class="tabulator-host"></div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import 'tabulator-tables/dist/css/tabulator.min.css'

export default {
  name: 'DataTable',
  props: {
    columns: {
      type: Array,
      required: true,
    },
    rows: {
      type: Array,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['cell-edited'],
  setup(props, { emit }) {
    const el = ref(null)
    let table = null
    let resizeObserver = null
    let tableReady = false
    let pendingRows = null
    let pendingColumns = null

    const mapColumns = (columns) =>
      columns.map((column) => {
        const { metaType, ...mapped } = column
        return mapped
      })

    const canUseTable = () =>
      Boolean(table && tableReady && el.value && el.value.isConnected)

    const safeRedraw = () => {
      if (!canUseTable()) return
      try {
        table.redraw(true)
      } catch (_) {}
    }

    const flushPendingUpdates = () => {
      if (!canUseTable()) return

      if (pendingColumns !== null) {
        try {
          table.setColumns(mapColumns(pendingColumns))
        } catch (_) {}
        pendingColumns = null
      }

      if (pendingRows !== null) {
        try {
          table.replaceData(pendingRows)
        } catch (_) {}
        pendingRows = null
      }

      safeRedraw()
    }

    onMounted(() => {
      if (!el.value) return

      table = new Tabulator(el.value, {
        data: props.rows,
        columns: mapColumns(props.columns),
        index: 'id',
        height: '100%',
        layout: 'fitColumns',
        reactiveData: false,
        pagination: true,
        paginationSize: 50,
        paginationSizeSelector: [25, 50, 100, 200],
        movableColumns: true,
        resizableColumns: true,
        tableBuilt: () => {
          tableReady = true
          flushPendingUpdates()
        },
        cellClick: (_e, cell) => {
          if (cell) cell.edit(true)
        },
        cellEdited: (cell) => {
          emit('cell-edited', {
            row: cell.getRow().getData(),
            field: cell.getField(),
            value: cell.getValue(),
          })
        },
      })

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          safeRedraw()
        })
        resizeObserver.observe(el.value)
      }
    })

    watch(
      () => props.rows,
      (newRows) => {
        if (!table) return
        if (!tableReady) {
          pendingRows = newRows
          return
        }
        try {
          table.replaceData(newRows)
        } catch (_) {}
        safeRedraw()
      },
      { deep: false }
    )

    watch(
      () => props.columns,
      (newColumns) => {
        if (!table) return
        if (!tableReady) {
          pendingColumns = newColumns
          return
        }
        try {
          table.setColumns(mapColumns(newColumns))
        } catch (_) {}
        safeRedraw()
      },
      { deep: false }
    )

    watch(
      () => props.active,
      (active) => {
        if (!active) return
        requestAnimationFrame(() => safeRedraw())
      }
    )

    onBeforeUnmount(() => {
      tableReady = false
      pendingRows = null
      pendingColumns = null
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      if (table) {
        try {
          table.destroy()
        } catch (_) {}
        table = null
      }
    })

    return { el }
  },
}
</script>

<style>
.tabulator-host {
  width: 100%;
  height: 100%;
  min-height: 220px;
  background: #141414;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.tabulator-host .tabulator {
  font-size: 14px;
  background: transparent !important;
  color: var(--text) !important;
  border: none !important;
}

.tabulator-host .tabulator-header {
  background: #161616 !important;
  font-weight: 600;
  border-bottom: 1px solid var(--border) !important;
}

.tabulator-host .tabulator-header .tabulator-col {
  background: transparent !important;
  color: var(--muted) !important;
  border-right: 1px solid var(--border) !important;
}

.tabulator-host .tabulator-tableholder,
.tabulator-host .tabulator-table,
.tabulator-host .tabulator-row,
.tabulator-host .tabulator-row.tabulator-row-even,
.tabulator-host .tabulator-row.tabulator-row-odd {
  background: #141414 !important;
}

.tabulator-host .tabulator-cell {
  padding: 0.75rem;
  background: transparent !important;
  color: var(--text) !important;
  border-right: 1px solid var(--border) !important;
  border-bottom: 1px dashed var(--border) !important;
}

.tabulator-host .tabulator-cell.cell-null {
  background: rgba(255, 99, 99, 0.12) !important;
  color: #ffb3b3 !important;
  font-style: italic;
}

.tabulator-host .tabulator-row.tabulator-selected {
  background: rgba(29, 185, 84, 0.2) !important;
}

.tabulator-host .tabulator-footer {
  background: #161616 !important;
  color: var(--muted) !important;
  border-top: 1px solid var(--border) !important;
}

.tabulator-host .tabulator-page {
  color: var(--muted) !important;
}

.tabulator-host .tabulator-page.active {
  color: var(--accent) !important;
}

.tabulator-host .tabulator-row:hover {
  background: rgba(29, 185, 84, 0.12) !important;
}
</style>
