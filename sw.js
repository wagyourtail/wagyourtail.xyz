const localCache = "Minecraft-Mappings-Viewer-Cache-local";
const remoteCache = "Minecraft-Mappings-Viewer-Cache-remote";
const install_cached = [
    "/static/js/minecraft/mappings.js",
    "/static/js/minecraft/mappingsbeta.js",
    "/static/css/minecraft/mappings.css",
    "/static/css/minecraft/mappingsbeta.css",
    "/Projects/Minecraft Mappings Viewer/App",
    "/Projects/Minecraft Mappings Viewer beta/App"
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(localCache).then((cache) => {
            return cache.addAll(install_cached);
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method != 'GET') return;

    event.respondWith(async function() {
        const localC = await caches.open(localCache);
        const remoteC = await caches.open(remoteCache);
        const cached_resp = await localC.match(event.request);
        const cached_resp_rem = await remoteC.match(event.request);
        if (cached_resp) return fetch(event.request).catch(() => cached_resp);
        if (cached_resp_rem) {
            remoteC.add(event.request);
            return cached_resp_rem;
        } else {
            return fetch(event.request).then((e) => {
                remoteC.put(event.request, e.clone());
                return e;
            });
        }
    }());
});
