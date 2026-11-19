// Hosting checks for GitHub Pages: no server headers there, so privacy rules live in each page.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const pages = ['index.html', 'about/index.html', '404.html', 'class-9/science/work-energy/index.html']

describe('GitHub Pages setup', () => {
  it('serves the custom domain www.justinlimit.com and skips Jekyll', () => {
    expect(readFileSync(resolve(root, 'public/CNAME'), 'utf8').trim()).toBe('www.justinlimit.com')
    expect(existsSync(resolve(root, 'public/.nojekyll'))).toBe(true)
  })
  for (const p of pages) {
    it(`${p}: same-origin-only CSP and no referrer`, () => {
      const html = readFileSync(resolve(root, p), 'utf8')
      const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? ''
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self'")
      expect(csp).toContain("connect-src 'self'")
      expect(csp).toContain("form-action 'none'")
      expect(csp).not.toMatch(/https?:/)
      expect(html).toContain('<meta name="referrer" content="no-referrer" />')
    })
  }
})
