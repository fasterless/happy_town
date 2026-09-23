import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  // 测试文件直接使用 describe/it/expect 全局，不逐个导入。
  // vitest 1.6 起默认不注入全局，这里显式打开，保证 npm test 在任何环境下一致。
  test: {
    globals: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: true,
    rollupOptions: {
      output: {
        // core 与 systems 相互依赖（storage.js 结算 orders/wishes/codex，
        // 这些系统又回头用 inventory），拆成两个 chunk 会产生循环引用警告。
        // 按目录分块并把这对相互依赖的层放进同一个 chunk。
        manualChunks(id) {
          if (!id.includes('/src/')) return undefined;
          if (id.includes('/src/config/')) return 'game-config';
          if (id.includes('/src/core/') || id.includes('/src/systems/')) {
            return 'game-engine';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
    open: true,
  },
});
