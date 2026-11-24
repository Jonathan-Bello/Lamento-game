import { defineConfig } from 'vite';

// base relativa: el mismo build funciona en GitHub Pages (/<repo>/) y en local.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
