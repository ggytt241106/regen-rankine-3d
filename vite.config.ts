import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 部署基路径 — 仓库名为 regen-rankine-3d
  // 若部署到自定义域名或用户页面，请修改为 '/' 或实际路径
  base: '/regen-rankine-3d/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 生成 sourcemap 便于调试
    sourcemap: false,
    // 分包策略: Three.js 和 ECharts 单独打包
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          echarts: ['echarts'],
        },
      },
    },
  },
});