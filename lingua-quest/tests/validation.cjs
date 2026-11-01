/* Validation avant publication (Chromium) : micro refusé, micro du serveur voix (arrêt auto, arrêt manuel,
   pistes libérées, nouvel essai), double validation, XP attribuée une seule fois, fichier autonome sans réseau,
   retour du réseau et mise à jour du cache hors ligne, utilisation sur ordinateur (souris, clavier).
   Lancer : python3 -m http.server 8765 (dans lingua-quest/), puis node tests/validation.cjs */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE || 'http://localhost:8765/';
const problems = [];
const check = (cond, msg) => { if (!cond) { problems.push(msg); console.log('ÉCHEC : ' + msg); } else console.log('ok : ' + msg); };

/* Micro simulé : « refus » (autorisation refusée), sinon un vrai flux audio (son 1 s puis silence) */
const INIT = () => {
  window.__LQ_GUARD_MS = 0;
  const V = window.__v = { micMode: 'voix', stopped: 0, gum: 0, recMode: 'ok', said: [] };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, pending: false, paused: false, getVoices: () => [], cancel() {}, resume() {}, speak(u) { V.said.push(u.text); setTimeout(() => u.onend && u.onend(), 20); } } });
  navigator.mediaDevices.getUserMedia = async () => {
    V.gum++;
    if (V.micMode === 'refus') throw new DOMException('refusé', 'NotAllowedError');
    const c = new AudioContext(), osc = c.createOscillator(), g = c.createGain(), dest = c.createMediaStreamDestination();
    g.gain.value = 0.5; osc.connect(g); g.connect(dest); osc.start();
    if (V.micMode === 'voix') setTimeout(() => { g.gain.value = 0; }, 1000);
    for (const t of dest.stream.getTracks()) { const st = t.stop.bind(t); t.stop = () => { V.stopped++; st(); }; }
    return dest.stream;
  };
  class Rec {
    start() { if (V.recMode === 'refus') setTimeout(() => { this.onerror && this.onerror({ error: 'not-allowed' }); this.onend && this.onend(); }, 30); else setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: V.say || 'hello' }]] }); this.onend && this.onend(); }, 30); }
    stop() {} abort() {}
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = Rec;
};

