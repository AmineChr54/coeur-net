/* Cœur Net — service worker : tout fonctionne hors ligne une fois la page ouverte une fois. */
var CACHE = 'coeur-net-__VERSION__';
var FILES = __FILES__;
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
// Réseau d'abord pour les pages (mises à jour rapides), cache en secours ; cache d'abord pour le reste.
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); return res;
    }).catch(function(){ return caches.match(req, {ignoreSearch:true}).then(function(r){ return r || caches.match('index.html'); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function(r){ return r || fetch(req); }));
});
