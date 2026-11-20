// Small drawing toolkit shared by the labs. No libraries: plain 2D canvas.

export const C = {
  bg: '#0d0e10',
  line: '#262b33',
  line2: '#323844',
  text: '#f2f4f8',
  muted: '#9aa3b2',
  dim: '#5a6270',
  blue: '#00b3ff',
  orange: '#ff7a1a',
  mint: '#3dffb0',
  brass: '#d4a64a',
  red: '#ff4d5e',
}

export const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
export const MONO = 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace'

export type View = { ctx: CanvasRenderingContext2D; w: number; h: number }

/** Keeps a canvas sharp at any size and device pixel ratio; calls draw() after every resize. */
export function setupCanvas(canvas: HTMLCanvasElement, draw: (v: View) => void): View {
  const ctx = canvas.getContext('2d')!
  const v: View = { ctx, w: 0, h: 0 }
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    v.w = canvas.clientWidth
    v.h = canvas.clientHeight
    canvas.width = Math.round(v.w * dpr)
    canvas.height = Math.round(v.h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(v)
  }
  new ResizeObserver(fit).observe(canvas)
  fit()
  return v
}

export function text(
  ctx: CanvasRenderingContext2D, s: string, x: number, y: number,
  o: { size?: number; color?: string; align?: CanvasTextAlign; base?: CanvasTextBaseline; weight?: number; mono?: boolean } = {},
) {
  ctx.font = `${o.weight ?? 600} ${o.size ?? 13}px ${o.mono ? MONO : FONT}`
  ctx.fillStyle = o.color ?? C.muted
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.base ?? 'alphabetic'
  ctx.fillText(s, x, y)
}

/** Arrow from (x0,y0) to (x1,y1) with a filled head. */
export function arrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, width = 3) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  if (len < 1) return
  const ux = (x1 - x0) / len
  const uy = (y1 - y0) / len
  const head = Math.min(12 + width, len * 0.6)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1 - ux * head * 0.8, y1 - uy * head * 0.8)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - ux * head - uy * head * 0.5, y1 - uy * head + ux * head * 0.5)
  ctx.lineTo(x1 - ux * head + uy * head * 0.5, y1 - uy * head - ux * head * 0.5)
  ctx.closePath()
  ctx.fill()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Wire a range input to its <output> and a callback. Returns a getter. */
export function slider(root: HTMLElement, name: string, onInput: () => void, show: (v: number) => string) {
  const input = root.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
  const out = root.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`)
  const sync = () => { if (out) out.value = show(Number(input.value)) }
  input.addEventListener('input', () => { sync(); onInput() })
  sync()
  return {
    get: () => Number(input.value),
    set: (v: number) => { input.value = String(v); sync() },
    el: input,
  }
}

/** A group of aria-pressed buttons sharing data-<key>. */
export function segmented<T extends string>(root: HTMLElement, key: string, onPick: (v: T) => void) {
  const btns = [...root.querySelectorAll<HTMLButtonElement>(`[data-${key}]`)]
  let cur = (btns.find((b) => b.getAttribute('aria-pressed') === 'true') ?? btns[0]).dataset[key] as T
  btns.forEach((b) => b.addEventListener('click', () => {
    cur = b.dataset[key] as T
    btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)))
    onPick(cur)
  }))
  return { get: () => cur }
}

export function stat(root: HTMLElement, name: string) {
  const el = root.querySelector<HTMLElement>(`[data-stat="${name}"]`)!
  return (s: string, cls?: 'good' | 'warn' | 'bad' | '') => {
    el.textContent = s
    const box = el.parentElement!
    box.classList.remove('good', 'warn', 'bad')
    if (cls) box.classList.add(cls)
  }
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * How much of an element (top/bottom in viewport pixels) is visible between the sticky header and the
 * bottom of the screen, as a fraction 0–1 of its height.
 */
export function visibleFraction(top: number, bottom: number, viewportH: number, headerH = 68) {
  const h = bottom - top
  if (h <= 0) return 0
  const seen = Math.min(bottom, viewportH) - Math.max(top, headerH)
  return Math.max(0, Math.min(1, seen / h))
}

/** Scroll so `el` is on screen, unless at least `enough` of it already is (so desktop users don't get a jump). */
export function bringIntoView(el: HTMLElement, enough = 0.7) {
  const r = el.getBoundingClientRect()
  if (visibleFraction(r.top, r.bottom, window.innerHeight) >= enough) return
  // scrollIntoView never moves keyboard focus, so the pressed Run/Pause button stays focused
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' })
}

/**
 * On narrow screens the controls sit below the canvas. Adds a "Change values ↓" button under the
 * canvas that jumps back to them (hidden by CSS on wide screens).
 */
export function addControlsLink(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('.lab-stage')
  const controls = root.querySelector<HTMLElement>('.lab-controls')
  if (!stage || !controls || root.querySelector('.to-controls')) return
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'to-controls'
  btn.textContent = 'Change values ↓'
  btn.addEventListener('click', () => {
    controls.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
    controls.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true })
  })
  stage.after(btn)
}
