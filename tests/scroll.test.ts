// "Run" brings the lab canvas into view only when it isn't already mostly on screen.
import { describe, expect, it } from 'vitest'
import { visibleFraction } from '../src/canvas'

const VH = 812 // phone viewport height (375 x 812)
const HEADER = 68 // sticky site header

describe('visibleFraction (decides whether Run scrolls to the canvas)', () => {
  it('fully on screen → 1 (desktop: no jump)', () => {
    expect(visibleFraction(120, 520, 900, HEADER)).toBe(1)
  })
  it('phone: canvas scrolled up above the controls → 0, so Run scrolls to it', () => {
    expect(visibleFraction(-400, -100, VH, HEADER)).toBe(0)
  })
  it('hidden behind the sticky header counts as not visible', () => {
    expect(visibleFraction(0, 68, VH, HEADER)).toBe(0)
    expect(visibleFraction(-100, 268, VH, HEADER)).toBeCloseTo(200 / 368, 12)
  })
  it('partly below the screen bottom', () => {
    expect(visibleFraction(612, 912, VH, HEADER)).toBeCloseTo(200 / 300, 12) // 67 % < 70 % → scrolls
    expect(visibleFraction(500, 800, VH, HEADER)).toBe(1)
  })
  it('zero-height element → 0', () => {
    expect(visibleFraction(100, 100, VH, HEADER)).toBe(0)
  })
})
