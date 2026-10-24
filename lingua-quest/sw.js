/* Lingua Quest hors ligne. Réseau d’abord (pour recevoir les mises à jour), cache si hors ligne.
   Change VERSION à chaque mise à jour des fichiers. Ne touche qu’aux caches « lingua-quest- ». */
const VERSION = 'lingua-quest-v8';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'js/app.js', 'js/logic.js', 'js/ctx.js', 'js/ui.js', 'js/audio.js', 'js/content.js', 'js/play.js', 'js/codexview.js',
  'data/codex.js', 'data/tenses.js', 'data/toeic.js', 'data/world.js',
  'sons/son-juste.mp3', 'sons/son-faux.mp3', 'sons/son-combo.mp3', 'sons/son-victoire.mp3', 'sons/son-temps.mp3', 'sons/son-micro.mp3',
  'img/titre.webp', 'img/carte.webp', 'img/heros-toi.webp', 'img/combattant.webp', 'img/stratege.webp', 'img/explorateur.webp', 'img/technicien.webp', 'img/cafe.webp',
  'img/boss-1.webp', 'img/boss-2.webp', 'img/boss-3.webp', 'img/boss-4.webp', 'img/boss-5.webp', 'img/boss-6.webp',
  'img/photo-bureau.webp', 'img/photo-livraison.webp', 'img/photo-restaurant.webp'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('lingua-quest-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  /* polices Google : cache au premier passage, pour l’affichage hors ligne */
  if (u.origin !== location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
      e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(r, cp)); return res; })));
    }
    return;
  }
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(r, cp)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
