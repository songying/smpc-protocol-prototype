// SMPC Protocol Service Worker
// Version 1.0.0

const CACHE_NAME = 'smpc-protocol-v1'
const STATIC_CACHE_NAME = 'smpc-static-v1'
const DYNAMIC_CACHE_NAME = 'smpc-dynamic-v1'

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html'
]

// API endpoints that should be cached
const CACHEABLE_API_ROUTES = [
  '/api/user/profile',
  '/api/system/health',
  '/api/notifications'
]

// Routes that need network-first strategy
const NETWORK_FIRST_ROUTES = [
  '/api/data/upload',
  '/api/computation/submit',
  '/api/audit/submit'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }).then(() => {
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
  } else if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request))
  } else if (url.pathname.startsWith('/_next/static/') || 
             url.pathname.endsWith('.js') || 
             url.pathname.endsWith('.css')) {
    event.respondWith(handleStaticAssets(request))
  } else {
    event.respondWith(handlePageRequest(request))
  }
})

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  // Network-first strategy for critical operations
  if (NETWORK_FIRST_ROUTES.some(route => url.pathname.startsWith(route))) {
    return networkFirst(request, DYNAMIC_CACHE_NAME)
  }
  
  // Cache-first for less critical data
  if (CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    return cacheFirst(request, DYNAMIC_CACHE_NAME)
  }
  
  // Network-only for everything else
  return fetch(request)
}

// Handle static assets
async function handleStaticAssets(request) {
  return cacheFirst(request, STATIC_CACHE_NAME)
}

// Handle image requests
async function handleImageRequest(request) {
  return cacheFirst(request, DYNAMIC_CACHE_NAME)
}

// Handle page requests
async function handlePageRequest(request) {
  return networkFirst(request, DYNAMIC_CACHE_NAME)
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url)
      // Update cache in background
      updateCache(request, cache)
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Cache-first failed:', error)
    return getOfflineResponse(request)
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error)
    
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    return getOfflineResponse(request)
  }
}

// Update cache in background
async function updateCache(request, cache) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', error)
  }
}

// Get offline response
function getOfflineResponse(request) {
  const url = new URL(request.url)
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    return caches.match('/offline.html')
  }
  
  // Return offline API response
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This request requires an internet connection',
        offline: true
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
  
  // Return generic offline response
  return new Response('Offline', { status: 503 })
}

// Background sync for data upload
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Process queued data uploads
    const uploads = await getQueuedUploads()
    
    for (const upload of uploads) {
      try {
        await processQueuedUpload(upload)
        await removeFromQueue(upload.id)
      } catch (error) {
        console.log('[SW] Failed to process queued upload:', error)
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error)
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return

  const options = {
    body: 'You have new updates in SMPC Protocol',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'smpc-notification',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  }

  try {
    const data = event.data.json()
    options.body = data.message || options.body
    options.data.url = data.url || options.data.url
  } catch (error) {
    console.log('[SW] Push data parsing error:', error)
  }

  event.waitUntil(
    self.registration.showNotification('SMPC Protocol', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const url = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting()
        break
        
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: '1.0.0' })
        break
        
      case 'CACHE_URLS':
        event.waitUntil(
          cacheUrls(event.data.urls).then(() => {
            event.ports[0].postMessage({ success: true })
          }).catch((error) => {
            event.ports[0].postMessage({ success: false, error: error.message })
          })
        )
        break
        
      case 'CLEAR_CACHE':
        event.waitUntil(
          clearAllCaches().then(() => {
            event.ports[0].postMessage({ success: true })
          }).catch((error) => {
            event.ports[0].postMessage({ success: false, error: error.message })
          })
        )
        break
    }
  }
})

// Helper functions for IndexedDB operations (for offline queue)
async function getQueuedUploads() {
  // This would integrate with IndexedDB for offline queue
  // For now, return empty array
  return []
}

async function processQueuedUpload(upload) {
  // Process the queued upload when back online
  const response = await fetch('/api/data/upload', {
    method: 'POST',
    body: upload.formData
  })
  
  if (!response.ok) {
    throw new Error('Upload failed')
  }
  
  return response.json()
}

async function removeFromQueue(uploadId) {
  // Remove processed upload from IndexedDB queue
  console.log('[SW] Removing processed upload from queue:', uploadId)
}

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  return cache.addAll(urls)
}

async function clearAllCaches() {
  const cacheNames = await caches.keys()
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )
}

console.log('[SW] Service Worker loaded')