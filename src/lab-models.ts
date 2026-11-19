// State and formulas behind each lab, kept apart from drawing so the tests can check them.
import {
  G, areaUnder, inclineEffort, inclineMA, leverEffort, leverMA, potentialEnergy, power, type Pt,
} from './physics'

// ---------------------------------------------------------------- Lab 1: work and the F–s graph
export type WorkMode = 'constant' | 'changing'
export type WorkDir = 'along' | 'against' | 'perpendicular'

/**
 * Force along the motion vs displacement, for a push of size F over a displacement s.
 * 'changing': the push builds up over the first fifth of the way, stays steady, then eases off over the last fifth.
 * 'against': the force points opposite to the displacement, so its component along the motion is −F.
 * 'perpendicular': the force has no component along the motion, so it does no work.
 */
export function workProfile(mode: WorkMode, dir: WorkDir, F: number, s: number): Pt[] {
  const sign = dir === 'along' ? 1 : dir === 'against' ? -1 : 0
  const f = sign * F
  if (mode === 'constant') return [[0, f], [s, f]]
  return [[0, 0], [0.2 * s, f], [0.8 * s, f], [s, 0]]
}

export const workOf = (mode: WorkMode, dir: WorkDir, F: number, s: number) => areaUnder(workProfile(mode, dir, F, s))

// ---------------------------------------------------------------- Lab 3: power (stair race)
export function stairRace(m: number, h: number, tWalk: number, tRun: number, g = G) {
  const W = potentialEnergy(m, h, g) // work done against gravity = gain in potential energy = m g h
  return { W, pWalk: power(W, tWalk), pRun: power(W, tRun), ratio: tWalk / tRun }
}

// ---------------------------------------------------------------- Lab 4: simple machines
export function incline(m: number, h: number, L: number, g = G) {
  const load = m * g
  const effort = inclineEffort(m, h, L, g)
  return {
    load,
    effort,
    ma: inclineMA(L, h),
    workByYou: effort * L, // F′ × L
    gainPE: potentialEnergy(m, h, g), // m g h
    base: Math.sqrt(Math.max(0, L * L - h * h)),
  }
}

export function lever(load: number, loadArm: number, effortArm: number, effortApplied: number) {
  const left = effortApplied * effortArm // effort × effort arm
  const right = load * loadArm // load × load arm
  const needed = leverEffort(load, loadArm, effortArm)
  const diff = left - right
  const balanced = Math.abs(diff) <= 0.01 * Math.max(right, 1e-9)
  return {
    effortTimesArm: left,
    loadTimesArm: right,
    needed,
    ma: leverMA(effortArm, loadArm),
    balanced,
    // which way the beam turns: +1 effort side goes down (load rises), −1 load side goes down, 0 balanced
    tips: balanced ? 0 : Math.sign(diff),
  }
}

/** A fixed pulley only changes direction: effort = load, MA = 1, the load rises as far as the rope is pulled. */
export function fixedPulley(load: number, pulled: number) {
  return { effort: load, ma: 1, rise: pulled, work: load * pulled }
}
