// The ManimGL clips are pre-rendered video, so we check their source: every number shown on screen
// must be right, recomputed here.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { G, areaUnder, inclineEffort, kineticEnergy, leverEffort, potentialEnergy, speedAfterDrop } from '../src/physics'

const py = readFileSync(resolve(import.meta.dirname, '../manim/ch7_clips.py'), 'utf8')

describe('WorkArea clip', () => {
  it('20 N over 3 m = 60 J', () => {
    expect(areaUnder([[0, 20], [3, 20]])).toBe(60)
    expect(py).toContain('20 N × 3 m = 60 J')
  })
  it('force growing 0 → 30 N over 4 m: triangle = 60 J', () => {
    expect(areaUnder([[0, 0], [4, 30]])).toBe(60)
    expect(py).toContain('= ½ × 4 m × 30 N')
  })
  it('−15 N over 2 m = −30 J', () => {
    expect(areaUnder([[0, -15], [2, -15]])).toBe(-30)
    expect(py).toContain('W = −30 J')
  })
})

describe('EnergySwap clip', () => {
  it('2 kg from 5 m: m g h = 100 J, lands at 10 m/s after 1 s', () => {
    expect(potentialEnergy(2, 5)).toBe(100)
    expect(speedAfterDrop(5)).toBe(10)
    expect(kineticEnergy(2, 10)).toBe(100)
    expect(Math.sqrt((2 * 5) / G)).toBe(1) // fall time used for the animation clock
    expect(py).toContain('√(2 × 10 × 5) = 10 m s⁻¹')
    expect(py).toContain('the total stays 100 J')
  })
})

describe('SameWork clip', () => {
  it('10 kg box up 1 m: 100 N straight up, 25 N along a 4 m ramp, both 100 J, MA 4', () => {
    expect(10 * G).toBe(100)
    expect(inclineEffort(10, 1, 4)).toBe(25)
    expect(inclineEffort(10, 1, 4) * 4).toBe(potentialEnergy(10, 1))
    expect(py).toContain('F′ = 25 N over 4 m')
    expect(py).toContain('MA = L / h = 4 m / 1 m = 4')
  })
  it('lever 2 m / 0.5 m: 100 N lifts 400 N; 100 × 0.4 = 400 × 0.1 = 40 J', () => {
    expect(leverEffort(400, 0.5, 2)).toBe(100)
    expect(100 * 0.4).toBeCloseTo(400 * 0.1, 12)
    expect(2 * Math.sin(Math.asin(0.4 / 2))).toBeCloseTo(0.4, 12)
    expect(0.5 * Math.sin(Math.asin(0.4 / 2))).toBeCloseTo(0.1, 12)
    expect(py).toContain('100 N × 0.4 m = 40 J')
    expect(py).toContain('400 N × 0.1 m = 40 J')
  })
})
