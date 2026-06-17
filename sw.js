// Stacks service worker
// Stale-while-revalidate for everything: the app shell and your library open
// instantly offline, and previously-seen book covers / fonts stay available
// without a connection. Fresh copies are fetched in the background when online.
// Google Books lookups for NEW titles still need a network, and degrade
// gracefully when offline.
var CACHE = 'stacks-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(resp){
        // Cache successful same-origin responses and opaque cross-origin ones
        // (covers, fonts) so they survive offline.
        if (resp && (resp.status === 200 || resp.type === 'opaque')) {
          var copy = resp.clone();
          caches.open(CACHE).then(function(cache){ cache.put(req, copy); });
        }
        return resp;
      }).catch(function(){
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
      return cached || network;
    })
  );
});
