// BiKitchen Service Worker - Enhanced v6
// ACTUALIZACIÓN: Fallback de pago sin 3DS + corrección de llaves NMI
const CACHE_VERSION = 'v6';
const STATIC_CACHE = `bikitchen-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `bikitchen-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `bikitchen-images-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Archivos estáticos a cachear inicialmente
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/assets/logo.jpg',
  '/bikitchen-icon.svg'
];

// Rutas de la app para pre-cachear (SPA routes)
const APP_ROUTES = [
  '/packs',
  '/menu',
  '/individuales',
  '/promociones',
  '/temporada',
  '/como-funciona',
  '/nosotros',
  '/faq'
];

// Rutas que siempre deben ir a la red (no cachear)
const NETWORK_ONLY = [
  '/api/',
  'firestore.googleapis.com',
  'firebase',
  'tilopay.com',
  'googleapis.com/identitytoolkit',
  'menus_oficial',  // Nunca cachear peticiones de menús
  'getOfficialMenus' // Nunca cachear función de menús
];

// Dominios de imágenes para cachear agresivamente
const IMAGE_DOMAINS = [
  'firebasestorage.googleapis.com',
  'images.unsplash.com',
  'cdn.jsdelivr.net',
  'seeklogo.com'
];

// Tiempo máximo de caché para contenido dinámico (2 horas)
const DYNAMIC_CACHE_MAX_AGE = 2 * 60 * 60 * 1000;

// Límite de items en caché de imágenes
const IMAGE_CACHE_LIMIT = 100;

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('bikitchen-') && !currentCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Determinar qué caché usar según el tipo de recurso
function getCacheName(request) {
  const url = request.url;
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) || IMAGE_DOMAINS.some(d => url.includes(d))) {
    return IMAGE_CACHE;
  }
  if (url.match(/\.(js|css|woff2?|ttf|eot)$/i)) {
    return STATIC_CACHE;
  }
  return DYNAMIC_CACHE;
}

// Verificar si debe ir solo a la red
function isNetworkOnly(url) {
  return NETWORK_ONLY.some(pattern => url.includes(pattern));
}

// Verificar si es una imagen externa
function isExternalImage(url) {
  return IMAGE_DOMAINS.some(domain => url.includes(domain));
}

// Limpiar caché de imágenes si excede el límite
async function trimImageCache() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();
  if (keys.length > IMAGE_CACHE_LIMIT) {
    // Eliminar las más antiguas
    const toDelete = keys.slice(0, keys.length - IMAGE_CACHE_LIMIT);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// Estrategia de cache inteligente
self.addEventListener('fetch', (event) => {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Network only para APIs y Firebase
  if (isNetworkOnly(url)) {
    // No interceptar estas peticiones: dejar que el navegador las maneje
    // (evita warnings de FetchEvent cuando la red falla o el stream se reinicia)
    return;
  }

  // Para imágenes (locales y externas): Cache First con stale-while-revalidate
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) || isExternalImage(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Fetch en background para actualizar
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
              // Limpiar caché si es muy grande
              trimImageCache();
            });
            return response;
          }
          // Si Storage devuelve 304/412 u otro status no-200, servir caché si existe
          if (cachedResponse) return cachedResponse;
          return response;
        }).catch(() => cachedResponse);

        // Retornar caché inmediatamente si existe
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Para todo lo demás: Network First con fallback a cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          const cacheName = getCacheName(event.request);
          caches.open(cacheName).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es navegación, mostrar página offline
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { 
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'BiKitchen',
    body: '¡Tienes una nueva notificación!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
