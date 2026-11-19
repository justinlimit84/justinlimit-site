// Lab 3 — Power: same work, different times. Two students carry themselves up the same stairs.
import { C, setupCanvas, slider, stat, text, type View } from './canvas'
import { stairRace } from './lab-models'
import { HORSEPOWER, fmt } from './physics'

const STEPS = 12

export function startPowerLab(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!
  const note = root.querySelector<HTMLElement>('[data-note]')!
  const playBtn = root.querySelector<HTMLButtonElement>('[data-action="play"]')!
  const out = { w: stat(root, 'w'), pw: stat(root, 'pwalk'), pr: stat(root, 'prun'), ratio: stat(root, 'ratio') }

  let t = 0 // race clock in real seconds
  let running = false
  let raf = 0
  let last = 0

  const M = slider(root, 'm', () => reset(), (v) => `${v} kg`)
  const H = slider(root, 'h', () => reset(), (v) => `${v} m`)
  const TW = slider(root, 'twalk', () => reset(), (v) => `${v} s`)
  const TR = slider(root, 'trun', () => reset(), (v) => `${v} s`)
  const view = setupCanvas(canvas, draw)

  function report() {
    const r = stairRace(M.get(), H.get(), TW.get(), TR.get())
    out.w(`${fmt(r.W, 0)} J each`)
    out.pw(`${fmt(r.pWalk, 0)} W`)
    out.pr(`${fmt(r.pRun, 0)} W`, 'good')
    out.ratio(`× ${fmt(r.ratio, 2)}`)
    note.textContent = `Both do W = m g h = ${M.get()} × 10 × ${H.get()} = ${fmt(r.W, 0)} J. ` +
      `Power = W ÷ t: walking ${fmt(r.W, 0)} ÷ ${TW.get()} = ${fmt(r.pWalk, 0)} W, running ${fmt(r.W, 0)} ÷ ${TR.get()} = ${fmt(r.pRun, 0)} W` +
      ` (about ${fmt(r.pRun / HORSEPOWER, 2)} horsepower).`
  }

  function reset() {
    running = false
    cancelAnimationFrame(raf)
    t = 0
    playBtn.textContent = 'Race ▶'
    report()
    draw(view)
  }

  // play the race so the slower climber finishes in about 6 s of screen time
  const speedUp = () => Math.max(1, Math.max(TW.get(), TR.get()) / 6)

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    t = Math.min(Math.max(TW.get(), TR.get()), t + dt * speedUp())
    draw(view)
    if (t >= Math.max(TW.get(), TR.get())) { running = false; playBtn.textContent = 'Race again ▶'; return }
    if (running) raf = requestAnimationFrame(tick)
  }

  playBtn.addEventListener('click', () => {
    if (running) return
    if (t > 0) t = 0
    running = true
    last = performance.now()
    raf = requestAnimationFrame(tick)
  })

  function draw({ ctx, w, h }: View) {
    if (!w) return
    ctx.clearRect(0, 0, w, h)
    const lanes: [string, number, string][] = [['walks', TW.get(), C.blue], ['runs', TR.get(), C.orange]]
    const laneW = w / 2
    lanes.forEach(([who, T, col], i) => {
      const x0 = i * laneW + 24
      const x1 = (i + 1) * laneW - 24
      const yb = h - 36
      const yt = 52
      const stepW = (x1 - x0) / STEPS
      const stepH = (yb - yt) / STEPS
      // staircase
      ctx.strokeStyle = C.line2
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      for (let k = 0; k < STEPS; k++) {
        ctx.lineTo(x0 + k * stepW, yb - (k + 1) * stepH)
        ctx.lineTo(x0 + (k + 1) * stepW, yb - (k + 1) * stepH)
      }
      ctx.stroke()
      // climber (moves at a steady rate: same height gained per second)
      const frac = Math.min(1, t / T)
      const cx = x0 + frac * (x1 - x0)
      const cy = yb - frac * (yb - yt) - 12
      ctx.fillStyle = col
      ctx.beginPath(); ctx.arc(cx, cy - 12, 7, 0, Math.PI * 2); ctx.fill()
      ctx.fillRect(cx - 5, cy - 4, 10, 16)
      text(ctx, `${who}: ${T} s`, x0, 22, { size: 13, color: col, weight: 700 })
      const done = frac >= 1
      text(ctx, done ? `at the top · P = ${fmt(stairRace(M.get(), H.get(), T, T).pWalk, 0)} W` : `height ${fmt(frac * H.get(), 1)} m`, x0, 40, { size: 12, color: done ? C.text : C.muted })
    })
    text(ctx, `t = ${fmt(t, 1)} s`, w - 12, h - 10, { align: 'right', size: 12, mono: true, color: C.muted })
    text(ctx, `stairs: h = ${H.get()} m`, 12, h - 10, { size: 12, color: C.dim })
  }

  reset()
}
