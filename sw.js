const VERSION = '1.1.0';
const CACHE_PREFIX = 'dayline-github-static-';
const CACHE = CACHE_PREFIX + VERSION;
const BASE = new URL('./', self.registration.scope);
const ROOT = BASE.href;
const ASSETS = [
  ROOT,
  new URL('styles.css?v=' + VERSION, BASE).href,
  new URL('pwa.css?v=' + VERSION, BASE).href,
  new URL('app.js?v=' + VERSION, BASE).href,
  new URL('model.js?v=' + VERSION, BASE).href,
  new URL('pwa.js?v=' + VERSION, BASE).href,
  new URL('icon.svg', BASE).href,
  new URL('icon-192.png', BASE).href,
  new URL('icon-512.png', BASE).href,
  new URL('manifest.webmanifest', BASE).href
];

async function verifiedResponse(path, response) {
  if (!response.ok || response.redirected || response.type === 'opaque') throw new Error('Application resources unavailable');
  const resource = new URL(path);
  if (response.url && new URL(response.url).origin !== resource.origin) throw new Error('Unexpected resource origin');
  const mime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const expected = path === ROOT ? ['text/html'] : resource.pathname.endsWith('.js') ? ['text/javascript', 'application/javascript'] : resource.pathname.endsWith('.css') ? ['text/css'] : resource.pathname.endsWith('.png') ? ['image/png'] : resource.pathname.endsWith('.svg') ? ['image/svg+xml'] : ['application/manifest+json', 'application/json'];
  if (!expected.includes(mime)) throw new Error('Unexpected resource type');
  if (path === ROOT) {
    const html = await response.clone().text();
    if (!html.includes('data-dayline-shell="1"') || !html.includes('src="./app.js?v=' + VERSION + '"')) throw new Error('Application shell is unavailable');
  }
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const responses = await Promise.all(ASSETS.map(async path => verifiedResponse(path, await fetch(new Request(path, { credentials: 'same-origin', cache: 'reload', redirect: 'error' })))));
      const cache = await caches.open(CACHE);
      await Promise.all(ASSETS.map((path, index) => cache.put(path, responses[index])));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'GET_OFFLINE_STATUS' && event.ports?.[0]) event.waitUntil((async()=>{
    const cache = await caches.open(CACHE);
    const complete = (await Promise.all(ASSETS.map(path => cache.match(path)))).every(Boolean);
    event.ports[0].postMessage({ version: VERSION, ready: complete });
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const navigation = request.mode === 'navigate' && (url.pathname === BASE.pathname || url.pathname === BASE.pathname + 'index.html');
  const path = navigation ? ROOT : url.href;
  if (!ASSETS.includes(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(path);
    if (cached) return cached;
    try {
      const response = await verifiedResponse(path, await fetch(new Request(path, { credentials: 'same-origin', redirect: 'error' })));
      await cache.put(path, response.clone());
      return response;
    } catch {
      if (!navigation) return new Response('', { status: 503 });
      const html = '<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><title>日序 · 需要联网</title><body style="font-family:system-ui;padding:40px 24px;color:#385c47;background:#f7f8f4"><h1>先联网，打开这一天。</h1><p>首次打开需要联网，之后才能准备离线资源。</p><p>联网后，请重新打开日序。你的本机记录不会被清除。</p><a href="' + ROOT + '">重新打开</a></body></html>';
      return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  })());
});