// Lab 4 — Simple machines: inclined plane, lever and fixed pulley.
// Each panel shows the load, the effort, the mechanical advantage, and that the work stays the same.
import { C, arrow, roundRect, segmented, setupCanvas, slider, stat, text, type View } from './canvas'
import { fixedPulley, incline, lever } from './lab-models'
import { G, fmt } from './physics'

type Machine = 'incline' | 'lever' | 'pulley'

export function startMachinesLab(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!
  const note = root.querySelector<HTMLElement>('[data-note]')!
  const groups = [...root.querySelectorAll<HTMLElement>('[data-for]')]
  const balanceBtn = root.querySelector<HTMLButtonElement>('[data-action="balance"]')!
  const out = { a: stat(root, 'a'), b: stat(root, 'b'), c: stat(root, 'c'), d: stat(root, 'd') }
  const labels = [...root.querySelectorAll<HTMLElement>('[data-stat-label]')]

  const machine = segmented<Machine>(root, 'machine', () => update())
  const upd = () => update()
  // inclined plane
  const Im = slider(root, 'im', upd, (v) => `${v} kg`)
  const Ih = slider(root, 'ih', upd, (v) => `${fmt(v, 1)} m`)
  const IL = slider(root, 'iL', upd, (v) => `${fmt(v, 1)} m`)
  // lever
  const Lload = slider(root, 'lload', upd, (v) => `${v} N`)
  const Ld2 = slider(root, 'ld2', upd, (v) => `${fmt(v, 2)} m`)
  const Ld1 = slider(root, 'ld1', upd, (v) => `${fmt(v, 2)} m`)
  const Leff = slider(root, 'leff', upd, (v) => `${v} N`)
  // pulley
  const Pload = slider(root, 'pload', upd, (v) => `${v} N`)
  const Ppull = slider(root, 'ppull', upd, (v) => `${fmt(v, 2)} m`)

  const view = setupCanvas(canvas, draw)

  balanceBtn.addEventListener('click', () => {
    const r = lever(Lload.get(), Ld2.get(), Ld1.get(), 0)
    Leff.set(Math.round(r.needed))
    update()
  })

  function setLabels(names: string[]) { labels.forEach((l, i) => (l.textContent = names[i] ?? '')) }

  function update() {
    const m = machine.get()
    groups.forEach((g) => (g.hidden = g.dataset.for !== m))
    balanceBtn.hidden = m !== 'lever'
    if (m === 'incline') {
      // the ramp can't be shorter than the height it climbs
      if (IL.get() < Ih.get()) IL.set(Ih.get())
      const r = incline(Im.get(), Ih.get(), IL.get())
      setLabels(['load (weight m g)', 'effort F′ along the ramp', 'mechanical advantage L/h', 'work: F′ × L  vs  m g h'])
      out.a(`${fmt(r.load, 0)} N`)
      out.b(`${fmt(r.effort, 1)} N`, 'good')
      out.c(`${fmt(r.ma, 2)}`)
      out.d(`${fmt(r.workByYou, 0)} J = ${fmt(r.gainPE, 0)} J`, 'good')
      note.textContent = `Lifting straight up needs ${fmt(r.load, 0)} N. Pushing along a ${fmt(IL.get(), 1)} m ramp needs only ${fmt(r.effort, 1)} N, ` +
        `but over a longer distance, so the work is the same (ignoring friction).`
    } else if (m === 'lever') {
      const r = lever(Lload.get(), Ld2.get(), Ld1.get(), Leff.get())
      setLabels(['effort × effort arm', 'load × load arm', 'effort needed to balance', 'mechanical advantage'])
      out.a(`${fmt(r.effortTimesArm, 1)} N m`, r.balanced ? 'good' : '')
      out.b(`${fmt(r.loadTimesArm, 1)} N m`, r.balanced ? 'good' : '')
      out.c(`${fmt(r.needed, 1)} N`)
      out.d(`${fmt(r.ma, 2)}`)
      note.textContent = r.balanced
        ? `Balanced: ${Leff.get()} N × ${fmt(Ld1.get(), 2)} m = ${Lload.get()} N × ${fmt(Ld2.get(), 2)} m.`
        : r.tips > 0
          ? 'Effort × effort arm is bigger, so the effort side goes down and the load is lifted.'
          : 'Load × load arm is bigger, so the load side stays down. Push harder or use a longer effort arm.'
    } else {
      const r = fixedPulley(Pload.get(), Ppull.get())
      setLabels(['load', 'effort (rope pull)', 'mechanical advantage', 'work done by you'])
      out.a(`${r.effort} N`)
      out.b(`${r.effort} N`)
      out.c('1')
      out.d(`${fmt(r.work, 0)} J`)
      note.textContent = 'A fixed pulley does not reduce the force: effort = load, so MA = 1. It helps by letting you pull down instead of lifting up.'
    }
    draw(view)
  }

  function draw({ ctx, w, h }: View) {
    if (!w) return
    ctx.clearRect(0, 0, w, h)
    const m = machine.get()
    if (m === 'incline') drawIncline(ctx, w, h)
    else if (m === 'lever') drawLever(ctx, w, h)
    else drawPulley(ctx, w, h)
  }

  function drawIncline(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const r = incline(Im.get(), Ih.get(), IL.get())
    const hh = Ih.get()
    const base = r.base
    const ground = h - 40
    // scale so the longest ramp (6 m) and highest step (2 m) fit
    const k = Math.min((w * 0.55) / Math.max(base, 0.5), (h - 190) / Math.max(hh, 0.2))
    const x0 = w * 0.3
    const pA = [x0, ground]
    const pB = [x0 + base * k, ground]
    const pC = [x0 + base * k, ground - hh * k]
    // platform
    ctx.fillStyle = '#1b1f26'
    ctx.fillRect(pC[0], pC[1], w - pC[0] - 12, ground - pC[1])
    // ramp
    ctx.fillStyle = '#20252e'
    ctx.strokeStyle = C.muted
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(pA[0], pA[1]); ctx.lineTo(pB[0], pB[1]); ctx.lineTo(pC[0], pC[1]); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = C.line2; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(12, ground); ctx.lineTo(w - 12, ground); ctx.stroke()
    // labels L and h
    text(ctx, `L = ${fmt(IL.get(), 1)} m`, pA[0] + (pC[0] - pA[0]) * 0.2 - 8, pA[1] + (pC[1] - pA[1]) * 0.2 - 14, { align: "right", color: C.text, size: 12 })
    text(ctx, `h = ${fmt(hh, 1)} m`, pB[0] + 6, (pB[1] + pC[1]) / 2 + 4, { color: C.text, size: 12 })
    // box half-way up the ramp, effort arrow along the ramp
    const ux = (pC[0] - pA[0]) / (IL.get() * k)
    const uy = (pC[1] - pA[1]) / (IL.get() * k)
    const s = 0.5
    const bx = pA[0] + (pC[0] - pA[0]) * s
    const by = pA[1] + (pC[1] - pA[1]) * s
    const bs = 26
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(Math.atan2(uy, ux))
    ctx.fillStyle = C.brass
    roundRect(ctx, -bs / 2, -bs, bs, bs, 4); ctx.fill()
    ctx.restore()
    const nx = uy
    const ny = -ux
    const cx = bx + (nx * bs) / 2
    const cy = by + (ny * bs) / 2
    const len = 20 + (r.effort / Math.max(r.load, 1)) * 110
    arrow(ctx, cx + (ux * bs) / 2 + ux * 4, cy + (uy * bs) / 2 + uy * 4, cx + ux * (bs / 2 + 4 + len), cy + uy * (bs / 2 + 4 + len), C.orange, 4)
    text(ctx, `effort F′ = ${fmt(r.effort, 1)} N`, cx + ux * (bs / 2 + len) + 6, cy + uy * (bs / 2 + len) - 10, { color: C.orange, size: 12, weight: 700 })
    // the "lift it straight up" comparison on the left
    const lx = Math.max(40, x0 * 0.45)
    ctx.fillStyle = C.brass
    roundRect(ctx, lx - bs / 2, ground - bs, bs, bs, 4); ctx.fill()
    arrow(ctx, lx, ground - bs - 4, lx, ground - bs - 4 - 130, C.blue, 4)
    text(ctx, `lift straight up:`, lx, ground - bs - 160, { align: 'center', color: C.blue, size: 12, weight: 700 })
    text(ctx, `${fmt(r.load, 0)} N`, lx, ground - bs - 144, { align: 'center', color: C.blue, size: 12, weight: 700 })
    text(ctx, `${Im.get()} kg box, g = ${G} m s⁻²`, 12, 20, { size: 11, color: C.dim })
  }

  function drawLever(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const r = lever(Lload.get(), Ld2.get(), Ld1.get(), Leff.get())
    const d1 = Ld1.get()
    const d2 = Ld2.get()
    const piv = [w * 0.5, h * 0.62]
    const k = Math.min((w * 0.44) / 3, (w * 0.44) / 1.5) // 3 m effort arm or 1.5 m load arm fits each side
    // tilt: effort side down if effort × arm is bigger
    const ang = r.tips * Math.min(0.22, 0.02 + Math.abs(r.effortTimesArm - r.loadTimesArm) / Math.max(r.loadTimesArm, 1) * 0.2)
    const dx = Math.cos(ang)
    const dy = Math.sin(ang)
    const effEnd = [piv[0] - d1 * k * dx, piv[1] + d1 * k * dy]
    const loadEnd = [piv[0] + d2 * k * dx, piv[1] - d2 * k * dy]
    // fulcrum
    ctx.fillStyle = C.dim
    ctx.beginPath(); ctx.moveTo(piv[0], piv[1]); ctx.lineTo(piv[0] - 18, piv[1] + 34); ctx.lineTo(piv[0] + 18, piv[1] + 34); ctx.closePath(); ctx.fill()
    text(ctx, 'fulcrum', piv[0], piv[1] + 50, { align: 'center', size: 11 })
    // beam
    ctx.strokeStyle = r.balanced ? C.mint : C.text
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(effEnd[0], effEnd[1]); ctx.lineTo(loadEnd[0], loadEnd[1]); ctx.stroke()
    // load (box on the right end)
    const bs = 20 + Math.min(30, Lload.get() / 20)
    ctx.fillStyle = C.brass
    roundRect(ctx, loadEnd[0] - bs / 2, loadEnd[1] - bs - 3, bs, bs, 4); ctx.fill()
    text(ctx, `load ${Lload.get()} N`, loadEnd[0], loadEnd[1] - bs - 12, { align: 'center', color: C.brass, size: 12, weight: 700 })
    // effort arrow (pushing down on the left end)
    const len = 16 + Math.min(110, Leff.get() / 4)
    arrow(ctx, effEnd[0], effEnd[1] - 8 - len, effEnd[0], effEnd[1] - 6, C.orange, 4)
    text(ctx, `effort ${Leff.get()} N`, effEnd[0], effEnd[1] - 16 - len, { align: 'center', color: C.orange, size: 12, weight: 700 })
    // arm lengths
    const yA = piv[1] + 72
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(piv[0] - d1 * k, yA); ctx.lineTo(piv[0], yA); ctx.moveTo(piv[0], yA); ctx.lineTo(piv[0] + d2 * k, yA); ctx.stroke()
    text(ctx, `effort arm ${fmt(d1, 2)} m`, piv[0] - (d1 * k) / 2, yA + 16, { align: 'center', size: 11, color: C.orange })
    text(ctx, `load arm ${fmt(d2, 2)} m`, piv[0] + (d2 * k) / 2, yA + 16, { align: 'center', size: 11, color: C.brass })
    if (r.balanced) text(ctx, 'balanced', piv[0], 26, { align: 'center', size: 15, color: C.mint, weight: 800 })
  }

  function drawPulley(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const r = fixedPulley(Pload.get(), Ppull.get())
    const cx = w * 0.5
    const cy = 54
    const R = 26
    const k = (h - 160) / 1.5 // 1.5 m of rope travel fits
    // support
    ctx.strokeStyle = C.line2; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(cx - 80, 14); ctx.lineTo(cx + 80, 14); ctx.moveTo(cx, 14); ctx.lineTo(cx, cy); ctx.stroke()
    // wheel
    ctx.strokeStyle = C.muted; ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = C.muted; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill()
    // ropes
    const loadY = h - 60 - r.rise * k
    const handY = cy + 70 + r.rise * k
    ctx.strokeStyle = C.text; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx - R, loadY); ctx.moveTo(cx + R, cy); ctx.lineTo(cx + R, handY); ctx.stroke()
    // load
    const bs = 42
    ctx.fillStyle = C.brass
    roundRect(ctx, cx - R - bs / 2, loadY, bs, bs, 5); ctx.fill()
    text(ctx, `load ${r.effort} N`, cx - R - bs / 2 - 8, loadY + bs / 2 + 4, { align: 'right', color: C.brass, size: 12, weight: 700 })
    arrow(ctx, cx - R, loadY - 4, cx - R, loadY - 40, C.mint, 3)
    text(ctx, `rises ${fmt(r.rise, 2)} m`, cx - R - 10, loadY - 26, { align: 'right', color: C.mint, size: 11 })
    // effort
    arrow(ctx, cx + R, handY, cx + R, handY + 50, C.orange, 4)
    text(ctx, `effort ${r.effort} N, pulled down ${fmt(r.rise, 2)} m`, cx + R + 10, handY + 30, { color: C.orange, size: 12, weight: 700 })
    ctx.strokeStyle = C.line2; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(12, h - 16); ctx.lineTo(w - 12, h - 16); ctx.stroke()
  }

  update()
}
