const CACHE = 'hachikai-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll([OFFLINE_URL, '/', '/manifest.webmanifest'])
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  // Navigate requests: try network, fallback to offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse
        if (preload) return preload
        const net = await fetch(req)
        return net
      } catch (e) {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(OFFLINE_URL)
        return cached || new Response('offline', { status: 503 })
      }
    })())
    return
  }
  // Static assets: cache-first
  if (url.origin === location.origin && (/\.(?:css|js|svg|png|jpg|jpeg|gif|ico)$/).test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(req)
      if (cached) return cached
      const resp = await fetch(req)
      cache.put(req, resp.clone())
      return resp
    })())
  }
})

