import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'game-core': [
            './src/core/state.js',
            './src/core/inventory.js',
            './src/core/storage.js',
          ],
          'game-systems': [
            './src/systems/farm.js',
            './src/systems/orders.js',
            './src/systems/home.js',
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
