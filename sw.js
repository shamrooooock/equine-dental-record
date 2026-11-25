const BUILD_ID="2026-11-25T00:32:54.308Z";
const REVISION="745ac75d9a0217d18ae8035474cc98c0c0bcbe062e5c836d42356940e3dc6b4f";
const ASSETS=[{"url":"assets/html2canvas.esm-QH1iLAAe.js","hash":"061c08e50c0dc57b8d5e6531f0b8237a52a68b233260d49ab2f2c2906ad112c4"},{"url":"assets/index-BIaWkRwb.css","hash":"30d2858a19bd59efe9ecd8064d23a0ee4adeb575c430aaaf14edd1734acc01ac"},{"url":"assets/index-D46q_u4x.js","hash":"7409987e19e5a7d71764683fe60903de0c5871dfa3511439b6698cc6f30709c0"},{"url":"assets/index.es-BiHQHEVN.js","hash":"abf200e0a258747a1f06449c333aaf392271182693f01aded60a4dc8086763f4"},{"url":"assets/jspdf.es.min-DmizuJPC.js","hash":"a246a93f9f584323cde6c2ae61154a3bb3e1eb73c44ac96d4222c26f10115c15"},{"url":"assets/purify.es-BKvm9NlY.js","hash":"24e7f3c2678c36a7cf3e13d3bdc5a889852602a01256f9fa7ca39844faeaf128"},{"url":"build-id.json","hash":"11408e154c65875fa82e3eb98cd871db0ec8f1cde35f6cd9b59820e1e0aace20"},{"url":"icons/apple-touch-icon.png","hash":"c071409ec33abc287bad969fe695cd3798753d1c7dba21b66e0b105f9d916daf"},{"url":"icons/icon-192.png","hash":"fada197038d11e38c77c574becf2ac7a342fabf7b6ac7fe303be7f1d11fb4b0e"},{"url":"icons/icon-512.png","hash":"0068dedd3d0a8447d84aecd1714f2730ff1e0568c53479eb54d51b19e2d9244f"},{"url":"icons/skull-v1-180.png","hash":"0dd999f21433a0015902a5ec101d7c851c189fbbfb74fe6f60d1488e75e68678"},{"url":"icons/skull-v1-192.png","hash":"dbe8397d0c80830237b335137349c53d1e7223333f64c4473a4ab3acb44b94b0"},{"url":"icons/skull-v1-32.png","hash":"d510693af7a9c5e68fbdf3c3cccdb397b8d7e4f07febfe1d54a4cd6c317d9cf9"},{"url":"icons/skull-v1-512.png","hash":"ff3d72fb613932524e7a65f1258578ba3e54ebe5236dfe75921d6b626bb3af83"},{"url":"index.html","hash":"2359a58e527bfea876ad0668a7c178277fc4afdd17f430fc40a6bbeb58dc1e7f"},{"url":"manifest.webmanifest","hash":"1076595dccc5c7c297b8a96de066386a1a8628daea9e07fe419056f3c28ea6ca"}];
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
