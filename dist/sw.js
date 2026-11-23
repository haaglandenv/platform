const cacheKey = 'hv-control-demo-20fd17f761c4';
const offlineUrl = new URL('./', self.registration.scope);

self.addEventListener('install', () => {});
self.addEventListener('message', event => {
  if(event.data?.type === 'HV_ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('hv-control-demo-') && key !== cacheKey).map(key => caches.delete(key)))),
  ]));
});

self.addEventListener('fetch', (event) => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(cacheKey);
      try {
        const response = await fetch(request);
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          const markup = await response.clone().text();
          if (markup.includes('data-hv-prototype')) await cache.put(offlineUrl, response.clone());
        }
        return response;
      } catch {
        return (await cache.match(offlineUrl)) || Response.error();
      }
    })());
    return;
  }
  const resource = new URL(url.pathname, url.origin).href;
  if (!resource.startsWith(new URL('assets/', self.registration.scope).href)
    && !['site.js','site.css','manifest.webmanifest'].some(name => resource === new URL(name,self.registration.scope).href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheKey);
    try {
      const response = await fetch(request);
      if (response.ok && !response.headers.get('content-type')?.includes('text/html')) await cache.put(request,response.clone());
      return response;
    } catch {
      return (await cache.match(request)) || Response.error();
    }
  })());
});
