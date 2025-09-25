// Service Worker - CompreAqui E-commerce
// Versão 1.0 - Cache estratégico e PWA

const CACHE_NAME = 'compreaqui-v1.0.0';
const STATIC_CACHE = 'compreaqui-static-v1.0.0';
const DYNAMIC_CACHE = 'compreaqui-dynamic-v1.0.0';
const API_CACHE = 'compreaqui-api-v1.0.0';

// Recursos para cache estático (sempre em cache)
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/responsive.css',
    '/js/main.js',
    '/js/auth.js',
    '/js/utils.js',
    '/js/security.js',
    '/js/validation.js',
    '/img/hero-banner.svg',
    '/img/security-badge.svg',
    '/img/ssl-badge.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Recursos para cache dinâmico (cache sob demanda)
const DYNAMIC_ASSETS = [
    '/pages/',
    '/img/products/',
    '/img/avatars/'
];

// APIs para cache com estratégia específica
const API_ENDPOINTS = [
    '/api/products',
    '/api/categories'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        Promise.all([
            // Cache estático
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Fazendo cache dos recursos estáticos...');
                return cache.addAll(STATIC_ASSETS);
            }),
            
            // Pular waiting para ativar imediatamente
            self.skipWaiting()
        ])
    );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');
    
    event.waitUntil(
        Promise.all([
            // Limpar caches antigos
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== API_CACHE) {
                            console.log('[SW] Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Tomar controle de todas as abas
            self.clients.claim()
        ])
    );
});

// Interceptação de requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requests não-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Estratégia baseada no tipo de recurso
    if (isStaticAsset(request.url)) {
        // Cache First para recursos estáticos
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else if (isAPIRequest(request.url)) {
        // Network First para APIs
        event.respondWith(networkFirst(request, API_CACHE));
    } else if (isDynamicAsset(request.url)) {
        // Stale While Revalidate para recursos dinâmicos
        event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    } else {
        // Network First como fallback
        event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    }
});

// Estratégias de cache

// Cache First - Prioriza cache, fallback para network
async function cacheFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Erro em cacheFirst:', error);
        return getOfflineFallback(request);
    }
}

// Network First - Prioriza network, fallback para cache
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network falhou, tentando cache...');
        
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return getOfflineFallback(request);
    }
}

// Stale While Revalidate - Retorna cache e atualiza em background
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Fetch em background para atualizar cache
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => {
        // Silenciosamente falha se network não disponível
    });
    
    // Retorna cache imediatamente se disponível
    return cachedResponse || fetchPromise;
}

// Funções auxiliares
function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => url.includes(asset)) ||
           url.includes('.css') ||
           url.includes('.js') ||
           url.includes('.svg') ||
           url.includes('font-awesome');
}

function isAPIRequest(url) {
    return url.includes('/api/') ||
           API_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

function isDynamicAsset(url) {
    return DYNAMIC_ASSETS.some(asset => url.includes(asset)) ||
           url.includes('.jpg') ||
           url.includes('.png') ||
           url.includes('.webp');
}

function getOfflineFallback(request) {
    if (request.destination === 'document') {
        return caches.match('/index.html');
    }
    
    if (request.destination === 'image') {
        return caches.match('/img/placeholder.svg');
    }
    
    return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

// Sincronização em background
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Sincronizar dados offline
        const offlineData = await getOfflineData();
        
        if (offlineData.length > 0) {
            for (const data of offlineData) {
                await syncDataToServer(data);
            }
            
            await clearOfflineData();
            
            // Notificar clientes sobre sincronização
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SYNC_COMPLETE',
                        data: { synced: offlineData.length }
                    });
                });
            });
        }
    } catch (error) {
        console.error('[SW] Erro na sincronização:', error);
    }
}

// Notificações Push
self.addEventListener('push', (event) => {
    console.log('[SW] Push recebido:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Nova notificação do CompreAqui!',
        icon: '/img/icon-192.png',
        badge: '/img/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver detalhes',
                icon: '/img/checkmark.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: '/img/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('CompreAqui', options)
    );
});

// Clique em notificações
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificação clicada:', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Funções de dados offline (implementar conforme necessário)
async function getOfflineData() {
    // Implementar lógica para recuperar dados offline
    return [];
}

async function syncDataToServer(data) {
    // Implementar lógica para sincronizar dados com servidor
    return fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

async function clearOfflineData() {
    // Implementar lógica para limpar dados offline após sincronização
    return Promise.resolve();
}