// Lab 1 — Work done by a force = area under the force–displacement graph (and its sign).
import { C, arrow, roundRect, segmented, setupCanvas, slider, stat, text, type View } from './canvas'
import { workOf, workProfile, type WorkDir, type WorkMode } from './lab-models'
import { areaUpTo, fmt, forceAt } from './physics'

export function startWorkLab(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!
  const note = root.querySelector<HTMLElement>('[data-note]')!
  const playBtn = root.querySelector<HTMLButtonElement>('[data-action="play"]')!
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-action="reset"]')!
  const out = { f: stat(root, 'f'), s: stat(root, 's'), w: stat(root, 'w'), wfinal: stat(root, 'wfinal') }

  let x = 0 // how far the block has moved so far (m)
  let running = false
  let raf = 0
  let last = 0

  const redraw = () => draw(v)
  const mode = segmented<WorkMode>(root, 'mode', () => { reset() })
  const dir = segmented<WorkDir>(root, 'dir', () => { reset() })
  const F = slider(root, 'F', () => reset(), (v) => `${v} N`)
  const S = slider(root, 's', () => reset(), (v) => `${fmt(v, 1)} m`)
  const v = setupCanvas(canvas, draw)

  function notes() {
    const d = dir.get()
    const m = mode.get()
    if (d === 'perpendicular') return 'Carrying a bag while walking: your upward force is perpendicular to the displacement, so it does zero work on the bag.'
    if (d === 'against') return 'Like a goalkeeper stopping a ball: the force points opposite to the displacement, so the work done by that force is negative.'
    if (m === 'changing') return 'The force changes as the block moves. The work is still the area under the graph: add up all the thin strips.'
    return 'Constant force along the motion: the area is a rectangle, so W = F × s.'
  }

  function report() {
    const pts = workProfile(mode.get(), dir.get(), F.get(), S.get())
    const fNow = forceAt(pts, Math.min(x, S.get()))
    out.f(`${fmt(fNow, 1)} N`)
    out.s(`${fmt(x, 2)} m`)
    const wNow = areaUpTo(pts, x)
    out.w(`${fmt(wNow, 1)} J`, wNow > 0 ? 'good' : wNow < 0 ? 'warn' : '')
    const wf = workOf(mode.get(), dir.get(), F.get(), S.get())
    out.wfinal(`${fmt(wf, 1)} J`, wf > 0 ? 'good' : wf < 0 ? 'warn' : '')
    note.textContent = notes()
  }

  function reset() {
    running = false
    cancelAnimationFrame(raf)
    x = 0
    playBtn.textContent = 'Push ▶'
    report()
    redraw()
  }

  function tick(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    x = Math.min(S.get(), x + dt * Math.max(0.8, S.get() / 3)) // finish in about 3 s
    report()
    redraw()
    if (x >= S.get()) { running = false; playBtn.textContent = 'Push again ▶'; return }
    if (running) raf = requestAnimationFrame(tick)
  }

  playBtn.addEventListener('click', () => {
    if (running) { running = false; playBtn.textContent = 'Resume ▶'; return }
    if (x >= S.get()) x = 0
    running = true
    playBtn.textContent = 'Pause ❚❚'
    last = performance.now()
    raf = requestAnimationFrame(tick)
  })
  resetBtn.addEventListener('click', reset)

  function draw({ ctx, w, h }: View) {
    if (!w) return
    ctx.clearRect(0, 0, w, h)
    const s = S.get()
    const Fv = F.get()
    const pts = workProfile(mode.get(), dir.get(), Fv, s)
    const pad = Math.max(14, w * 0.04)

    // ---------- top: the block on the floor
    const sceneH = h * 0.36
    const floorY = sceneH - 24
    const sMax = 5
    const x0 = pad + 30
    const xSpan = w - 2 * pad - 90
    const px = (m: number) => x0 + (m / sMax) * xSpan
    ctx.strokeStyle = C.line2
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(pad, floorY); ctx.lineTo(w - pad, floorY); ctx.stroke()
    for (let m = 0; m <= sMax; m++) {
      ctx.beginPath(); ctx.moveTo(px(m), floorY); ctx.lineTo(px(m), floorY + 5); ctx.stroke()
    }
    // start and end markers
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = C.dim
    ctx.beginPath(); ctx.moveTo(px(s), floorY - sceneH * 0.6); ctx.lineTo(px(s), floorY); ctx.stroke()
    ctx.setLineDash([])
    const bw = Math.min(54, w * 0.08)
    const bh = bw * 0.75
    const bx = px(x)
    ctx.fillStyle = C.brass
    roundRect(ctx, bx - bw / 2, floorY - bh, bw, bh, 5); ctx.fill()
    text(ctx, 'block', bx, floorY - bh / 2 + 4, { align: 'center', color: '#1a1404', size: 11, weight: 700 })
    // displacement arrow (always to the right)
    if (x > 0.05) arrow(ctx, px(0), floorY + 16, px(x), floorY + 16, C.muted, 2)
    text(ctx, "s (displacement)", px(0), floorY + 32, { size: 11 })
    // force arrow
    const fAlong = forceAt(pts, Math.min(x, s))
    const d = dir.get()
    const mag = mode.get() === 'changing' ? Math.abs(fAlong) : Fv
    const len = 18 + (mag / 50) * Math.min(110, w * 0.16)
    if (Fv > 0) {
      if (d === 'perpendicular') {
        arrow(ctx, bx, floorY - bh - 4, bx, floorY - bh - 4 - len * 0.7, C.blue, 4)
        text(ctx, `F = ${Fv} N (upwards)`, bx + 10, floorY - bh - len * 0.5, { color: C.blue, size: 12 })
      } else if (mag > 0.01) {
        const sign = d === 'along' ? 1 : -1
        const cy = floorY - bh / 2
        const start = sign > 0 ? bx - bw / 2 - len - 4 : bx + bw / 2 + len + 4
        const end = sign > 0 ? bx - bw / 2 - 4 : bx + bw / 2 + 4
        arrow(ctx, start, cy, end, cy, sign > 0 ? C.mint : C.orange, 4)
        text(ctx, `F = ${fmt(mag, 1)} N`, (start + end) / 2, cy - 12, { align: 'center', color: sign > 0 ? C.mint : C.orange, size: 12 })
      }
    }

    // ---------- bottom: force (along the motion) vs displacement
    const gTop = sceneH + 44
    const gBot = h - 30
    const gx0 = pad + 34
    const gx1 = w - pad - 10
    const fMax = 55
    const gy = (f: number) => gTop + ((fMax - f) / (2 * fMax)) * (gBot - gTop)
    const gxp = (m: number) => gx0 + (m / sMax) * (gx1 - gx0)
    // grid + axes
    ctx.lineWidth = 1
    ctx.strokeStyle = C.line
    for (let f = -50; f <= 50; f += 25) { ctx.beginPath(); ctx.moveTo(gx0, gy(f)); ctx.lineTo(gx1, gy(f)); ctx.stroke() }
    for (let m = 1; m <= sMax; m++) { ctx.beginPath(); ctx.moveTo(gxp(m), gTop); ctx.lineTo(gxp(m), gBot); ctx.stroke() }
    ctx.strokeStyle = C.muted
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(gx0, gTop); ctx.lineTo(gx0, gBot); ctx.moveTo(gx0, gy(0)); ctx.lineTo(gx1, gy(0)); ctx.stroke()
    for (let f = -50; f <= 50; f += 25) text(ctx, fmt(f, 0), gx0 - 6, gy(f) + 4, { align: 'right', size: 11 })
    for (let m = 1; m <= sMax; m++) text(ctx, String(m), gxp(m), gy(0) + 14, { align: 'center', size: 11 })
    text(ctx, 'F along the motion (N)', gx0 + 6, gTop + 12, { size: 11 })
    text(ctx, 's (m)', gx1, gy(0) - 6, { align: 'right', size: 11 })

    // shaded area up to x
    const sh: [number, number][] = []
    for (const p of pts) if (p[0] <= x) sh.push([p[0], p[1]])
    if (x > 0) sh.push([x, forceAt(pts, x)])
    if (sh.length > 1) {
      const pos = (sh.reduce((a, p) => a + p[1], 0)) >= 0
      ctx.fillStyle = pos ? 'rgba(61,255,176,0.28)' : 'rgba(255,122,26,0.30)'
      ctx.beginPath(); ctx.moveTo(gxp(sh[0][0]), gy(0))
      for (const [m, f] of sh) ctx.lineTo(gxp(m), gy(f))
      ctx.lineTo(gxp(sh[sh.length - 1][0]), gy(0)); ctx.closePath(); ctx.fill()
    }
    // the graph line
    const lc = d === 'against' ? C.orange : d === 'along' ? C.mint : C.blue
    ctx.strokeStyle = lc
    ctx.lineWidth = 3
    ctx.beginPath()
    pts.forEach(([m, f], i) => (i ? ctx.lineTo(gxp(m), gy(f)) : ctx.moveTo(gxp(m), gy(f))))
    ctx.stroke()
    const wNow = areaUpTo(pts, x)
    text(ctx, `area so far = ${fmt(wNow, 1)} J`, gx1, gTop + 12, { align: 'right', color: wNow < 0 ? C.orange : wNow > 0 ? C.mint : C.muted, size: 13, weight: 700 })
  }

  reset()
}
