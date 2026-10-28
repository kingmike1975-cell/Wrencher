import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// builds the Phaser version into public/next/, served beside the original at /next/
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: { outDir: fileURLToPath(new URL('../public/next', import.meta.url)), emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
