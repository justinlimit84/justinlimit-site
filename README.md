# justinlimit.com

Interactive science learning for NCERT Class 9 (2026 *Exploration* textbook): canvas labs, short ManimGL
animations and step-by-step solutions. A static multi-page site (Vite + TypeScript, no framework),
hosted on GitHub Pages.

## Rules for every page

- **Accuracy first.** Symbols, definitions, SI units and sign conventions match the NCERT chapter. Every
  worked answer is solved two ways, and every number on the page is recomputed by `tests/answers.test.ts`
  (tag it with `data-check="key" data-value="number"` and add the independent calculation to the test).
- **Copyright.** Concepts only. Never copy NCERT text, figures or exercise questions. Refer to examples and
  exercises by number and link to https://ncert.nic.in/textbook.php. Only original images, system fonts and
  no third-party assets.
- **Privacy (children's site, DPDP Act 2023).** No accounts, cookies, analytics, forms or third-party requests.
  The Content-Security-Policy `<meta>` tag in every page enforces "same origin only". The "Spotted a mistake?" links are
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

## Deploy (GitHub Pages)

This repo is public and GitHub Pages serves it directly. `.github/workflows/pages.yml` runs on every push to
`main`: `npm ci`, `npm test`, `npm run build`, then publishes `dist/`. A failing test blocks the deploy.
**Pushing to `main` updates www.justinlimit.com**, so work on a branch and merge after review.
(One-time setting: repo Settings → Pages → Source: "GitHub Actions"; custom domain www.justinlimit.com.)

- `public/CNAME` (www.justinlimit.com) and `public/.nojekyll` are copied into `dist/`.
- Pages can't send HTTP headers, so the Content-Security-Policy and referrer policy are `<meta>` tags in each
  page (checked by `tests/site.test.ts`).
- DNS (GoDaddy): `www` CNAME → `justinlimit84.github.io`; apex `@` A records → 185.199.108.153,
  185.199.109.153, 185.199.110.153, 185.199.111.153. Then tick "Enforce HTTPS" in the Pages settings.
