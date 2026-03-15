import {
  buildValidationSummaryLine,
  extractProblematicColumns,
  normalizeValidationReport,
} from '../../src/utils/validationReport'

describe('validation report normalization', () => {
  it('returns null for unsupported payloads', () => {
    expect(normalizeValidationReport(null)).toBeNull()
    expect(normalizeValidationReport(undefined)).toBeNull()
    expect(normalizeValidationReport('legacy')).toBeNull()
  })

  it('normalizes summary/problem columns and ignores legacy issue dump', () => {
    const normalized = normalizeValidationReport({
      summary: {
        rows_imported: '7',
        rows_skipped: '1',
        problematic_columns: 0,
        normalized_cells: '5',
        nullified_cells: '2',
      },
      problem_columns: [
        {
          column_index: '2',
          column_name: 'Revenue',
          issue_count: '3',
          normalized_count: '1',
          nullified_count: '2',
          review_samples: [
            { row: '4', original_value: '12,5', action: 'normalized', new_value: 12.5, reason: 'Numeric format normalized' },
            { row: 0, original_value: 'legacy', action: 'nullified', new_value: null, reason: 'invalid row should be removed' },
          ],
        },
        {
          column_index: 3,
          column_name: 'EventDate',
          issue_count: 1,
          normalized_count: 0,
          nullified_count: 1,
          review_samples: [
            { row: 5, original_value: '2024/13/44', action: 'nullified', new_value: null, reason: 'Invalid date or datetime value' },
          ],
        },
      ],
      issues: [
        { code: 'legacy_warning', message: 'Old issue model payload' },
      ],
    })

    expect(normalized).not.toBeNull()
    expect(normalized.summary.rows_imported).toBe(7)
    expect(normalized.summary.rows_skipped).toBe(1)
    expect(normalized.summary.problematic_columns).toBe(2)
    expect(normalized.summary.normalized_cells).toBe(5)
    expect(normalized.summary.nullified_cells).toBe(2)

    expect(normalized.problem_columns).toHaveLength(2)
    expect(normalized.problem_columns[0].column_name).toBe('Revenue')
    expect(normalized.problem_columns[0].problematic_value_count).toBe(3)
    expect(normalized.problem_columns[0].review_samples).toHaveLength(1)
    expect(normalized.problem_columns[0].review_samples[0].row).toBe(4)

    expect(normalized).not.toHaveProperty('issues')
  })

  it('keeps blocking error payload for blocked imports', () => {
    const normalized = normalizeValidationReport({
      summary: { import_status: 'blocked' },
      problem_columns: [],
      blocking_error: {
        code: 'file_no_rows',
        message: 'The uploaded file has no readable rows.',
      },
    })

    expect(normalized.summary.import_status).toBe('blocked')
    expect(normalized.problem_columns).toHaveLength(0)
    expect(normalized.blocking_error?.code).toBe('file_no_rows')
  })

  it('builds a compact summary line and de-emphasizes empty marker samples', () => {
    const summaryLine = buildValidationSummaryLine({
      rows_imported: 10,
      rows_skipped: 2,
      problematic_columns: 1,
      normalized_cells: 3,
      nullified_cells: 4,
    })
    expect(summaryLine).toContain('10 imported')
    expect(summaryLine).toContain('4 may become null')

    const columns = extractProblematicColumns([
      {
        column_name: 'Amount',
        issue_count: 6,
        normalized_count: 1,
        nullified_count: 5,
        review_samples: [
          { row: 2, original_value: null, action: 'nullified', new_value: null, reason: 'Empty marker converted to null' },
          { row: 3, original_value: '', action: 'nullified', new_value: null, reason: 'Empty marker converted to null' },
          { row: 4, original_value: 'abc', action: 'nullified', new_value: null, reason: 'Invalid numeric value' },
        ],
      },
    ])

    expect(columns).toHaveLength(1)
    expect(columns[0].visible_review_samples).toHaveLength(1)
    expect(columns[0].hidden_review_sample_count).toBe(2)
    expect(columns[0].visible_review_samples.map((sample) => sample.original_value)).toContain('abc')
  })
})
