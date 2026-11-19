// Every numeric answer printed on the chapter page (data-check) is recomputed here, independently,
// and must match both the data-value and the text the student actually sees.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(import.meta.dirname, '../class-9/science/work-energy/index.html'), 'utf8')
const g = 10

// Independent solutions (plain arithmetic, written from the physics, not from src/).
const expected: Record<string, number> = {
  'ex7.2': 200 * -0.15,
  'ex7.4': (0.5 * 1 * 4 ** 2) / (0.5 * 1 * 2 ** 2),
  'ex7.5': 0.5 * 0.2 * (154.8 / 3.6) ** 2,
  'ex7.6': Math.sqrt((2 * 367500 * 100) / 15000),
  'ex7.7': 0.2 * g * 10,
  'ex7.9': (0.5 * 10000 * (72 / 3.6) ** 2) / (50000 + (10000 * g) / 2),
  'ex7.10': (75 * g * 2) / 5,
  'ex7.11': (0.5 * 1000 * (72 / 3.6) ** 2) / 10,
  'ex7.12': Math.hypot(30, 40) / 30,
  'ex7.13': (15 * 2) / 30,
  pp4: Math.sqrt(4), // ½ m vA² = ½ (4m) vB²
  q5: 50 * g * 72.5,
  q6: (20 * 1) / (10 * 1), // energy ratio, 20 floors vs 10 floors
  q7: 2, // doubling speed halves time: P = W/t doubles
  q8: (60 + 100) / (60 + 100 + 40),
  q9: 2 / 1, // W × d_child = 2W × d_adult
  q10: 2 * g * 19.4 - 0.5 * 2 * 20 ** 2,
  'q11a': Math.sqrt((2 * 180) / 10),
  'q11b': Math.sqrt((2 * (180 + 0.5 * 1 * 50 + 2 * 50 + 0.5 * 1 * 50)) / 10),
  q12: 8 * 6,
  'q13a': 0.5 * 1000 * 35 ** 2,
  'q13b': 0 - 0.5 * 1000 * 35 ** 2,
  'q14p': Math.sqrt((2 * (30 - 20)) / 0.5),
  'q14q': 0,
  'q15a': Math.sqrt(2 * g * 10),
  'q15b': (1.5 * g * 10) / 3000,
}

// answers given in words or as a ratio rather than as the number itself
const textInstead: Record<string, RegExp> = { q6: /twice/i, q7: /doubles/i, q8: /4 : 5/ }

type Found = { key: string; value: number; text: string }
const found: Found[] = [...html.matchAll(/data-check="([^"]+)" data-value="([^"]+)"[^>]*>([\s\S]*?)<\//g)].map((m) => ({
  key: m[1], value: Number(m[2]), text: m[3].replace(/<[^>]+>/g, ''),
}))

const decimals = (x: number) => (String(x).split('.')[1] ?? '').length

describe('answers on the chapter page', () => {
  it('every expected answer appears exactly once, and nothing unchecked is tagged', () => {
    expect(found.map((f) => f.key).sort()).toEqual(Object.keys(expected).sort())
  })
  for (const f of found) {
    it(`${f.key}: ${f.text.trim()}`, () => {
      const want = expected[f.key]
      expect(want).toBeDefined()
      // the page value is the exact answer rounded to the decimals shown
      expect(f.value).toBeCloseTo(want, Math.max(0, decimals(f.value)))
      expect(Math.abs(f.value - want)).toBeLessThanOrEqual(0.5 * 10 ** -decimals(f.value) + 1e-9)
      const shown = f.text.replace(/−/g, '-')
      if (textInstead[f.key]) expect(shown).toMatch(textInstead[f.key])
      else expect(shown).toContain(String(f.value))
    })
  }
})

describe('page hygiene', () => {
  it('uses g = 10 m s⁻² and links to the official NCERT site', () => {
    expect(html).toContain('<var>g</var> = 10 m s<sup>−2</sup>')
    expect(html).toContain('https://ncert.nic.in/')
  })
  it('every section has a "Spotted a mistake?" link', () => {
    const sections = [...html.matchAll(/<section class="topic" id="([^"]+)">([\s\S]*?)<\/section>/g)]
    expect(sections.length).toBeGreaterThanOrEqual(9)
    for (const [, id, body] of sections) expect(body, id).toMatch(/Spotted a mistake\? <a data-mistake=/)
  })
  it('loads nothing from third parties (privacy)', () => {
    const external = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1])
    for (const url of external) expect(url, url).toMatch(/^https:\/\/(ncert\.nic\.in|www\.justinlimit\.com)\//)
    expect(html).not.toMatch(/<iframe|google|analytics|gtag|facebook|youtube\.com\/embed/i)
  })
})
