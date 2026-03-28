<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="validation-modal-backdrop"
      @click.self="$emit('close')"
    >
      <div class="validation-modal panel" role="dialog" aria-modal="true" aria-label="Import review">
        <div v-if="showDatasetBindingNote" class="dataset-binding-note">
          <div class="dataset-binding-title">This project already contains a dataset.</div>
          <div class="dataset-binding-text">To work with another dataset, create a new project.</div>
        </div>

        <div class="validation-head">
          <div class="validation-title">Import Review</div>
          <div class="validation-actions">
            <button type="button" class="btn" @click="$emit('clear')">Clear Report</button>
            <button type="button" class="btn" @click="$emit('close')">Close</button>
          </div>
        </div>

        <div v-if="blockingError?.message" class="blocking-error">
          {{ blockingError.message }}
        </div>

        <section class="validation-section">
          <div class="section-title">Summary</div>
          <div class="validation-summary-line">
            {{ resolvedSummaryLine }}
          </div>
          <div class="validation-summary-grid">
            <div class="summary-item">
              <span class="summary-label">Rows imported</span>
              <strong class="summary-value">{{ reviewSummary.rows_imported }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">Rows skipped</span>
              <strong class="summary-value">{{ reviewSummary.rows_skipped }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">Problematic columns</span>
              <strong class="summary-value">{{ reviewSummary.problematic_columns }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">Normalized values</span>
              <strong class="summary-value">{{ reviewSummary.normalized_cells }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">May become null</span>
              <strong class="summary-value">{{ reviewSummary.nullified_cells }}</strong>
            </div>
          </div>
        </section>

        <section class="validation-section">
          <div class="section-title">Problematic Columns</div>
          <div v-if="reviewColumns.length" class="table-wrap">
            <table class="data-table columns-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Problematic values</th>
                  <th>Normalized</th>
                  <th>May become null</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="column in reviewColumns"
                  :key="`problem-column-row-${column.column_name}-${column.column_index}`"
                >
                  <td>
                    <span class="column-name">{{ column.column_name }}</span>
                    <span class="column-index">#{{ column.column_index || '-' }}</span>
                  </td>
                  <td>{{ column.problematic_value_count || 0 }}</td>
                  <td>{{ column.normalized_count || 0 }}</td>
                  <td>{{ column.nullified_count || 0 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="validation-summary-empty">No problematic columns found.</div>
        </section>

        <section class="validation-section">
          <div class="section-title">Review Samples</div>
          <div v-if="reviewColumns.length" class="column-list">
            <article
              v-for="column in reviewColumns"
              :key="`problem-column-${column.column_name}-${column.column_index}`"
              class="column-card"
            >
              <div class="column-head">
                <div>
                  <div class="column-name">{{ column.column_name }}</div>
                  <div class="column-meta">
                    {{ column.problematic_value_count || 0 }} problematic value{{ (column.problematic_value_count || 0) === 1 ? '' : 's' }}
                  </div>
                </div>
                <div class="column-counters">
                  <span class="counter-chip">Normalized: {{ column.normalized_count || 0 }}</span>
                  <span class="counter-chip nullified">Nullified: {{ column.nullified_count || 0 }}</span>
                </div>
              </div>

              <div v-if="column.visible_review_samples.length" class="table-wrap samples-wrap">
                <table class="data-table samples-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Original value</th>
                      <th>Action</th>
                      <th>Result</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="sample in column.visible_review_samples"
                      :key="`sample-${column.column_name}-${sample.row}-${sample.original_value}-${sample.new_value}`"
                    >
                      <td>{{ sample.row }}</td>
                      <td>{{ formatReviewValue(sample.original_value) }}</td>
                      <td>
                        <span :class="['action-badge', sample.action === 'nullified' ? 'action-nullified' : 'action-normalized']">
                          {{ sample.action === 'nullified' ? 'nullified' : 'normalized' }}
                        </span>
                      </td>
                      <td>{{ formatReviewValue(sample.new_value) }}</td>
                      <td>{{ sample.reason }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="column-empty">
                No reviewable samples for this column.
              </div>
              <div v-if="column.hidden_review_sample_count > 0" class="sample-note">
                {{ column.hidden_review_sample_count }} empty-marker sample{{ column.hidden_review_sample_count === 1 ? '' : 's' }} hidden from preview.
              </div>
            </article>
          </div>
          <div v-else class="validation-summary-empty">No review samples found.</div>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script>
import {
  buildValidationSummaryLine,
  extractProblematicColumns,
  extractValidationSummary,
  formatReviewValue,
} from '../../utils/validationReport'

export default {
  name: 'ProjectValidationModal',
  props: {
    isOpen: { type: Boolean, default: false },
    summary: { type: Object, default: () => ({}) },
    summaryLine: { type: String, default: '' },
    problemColumns: { type: Array, default: () => [] },
    blockingError: { type: Object, default: null },
    showDatasetBindingNote: { type: Boolean, default: false },
  },
  emits: ['close', 'clear'],
  computed: {
    reviewSummary() {
      return extractValidationSummary(this.summary)
    },
    resolvedSummaryLine() {
      if (this.summaryLine) return this.summaryLine
      return buildValidationSummaryLine(this.reviewSummary)
    },
    reviewColumns() {
      return extractProblematicColumns(this.problemColumns)
    },
  },
  methods: {
    formatReviewValue,
  },
}
</script>

<style scoped>
.validation-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2200;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.validation-modal {
  width: min(860px, 94vw);
  max-height: 84vh;
  overflow: auto;
}
.validation-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.validation-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.validation-title { font-size: 15px; font-weight: 700; color: #93f6b3; }
.dataset-binding-note {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #151515;
  padding: 10px 12px;
  margin-bottom: 12px;
}
.dataset-binding-title { font-weight: 700; }
.dataset-binding-text { color: var(--muted); font-size: 13px; margin-top: 2px; }
.validation-section { margin-top: 12px; }
.validation-summary-line { color: var(--muted); font-size: 13px; line-height: 1.45; margin-bottom: 8px; }
.blocking-error {
  color: #fda4af;
  border: 1px solid rgba(244, 63, 94, 0.35);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
}
.validation-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}
.summary-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  background: #161616;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.summary-label { color: var(--muted); font-size: 11px; }
.summary-value { color: var(--text); font-size: 16px; }
.section-title { font-size: 12px; font-weight: 700; color: var(--muted); }
.columns-table { min-width: 540px; }
.column-list { display: flex; flex-direction: column; gap: 10px; }
.column-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #161616;
  padding: 10px;
}
.column-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.column-name { font-weight: 700; color: var(--text); }
.column-meta { color: var(--muted); font-size: 12px; margin-top: 2px; }
.column-index {
  color: var(--muted);
  font-size: 11px;
  margin-left: 6px;
}
.column-counters { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
.counter-chip {
  font-size: 11px;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 8px;
}
.counter-chip.nullified {
  border-color: rgba(245, 158, 11, 0.45);
  color: #fbbf24;
}
.samples-wrap { margin-top: 8px; }
.samples-table { min-width: 700px; }
.action-badge {
  font-size: 10px;
  border-radius: 999px;
  padding: 2px 6px;
  text-transform: lowercase;
}
.action-normalized {
  border: 1px solid rgba(34, 197, 94, 0.45);
  color: #86efac;
}
.action-nullified {
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #fbbf24;
}
.sample-note {
  margin-top: 6px;
  color: var(--muted);
  font-size: 11px;
}
.column-empty,
.validation-summary-empty {
  color: var(--muted);
  font-size: 12px;
  margin-top: 8px;
}
</style>
