import { revealDelayStyle } from '../../../src/utils/home/reveal'

describe('revealDelayStyle', () => {
  it('builds the reveal delay CSS variable from index, start, and step', () => {
    expect(revealDelayStyle(0)).toEqual({ '--reveal-delay': '0ms' })
    expect(revealDelayStyle(3, 20, 50)).toEqual({ '--reveal-delay': '170ms' })
  })
})
