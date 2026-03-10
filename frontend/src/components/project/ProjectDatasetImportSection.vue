<template>
  <div>
    <div class="import-top-row">
      <button class="btn" @click="$emit('back')"><- Back to Projects</button>
    </div>
    <div class="panel">
      <div class="section-title">Add Data</div>
      <div class="mode-row">
        <button
          type="button"
          :class="['btn', { primary: importMode === 'file' }]"
          @click="$emit('change-import-mode', 'file')"
        >
          Upload File
        </button>
        <button
          type="button"
          :class="['btn', { primary: importMode === 'manual' }]"
          @click="$emit('change-import-mode', 'manual')"
        >
          Manual Input
        </button>
      </div>

      <form v-if="importMode === 'file'" @submit.prevent="$emit('import')">
        <div class="form-group">
          <label>CSV File</label>
          <input type="file" accept=".csv,.txt" required @change="$emit('file-select', $event)" />
        </div>
        <div class="form-group">
          <label>
            <input
              type="checkbox"
              :checked="Boolean(importOptions?.has_header)"
              @change="setHasHeader($event.target.checked)"
            />
            First row is header
          </label>
        </div>
        <div class="form-group">
          <label>Delimiter</label>
          <input
            type="text"
            maxlength="1"
            :value="importOptions?.delimiter ?? ','"
            @input="setDelimiter($event.target.value)"
          />
        </div>
        <button type="submit" :disabled="!selectedFile || importing" class="btn primary">
          {{ importing ? 'Importing...' : 'Import' }}
        </button>
      </form>

      <div v-else class="manual-builder">
        <div class="mode-row">
          <button class="btn" type="button" @click="$emit('add-manual-column')">+ Column</button>
          <button
            class="btn"
            type="button"
            :disabled="manualHeaders.length <= 1"
            @click="$emit('remove-manual-column')"
          >
            - Column
          </button>
          <button class="btn" type="button" @click="$emit('add-manual-row')">+ Row</button>
          <button
            class="btn"
            type="button"
            :disabled="manualRowsInput.length <= 1"
            @click="$emit('remove-manual-row')"
          >
            - Row
          </button>
        </div>

        <div class="table-wrap manual-table-wrap">
          <table class="data-table manual-table">
            <thead>
              <tr>
                <th v-for="(header, headerIndex) in manualHeaders" :key="`h-${headerIndex}`">
                  <input
                    class="manual-input header"
                    :value="header"
                    :placeholder="`Column ${headerIndex + 1}`"
                    @input="updateHeader(headerIndex, $event.target.value)"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in manualRowsInput" :key="`r-${rowIndex}`">
                <td v-for="(_, colIndex) in manualHeaders" :key="`c-${rowIndex}-${colIndex}`">
                  <input
                    class="manual-input"
                    :value="row?.[colIndex] ?? ''"
                    @input="updateCell(rowIndex, colIndex, $event.target.value)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="manualError" class="manual-error">{{ manualError }}</div>
        <button type="button" :disabled="importing" class="btn primary" @click="$emit('manual-import')">
          {{ importing ? 'Creating...' : 'Create Table' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectDatasetImportSection',
  props: {
    importMode: { type: String, default: 'file' },
    importOptions: { type: Object, default: () => ({ has_header: true, delimiter: ',' }) },
    selectedFile: { type: [Object, null], default: null },
    importing: { type: Boolean, default: false },
    manualHeaders: { type: Array, default: () => [] },
    manualRowsInput: { type: Array, default: () => [] },
    manualError: { type: String, default: '' },
  },
  emits: [
    'back',
    'change-import-mode',
    'change-import-options',
    'file-select',
    'import',
    'add-manual-column',
    'remove-manual-column',
    'add-manual-row',
    'remove-manual-row',
    'manual-import',
    'change-manual-headers',
    'change-manual-rows',
  ],
  setup(props, { emit }) {
    const setHasHeader = (hasHeader) => {
      emit('change-import-options', {
        ...(props.importOptions || {}),
        has_header: Boolean(hasHeader),
      })
    }

    const setDelimiter = (delimiter) => {
      emit('change-import-options', {
        ...(props.importOptions || {}),
        delimiter,
      })
    }

    const updateHeader = (index, value) => {
      const nextHeaders = Array.isArray(props.manualHeaders) ? [...props.manualHeaders] : []
      nextHeaders[index] = value
      emit('change-manual-headers', nextHeaders)
    }

    const updateCell = (rowIndex, colIndex, value) => {
      const nextRows = Array.isArray(props.manualRowsInput)
        ? props.manualRowsInput.map((row) => (Array.isArray(row) ? [...row] : []))
        : []
      if (!nextRows[rowIndex]) return
      nextRows[rowIndex][colIndex] = value
      emit('change-manual-rows', nextRows)
    }

    return {
      setHasHeader,
      setDelimiter,
      updateHeader,
      updateCell,
    }
  },
}
</script>

<style scoped>
.import-top-row { margin-bottom: 12px; }
.section-title { font-weight: 700; margin-bottom: 12px; }
.mode-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.manual-builder { display: flex; flex-direction: column; gap: 10px; }
.manual-table-wrap { max-height: 360px; }
.manual-table { min-width: 600px; }
.manual-input {
  width: 100%;
  min-width: 120px;
  padding: 7px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}
.manual-input:focus { outline: none; border-color: var(--accent); }
.manual-input.header { font-weight: 600; }
.manual-error { color: #ff9b9b; font-size: 13px; }

@media (max-width: 720px) {
  .manual-table { min-width: 520px; }
}
</style>
