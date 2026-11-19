// Physics for NCERT Class 9 Science (Exploration, 2026), Ch 7 "Work, Energy, and Simple Machines".
// Pure functions only (no DOM), so the labs, the page and the tests all use the same formulas.
// Symbols follow the chapter: W, F, s, K, U, m, g, h, u, v, a, t, P, L, F′, F1, d1, F2, d2. SI units throughout.

/** Acceleration due to gravity used in all of the chapter's numerical examples (m s⁻²). */
export const G = 10

// ---------------------------------------------------------------- 7.1 work by a constant force
/** W = F × s, where s is the displacement measured along the force (negative if opposite to it). */
export const work = (F: number, s: number) => F * s

/** A point on a force–displacement graph: [displacement s (m), force F (N)]. */
export type Pt = readonly [s: number, F: number]

/** Work done = area under the force–displacement graph (straight-line pieces, so trapezoids are exact). */
export function areaUnder(pts: readonly Pt[]): number {
  let A = 0
  for (let i = 1; i < pts.length; i++) {
    const [s0, f0] = pts[i - 1]
    const [s1, f1] = pts[i]
    A += ((f0 + f1) / 2) * (s1 - s0)
  }
  return A
}

/** Force read off a piecewise-straight F–s graph at displacement x (0 outside the graph). */
export function forceAt(pts: readonly Pt[], x: number): number {
  for (let i = 1; i < pts.length; i++) {
    const [s0, f0] = pts[i - 1]
    const [s1, f1] = pts[i]
    if (x >= s0 && x <= s1) return s1 === s0 ? f1 : f0 + ((f1 - f0) * (x - s0)) / (s1 - s0)
  }
  return 0
}

/** Area under the graph from the first point up to displacement x (the work done so far). */
export function areaUpTo(pts: readonly Pt[], x: number): number {
  const out: Pt[] = []
  for (const p of pts) {
    if (p[0] <= x) out.push(p)
    else break
  }
  if (out.length && out[out.length - 1][0] < x) out.push([x, forceAt(pts, x)])
  return areaUnder(out)
}

// ---------------------------------------------------------------- 7.4 mechanical energy
/** K = ½ m v² (J). */
export const kineticEnergy = (m: number, v: number) => 0.5 * m * v * v
/** Speed (magnitude of velocity) of mass m that has kinetic energy K: v = √(2K/m). */
export const speedFromKE = (m: number, K: number) => Math.sqrt((2 * Math.max(0, K)) / m)
/** Gravitational potential energy near the Earth's surface, U = m g h (zero on the ground). */
export const potentialEnergy = (m: number, h: number, g = G) => m * g * h
/** Work-energy theorem with a constant force: W = ½ m (v² − u²). */
export const workFromSpeeds = (m: number, u: number, v: number) => 0.5 * m * (v * v - u * u)
/** Speed at the bottom of a frictionless drop of height h: ½mv² = mgh ⇒ v = √(2gh). */
export const speedAfterDrop = (h: number, g = G) => Math.sqrt(2 * g * h)

/** km h⁻¹ → m s⁻¹ (× 1000 m / 3600 s). */
export const kmhToMs = (kmh: number) => (kmh * 1000) / 3600
export const msToKmh = (ms: number) => (ms * 3600) / 1000

// ---------------------------------------------------------------- kinematics (Ch 4), used in 7.4
export const vAfter = (u: number, a: number, t: number) => u + a * t
export const sAfter = (u: number, a: number, t: number) => u * t + 0.5 * a * t * t
export const vSquared = (u: number, a: number, s: number) => u * u + 2 * a * s

/** Free fall from rest at height h (Fig. 7.19 idea): after time t, v = g t and h′ = h − ½ g t². */
export function freeFall(h: number, t: number, g = G) {
  const tGround = Math.sqrt((2 * h) / g)
  const tt = Math.min(t, tGround)
  return { v: g * tt, height: h - 0.5 * g * tt * tt, landed: t >= tGround }
}

// ---------------------------------------------------------------- 7.5 power
/** Average power P = W / t (W). */
export const power = (W: number, t: number) => W / t
export const HORSEPOWER = 746 // W (side note in 7.5)

// ---------------------------------------------------------------- 7.6 simple machines
/** Mechanical advantage = load / effort. */
export const mechanicalAdvantage = (load: number, effort: number) => load / effort
/** Inclined plane (frictionless, steady speed): F′ × L = m g h ⇒ F′ = m g h / L. */
export const inclineEffort = (m: number, h: number, L: number, g = G) => (m * g * h) / L
/** MA of an inclined plane = L / h. */
export const inclineMA = (L: number, h: number) => L / h
/** Lever balances when effort × effort arm = load × load arm. */
export const leverEffort = (load: number, loadArm: number, effortArm: number) => (load * loadArm) / effortArm
/** MA of a lever = effort arm / load arm. */
export const leverMA = (effortArm: number, loadArm: number) => effortArm / loadArm

// ---------------------------------------------------------------- energy lab: motion along a track
/**
 * A track is a smooth curve y(x) in metres (y = height above the ground), sampled finely.
 * The object stays on the track. Along the track (arc length σ) its acceleration is
 *   dv/dt = −g · dy/dσ − (f/m) · sign(v)
 * where f is a constant resistive force (friction from a rough surface; 0 = frictionless).
 * Nothing here uses energy conservation: the tests check that conservation comes out of the motion.
 */
export type Track = { name: string; xs: number[]; ys: number[]; sigma: number[] }

export function makeTrack(name: string, fn: (u: number) => [number, number], n = 1200): Track {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i <= n; i++) {
    const [x, y] = fn(i / n)
    xs.push(x)
    ys.push(y)
  }
  const sigma = [0]
  for (let i = 1; i <= n; i++) sigma.push(sigma[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]))
  return { name, xs, ys, sigma }
}

