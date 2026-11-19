// Lab 2 — Kinetic and potential energy on slides and in free fall (conservation of mechanical energy).
// The motion comes from forces only (physics.stepRide); the energy bars are then computed from that motion,
// so seeing KE + PE stay at m g h is a real result, not something drawn in.
import { C, roundRect, segmented, setupCanvas, slider, stat, text, type View } from './canvas'
import {
  G, fmt, potentialEnergy, rideEnergy, speedAfterDrop, startRide, stepRide, trackAt, trackFor,
  type RideState, type Track, type TrackKind,
} from './physics'

const SLOW = 0.5 // play at half speed so the motion is easy to follow

export function startEnergyLab(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!
  const note = root.querySelector<HTMLElement>('[data-note]')!
  const playBtn = root.querySelector<HTMLButtonElement>('[data-action="play"]')!
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-action="reset"]')!
  const out = {
    height: stat(root, 'height'), v: stat(root, 'v'), ke: stat(root, 'ke'),
    pe: stat(root, 'pe'), total: stat(root, 'total'), heat: stat(root, 'heat'),
  }

  let track: Track
  let st: RideState = startRide()
  let running = false
  let raf = 0
  let last = 0

  const kind = segmented<TrackKind>(root, 'track', () => reset())
  const M = slider(root, 'm', () => reset(), (v) => `${v} kg`)
  const H = slider(root, 'h', () => reset(), (v) => `${fmt(v, 1)} m`)
  const Fr = slider(root, 'f', () => reset(), (v) => (v === 0 ? 'none' : `${v} N`))
  const view = setupCanvas(canvas, draw)

  function report() {
    const m = M.get()
    const f = Fr.get()
    const e = rideEnergy(track, st, m, f)
    const E0 = potentialEnergy(m, H.get())
    out.height(`${fmt(e.height, 2)} m`)
    out.v(`${fmt(Math.abs(st.v), 2)} m s⁻¹`)
    out.ke(`${fmt(e.K, 0)} J`)
    out.pe(`${fmt(e.U, 0)} J`)
    out.total(`${fmt(e.K + e.U, 0)} J`, f === 0 ? 'good' : e.K + e.U < E0 - 0.5 ? 'warn' : 'good')
    out.heat(`${fmt(e.heat, 0)} J`)
    const vb = speedAfterDrop(H.get())
    const k = kind.get()
    if (st.t === 0) {
      note.textContent = f === 0
        ? `Start: all of the energy is potential energy, m g h = ${M.get()} × 10 × ${fmt(H.get(), 1)} = ${fmt(E0, 0)} J. Press Release.`
        : `With a rough surface, the resistive force does negative work, so some energy turns into heat (thermal energy).`
      return
    }
    if (st.done || k === 'valley') {
      if (f === 0 && k !== 'valley') {
        note.textContent = `Bottom reached at ${fmt(Math.abs(st.v), 2)} m s⁻¹. Energy says v = √(2gh) = √(2 × 10 × ${fmt(H.get(), 1)}) = ${fmt(vb, 2)} m s⁻¹: same for every shape and every mass.`
      } else if (f === 0) {
        note.textContent = 'No friction: the ball keeps swinging back up to the height it started from, like a pendulum bob.'
      } else {
        note.textContent = `Work done against friction = f × distance = ${Fr.get()} N × ${fmt(st.path, 2)} m = ${fmt(e.heat, 0)} J, turned into heat. KE + PE + heat = ${fmt(e.K + e.U + e.heat, 0)} J.`
      }
    } else {
      note.textContent = 'Potential energy is turning into kinetic energy…'
    }
  }

  function reset() {
    running = false
    cancelAnimationFrame(raf)
    track = trackFor(kind.get(), H.get())
    st = startRide()
    playBtn.textContent = 'Release ▶'
    report()
    draw(view)
  }

  function tick(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000) * SLOW
    last = t
    st = stepRide(track, st, M.get(), Fr.get(), dt)
    report()
    draw(view)
    if (st.done) { running = false; playBtn.textContent = 'Again ▶'; return }
    if (st.t > 60) { running = false; playBtn.textContent = 'Again ▶'; return }
    if (running) raf = requestAnimationFrame(tick)
  }

  playBtn.addEventListener('click', () => {
    if (running) { running = false; playBtn.textContent = 'Resume ▶'; return }
    if (st.done || st.t > 60) st = startRide()
    running = true
    playBtn.textContent = 'Pause ❚❚'
    last = performance.now()
    raf = requestAnimationFrame(tick)
  })
  resetBtn.addEventListener('click', reset)

  function draw({ ctx, w, h }: View) {
    if (!w || !track) return
    ctx.clearRect(0, 0, w, h)
    const m = M.get()
    const f = Fr.get()
    const H0 = H.get()
    const E0 = potentialEnergy(m, H0)
    const narrow = w < 560

    // ---------- left: the track, scaled to fit
    const barsW = narrow ? w * 0.42 : w * 0.34
    const areaW = w - barsW - 20
    const top = 34
    const bottom = h - 34
    const xs = track.xs
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const yMax = Math.max(...track.ys, 1) * 1.12
    const sx = (areaW - 50) / Math.max(xMax - xMin, 1)
    const sy = (bottom - top) / yMax
    const k = Math.min(sx, sy)
    const ox = 34 + (xMax === xMin ? (areaW - 50) / 2 : 0)
    const px = (x: number) => ox + (x - xMin) * k
    const py = (y: number) => bottom - y * k
    // height scale
    ctx.strokeStyle = C.line
    ctx.lineWidth = 1
    for (let y = 0; y <= yMax + 0.01; y += yMax > 12 ? 5 : yMax > 5 ? 2 : 1) {
      ctx.beginPath(); ctx.moveTo(26, py(y)); ctx.lineTo(areaW, py(y)); ctx.stroke()
      text(ctx, `${y} m`, 22, py(y) + 4, { align: 'right', size: 10 })
    }
    // ground
    ctx.strokeStyle = C.line2
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(26, bottom + 1); ctx.lineTo(areaW, bottom + 1); ctx.stroke()
    // track
    if (kind.get() === 'drop') {
      ctx.setLineDash([3, 5]); ctx.strokeStyle = C.dim; ctx.lineWidth = 1.5
    } else {
      ctx.setLineDash([]); ctx.strokeStyle = f > 0 ? C.brass : C.muted; ctx.lineWidth = f > 0 ? 4 : 3
    }
    ctx.beginPath()
    xs.forEach((x, i) => (i ? ctx.lineTo(px(x), py(track.ys[i])) : ctx.moveTo(px(x), py(track.ys[i]))))
    ctx.stroke()
    ctx.setLineDash([])
    // start height line
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(61,255,176,0.45)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(26, py(H0)); ctx.lineTo(areaW, py(H0)); ctx.stroke(); ctx.setLineDash([])
    text(ctx, `start height h = ${fmt(H0, 1)} m`, areaW, py(H0) - 6, { align: 'right', size: 11, color: C.mint })
    // ball (sits on top of the track)
    const p = trackAt(track, st.s)
    const r = Math.max(7, Math.min(14, 6 + m / 8))
    let bx = px(p.x)
    let by = py(p.y)
    if (kind.get() !== 'drop') {
      const i = Math.min(track.xs.length - 2, Math.max(0, track.sigma.findIndex((s) => s >= st.s) - 1))
      const tx = px(track.xs[i + 1]) - px(track.xs[i])
      const ty = py(track.ys[i + 1]) - py(track.ys[i])
      const n = Math.hypot(tx, ty) || 1
      bx += (ty / n) * r
      by += (-tx / n) * r
      if (by > bottom - r) by = bottom - r
    } else {
      bx = px(0) + 0
      by = Math.min(by, bottom - r)
    }
    ctx.fillStyle = C.brass
    ctx.shadowColor = C.brass
    ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    text(ctx, `${m} kg`, bx, by - r - 6, { align: 'center', size: 11, color: C.text })

    // ---------- right: energy bars
    const e = rideEnergy(track, st, m, f)
    const bx0 = w - barsW + 6
    const bars: [string, number, string][] = [
      ['PE', e.U, C.blue], ['KE', e.K, C.orange], ['KE+PE', e.K + e.U, C.mint], ['heat', e.heat, C.red],
    ]
    const bw = (barsW - 30) / bars.length
    const bTop = top + 42
    const bBot = bottom
    const scale = (bBot - bTop) / Math.max(E0, 1e-9)
    // m g h reference line
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(61,255,176,0.6)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(bx0 - 4, bBot - E0 * scale); ctx.lineTo(w - 8, bBot - E0 * scale); ctx.stroke(); ctx.setLineDash([])
    text(ctx, `mgh = ${fmt(E0, 0)} J`, w - 8, top + 4, { align: "right", size: 11, color: C.mint })
    bars.forEach(([name, val, col], i) => {
      const x = bx0 + i * bw + 4
      const hh = Math.max(0, val) * scale
      ctx.fillStyle = col
      roundRect(ctx, x, bBot - hh, bw - 8, Math.max(hh, 0.5), 4); ctx.fill()
      text(ctx, name, x + (bw - 8) / 2, bBot + 14, { align: "center", size: narrow ? 9 : 11 })
      text(ctx, fmt(val, 0), x + (bw - 8) / 2, bBot - hh - 6, { align: 'center', size: 11, color: C.text, mono: true })
    })
    text(ctx, `g = ${G} m s⁻² · slow motion ×${SLOW}`, 30, 20, { size: 11, color: C.dim })
  }

  reset()
}
