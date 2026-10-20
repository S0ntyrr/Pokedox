const CACHE = 'pokedex-v3'
const SCOPE = new URL('./', self.registration.scope).pathname
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Red primero (página y datos frescos); si no hay red, lo último guardado.
// Assets con hash de Vite, imágenes y fuentes: caché primero.
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (!url.protocol.startsWith('http')) return

  const cacheFirst =
    url.pathname.startsWith(SCOPE + 'assets/') ||
    /\.(png|woff2?)$/.test(url.pathname) ||
    url.hostname === 'fonts.gstatic.com'

  event.respondWith(
    cacheFirst
      ? caches.match(req).then((hit) => hit || fetchAndStore(req))
      : fetchAndStore(req).catch(() =>
          caches
            .match(req)
            .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
        ),
  )
})

function fetchAndStore(req) {
  return fetch(req).then((res) => {
    if (res && (res.status === 200 || res.type === 'opaque')) {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy))
    }
    return res
  })
}
