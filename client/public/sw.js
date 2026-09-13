/* Service worker del Catálogo de Repuestos.
   Estrategia: red primero con respaldo en caché — la app abre siempre,
   con o sin internet, y nunca sirve código viejo cuando hay señal. */

const CACHE = "catalogo-v1";
const IMG_CACHE = "catalogo-img-v1";
const IMG_MAX = 300;
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

/** Deja la caché de fotos por debajo del tope, borrando las más antiguas. */
async function trimImageCache() {
  const cache = await caches.open(IMG_CACHE);
  const keys = await cache.keys();
  if (keys.length <= IMG_MAX) return;
  await Promise.all(keys.slice(0, keys.length - IMG_MAX).map((key) => cache.delete(key)));
}

/**
 * Fotos de los repuestos: primero la caché (así se ven sin señal) y, si no
 * están, la red guardando una copia. Una foto que falla nunca rompe la app:
 * el error llega al <img>, que muestra "Imagen no disponible".
 */
async function imageFirstCache(request) {
  const cache = await caches.open(IMG_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    await cache.put(request, response.clone()).catch(() => undefined);
    trimImageCache();
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE && k !== IMG_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* El cliente envía los recursos que realmente cargó (scripts, estilos, fuentes)
   para dejarlos en caché desde la primera visita, antes de perder la señal. */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "precache" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(
        [...new Set([...SHELL, ...data.urls])].map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
        ),
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Fotos de los repuestos (viven en Google Drive): caché primero, para verlas sin señal.
  if (request.destination === "image" && url.origin !== self.location.origin) {
    event.respondWith(imageFirstCache(request).catch(() => Response.error()));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Las llamadas al API no se cachean: el catálogo offline vive en localStorage.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy).catch(() => undefined));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return new Response("Sin conexión", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }),
  );
});
