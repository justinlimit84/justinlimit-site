// The labs must obey the textbook. These tests drive the same models the canvases draw from.
import { describe, expect, it } from 'vitest'
import { climbAt, fixedPulley, incline, lever, stairRace, workOf, workProfile } from '../src/lab-models'
import {
  G, areaUpTo, kineticEnergy, potentialEnergy, rideEnergy, speedAfterDrop, startRide, stepRide, trackAt, trackFor,
  type TrackKind,
} from '../src/physics'

// The ride is integrated numerically (RK4, 0.5 ms steps). Where a slide meets its flat run-out there is a sharp
// corner, so a tiny numerical drift appears there. We allow 0.05 % of m g h: far below the whole joules shown.
const DRIFT = 5e-4

/** Run a ride until it ends (or t_max), checking energy on the way. */
function ride(kind: TrackKind, m: number, h: number, f: number, tMax = 30, dt = 1 / 60) {
  const tr = trackFor(kind, h)
  let st = startRide()
  let worstDrift = 0
  let maxHeightAfterStart = 0
  const E0 = potentialEnergy(m, h)
  while (!st.done && st.t < tMax) {
    st = stepRide(tr, st, m, f, dt)
    const e = rideEnergy(tr, st, m, f)
    worstDrift = Math.max(worstDrift, Math.abs(e.K + e.U + e.heat - E0) / E0)
    if (st.t > 0.2) maxHeightAfterStart = Math.max(maxHeightAfterStart, e.height)
  }
  return { tr, st, worstDrift, maxHeightAfterStart, e: rideEnergy(tr, st, m, f) }
}

describe('Lab 1: work = area under the F–s graph', () => {
  it('constant force along the motion: W = F × s', () => {
    expect(workOf('constant', 'along', 20, 3)).toBe(60)
    expect(workOf('constant', 'along', 50, 5)).toBe(250)
  })
  it('against the motion: W = −F × s; perpendicular: W = 0', () => {
    expect(workOf('constant', 'against', 20, 3)).toBe(-60)
    expect(workOf('constant', 'perpendicular', 20, 3)).toBe(0)
    expect(workOf('changing', 'perpendicular', 20, 3)).toBe(0)
  })
  it('changing force (ramp up a fifth, hold, ease off a fifth): area = 0.8 F s, e.g. 48 J for 20 N over 3 m', () => {
    expect(workOf('changing', 'along', 20, 3)).toBeCloseTo(48, 12)
    expect(workOf('changing', 'against', 20, 3)).toBeCloseTo(-48, 12)
    const pts = workProfile('changing', 'along', 20, 3)
    expect(pts[0]).toEqual([0, 0])
    expect(pts[pts.length - 1]).toEqual([3, 0])
  })
})

describe('Lab 2: motion from forces conserves K + U (+ heat)', () => {
  const kinds: TrackKind[] = ['drop', 'straight', 'curve', 'wavy']
  for (const kind of kinds) {
    it(`${kind}: frictionless, reaches the bottom at √(2gh), energy constant`, () => {
      const h = 5
      const { tr, st, worstDrift } = ride(kind, 30, h, 0)
      expect(st.done).toBe(true)
      expect(worstDrift).toBeLessThan(DRIFT)
      expect(trackAt(tr, st.s).y).toBeCloseTo(0, 9)
      expect(Math.abs(st.v)).toBeCloseTo(speedAfterDrop(h), 2) // 10 m/s, to the 2 decimals the lab displays
    })
  }
  it('free fall matches h′ = h − ½ g t² and v = g t', () => {
    const tr = trackFor('drop', 20)
    let st = startRide()
    for (let i = 0; i < 60; i++) st = stepRide(tr, st, 2, 0, 1 / 60) // 1 s
    expect(st.t).toBeCloseTo(1, 9)
    expect(st.v).toBeCloseTo(G * 1, 6)
    expect(trackAt(tr, st.s).y).toBeCloseTo(20 - 0.5 * G * 1, 6)
  })
  it('speed at the bottom does not depend on the mass (no friction)', () => {
    const a = ride('wavy', 10, 6, 0).st.v
    const b = ride('wavy', 60, 6, 0).st.v
    expect(a).toBeCloseTo(b, 6)
    expect(a).toBeCloseTo(speedAfterDrop(6), 3)
  })
  it('valley track without friction never climbs above the start height (pendulum-like)', () => {
    const h = 4
    const { maxHeightAfterStart, worstDrift } = ride('valley', 20, h, 0, 20)
    expect(worstDrift).toBeLessThan(DRIFT)
    expect(maxHeightAfterStart).toBeLessThanOrEqual(h + 1e-3)
    expect(maxHeightAfterStart).toBeGreaterThan(h - 0.02) // and it does get back up there
  })
  it('with friction: work against friction = f × distance, and K + U + heat = m g h (work–energy theorem)', () => {
    for (const kind of ['straight', 'curve', 'valley'] as TrackKind[]) {
      const m = 30, h = 5, f = 40
      const { st, worstDrift, e } = ride(kind, m, h, f, 60)
      expect(worstDrift).toBeLessThan(1e-3)
      expect(e.heat).toBeCloseTo(f * st.path, 9)
      expect(e.K + e.U).toBeLessThan(potentialEnergy(m, h))
    }
  })
  it('straight slide with friction: final speed from ½ m v² = m g h − f × L', () => {
    const m = 30, h = 5, f = 40
    const { st } = ride('straight', m, h, f)
    const L = st.path // the whole track, slide + run-out
    const K = potentialEnergy(m, h) - f * L
    expect(Math.abs(kineticEnergy(m, st.v) - K)).toBeLessThan(DRIFT * potentialEnergy(m, h))
  })
})

