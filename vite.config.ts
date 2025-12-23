import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const manifest = JSON.parse(
  readFileSync(resolve(__dirname, './src/manifest.json'), 'utf-8')
)

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  // 添加 Node.js 兼容性配置
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
})

