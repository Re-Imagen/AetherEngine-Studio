// Scope-aware PWA cache: works at https://example.com and project subpaths.
const BASE_PATH = new URL(self.registration.scope).pathname;
const CACHE_NAME = `aether-studio-shell-v3-__BUILD_ID__:${BASE_PATH}`;
const BUILT_FILES = /* __BUILT_FILES__ */ [];
const APP_SHELL = [BASE_PATH, ...['manifest.webmanifest', 'aether-icon.svg', ...BUILT_FILES].map(file => `${BASE_PATH}${file}`)];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('aether-studio-') && key.endsWith(`:${BASE_PATH}`) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH)) return;
  if (url.pathname.startsWith(`${BASE_PATH}aether-ws`) || url.pathname.startsWith(`${BASE_PATH}api/`)) return;

  // Documents use network-first so a new deployment is picked up immediately,
  // then fall back to the scoped app shell when the device goes offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(BASE_PATH, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(BASE_PATH)) || Response.error();
      }
    })());
    return;
  }

  // Hashed JS/CSS, icons, textures, and other static assets use cache-first.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
