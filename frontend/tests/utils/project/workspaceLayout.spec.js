import { sanitizeLayouts } from '../../../src/utils/project/workspaceLayout'

const IDS = ['table', 'chart', 'stats']
const MIN = {
  table: { w: 420, h: 280 },
  chart: { w: 360, h: 320 },
  stats: { w: 300, h: 220 },
}

const buildValidLayouts = () => ({
  table: { x: 0, y: 0, w: 620, h: 430, z: 1 },
  chart: { x: 636, y: 0, w: 364, h: 430, z: 2 },
  stats: { x: 0, y: 446, w: 1000, h: 520, z: 3 },
})

describe('sanitizeLayouts', () => {
  it('returns null for malformed input metadata', () => {
    expect(
      sanitizeLayouts({
        layouts: buildValidLayouts(),
        savedWidth: 1000,
        canvasWidth: 0,
        min: MIN,
        ids: IDS,
      })
    ).toBeNull()

    expect(
      sanitizeLayouts({
        layouts: buildValidLayouts(),
        savedWidth: 1000,
        canvasWidth: 1000,
        min: null,
        ids: IDS,
      })
    ).toBeNull()
  })

  it('clamps extreme values and normalizes invalid z-index', () => {
    const sanitized = sanitizeLayouts({
      layouts: {
        table: { x: -200, y: 999999, w: 2000, h: 9000, z: -5 },
        chart: { x: 700, y: -10, w: 500, h: 320, z: 0 },
        stats: { x: 0, y: 1200, w: 1000, h: 9999, z: 7.8 },
      },
      savedWidth: 1000,
      canvasWidth: 1000,
      min: MIN,
      ids: IDS,
    })

    expect(sanitized).not.toBeNull()
    expect(sanitized.table.x).toBe(0)
    expect(sanitized.table.w).toBe(1000)
    expect(sanitized.table.y).toBe(4800)
    expect(sanitized.table.h).toBe(2200)
    expect(sanitized.table.z).toBe(1)
    expect(sanitized.chart.y).toBe(0)
    expect(sanitized.chart.z).toBe(2)
    expect(sanitized.stats.h).toBe(2200)
    expect(sanitized.stats.z).toBe(8)
  })

  it('falls back when restored layout panels overlap', () => {
    const sanitized = sanitizeLayouts({
      layouts: {
        table: { x: 0, y: 0, w: 700, h: 420, z: 1 },
        chart: { x: 620, y: 0, w: 380, h: 420, z: 2 },
        stats: { x: 0, y: 436, w: 1000, h: 500, z: 3 },
      },
      savedWidth: 1000,
      canvasWidth: 1000,
      min: MIN,
      ids: IDS,
    })

    expect(sanitized).toBeNull()
  })
})
