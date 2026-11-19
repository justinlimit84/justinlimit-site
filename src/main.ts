import './styles.css'
import { REPORT_EMAIL } from './site'

// ---- mobile menu ----
const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle')
const nav = document.querySelector<HTMLElement>('#site-nav')
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true'
  toggle.setAttribute('aria-expanded', String(open))
  nav?.classList.toggle('open', open)
})

// ---- mark the current section in the nav ----
const section = document.body.dataset.section
if (section) document.querySelector(`[data-nav="${section}"]`)?.setAttribute('aria-current', 'page')

// ---- footer year ----
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())))

// ---- "Spotted a mistake?" links: a plain email link with the page and section filled in.
// Nothing is sent anywhere unless the reader chooses to send the email themselves.
document.querySelectorAll<HTMLAnchorElement>('a[data-mistake]').forEach((a) => {
  const where = a.dataset.mistake || document.title
  const subject = `Mistake on justinlimit.com: ${where}`
  const body = `Page: ${location.origin}${location.pathname}\nSection: ${where}\n\nWhat looks wrong:\n\n`
  a.href = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
})

// ---- chapter side menu: highlight the topic being read ----
const links = [...document.querySelectorAll<HTMLAnchorElement>('.chapter-nav a[href^="#"]')]
if (links.length && 'IntersectionObserver' in window) {
  const byId = new Map(links.map((l) => [l.hash.slice(1), l]))
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      links.forEach((l) => l.classList.remove('on'))
      byId.get(e.target.id)?.classList.add('on')
    }
  }, { rootMargin: '-30% 0px -60% 0px' })
  byId.forEach((_l, id) => { const t = document.getElementById(id); if (t) spy.observe(t) })
}

// ---- gentle reveal on scroll ----
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io?.unobserve(e.target) } }), { rootMargin: '0px 0px -8% 0px' })
  : null
document.querySelectorAll('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')))

/** Start a lab only when it scrolls near the screen (keeps the page light on phones). */
export function whenNear(el: HTMLElement, start: () => void) {
  if (!('IntersectionObserver' in window)) { start(); return }
  const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); start() } }, { rootMargin: '300px 0px' })
  o.observe(el)
}
