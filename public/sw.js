const CACHE_NAME = 'wali-tahfiz-corner-v2'
const AUDIO_CACHE_NAME = 'wali-tahfiz-audio-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE_NAME).map((key) => caches.delete(key)),
  )))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const requestUrl = new URL(event.request.url)
  const isQuranAudio = requestUrl.hostname === 'verses.quran.foundation' && requestUrl.pathname.endsWith('.mp3')

  if (isQuranAudio) {
    event.respondWith(caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) return cached

      const response = await fetch(event.request)
      // Respons audio yang berhasil disimpan agar dapat diputar lagi tanpa unduh ulang.
      if (response.ok || response.type === 'opaque') cache.put(event.request, response.clone())
      return response
    }))
    return
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)))
})
