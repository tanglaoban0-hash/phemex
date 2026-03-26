const CACHE_NAME = 'phemex-v2'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
]

// 安装时缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// 拦截请求，API不缓存，其他优先使用缓存
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // API请求不缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }
  
  // 其他资源优先使用缓存
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response
        }
        return fetch(request)
      })
  )
})

// 监听消息，处理跳过等待
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})