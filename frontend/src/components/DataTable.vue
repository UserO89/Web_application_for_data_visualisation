<template>
  <div ref="el" class="data-table"></div>
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
  },
  emits: ['cell-edited'],
  setup(props, { emit }) {
    const el = ref(null)
    let table = null

    onMounted(() => {
      if (!el.value) return

      table = new Tabulator(el.value, {
        data: props.rows,
        columns: props.columns,
        layout: 'fitColumns',
        reactiveData: true,
        pagination: true,
        paginationSize: 50,
        paginationSizeSelector: [25, 50, 100, 200],
        movableColumns: true,
        resizableColumns: true,
        cellEdited: (cell) => {
          emit('cell-edited', {
            row: cell.getRow().getData(),
            field: cell.getField(),
            value: cell.getValue(),
          })
        },
      })
    })

    watch(
      () => props.rows,
      (newRows) => {
        if (table) {
          table.replaceData(newRows)
        }
      },
      { deep: true }
    )

    watch(
      () => props.columns,
      (newColumns) => {
        if (table) {
          table.setColumns(newColumns)
        }
      },
      { deep: true }
    )

    onBeforeUnmount(() => {
      if (table) {
        table.destroy()
      }
    })

    return { el }
  },
}
</script>

<style>
.data-table {
  background: white;
  border-radius: 4px;
  overflow: hidden;
}

.tabulator {
  font-size: 14px;
}

.tabulator .tabulator-header {
  background: #f8f9fa;
  font-weight: 600;
}

.tabulator .tabulator-cell {
  padding: 0.75rem;
}

.tabulator .tabulator-row:hover {
  background: #f0f0f0;
}
</style>
