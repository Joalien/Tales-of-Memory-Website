import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.talesofmemory.com',
  output: 'static',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
