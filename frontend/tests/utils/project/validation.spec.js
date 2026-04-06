import { formatIssueValue, normalizeDraftValue } from '../../../src/utils/project/validation'

describe('project validation utils', () => {
  it('normalizes draft values by trimming text and collapsing empties to null', () => {
    expect(normalizeDraftValue(null)).toBeNull()
    expect(normalizeDraftValue(undefined)).toBeNull()
    expect(normalizeDraftValue('   ')).toBeNull()
    expect(normalizeDraftValue('  draft value  ')).toBe('draft value')
    expect(normalizeDraftValue(42)).toBe('42')
  })

  it('formats validation issue values with a null placeholder', () => {
    expect(formatIssueValue(null)).toBe('null')
    expect(formatIssueValue(undefined)).toBe('null')
    expect(formatIssueValue('')).toBe('null')
    expect(formatIssueValue(false)).toBe('false')
    expect(formatIssueValue(15)).toBe('15')
  })
})
