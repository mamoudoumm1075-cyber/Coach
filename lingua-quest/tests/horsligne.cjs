/* Audit du mode hors connexion (service worker) dans Chromium.
   Lancer : python3 -m http.server 8765 (dans lingua-quest/), puis node tests/horsligne.cjs */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:8765/';
const problems = [];
const check = (cond, msg) => { if (!cond) { problems.push(msg); console.log('ÉCHEC : ' + msg); } else console.log('ok : ' + msg); };

(async () => {
  /* 1. Chaque fichier mis en cache existe, et tout fichier utile est dans la liste */
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const files = JSON.parse('[' + sw.match(/const FILES = \[([\s\S]*?)\];/)[1].replace(/'/g, '"') + ']');
  const root = path.join(__dirname, '..');
  const missing = files.filter(f => f !== './' && !fs.existsSync(path.join(root, f)));
  check(!missing.length, 'tous les fichiers du cache existent' + (missing.length ? ' : manquent ' + missing.join(', ') : ''));
  const needed = [...fs.readdirSync(path.join(root, 'img')).map(f => 'img/' + f), ...fs.readdirSync(path.join(root, 'sons')).map(f => 'sons/' + f),
    ...fs.readdirSync(path.join(root, 'js')).map(f => 'js/' + f), ...fs.readdirSync(path.join(root, 'data')).map(f => 'data/' + f)];
  const absent = needed.filter(f => !files.includes(f));
  check(!absent.length, 'chaque image, son et script est mis en cache' + (absent.length ? ' : oubliés ' + absent.join(', ') : ''));

  /* 2. Première visite en ligne, puis tout hors connexion */
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(BASE);
  await page.waitForSelector('.title-screen');
  const ready = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  check(ready, 'service worker installé et actif');
  await page.waitForFunction(async () => { const ks = await caches.keys(); const c = ks.find(k => k.startsWith('lingua-quest-')); if (!c) return false; return (await (await caches.open(c)).keys()).length > 30; }, null, { timeout: 15000 }).catch(() => {});
  const cached = await page.evaluate(async () => { const ks = await caches.keys(); const c = ks.find(k => k.startsWith('lingua-quest-')); return c ? (await (await caches.open(c)).keys()).length : 0; });
  check(cached >= files.length - 1, `fichiers en cache après la première visite (${cached}/${files.length})`);

  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.title-screen', { timeout: 8000 }).catch(() => {});
  check(await page.locator('.title-screen').count() === 1, 'hors connexion : l’appli s’ouvre');
  const imgOk = src => page.evaluate(s => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = s; }), src);
  for (const img of ['img/titre.webp', 'img/carte.webp', 'img/boss-6.webp', 'img/photo-bureau.webp', 'img/heros-toi.webp']) check(await imgOk(img), 'hors connexion : image ' + img);
  await page.click('text=Commencer l’aventure');
  await page.fill('#heroName', 'Hors ligne');
  await page.click('[data-act="createDone"]');
  await page.click('[data-act="placementSkip"]');
  await page.waitForSelector('.home-screen');
  await page.goto(BASE + '#/chapter/1');
  await page.click('[data-act="quest"][data-id="q1-4"]');
  for (let k = 0; k < 40 && !(await page.locator('#play .bilan').count()); k++) {
    const b = page.locator('#play [data-act="next"], #play [data-act="dlgNext"], #play [data-act="reveal"], #play [data-act="grade"][data-g="ok"], #play [data-act="continue"]').first();
    if (await b.count()) { await b.click(); continue; }
    const opt = page.locator('#play [data-act="pick"]').first();
    if (await opt.count()) { await opt.click(); continue; }
    break;
  }
  check(await page.locator('#play .bilan').count() === 1, 'hors connexion : une quête se joue jusqu’au bilan');
  await page.click('#play [data-act="close"]');
  const saved = await page.evaluate(() => !!JSON.parse(localStorage.getItem('lingua-quest-v1')).quests['q1-4']);
  check(saved, 'hors connexion : la progression est enregistrée');
  check(!errors.length, 'aucune erreur JavaScript hors connexion' + (errors.length ? ' : ' + errors.join(' // ') : ''));
  await browser.close();
  console.log(problems.length ? `\n${problems.length} problème(s).` : '\nHors connexion : aucun problème.');
  process.exit(problems.length ? 1 : 0);
})();
