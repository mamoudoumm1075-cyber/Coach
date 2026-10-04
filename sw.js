/* Hors ligne : l'app se charge même sans réseau. Change VERSION à chaque mise à jour des fichiers. */
const VERSION='coach-v5';
const FILES=['./','index.html','contenu.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  /* réseau d'abord pour récupérer les mises à jour, cache si hors ligne */
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok){ const c=r.clone(); caches.open(VERSION).then(x=>x.put(e.request,c)); } return r; })
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
