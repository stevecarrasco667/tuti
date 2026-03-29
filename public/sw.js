// ─────────────────────────────────────────────────────────────────────────────
// Tuti Games — Service Worker v1.0
//
// ESTRATEGIA: Cache-First para assets estáticos del bundle de Vite.
//
// ⛔ EXCLUSIONES CRÍTICAS (nunca se cachean):
//   - Peticiones WebSocket (ws://, wss://)
//   - Endpoints de PartyKit  → cualquier URL que contenga /party/
//   - Endpoints de Supabase  → *.supabase.co
//   - APIs externas          → pagead2.googlesyndication.com (AdSense)
//   - Rutas de autenticación → /auth/
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'tuti-static-v3';

// Assets que se pre-cachean en la instalación del SW
// ⚠️ NUNCA pre-cachear index.html ni / en una SPA con Vite.
// Los hashes del bundle cambian en cada deploy, y servir un HTML
// obsoleto causa 404 de assets → pantalla blanca.
const PRE_CACHE_ASSETS = [
    '/manifest.json',
];

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRE_CACHE_ASSETS);
        })
    );
    // Forzar activación inmediata sin esperar a cerrar pestañas
    self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) =>
            Promise.all(
                keyList
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    // Tomar control de todas las pestañas abiertas inmediatamente
    self.clients.claim();
});

// ── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ⛔ 0. Solo interceptar peticiones HTTP/HTTPS del MISMO origen.
    // Esto previene errores con chrome-extension://, moz-extension://,
    // y evita interferir con cualquier petición cross-origin (PartyKit, Supabase, etc.)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return;
    }
    if (url.origin !== self.location.origin) {
        return;
    }

    // ⛔ 1. Solo cachear peticiones GET (nunca POST/PUT/DELETE)
    if (request.method !== 'GET') {
        return;
    }

    // ⛔ 2. Nunca interceptar rutas de autenticación (OAuth callbacks)
    if (url.pathname.startsWith('/auth/')) {
        return;
    }

    // ✅ ESTRATEGIA: Cache-First para assets estáticos de Vite
    // Los assets de Vite tienen hashes en el nombre (ej. /assets/index-Bx2L3.js)
    // por lo que son inmutables → perfectos para Cache-First.
    const isStaticAsset =
        url.pathname.startsWith('/assets/') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|webp|svg|ico|mp3|wav|ogg)$/);

    if (isStaticAsset) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;

                return fetch(request).then((response) => {
                    // Solo cachear respuestas válidas (no errores 4xx/5xx)
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                });
            })
        );
        return;
    }

    // ✅ ESTRATEGIA: Network-First para el index.html y rutas de la SPA
    // Permite que la app siempre reciba el HTML más fresco del servidor.
    // Si hay fallo de red (offline), sirve desde caché.
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