export type TrackKind = 'drop' | 'straight' | 'curve' | 'wavy' | 'valley'

/** Tracks used in the energy lab, all starting at height h. Each slide ends in a short flat run-out. */
export function trackFor(kind: TrackKind, h: number): Track {
  const L = 8 // horizontal length of the sloping part (m)
  const run = 2.5 // flat run-out at the bottom (m)
  const withRun = (f: (u: number) => number) => (w: number): [number, number] => {
    const total = L + run
    const x = w * total
    return x <= L ? [x, f(x / L)] : [x, 0]
  }
  switch (kind) {
    case 'drop':
      return makeTrack('Free fall', (w) => [0, h * (1 - w)])
    case 'straight':
      return makeTrack('Straight slide', withRun((u) => h * (1 - u)))
    case 'curve':
      return makeTrack('Steep, then gentle', withRun((u) => h * (1 - u) * (1 - u)))
    case 'wavy':
      return makeTrack('Wavy slide', withRun((u) => h * (1 - u) + 0.12 * h * Math.sin(2 * Math.PI * u)))
    case 'valley':
      // y = h (2u − 1)², u from 0 to 1.1: starts at h, bottom at u = ½, right end at 1.44 h (higher than the start)
      return makeTrack('Valley track', (w) => {
        const u = 1.1 * w
        return [u * L, h * (2 * u - 1) ** 2]
      })
  }
}

/** Height and slope dy/dσ at arc length σ (linear interpolation between samples). */
export function trackAt(tr: Track, s: number) {
  const { sigma, xs, ys } = tr
  const last = sigma.length - 1
  const c = Math.max(0, Math.min(s, sigma[last]))
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (sigma[mid] <= c) lo = mid
    else hi = mid
  }
  const ds = sigma[hi] - sigma[lo] || 1e-12
  const k = (c - sigma[lo]) / ds
  return {
    x: xs[lo] + (xs[hi] - xs[lo]) * k,
    y: ys[lo] + (ys[hi] - ys[lo]) * k,
    slope: (ys[hi] - ys[lo]) / ds, // dy/dσ, between −1 and 1
  }
}

export type RideState = {
  t: number // time (s)
  s: number // distance along the track from the start (m)
  v: number // velocity along the track (m s⁻¹), + means forwards
  path: number // total distance travelled (m), for the work done against friction
  done: boolean // reached the end of the track, hit the ground, or stopped for good
}

export function startRide(): RideState {
  return { t: 0, s: 0, v: 0, path: 0, done: false }
}

/** Advance the ride by dt seconds (RK4 on the equation of motion, in small sub-steps). */
export function stepRide(tr: Track, st: RideState, m: number, f: number, dt: number, g = G): RideState {
  if (st.done) return st
  const end = tr.sigma[tr.sigma.length - 1]
  const acc = (s: number, v: number) => {
    const { slope } = trackAt(tr, s)
    const drive = -g * slope
    if (f === 0) return drive
    const fr = f / m
    if (Math.abs(v) > 1e-9) return drive - fr * Math.sign(v)
    // at rest: friction holds it unless the slope pulls harder than friction can
    return Math.abs(drive) <= fr ? 0 : drive - fr * Math.sign(drive)
  }
  let { t, s, v, path } = st
  const n = Math.max(1, Math.ceil(dt / 0.0005))
  const h = dt / n
  for (let i = 0; i < n; i++) {
    const k1s = v
    const k1v = acc(s, v)
    const k2s = v + 0.5 * h * k1v
    const k2v = acc(s + 0.5 * h * k1s, k2s)
    const k3s = v + 0.5 * h * k2v
    const k3v = acc(s + 0.5 * h * k2s, k3s)
    const k4s = v + h * k3v
    const k4v = acc(s + h * k3s, k4s)
    let ns = s + (h / 6) * (k1s + 2 * k2s + 2 * k3s + k4s)
    let nv = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
    // friction can stop the object but never push it backwards
    if (f > 0 && v !== 0 && Math.sign(nv) !== Math.sign(v)) {
      const { slope } = trackAt(tr, ns)
      if (Math.abs(g * slope) <= f / m) nv = 0
    }
    path += Math.abs(ns - s)
    s = ns
    v = nv
    t += h
    if (s >= end) {
      // reached the end (ground for a free fall, end of the run-out for a slide)
      path -= s - end
      s = end
      return { t, s, v, path, done: true }
    }
    if (s <= 0 && v < 0) {
      path -= -s
      s = 0
      v = 0
    }
    if (f > 0 && nv === 0 && Math.abs(g * trackAt(tr, s).slope) <= f / m) return { t, s, v: 0, path, done: true }
  }
  return { t, s, v, path, done: false }
}

/** Energies at a ride state. heat = work done against friction = f × distance travelled. */
export function rideEnergy(tr: Track, st: RideState, m: number, f: number, g = G) {
  const { y } = trackAt(tr, st.s)
  const K = kineticEnergy(m, st.v)
  const U = potentialEnergy(m, y, g)
  return { K, U, heat: f * st.path, height: y }
}

// ---------------------------------------------------------------- formatting
/** Round to a sensible number of decimals for display, dropping trailing zeros. */
export function fmt(x: number, dp = 2): string {
  if (!Number.isFinite(x)) return '—'
  const r = Number(x.toFixed(dp))
  const s = (Object.is(r, -0) ? 0 : r).toLocaleString('en-IN', { maximumFractionDigits: dp, useGrouping: false })
  return s.replace('-', '−')
}
