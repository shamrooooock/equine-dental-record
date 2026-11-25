const BUILD_ID="2026-11-25T00:04:36.698Z";
const REVISION="0ea42a946e5cf22138bdf3914f00f3c41295be44dee307275b3966d1b0b43baf";
const ASSETS=[{"url":"assets/html2canvas.esm-QH1iLAAe.js","hash":"061c08e50c0dc57b8d5e6531f0b8237a52a68b233260d49ab2f2c2906ad112c4"},{"url":"assets/index-C8675hjq.js","hash":"501ba51f0bf309948dd4919eb5bf4344d11bd3568ed3f43311a32f8d876dac71"},{"url":"assets/index-n2fe-N64.css","hash":"e16803947bd663da313bff84bf91e655a0db8da8c0ed51f8568e0e37811546ae"},{"url":"assets/index.es-jK2Budtk.js","hash":"df50ca7af2f2b9279baf80ceb6be647c0c8cc60c5e883900ff6c70aced17b95b"},{"url":"assets/jspdf.es.min-BkAbD1dz.js","hash":"f35ffb9ca5dd339a8eab0a943ca627c627980360139be7963de86484644bbbdd"},{"url":"assets/purify.es-BKvm9NlY.js","hash":"24e7f3c2678c36a7cf3e13d3bdc5a889852602a01256f9fa7ca39844faeaf128"},{"url":"build-id.json","hash":"0e25b320c995d8e3b710821d66b2414ff0ab88c3d120ad01ca7c87e82da7565f"},{"url":"icons/apple-touch-icon.png","hash":"c071409ec33abc287bad969fe695cd3798753d1c7dba21b66e0b105f9d916daf"},{"url":"icons/icon-192.png","hash":"fada197038d11e38c77c574becf2ac7a342fabf7b6ac7fe303be7f1d11fb4b0e"},{"url":"icons/icon-512.png","hash":"0068dedd3d0a8447d84aecd1714f2730ff1e0568c53479eb54d51b19e2d9244f"},{"url":"icons/skull-v1-180.png","hash":"0dd999f21433a0015902a5ec101d7c851c189fbbfb74fe6f60d1488e75e68678"},{"url":"icons/skull-v1-192.png","hash":"dbe8397d0c80830237b335137349c53d1e7223333f64c4473a4ab3acb44b94b0"},{"url":"icons/skull-v1-32.png","hash":"d510693af7a9c5e68fbdf3c3cccdb397b8d7e4f07febfe1d54a4cd6c317d9cf9"},{"url":"icons/skull-v1-512.png","hash":"ff3d72fb613932524e7a65f1258578ba3e54ebe5236dfe75921d6b626bb3af83"},{"url":"index.html","hash":"9571f7a82db07ef7e0e80d9796e2c345b01c2636ff2118c5c0c1dfebd3961641"},{"url":"manifest.webmanifest","hash":"1076595dccc5c7c297b8a96de066386a1a8628daea9e07fe419056f3c28ea6ca"}];
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
