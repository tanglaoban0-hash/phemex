import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    cors: true,
    proxy: {
      '/api': {
        target: 'http://192.168.0.112:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  define: {
    'process.env.VITE_API_BASE': JSON.stringify(process.env.VITE_API_BASE || '/api')
  },
  build: {
    outDir: 'dist'
  }
})