async function toSpeak(page) {
  for (let k = 0; k < 25; k++) {
    const c = await page.evaluate(() => window.__LQ.current());
    if (c && c.kind === 'item' && c.item.type === 'speak') return c.item;
    const b = page.locator('#play [data-act="next"], #play [data-act="continue"]').first();
    if (await b.count()) { await b.click(); continue; }
    const opt = page.locator('#play [data-act="pick"]').first();
    if (await opt.count()) { await opt.click(); continue; }
    await page.waitForTimeout(100);
  }
  return null;
}
const answered = page => page.locator('#play [data-act="continue"], #play [data-act="endNow"]').count();

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const V = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__v)));

  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.title-screen');
  await page.click('text=Commencer l’aventure');
  await page.fill('#heroName', 'Validation');
  await page.click('[data-act="createDone"]');
  await page.click('[data-act="placementSkip"]');
  await page.waitForSelector('.home-screen');

  /* 1. Micro du navigateur refusé : message clair, réponse écrite proposée, nouvel essai possible */
  await page.goto(BASE + '#/oral');
  await page.click('[data-act="oralRun"]');
  let it = await toSpeak(page);
  check(!!it, 'séance orale : exercice de prononciation trouvé');
  await page.evaluate(() => { window.__v.recMode = 'refus'; });
  await page.click('#play [data-act="mic"]');
  await page.waitForFunction(() => /refusé/.test(document.getElementById('micState').textContent), null, { timeout: 4000 }).catch(() => {});
  check(/refusé/.test(await page.textContent('#micState')), 'micro refusé : message « Le micro est refusé »');
  check(await page.locator('#play details.alt[open]').count() === 1, 'micro refusé : la réponse écrite s’ouvre');
  await page.evaluate(t => { window.__v.recMode = 'ok'; window.__v.say = t; }, it.target || it.model.split(' / ')[0]);
  await page.click('#play [data-act="mic"]');
  await page.waitForTimeout(400);
  check(await answered(page) > 0, 'micro : nouvel essai réussi après le refus');
  await page.click('#play [data-act="quit"]');

  /* 2. Micro du serveur voix : arrêt automatique après le silence, pistes libérées, transcription */
  await page.route('https://voix.test/**', async r => {
    const u = new URL(r.request().url());
    const say = await page.evaluate(() => window.__v.say || 'hello').catch(() => 'hello');
    if (u.pathname === '/stt') return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ text: say }) });
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: '{"ok":true}' });
  });
  await page.evaluate(() => { const s = window.__LQ.ctx.S.settings; s.voiceUrl = 'https://voix.test'; s.voiceCode = 'x'; window.__LQ.ctx.save(); });
  await page.reload();
  await page.goto(BASE + '#/oral');
  await page.click('[data-act="oralRun"]');
  it = await toSpeak(page);
  await page.evaluate(t => { window.__v.say = t; window.__v.stopped = 0; window.__v.micMode = 'voix'; }, it.target || it.model.split(' / ')[0]);
  const t0 = Date.now();
  await page.click('#play [data-act="mic"]');
  check(/appuie de nouveau/.test(await page.textContent('#micState')), 'micro serveur : consigne « appuie de nouveau quand tu as fini »');
  await page.waitForSelector('#play [data-act="continue"], #play [data-act="endNow"]', { timeout: 12000 }).catch(() => {});
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  check(await answered(page) > 0, 'micro serveur : arrêt automatique après 1,5 s de silence, puis transcription (' + secs + ' s)');
  check((await V()).stopped >= 1, 'micro serveur : la piste du micro est libérée (' + (await V()).stopped + ' piste arrêtée)');
  await page.click('#play [data-act="continue"], #play [data-act="endNow"]');

  /* 2b. Arrêt manuel : second appui sur le micro */
  it = await toSpeak(page);
  if (it) {
    await page.evaluate(t => { window.__v.say = t; window.__v.stopped = 0; window.__v.micMode = 'continu'; }, it.target || it.model.split(' / ')[0]);
    await page.click('#play [data-act="mic"]');
    await page.waitForTimeout(900);
    await page.click('#play [data-act="mic"]');
    await page.waitForSelector('#play [data-act="continue"], #play [data-act="endNow"]', { timeout: 6000 }).catch(() => {});
    check(await answered(page) > 0 && (await V()).stopped >= 1, 'micro serveur : un second appui termine la phrase et libère le micro');
    await page.click('#play [data-act="continue"], #play [data-act="endNow"]');
  } else check(false, 'second exercice de prononciation trouvé');

  /* 2c. Autorisation refusée sur le chemin serveur, puis nouvel essai */
  it = await toSpeak(page);
  if (it) {
    await page.evaluate(() => { window.__v.micMode = 'refus'; });
    await page.click('#play [data-act="mic"]');
    await page.waitForFunction(() => /refusé/.test(document.getElementById('micState').textContent), null, { timeout: 4000 }).catch(() => {});
    check(/refusé/.test(await page.textContent('#micState')), 'micro serveur refusé : message clair');
    check(!(await page.locator('#play .mic.rec').count()), 'micro serveur refusé : le bouton micro n’est pas resté bloqué');
    await page.evaluate(t => { window.__v.micMode = 'voix'; window.__v.say = t; }, it.target || it.model.split(' / ')[0]);
    await page.click('#play [data-act="mic"]');
    await page.waitForSelector('#play [data-act="continue"], #play [data-act="endNow"]', { timeout: 12000 }).catch(() => {});
    check(await answered(page) > 0, 'micro serveur : nouvel essai réussi après le refus');
  } else check(false, 'troisième exercice de prononciation trouvé');
  await page.click('#play [data-act="quit"]').catch(() => {});
  await page.evaluate(() => { const s = window.__LQ.ctx.S.settings; s.voiceUrl = ''; s.voiceCode = ''; window.__LQ.ctx.save(); });
  await page.unroute('https://voix.test/**');
  await page.reload();

  /* 3. Double validation : une réponse comptée une seule fois, XP une seule fois */
  await page.goto(BASE + '#/chapter/1');
  await page.click('[data-act="quest"][data-id="q1-4"]');
  let typeCard = null;
  for (let k = 0; k < 20 && !typeCard; k++) {
    const c = await page.evaluate(() => window.__LQ.current());
    if (c && c.kind === 'item' && ['qcm', 'listen', 'decode'].includes(c.item.type)) { typeCard = c.item; break; }
    const b = page.locator('#play [data-act="next"], #play [data-act="continue"]').first();
    if (await b.count()) { await b.click(); continue; }
    break;
  }
  if (typeCard) {
    const before = await page.evaluate(() => ({ xp: window.__LQ.ctx.S.xp, n: window.__LQ.ctx.S.recent.length }));
    const opt = page.locator(`#play [data-act="pick"][data-k="${typeCard.answer}"]`);
    await opt.dispatchEvent('click'); await opt.dispatchEvent('click');
    const after = await page.evaluate(() => ({ xp: window.__LQ.ctx.S.xp, n: window.__LQ.ctx.S.recent.length }));
    check(after.n - before.n === 1, 'double validation : une seule réponse enregistrée');
    check(after.xp - before.xp > 0 && after.xp - before.xp <= 15, 'double validation : XP d’une seule réponse (+' + (after.xp - before.xp) + ')');
  } else check(false, 'exercice à choix trouvé');
  await page.click('#play [data-act="quit"]');

  /* 4. XP : le bilan annonce exactement l’XP gagnée, et la récompense de quête n’est entière qu’une fois */
  const playQuest = async () => {
    await page.goto(BASE + '#/chapter/1');
    await page.click('[data-act="quest"][data-id="q1-4"]');
    for (let k = 0; k < 60 && !(await page.locator('#play .bilan').count()); k++) {
      const c = await page.evaluate(() => window.__LQ.current());
      if (c && c.kind === 'item' && ['qcm', 'listen', 'decode'].includes(c.item.type) && await page.locator('#play [data-act="pick"]:not([disabled])').count()) { await page.click(`#play [data-act="pick"][data-k="${c.item.answer}"]`); continue; }
      const b = page.locator('#play [data-act="next"], #play [data-act="continue"], #play [data-act="dlgNext"], #play [data-act="reveal"], #play [data-act="grade"][data-g="ok"]').first();
      if (await b.count()) { await b.click(); continue; }
      if (c && c.kind === 'item' && c.item.type === 'type') { await page.fill('#typeIn', c.item.answer[0]); await page.click('#play [data-act="checkType"]'); continue; }
      if (c && c.kind === 'item' && c.item.type === 'order') { const used = new Set(); for (const w of c.item.answer.split(' ')) { const k2 = c.item.words.findIndex((x, i) => !used.has(i) && x.toLowerCase() === w.toLowerCase()); used.add(k2); await page.click(`#play [data-act="orderAdd"][data-k="${k2}"]`); } await page.click('#play [data-act="checkOrder"]'); continue; }
      await page.waitForTimeout(100);
    }
    const shown = +(await page.locator('.score-row div:nth-child(2) b').textContent()).replace('+', '');
    const rewards = await page.locator('.reward').allTextContents();
    await page.click('#play [data-act="close"]');
    return { shown, rewards: rewards.join(' ') };
  };
  const x0 = await page.evaluate(() => window.__LQ.ctx.S.xp);
  const r1 = await playQuest();
  const x1 = await page.evaluate(() => window.__LQ.ctx.S.xp);
  check(r1.shown === x1 - x0, `XP : le bilan annonce exactement l’XP gagnée (+${r1.shown}, réel +${x1 - x0})`);
  const full = +((r1.rewards.match(/\+(\d+) XP/) || [])[1] || 0);
  const r2 = await playQuest();
  const replay = +((r2.rewards.match(/\+(\d+) XP/) || [])[1] || 0);
  check(full > 0 && replay > 0 && replay < full, `XP : récompense entière la 1re fois (+${full}), réduite ensuite (+${replay})`);
  await page.reload();
  check(await page.evaluate(() => window.__LQ.ctx.S.xp) === x1 + r2.shown, 'XP : tout est retrouvé après rechargement');

  /* 5. Fichier autonome : s’ouvre sans serveur ni réseau, tout est intégré */
  const single = path.join(ROOT, 'lingua-quest-complet.html');
  const html = fs.readFileSync(single, 'utf8');
  check(!/<script[^>]+src=/.test(html) && !/<link[^>]+stylesheet[^>]+href="(?!https)/.test(html), 'fichier autonome : JavaScript et CSS intégrés (aucun fichier local appelé)');
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p2 = await ctx2.newPage();
  const asked = [];
  await p2.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return r.continue(); asked.push(u); return r.abort(); });
  const err2 = [];
  p2.on('pageerror', e => err2.push(e.message));
  p2.on('dialog', d => d.accept());
  await p2.goto('file://' + single);
  await p2.waitForSelector('.title-screen', { timeout: 10000 }).catch(() => {});
  check(await p2.locator('.title-screen').count() === 1, 'fichier autonome : s’ouvre sans serveur et sans réseau');
  const media = await p2.evaluate(async () => {
    const S = window.__LQ_SONS || {}, I = window.__LQ_IMG || null;
    const c = new AudioContext();
    let decoded = 0;
    for (const v of Object.values(S)) { try { const ab = await (await fetch(v)).arrayBuffer(); await c.decodeAudioData(ab); decoded++; } catch (e) { /* compté */ } }
    return { sons: Object.keys(S).length, decoded, imgMap: I ? Object.keys(I).length : null };
  });
  check(media.sons === 6 && media.decoded === 6, `fichier autonome : 6 bruitages intégrés et lisibles (${media.decoded}/${media.sons})`);
  await p2.click('text=Commencer l’aventure');
  await p2.fill('#heroName', 'Autonome');
  await p2.click('[data-act="createDone"]');
  await p2.click('[data-act="placementSkip"]');
  await p2.waitForSelector('.home-screen');
  const imgs = [];
  for (const r of ['home', 'world', 'chapter/1', 'chapter/6', 'hero', 'toeic', 'dialogues']) {
    await p2.goto('file://' + single + '#/' + r);
    await p2.waitForTimeout(300);
    imgs.push(...await p2.evaluate(() => [...document.images].map(i => ({ ok: i.complete && i.naturalWidth > 0, src: i.src.slice(0, 30) }))));
  }
  const bad = imgs.filter(i => !i.ok);
  check(imgs.length > 10 && !bad.length, `fichier autonome : ${imgs.length} images affichées, toutes intégrées${bad.length ? ' — manquantes : ' + bad.map(b => b.src).join(', ') : ''}`);
  await p2.goto('file://' + single + '#/chapter/1');
  await p2.click('[data-act="quest"][data-id="q1-4"]');
  check(await p2.locator('#play:not([hidden])').count() === 1, 'fichier autonome : une quête démarre');
  const local = asked.filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u));
  check(!local.length, 'fichier autonome : aucune ressource demandée au réseau, hors polices Google (' + asked.length + ' requête(s) de police bloquée(s), police de secours utilisée)' + (local.length ? ' — ' + local.join(', ') : ''));
  check(!err2.length, 'fichier autonome : aucune erreur JavaScript' + (err2.length ? ' : ' + err2.join(' // ') : ''));
  await ctx2.close();

  /* 6. Hors ligne : retour du réseau, puis mise à jour du cache quand une nouvelle version est publiée */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lq-maj-'));
  fs.cpSync(ROOT, tmp, { recursive: true, filter: s => !/node_modules|\.captures|rapport-audit|\.git/.test(s) });
  const srv = spawn('python3', ['-m', 'http.server', '8799', '--bind', '127.0.0.1'], { cwd: tmp, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser3 = await chromium.launch();
  const ctx3 = await browser3.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await ctx3.newPage();
  const err3 = [];
  p3.on('pageerror', e => err3.push(e.message));
  const B3 = 'http://127.0.0.1:8799/';
  await p3.goto(B3);
  await p3.evaluate(() => navigator.serviceWorker.ready);
  const v1 = (fs.readFileSync(path.join(tmp, 'sw.js'), 'utf8').match(/VERSION = '([^']+)'/) || [])[1];
  for (let k = 0; k < 30; k++) { if ((await p3.evaluate(() => caches.keys())).includes(v1)) break; await p3.waitForTimeout(500); }
  await ctx3.setOffline(true);
  await p3.reload();
  check(await p3.locator('.title-screen').count() === 1, 'hors ligne : l’appli s’ouvre depuis le cache');
  await ctx3.setOffline(false);
  /* nouvelle version publiée pendant que le téléphone était hors ligne */
  const v2 = v1 + '-maj';
  fs.writeFileSync(path.join(tmp, 'sw.js'), fs.readFileSync(path.join(tmp, 'sw.js'), 'utf8').replace(v1, v2));
  fs.writeFileSync(path.join(tmp, 'index.html'), fs.readFileSync(path.join(tmp, 'index.html'), 'utf8').replace('<title>Lingua Quest</title>', '<title>Lingua Quest · mise à jour</title>'));
  await p3.reload();
  await p3.waitForSelector('.title-screen');
  check(await p3.title() === 'Lingua Quest · mise à jour', 'retour du réseau : la page reçoit la version publiée en ligne (réseau d’abord)');
  await p3.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  /* la nouvelle version s’installe (nouveau cache) puis s’active (suppression de l’ancien) : on attend l’activation */
  /* interrogation toutes les 500 ms (une interrogation à chaque image bloquerait le stockage du cache dans Chromium) */
  for (let k = 0; k < 30; k++) { const ks = await p3.evaluate(() => caches.keys()); if (ks.includes(v2) && !ks.includes(v1)) break; await p3.waitForTimeout(500); }
  const keys = await p3.evaluate(() => caches.keys());
  check(keys.includes(v2) && !keys.includes(v1), `mise à jour du cache : nouvelle version installée, ancienne supprimée (${keys.filter(k => k.startsWith('lingua')).join(', ')})`);
  await ctx3.setOffline(true);
  await p3.reload();
  check(await p3.title() === 'Lingua Quest · mise à jour', 'hors ligne après mise à jour : c’est la nouvelle version qui s’ouvre');
  check(!err3.length, 'hors ligne et mise à jour : aucune erreur JavaScript' + (err3.length ? ' : ' + err3.join(' // ') : ''));
  await ctx3.close();
  await browser3.close();
  srv.kill();
  fs.rmSync(tmp, { recursive: true, force: true });

  /* 7. Ordinateur : 1366×768, souris et clavier, sans écran tactile */
  const ctx4 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx4.addInitScript(() => { window.__LQ_GUARD_MS = 0; });
  const p4 = await ctx4.newPage();
  const err4 = [];
  p4.on('pageerror', e => err4.push(e.message));
  p4.on('dialog', d => d.accept());
  await p4.goto(BASE);
  await p4.evaluate(() => localStorage.clear());
  await p4.reload();
  await p4.click('text=Commencer l’aventure');
  await p4.fill('#heroName', 'Bureau');
  await p4.keyboard.press('Tab');
  await p4.click('[data-act="createDone"]');
  await p4.click('[data-act="placementSkip"]');
  await p4.waitForSelector('.home-screen');
  const wide = [];
  for (const r of ['home', 'world', 'chapter/1', 'learn', 'academy', 'codex', 'toeic', 'stats', 'hero', 'profile', 'review', 'carnet', 'oral', 'dialogues']) {
    await p4.goto(BASE + '#/' + r);
    await p4.waitForTimeout(80);
    if (await p4.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) wide.push(r);
  }
  check(!wide.length, 'ordinateur : 14 écrans sans défilement horizontal' + (wide.length ? ' — débordent : ' + wide.join(', ') : ''));
  /* clavier : une réponse tapée se valide avec Entrée, puis Entrée passe à la suite */
  await p4.goto(BASE + '#/tense/present-perfect');
  await p4.click('[data-act="tensePractice"]');
  let typed = false;
  for (let k = 0; k < 30 && !typed; k++) {
    const c = await p4.evaluate(() => window.__LQ.current());
    if (!c || await p4.locator('#play .bilan').count()) break;
    if (c.kind === 'item' && c.item.type === 'type') {
      const i0 = await p4.evaluate(() => document.querySelector('#play small').textContent);
      await p4.fill('#typeIn', c.item.answer[0]); /* remplit et donne le focus au champ */
      await p4.keyboard.press('Enter');
      const fb = await p4.locator('#play .feedback.ok').count();
      await p4.waitForTimeout(400);
      await p4.keyboard.press('Enter'); /* comme un vrai utilisateur : Entrée là où est le focus */
      const i1 = await p4.evaluate(() => (document.querySelector('#play small') || {}).textContent || 'bilan');
      check(fb === 1 && i1 !== i0, `ordinateur : Entrée valide la réponse tapée, puis Entrée passe à la suite (${i0} → ${i1})`);
      typed = true; break;
    }
    if (c.kind === 'item' && ['qcm', 'listen', 'decode'].includes(c.item.type) && await p4.locator('#play [data-act="pick"]:not([disabled])').count()) { await p4.click(`#play [data-act="pick"][data-k="${c.item.answer}"]`); continue; }
    const nb = p4.locator('#play [data-act="next"], #play [data-act="continue"], #play [data-act="dlgNext"], #play [data-act="reveal"], #play [data-act="grade"][data-g="ok"]').first();
    if (await nb.count()) { await nb.click(); continue; }
    if (c.kind === 'item' && c.item.type === 'order') { const used = new Set(); for (const w of c.item.answer.split(' ')) { const k2 = c.item.words.findIndex((x, i) => !used.has(i) && x.toLowerCase() === w.toLowerCase()); used.add(k2); await p4.click(`#play [data-act="orderAdd"][data-k="${k2}"]`); } await p4.click('#play [data-act="checkOrder"]'); continue; }
    await p4.waitForTimeout(80);
  }
  if (!typed) check(false, 'ordinateur : exercice à réponse tapée trouvé dans l’entraînement');
  /* Échap ferme une fiche du Codex */
  if (await p4.locator('#play .bilan').count()) await p4.click('#play [data-act="close"]');
  else await p4.click('#play [data-act="quit"]', { timeout: 3000 }).catch(() => {});
  await p4.goto(BASE + '#/codex');
  await p4.click('[data-act="word"] >> nth=0');
  await p4.waitForSelector('#sheet:not([hidden])');
  await p4.keyboard.press('Escape');
  check(await p4.locator('#sheet[hidden]').count() === 1, 'ordinateur : Échap ferme la fiche du Codex');
  check(!err4.length, 'ordinateur : aucune erreur JavaScript' + (err4.length ? ' : ' + err4.join(' // ') : ''));
  await ctx4.close();

  check(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' // ') : ''));
  await browser.close();
  console.log(problems.length ? `\n${problems.length} problème(s).` : '\nValidation : aucun problème.');
  process.exit(problems.length ? 1 : 0);
})();
