import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [react(), tailwindcss(), cssInjectedByJsPlugin()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    lib: {
      entry: 'src/embed.tsx',
      name: 'AlxOnboarding',
      formats: ['iife'],
      fileName: () => 'onboarding.js',
    },
    outDir: '../assets/js',
    emptyOutDir: false,
  },
});
