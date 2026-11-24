const BUILD_ID="2026-11-24T13:25:42.946Z";
const REVISION="4a4022870f955c999354a27f2779cadef2faf394af558bda9dadfe965a37119e";
const ASSETS=[{"url":"assets/html2canvas.esm-QH1iLAAe.js","hash":"061c08e50c0dc57b8d5e6531f0b8237a52a68b233260d49ab2f2c2906ad112c4"},{"url":"assets/index-B_zHsQ4Q.css","hash":"f25fe31a927f696a6d36c2a8e876d985f0135197a1ca90094a9c896584ad1f56"},{"url":"assets/index-CH9yk-nH.js","hash":"5914473b6bc41255f398651f49b441d90045af9a50cce5ce7a9cd9cd07fb15a2"},{"url":"assets/index.es-CWAPUJ-P.js","hash":"8980a90a0d8b3c2b70bd3579704371ee3db28bbf9aa0efa24e460d772d541cbe"},{"url":"assets/jspdf.es.min-BL3a-1Lg.js","hash":"6d89d56a34831df33ac53c78b4b3884f230caf6e4bbf7ecb50afe1020813b76a"},{"url":"assets/purify.es-BKvm9NlY.js","hash":"24e7f3c2678c36a7cf3e13d3bdc5a889852602a01256f9fa7ca39844faeaf128"},{"url":"build-id.json","hash":"2e7c5910616131b6f59d3409a1abfcd5f7b80f4ee3169bc74a80cfdd92d3287b"},{"url":"icons/apple-touch-icon.png","hash":"c071409ec33abc287bad969fe695cd3798753d1c7dba21b66e0b105f9d916daf"},{"url":"icons/icon-192.png","hash":"fada197038d11e38c77c574becf2ac7a342fabf7b6ac7fe303be7f1d11fb4b0e"},{"url":"icons/icon-512.png","hash":"0068dedd3d0a8447d84aecd1714f2730ff1e0568c53479eb54d51b19e2d9244f"},{"url":"index.html","hash":"66cadbe1718637d6475713234d829d1c9aabd0fc79ce3c8d37cd736d3c6f598f"},{"url":"manifest.webmanifest","hash":"46b6556c1dbabbced941ab0a397c9be57cf90138441d086ae4c55bcb55e8e0a7"}];
/* BUILD_ID, REVISION and ASSETS are injected by build-sw.mjs. No database access. */
const PREFIX = 'equine-dental-pwa:' + self.registration.scope;
const CACHE = PREFIX + REVISION;
const INDEX = new URL('index.html', self.registration.scope).href;
const urls = ASSETS.map(asset => new URL(asset.url, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Complete all writes before cleanup. A failed/partial deployment must not
    // activate or claim offline readiness, even for non-hashed HTML and icons.
    const results = await Promise.all(ASSETS.map(async (asset, i) => {
      try {
        const response = await fetch(urls[i], { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok || response.redirected) throw new Error('Invalid asset response');
        const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
        if (hash !== asset.hash) throw new Error('Build mismatch');
        await cache.put(urls[i], response);
        return true;
      } catch { return false; }
    }));
    if (results.some(ok => !ok)) { await caches.delete(CACHE); throw new Error('Offline cache incomplete'); }
    // Deliberately no skipWaiting: never replace the worker under an open chart.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Activation happens only when the old version's windows have all closed.
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const target = event.request.mode === 'navigate' ? INDEX : url.href;
    const response = await cache.match(target);
    // A missing resource is never replaced with a different build from network.
    return response || new Response('Offline resource unavailable. Reopen online to prepare the app.', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'OFFLINE_STATUS') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const present = await Promise.all(urls.map(url => cache.match(url)));
    event.ports[0]?.postMessage({ buildId: BUILD_ID, ready: present.every(Boolean) });
  })());
});
