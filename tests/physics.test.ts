// The chapter's formulas, checked against its worked examples. Every example is solved two ways:
// (a) with the functions the labs and the page use (src/physics.ts), and (b) with plain arithmetic
// written out by hand here (or with a different physical route), and both must agree.
import { describe, expect, it } from 'vitest'
import {
  G, areaUnder, areaUpTo, forceAt, freeFall, inclineEffort, inclineMA, kineticEnergy, kmhToMs,
  leverEffort, leverMA, mechanicalAdvantage, msToKmh, potentialEnergy, power, sAfter, speedAfterDrop,
  speedFromKE, vAfter, vSquared, work, workFromSpeeds,
} from '../src/physics'

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)))

describe('7.1 work: W = F × s', () => {
  it('1 J = 1 N × 1 m, and work scales with force and with displacement (3 bags / 3 m)', () => {
    expect(work(1, 1)).toBe(1)
    const m = 5
    const one = work(m * G, 1)
    expect(work(3 * m * G, 1)).toBe(3 * one)
    expect(work(m * G, 3)).toBe(3 * one)
  })
  it('zero work when F = 0 or s = 0; negative when s is opposite to F', () => {
    expect(work(0, 5)).toBe(0)
    expect(work(50, 0)).toBe(0)
    expect(work(10, -2)).toBe(-20)
  })
  it('area under a constant-force graph = F × s (Fig. 7.4 idea: 10 N over 1 m = 10 J)', () => {
    expect(areaUnder([[0, 10], [1, 10]])).toBe(10)
  })
  it('area under a changing force (trapezium/triangles) and running area', () => {
    const pts = [[0, 0], [1, 50], [3, 50], [4, 0]] as const
    expect(areaUnder(pts)).toBe(150)
    expect(areaUpTo(pts, 1)).toBe(25)
    expect(areaUpTo(pts, 0.5)).toBeCloseTo(0.5 * 0.5 * 25, 12) // triangle up to 0.5 m: ½ × 0.5 × 25
    expect(areaUpTo(pts, 3.5)).toBeCloseTo(25 + 100 + (50 + 25) / 2 * 0.5, 12)
    expect(forceAt(pts, 3.5)).toBe(25)
  })
  it('Example 7.2: goalkeeper, 200 N with hands moving back 15 cm → −30 J', () => {
    close(work(200, -0.15), -30)
    close(200 * -15 / 100, -30)
  })
})

describe('7.4 kinetic energy', () => {
  it('W = ½ m (v² − u²) equals F × s for a constant force (derivation 7.4–7.5)', () => {
    const m = 3, u = 2, a = 1.5, t = 4
    const v = vAfter(u, a, t)
    const s = sAfter(u, a, t)
    close(vSquared(u, a, s), v * v)
    close(work(m * a, s), workFromSpeeds(m, u, v))
  })
  it('Example 7.4: doubling the speed gives 4 × the kinetic energy', () => {
    close(kineticEnergy(7, 2 * 9) / kineticEnergy(7, 9), 4)
  })
  it('Example 7.5: 0.2 kg at 154.8 km/h → 43 m/s → 184.9 J', () => {
    close(kmhToMs(154.8), 43)
    close(154.8 / 3.6, 43)
    close(kineticEnergy(0.2, kmhToMs(154.8)), 184.9)
    close(0.5 * 0.2 * 43 * 43, 184.9)
  })
  it('Example 7.6: jet 15000 kg, 367500 N over 100 m → 70 m/s = 252 km/h', () => {
    const W = work(367500, -100)
    const v = Math.sqrt((-2 * W) / 15000) // 0 − ½ m v² = W
    close(v, 70)
    // second way: deceleration and v² = 2as
    const a = 367500 / 15000
    close(Math.sqrt(2 * a * 100), 70)
    close(msToKmh(70), 252)
  })
  it('speedFromKE inverts K = ½ m v²', () => {
    close(speedFromKE(10, kineticEnergy(10, 6)), 6)
  })
})

