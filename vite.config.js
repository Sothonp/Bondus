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
      proxy: Object.fromEntries(ragPaths.map((path) => [path, {
        target: ragTarget,
        changeOrigin: true,
        // A RAG server that is simply not running otherwise prints a bare ECONNREFUSED
        // stack, which reads like a bug in the app rather than a terminal nobody started.
        // This runs before Vite's own error handler, which then sees the reply already
        // sent and only logs; the browser gets JSON instead of an empty 500.
        configure: (proxy) => proxy.on('error', (err, _req, res) => {
          const isHttp = res && 'req' in res && typeof res.writeHead === 'function'
          if (!isHttp || res.headersSent || res.writableEnded) return   // a ws upgrade: leave it to Vite
          if (err.code === 'ECONNREFUSED')
            console.error(`\n  The AI coach server is not running at ${ragTarget}.`
              + '\n  Start it in another terminal: uv run uvicorn src.api:app --reload --port 8000\n')
          // The app reads a 5xx carrying no FastAPI `detail` as "server unreachable".
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'rag_api_unreachable', target: ragTarget }))
        }),
      }])),
    },
  }
})
