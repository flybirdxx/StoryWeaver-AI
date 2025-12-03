import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// 默认将前端的 /api 请求代理到 TS 版服务器 (52301)
// 如需切换回 JS 版，可临时改为 52300，或后续通过 .env 暴露配置。

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@storyweaver/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 52320,
    proxy: {
      '/api': {
        target: 'http://localhost:52301',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'zustand-vendor': ['zustand', 'immer']
        }
      }
    }
  }
});



