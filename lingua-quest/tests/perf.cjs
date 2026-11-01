/* Mesures de performance dans Chromium (protocole CDP) : premier affichage en 4G lente simulée, changement d’écran,
   mémoire, nœuds DOM et écouteurs après 180 changements d’écran et 15 quêtes (recherche de fuites et d’écouteurs dupliqués).
   Lancer : python3 -m http.server 8765 (dans lingua-quest/), puis node tests/perf.cjs */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { window.__LQ_GUARD_MS = 0; });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.accept());
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  await cdp.send('Network.enable');

  /* 1. Premier affichage, cache vide, « 4G lente » : 1,6 Mbit/s, 750 kbit/s, 150 ms de latence (profil Lighthouse) */
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await p.goto(BASE);
  await p.waitForSelector('.title-screen');
  const shown = Date.now() - t0;
  const nav = await p.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime;
    return { fcp: Math.round(fcp || 0), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), ko: Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), n.transferSize || 0) / 1024) };
  });
  console.log(`premier affichage (4G lente, processeur ×4 plus lent, cache vide) : écran titre visible en ${shown} ms`);
  console.log(`  premier rendu (FCP) ${nav.fcp} ms · DOMContentLoaded ${nav.dcl} ms · load ${nav.load} ms · ${nav.ko} Ko transférés`);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  await p.click('text=Commencer l’aventure'); await p.fill('#heroName', 'Perf'); await p.click('[data-act="createDone"]'); await p.click('[data-act="placementSkip"]');
  await p.waitForSelector('.home-screen');

  const winListeners = async () => {
    const out = {};
    for (const expr of ['window', 'document', 'document.getElementById("app")', 'document.getElementById("play")']) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: expr });
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
      for (const l of listeners) { const k = expr.replace(/document.getElementById\("(\w+)"\)/, '#$1') + ':' + l.type; out[k] = (out[k] || 0) + 1; }
    }
    return out;
  };
  const metrics = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const m = (await cdp.send('Performance.getMetrics')).metrics;
    const g = k => m.find(x => x.name === k).value;
    return { heap: g('JSHeapUsedSize') / 1048576, nodes: g('Nodes'), listeners: g('JSEventListeners'), docs: g('Documents') };
  };
  await p.goto(BASE + '#/home'); await p.waitForTimeout(300);
  const m0 = await metrics(), l0 = await winListeners();

  /* 2. 180 changements d’écran et 15 quêtes */
  const routes = ['home', 'world', 'chapter/1', 'learn', 'academy', 'codex', 'toeic', 'stats', 'hero', 'profile', 'review', 'carnet'];
  const times = [];
  let quests = 0;
  for (let c = 0; c < 15; c++) {
    for (const r of routes) {
      const t = await p.evaluate(async r => { const t1 = performance.now(); location.hash = '#/' + r; await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok))); return performance.now() - t1; }, r);
      times.push(t);
    }
    await p.goto(BASE + '#/chapter/1');
    await p.click('[data-act="quest"][data-id="q1-4"]');
    for (let k = 0; k < 40 && !(await p.locator('#play .bilan').count()); k++) {
      const cur = await p.evaluate(() => window.__LQ.current());
      if (cur && cur.kind === 'item' && ['qcm', 'listen', 'decode'].includes(cur.item.type) && await p.locator('#play [data-act="pick"]:not([disabled])').count()) { await p.click(`#play [data-act="pick"][data-k="${cur.item.answer}"]`); continue; }
      const nb = p.locator('#play [data-act="next"], #play [data-act="continue"], #play [data-act="dlgNext"], #play [data-act="reveal"], #play [data-act="grade"][data-g="ok"]').first();
      if (await nb.count()) { await nb.click(); continue; }
      if (cur && cur.kind === 'item' && cur.item.type === 'type') { await p.fill('#typeIn', cur.item.answer[0]); await p.click('#play [data-act="checkType"]'); continue; }
      if (cur && cur.kind === 'item' && cur.item.type === 'order') { const used = new Set(); for (const w of cur.item.answer.split(' ')) { const k2 = cur.item.words.findIndex((x, i) => !used.has(i) && x.toLowerCase() === w.toLowerCase()); used.add(k2); await p.click(`#play [data-act="orderAdd"][data-k="${k2}"]`); } await p.click('#play [data-act="checkOrder"]'); continue; }
      await p.waitForTimeout(50);
    }
    if (await p.locator('#play .bilan').count()) { quests++; await p.click('#play [data-act="close"]'); }
  }
  await p.goto(BASE + '#/home'); await p.waitForTimeout(300);
  const m1 = await metrics(), l1 = await winListeners();
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, v) => a + v, 0) / times.length;
  console.log(`changement d’écran (${times.length} mesures, jusqu’à l’affichage) : moyenne ${avg.toFixed(1)} ms · médiane ${times[times.length >> 1].toFixed(1)} ms · max ${times[times.length - 1].toFixed(1)} ms`);
  console.log(`quêtes jouées jusqu’au bilan : ${quests}/15`);
  console.log(`mémoire JS (après ramasse-miettes) : ${m0.heap.toFixed(2)} → ${m1.heap.toFixed(2)} Mo`);
  console.log(`nœuds DOM : ${m0.nodes} → ${m1.nodes} · documents : ${m0.docs} → ${m1.docs}`);
  console.log(`écouteurs d’événements (total) : ${m0.listeners} → ${m1.listeners}`);
  const dup = Object.keys({ ...l0, ...l1 }).filter(k => (l1[k] || 0) !== (l0[k] || 0)).map(k => `${k} ${l0[k] || 0}→${l1[k] || 0}`);
  console.log('écouteurs globaux (window, document, #app, #play) : ' + (dup.length ? 'ÉVOLUTION ' + dup.join(', ') : 'identiques avant/après, aucun doublon') + ' · ' + JSON.stringify(l1));
  console.log('erreurs JavaScript : ' + (errors.length ? errors.join(' // ') : 'aucune'));
  await b.close();
})();
