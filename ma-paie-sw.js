/* Ma Paie hors ligne : l'appli s'ouvre même sans connexion.
   La page est cherchée sur le réseau d'abord (pour recevoir les mises à jour), puis dans le cache si hors ligne.
   Les données restent dans le téléphone : ce fichier ne les lit jamais. */
const CACHE='ma-paie-v1';
const FILES=['ma-paie.html','ma-paie.webmanifest','ma-paie-icon-192.png','ma-paie-icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ma-paie-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  const page=r.mode==='navigate'||u.pathname.endsWith('/ma-paie.html');
  e.respondWith(fetch(r).then(res=>{
    if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(page?'ma-paie.html':r,cp))}
    return res;
  }).catch(()=>caches.match(page?'ma-paie.html':r,{ignoreSearch:true}).then(m=>m||caches.match('ma-paie.html'))));
});
