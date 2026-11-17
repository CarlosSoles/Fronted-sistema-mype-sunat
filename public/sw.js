/**
 * Service worker del shell.
 *
 * Objetivo: que la aplicación abra sin conexión sin servir versiones viejas.
 *
 * La versión anterior guardaba el index.html en una caché fija y, al pedir un
 * asset con un hash nuevo que ya no existía, el navegador recibía el HTML
 * (fallback de Cloudflare) y fallaba con "MIME type text/html". La página
 * quedaba en blanco hasta limpiar la caché a mano.
 *
 * Reglas actuales:
 * - La navegación siempre va a la red (`no-store`): el HTML nunca se reutiliza.
 * - Los assets llevan hash en el nombre, así que cache-first es seguro.
 * - La versión de la caché se sube al cambiar la estrategia para invalidar.
 */
const CACHE = 'sync-sunat-shell-v2';
const SHELL = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navegación: red primero y sin caché HTTP. Si falla, se usa el shell guardado.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => caches.match('/')),
    );
    return;
  }

  // Assets con hash: si está en caché, sirve; si no, red y guarda.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
