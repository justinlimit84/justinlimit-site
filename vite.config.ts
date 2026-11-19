import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// Static multi-page site: every page is real HTML (fast, works without JavaScript for reading).
// Shared header/footer live in /partials and are pulled in at build time with
//   <!-- @include header -->   and   <!-- @include footer -->
function partials(): Plugin {
  return {
    name: 'jl-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_m, name: string) =>
          readFileSync(resolve(import.meta.dirname, 'partials', `${name}.html`), 'utf8'),
        )
      },
    },
  }
}

const page = (p: string) => resolve(import.meta.dirname, p)

export default defineConfig({
  base: '/',
  plugins: [partials()],
  build: {
    rollupOptions: {
      input: {
        home: page('index.html'),
        workEnergy: page('class-9/science/work-energy/index.html'),
        about: page('about/index.html'),
        notFound: page('404.html'),
      },
    },
  },
})
