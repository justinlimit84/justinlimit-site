# justinlimit.com

Interactive science learning for NCERT Class 9 (2026 *Exploration* textbook): canvas labs, short ManimGL
animations and step-by-step solutions. A static multi-page site (Vite + TypeScript, no framework),
hosted on Vercel.

## Rules for every page

- **Accuracy first.** Symbols, definitions, SI units and sign conventions match the NCERT chapter. Every
  worked answer is solved two ways, and every number on the page is recomputed by `tests/answers.test.ts`
  (tag it with `data-check="key" data-value="number"` and add the independent calculation to the test).
- **Copyright.** Concepts only. Never copy NCERT text, figures or exercise questions. Refer to examples and
  exercises by number and link to https://ncert.nic.in/textbook.php. Only original images, system fonts and
  no third-party assets.
- **Privacy (children's site, DPDP Act 2023).** No accounts, cookies, analytics, forms or third-party requests.
  The Content-Security-Policy in `vercel.json` enforces "same origin only". The "Spotted a mistake?" links are
  plain `mailto:` links (`src/site.ts` sets the address).

## Develop (in WSL: node/npm live there)

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest: physics, labs, page answers, clip numbers
npm run build      # typecheck + build to dist/
```

## Layout

| Path | What |
|---|---|
| `index.html`, `about/`, `404.html` | home, about/privacy/how-we-check, not-found |
| `class-9/science/work-energy/` | Ch 7 Work, Energy and Simple Machines |
| `partials/` | header/footer, pulled in at build time with `<!-- @include name -->` |
| `src/physics.ts` | every formula (pure functions); the single source of truth |
| `src/lab-models.ts` | lab state built on `physics.ts` (testable without a browser) |
| `src/lab-*.ts`, `src/canvas.ts` | the canvas labs; each starts only when scrolled near |
| `tests/` | vitest suites |
| `manim/` | ManimGL source of the clips; `bash manim/render.sh` renders on the GPU and writes `public/clips/` |

## Clips

Rendered with ManimGL in WSL (`~/manim/venv`, GPU via `~/manim/gpu_render.py`), 1280x720, silent, ~250 KB each,
self-hosted in `public/clips/` with a poster frame. Separate from the outoflimit YouTube channel. Every number
on screen is checked in `tests/clips.test.ts`.

## Deploy

Vercel builds this repo (`vercel.json`: `npm ci`, `npm run build`, output `dist/`). Pushing a branch other than
`main` gives a preview URL; **pushing to `main` updates www.justinlimit.com**, so merge only after a review.
