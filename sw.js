// Service Worker for Aggressive Cache Busting
// Auckland Domain Rock Hunter - Force Cache Invalidation

const CACHE_VERSION = 'auckland-rocks-v1757748500-user-auth';
const CACHE_NAME = `auckland-rock-hunter-${CACHE_VERSION}`;

// List of files to cache (none - we want to force network requests)
const ASSETS_TO_CACHE = [];

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

// Fetch event - force network requests with cache busting
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Only handle requests to our domain
    if (url.origin === location.origin) {
        console.log('SW: Intercepting request:', url.pathname);
        
        event.respondWith(
            // Force network request with cache busting
            fetch(addCacheBuster(event.request.url), {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            }).catch(error => {
                console.error('SW: Network request failed:', error);
                // Fallback to original request if cache-busted fails
                return fetch(event.request);
            })
        );
    }
});

// Add cache busting parameters to URLs
function addCacheBuster(url) {
    const cacheBuster = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cb=${cacheBuster}&sw=force&mobile=nocache`;
}

// Listen for messages from the main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'FORCE_REFRESH') {
        console.log('SW: Force refresh requested');
        
        // Clear all caches
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log('SW: Force clearing cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            // Notify all clients to reload
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'CACHE_CLEARED',
                        message: 'All caches cleared - reload now'
                    });
                });
            });
        });
    }
});

console.log('SW: Service Worker loaded with cache version:', CACHE_VERSION);