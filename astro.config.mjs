import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.talesofmemory.com',
  output: 'static',
  build: { format: 'directory' },
  devToolbar: { enabled: false },

  vite: {
    build: {
      // Le minifieur CSS par défaut fusionne animation-timeline dans le
      // raccourci `animation`, ce que la spécification interdit : le navigateur
      // jette alors la déclaration entière et les animations au défilement ne
      // s'appliquent plus. esbuild ne fait pas cette réécriture.
      cssMinify: 'esbuild',
    },
  },
});
