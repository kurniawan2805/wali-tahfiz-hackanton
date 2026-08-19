import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import dailyCoach from './api/daily-coach.js'
import logProgress from './api/log-progress.js'

function localApi() {
  return {
    name: 'wali-tahfiz-local-api',
    apply: 'serve',
    configureServer(server) {
      const handlers = { '/api/daily-coach': dailyCoach, '/api/log-progress': logProgress }
      server.middlewares.use((request, response, next) => {
        const handler = handlers[request.url?.split('?')[0]]
        if (!handler) return next()
        return (async () => {
        const chunks = []
        for await (const chunk of request) chunks.push(chunk)
        try {
          request.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
        } catch {
          response.statusCode = 400
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: 'Body JSON tidak valid.' }))
          return
        }

        const apiResponse = {
          status(code) { response.statusCode = code; return apiResponse },
          json(payload) {
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify(payload))
          },
        }
        await handler(request, apiResponse)
        })().catch((error) => {
          if (!response.writableEnded) {
            response.statusCode = 500
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: 'Local API request failed.' }))
          }
          console.error('[local-api]', error)
        })
      })
    },
  }
}

function offlineAppShell() {
  return {
    name: 'wali-tahfiz-offline-app-shell',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.values(bundle)
        .filter((file) => file.type === 'chunk' || file.type === 'asset')
        .map((file) => `/${file.fileName}`)
      const appShell = ['/', '/index.html', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml', '/llms.txt', '/.well-known/llms.txt', '/icons/app-icon.svg', '/icons/app-icon-maskable.svg', '/icons/app-icon-180.png', '/icons/app-icon-192.png', '/icons/app-icon-512.png', '/icons/app-icon-maskable-512.png', '/fonts/dm-sans-latin.woff2', '/fonts/fredoka-latin.woff2', '/fonts/amiri-quran-arabic.woff2', ...files]
      const source = `const CACHE_NAME = 'wali-tahfiz-static-v8'
const AUDIO_CACHE_NAME = 'wali-tahfiz-audio-v1'
const APP_SHELL = ${JSON.stringify(appShell)}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.hostname === 'cdn.islamic.network' && url.pathname.endsWith('.mp3')) {
    event.respondWith(caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) return cached
      try {
        const response = await fetch(event.request)
        if (response.ok || response.type === 'opaque') cache.put(event.request, response.clone())
        return response
      } catch (err) {
        return new Response(null, { status: 504, statusText: 'Offline Audio Unavailable' })
      }
    }))
    return
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
      return response
    }).catch(() => caches.match('/index.html').then((res) => res || caches.match('/'))))
    return
  }
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html')
        }
        return new Response(null, { status: 503, statusText: 'Offline' })
      })
    }))
  }
})`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY
  return {
    plugins: [react(), localApi(), offlineAppShell()],
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/lucide-react/')) return 'vendor-ui'
            if (id.includes('/node_modules/dexie/')) return 'vendor-db'
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'vendor-react'
            return undefined
          },
        },
      },
    },
  }
})
