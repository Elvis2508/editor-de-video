/* Studio Obra Pro — Service Worker
 * Solo cachea assets estáticos. Nunca guarda videos/imágenes del usuario.
 */
const CACHE_NAME = "studio-obra-pro-static-v12";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./js/capabilities.js",
  "./js/export-deterministic.js",
  "./js/effects-catalog.js",
  "./js/effects-engine.js",
  "./js/speed-engine.js",
  "./js/effects-ui.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./vendor/ffmpeg11/ffmpeg.min.js",
  "./vendor/ffmpeg11/ffmpeg-core.js",
  "./vendor/ffmpeg11/ffmpeg-core.worker.js",
  "./vendor/ffmpeg11/ffmpeg-core.wasm"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isUserMediaRequest(request) {
  const url = request.url || "";
  if (url.startsWith("blob:")) return true;
  if (request.method !== "GET") return true;
  const dest = request.destination;
  if (dest === "video" || dest === "audio" || dest === "track") return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (isUserMediaRequest(request)) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Solo cachea estáticos del propio origen */
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const path = url.pathname;
        const cacheable = /\.(html|css|js|wasm|webmanifest|png|svg|ico)$/i.test(path)
          || path.endsWith("/")
          || /ffmpeg/i.test(path);
        if (cacheable && response.body) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      }).catch(() => cached);
    })
  );
});
