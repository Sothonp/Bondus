import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 uses the official Vite plugin — no tailwind.config.js needed.
export default defineConfig(({ mode }) => {
  // The AI Coach talks to the FastAPI RAG server (src/api.py). In dev, these paths are
  // proxied to it so the browser stays same-origin. /api/major-guidance is not listed:
  // it is a separate Vercel function.
  const ragTarget = loadEnv(mode, process.cwd(), '').RAG_API_PROXY_TARGET || 'http://127.0.0.1:8000'
  const ragPaths = ['/api/query', '/api/ingest', '/api/documents', '/health']
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: Object.fromEntries(ragPaths.map((path) => [path, { target: ragTarget, changeOrigin: true }])),
    },
  }
})