describe('Lab 3: power', () => {
  it('same work for both, power = W / t', () => {
    const r = stairRace(50, 6, 30, 6)
    expect(r.W).toBe(3000) // 50 × 10 × 6
    expect(r.pWalk).toBe(100)
    expect(r.pRun).toBe(500)
    expect(r.ratio).toBe(5)
  })
})

describe('Lab 4: simple machines', () => {
  it('inclined plane: F′ = m g h / L, MA = L / h, F′ L = m g h', () => {
    const r = incline(40, 1, 4)
    expect(r.load).toBe(400)
    expect(r.effort).toBe(100)
    expect(r.ma).toBe(4)
    expect(r.workByYou).toBe(r.gainPE)
    expect(r.load / r.effort).toBe(r.ma)
  })
  it('lever: balanced exactly when effort × effort arm = load × load arm', () => {
    const r = lever(400, 0.5, 2, 100)
    expect(r.balanced).toBe(true)
    expect(r.needed).toBe(100)
    expect(r.ma).toBe(4)
    expect(lever(400, 0.5, 2, 120).tips).toBe(1) // effort side goes down
    expect(lever(400, 0.5, 2, 80).tips).toBe(-1) // load side stays down
  })
  it('fixed pulley: effort = load, MA = 1, load rises as far as the rope is pulled', () => {
    const r = fixedPulley(150, 0.8)
    expect(r.effort).toBe(150)
    expect(r.ma).toBe(1)
    expect(r.rise).toBe(0.8)
    expect(r.work).toBeCloseTo(120, 12)
  })
})

describe('live values are measured from the motion, never shown before they happen', () => {
  it('Lab 1: work so far grows from 0 to the whole-push total, which equals the area formula', () => {
    for (const [mode, dir, F, s] of [['constant', 'along', 20, 3], ['changing', 'against', 12, 3]] as const) {
      const pts = workProfile(mode, dir, F, s)
      expect(areaUpTo(pts, 0)).toBe(0)
      const half = areaUpTo(pts, s / 2)
      expect(Math.abs(half)).toBeGreaterThan(0)
      expect(Math.abs(half)).toBeLessThan(Math.abs(workOf(mode, dir, F, s)))
      expect(areaUpTo(pts, s)).toBeCloseTo(workOf(mode, dir, F, s), 12) // e.g. −28.8 J for 12 N against over 3 m
    }
    expect(workOf('changing', 'against', 12, 3)).toBeCloseTo(-28.8, 12)
  })
  it('Lab 3: work so far = m g × height reached; steady climb ⇒ power so far is constant; final = m g h and W/T', () => {
    const m = 80, h = 6, T = 20
    expect(climbAt(m, h, T, 0)).toMatchObject({ height: 0, work: 0, power: null, done: false })
    const mid = climbAt(m, h, T, 5)
    expect(mid.height).toBeCloseTo(1.5, 12)
    expect(mid.work).toBeCloseTo(80 * G * 1.5, 9) // 1200 J so far
    expect(mid.power).toBeCloseTo(1200 / 5, 9) // 240 W
    const end = climbAt(m, h, T, 25) // after reaching the top the values freeze
    expect(end).toMatchObject({ height: 6, work: 4800, power: 240, done: true })
    expect(end.work).toBe(stairRace(m, h, T, 6).W)
    expect(climbAt(m, h, 6, 6).power).toBe(stairRace(m, h, T, 6).pRun) // 800 W
  })
  it('Lab 2: KE + PE is recomputed every step from height and speed (and stays m g h without friction)', () => {
    const tr = trackFor('curve', 5)
    let st = startRide()
    const totals: number[] = []
    const kes: number[] = []
    for (let i = 0; i < 60; i++) {
      st = stepRide(tr, st, 40, 0, 1 / 60)
      const e = rideEnergy(tr, st, 40, 0)
      totals.push(e.K + e.U)
      kes.push(e.K)
    }
    expect(kes[59]).toBeGreaterThan(kes[10]) // the parts really change…
    for (const tot of totals) expect(tot).toBeCloseTo(2000, 0) // …but their sum stays at 40 × 10 × 5
  })
})
