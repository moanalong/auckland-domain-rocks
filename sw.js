// Service Worker for NUCLEAR Cache Busting
// Auckland Domain Rock Hunter - EXTREME Cache Invalidation

const CACHE_VERSION = 'auckland-rocks-v1757750511-nuclear';
const CACHE_NAME = `auckland-rock-hunter-${CACHE_VERSION}`;
const TIMESTAMP = Date.now();

console.log('SW: NUCLEAR Cache Buster loaded at', new Date().toISOString());

// List of files to cache (NONE - we want to force ALL network requests)
const ASSETS_TO_CACHE = [];

// Patterns to force reload (everything)
const FORCE_RELOAD_PATTERNS = [
    /\.html$/,
    /\.js$/,
    /\.css$/,
    /\.json$/,
    /\/$/,
    /\?/
];

// Install event - clear all old caches
self.addEventListener('install', event => {
    console.log('SW: Installing with aggressive cache clearing');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log('SW: Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('SW: All caches cleared, taking control');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up and take control
self.addEventListener('activate', event => {
    console.log('SW: Activating and claiming clients');
    event.waitUntil(
        Promise.all([
            // Clear all existing caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('SW: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients immediately
            self.clients.claim()
        ])
    );
});

// Fetch event - NUCLEAR network requests with extreme cache busting
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Only handle requests to our domain
    if (url.origin === location.origin) {
        console.log('SW: NUCLEAR intercepting request:', url.pathname);
        
        // Check if this file type should be force reloaded
        const shouldForceReload = FORCE_RELOAD_PATTERNS.some(pattern => 
            pattern.test(url.pathname) || pattern.test(url.href)
        );
        
        if (shouldForceReload) {
            event.respondWith(
                // NUCLEAR network request with extreme cache busting
                fetch(addNuclearCacheBuster(event.request.url), {
                    cache: 'no-store',
                    mode: 'same-origin',
                    credentials: 'same-origin',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
                        'Pragma': 'no-cache',
                        'Expires': '-1',
                        'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'If-None-Match': '*'
                    }
                }).catch(error => {
                    console.error('SW: NUCLEAR request failed, trying fallback:', error);
                    // Try original request as absolute last resort
                    return fetch(event.request, { cache: 'no-store' });
                })
            );
        }
    }
});

// Add NUCLEAR cache busting parameters to URLs
function addNuclearCacheBuster(url) {
    const now = Date.now();
    const random = Math.random().toString(36).substring(7);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cb=${now}&r=${random}&sw=nuclear&mobile=nocache&ts=${TIMESTAMP}&force=true&v=${CACHE_VERSION}`;
}

// Legacy function for backward compatibility
function addCacheBuster(url) {
    return addNuclearCacheBuster(url);
}

// Listen for messages from the main thread
self.addEventListener('message', event => {
    if (event.data && (event.data.type === 'FORCE_REFRESH' || event.data.type === 'NUCLEAR_REFRESH')) {
        console.log('SW: NUCLEAR refresh requested at', new Date().toISOString());
        
        // NUCLEAR cache clearing - delete EVERYTHING
        Promise.all([
            // Clear all Cache API caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('SW: NUCLEAR clearing cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }),
            
            // Clear all client-side storage (via message to clients)
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'NUCLEAR_CLEAR_STORAGE',
                        timestamp: Date.now()
                    });
                });
            })
        ]).then(() => {
            console.log('SW: NUCLEAR cache clearing complete');
            
            // Notify all clients that nuclear clearing is done
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'NUCLEAR_CLEARED',
                        message: 'Nuclear cache clearing complete - force reloading now',
                        timestamp: Date.now()
                    });
                });
            });
        }).catch(error => {
            console.error('SW: NUCLEAR clearing failed:', error);
        });
    }
});

console.log('SW: Service Worker loaded with cache version:', CACHE_VERSION);