describe('7.4 potential energy and conservation', () => {
  it('Example 7.7: 200 g raised 10 m → 20 J', () => {
    close(potentialEnergy(0.2, 10), 20)
    close(kineticEnergy(0.2, speedAfterDrop(10)), 20) // second way: KE needed to get there
  })
  it('free fall (Eq. 7.9–7.10): K + U = m g h at every instant', () => {
    const m = 2, h = 20
    for (const t of [0, 0.3, 0.9, 1.5, 2]) {
      const { v, height } = freeFall(h, t)
      close(height, h - 0.5 * G * t * t)
      close(v, G * t)
      close(kineticEnergy(m, v) + potentialEnergy(m, height), m * G * h)
      // gain in K equals loss in U: ½ m g² t²
      close(kineticEnergy(m, v), 0.5 * m * G * G * t * t)
    }
  })
  it('Example 7.8: v = √(2gh) at the bottom of a slide, the same as a free fall', () => {
    for (const h of [1, 2.5, 5, 10]) {
      const tFall = Math.sqrt((2 * h) / G)
      close(speedAfterDrop(h), freeFall(h, tFall).v)
      close(speedAfterDrop(h) ** 2, vSquared(0, G, h))
    }
  })
  it('Example 7.9: truck on 30° escape ramp needs 20 m', () => {
    const m = 10000, v = kmhToMs(72), f = 50000
    close(v, 20)
    const K = kineticEnergy(m, v)
    close(K, 2000000)
    // work–energy: −f d = m g (d/2) − K  ⇒  d = K / (f + m g / 2)
    const d = K / (f + (m * G) / 2)
    close(d, 20)
    close(2000000 / 100000, 20)
  })
})

describe('7.5 power', () => {
  it('Example 7.10: 75 kg up 2 m in 5 s → 300 W', () => {
    close(power(potentialEnergy(75, 2), 5), 300)
    close(75 * G * (2 / 5), 300) // second way: force × average speed
  })
  it('Example 7.11: 1000 kg car, 0 → 72 km/h in 10 s → 20000 W', () => {
    const W = workFromSpeeds(1000, 0, kmhToMs(72))
    close(W, 200000)
    close(power(W, 10), 20000)
    // second way: a = 2 m/s², F = 2000 N, s = 100 m
    const a = 20 / 10
    close(work(1000 * a, sAfter(0, a, 10)), 200000)
  })
})

describe('7.6 simple machines', () => {
  it('fixed pulley MA = 1', () => {
    expect(mechanicalAdvantage(250, 250)).toBe(1)
  })
  it('Example 7.12: 30 cm step, 40 cm base → L = 50 cm, MA = 5/3 ≈ 1.67', () => {
    const L = Math.hypot(30, 40)
    close(L, 50)
    close(inclineMA(L, 30), 5 / 3)
    expect(inclineMA(L, 30).toFixed(2)).toBe('1.67')
    // second way: MA = load / effort with F′ = m g h / L
    close(mechanicalAdvantage(7 * G, inclineEffort(7, 0.3, 0.5)), 5 / 3)
  })
  it('inclined plane: F′ × L = m g h for every ramp', () => {
    for (const [m, h, L] of [[40, 1, 4], [10, 0.5, 0.5], [100, 2, 6]]) {
      close(inclineEffort(m, h, L) * L, potentialEnergy(m, h))
    }
  })
  it('Example 7.13: 15 kg at 2 m balances 30 kg at 1 m', () => {
    close(leverEffort(15, 2, 1), 30) // "effort" needed at 1 m to balance 15 kg at 2 m
    close((15 * 2) / 30, 1)
    close(leverMA(2, 0.5), 4)
  })
  it('lever: F1 d1 = F2 d2 (work in = work out) for a small turn', () => {
    const theta = 0.1
    const d1 = 2 * Math.sin(theta), d2 = 0.5 * Math.sin(theta)
    const F2 = 400, F1 = leverEffort(F2, 0.5, 2)
    close(F1 * d1, F2 * d2)
  })
})
