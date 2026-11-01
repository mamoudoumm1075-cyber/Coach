/* Robustesse dans Chromium : double appui, appuis rapides sur « Écouter », serveur voix muet ou lent,
   son suspendu, appli mise en arrière-plan, micro qui ne s’arrête jamais, deux onglets, import d’une sauvegarde.
   La voix et le micro du navigateur sont simulés (avec une vraie file d’attente, comme dans Safari et Chrome).
   Lancer : python3 -m http.server 8765 (dans lingua-quest/), puis node tests/robustesse.cjs */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:8765/';
const problems = [];
const check = (cond, msg) => { if (!cond) { problems.push(msg); console.log('ÉCHEC : ' + msg); } else console.log('ok : ' + msg); };

const INIT = () => {
  const T = window.__t = { started: [], cancels: 0, maxQueue: 0, recMode: 'ok', recStarts: 0 };
  /* voix du navigateur : file d’attente, une phrase à la fois, cancel() vide la file */
  const q = [];
  let cur = null;
  const synth = {
    get speaking() { return !!cur; }, get pending() { return q.length > 0; }, paused: false,
    getVoices: () => [], onvoiceschanged: null, resume() {},
    cancel() {
      T.cancels++;
      const all = cur ? [cur, ...q] : [...q];
      q.length = 0; cur = null;
      for (const u of all) setTimeout(() => u.onerror && u.onerror({ error: 'interrupted' }), 0);
    },
    speak(u) { q.push(u); T.maxQueue = Math.max(T.maxQueue, q.length + (cur ? 1 : 0)); if (!cur) next(); }
  };
  function next() {
    cur = q.shift() || null;
    if (!cur) return;
    const u = cur;
    if (u.text.trim()) T.started.push(u.text);
    setTimeout(() => { if (cur !== u) return; u.onstart && u.onstart(); setTimeout(() => { if (cur !== u) return; cur = null; u.onend && u.onend(); next(); }, 300); }, 10);
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  /* micro du navigateur : « jamais » = ne s’arrête jamais, même après stop() (bug connu de certains navigateurs) */
  class Rec {
    start() { T.recStarts++; T.recLive = true; if (T.recMode === 'ok') setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: 'hello' }]] }); this.onend && this.onend(); T.recLive = false; }, 50); }
    stop() { if (T.recMode !== 'jamais') { T.recLive = false; this.onend && this.onend(); } }
    abort() { T.recLive = false; T.aborted = true; }
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = Rec;
};

async function newGame(page, url) {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.title-screen');
  await page.click('text=Commencer l’aventure');
  await page.fill('#heroName', 'Robuste');
  await page.click('[data-act="createDone"]');
  await page.click('[data-act="placementSkip"]');
  await page.waitForSelector('.home-screen');
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const T = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__t)));
  await newGame(page, BASE);

  /* 1. Double appui sur « Commencer » : une seule carte passe */
  await page.goto(BASE + '#/chapter/1');
  await page.click('[data-act="quest"][data-id="q1-4"]');
  await page.waitForSelector('#play [data-act="next"]');
  const i0 = await page.evaluate(() => window.__LQ.current());
  await page.waitForTimeout(500); /* le temps de lire, comme un vrai joueur */
  await page.locator('#play [data-act="next"]').first().dispatchEvent('click');
  await page.waitForTimeout(60);
  if (await page.locator('#play [data-act="next"], #play [data-act="continue"]').count()) await page.locator('#play [data-act="next"], #play [data-act="continue"]').first().dispatchEvent('click');
  const i1 = await page.evaluate(() => window.__LQ.current());
  const cards = await page.evaluate(() => window.__LQ.ctx && document.querySelector('#play small').textContent);
  check(JSON.stringify(i0) !== JSON.stringify(i1) && /^2\//.test(cards), 'double appui : on avance d’une seule carte (' + cards + ')');
  await page.click('#play [data-act="quit"]');

  /* 2. Appuis rapides sur « Écouter » : une seule voix à la fois, la dernière demandée */
  const openWord = async () => { await page.goto(BASE + '#/codex'); await page.click('[data-act="word"] >> nth=0'); await page.waitForSelector('#sheet [data-act="say"]'); };
  await openWord();
  const say = page.locator('#sheet [data-act="say"]').first();
  if (await say.count()) {
    await page.evaluate(() => { window.__t.started = []; window.__t.maxQueue = 0; });
    for (let k = 0; k < 4; k++) { await say.dispatchEvent('click'); await page.waitForTimeout(30); }
    await page.waitForTimeout(1500);
    const t = await T();
    check(t.maxQueue <= 1, 'appuis rapides sur Écouter : jamais deux voix en file (max ' + t.maxQueue + ')');
    check(t.started.length >= 1, 'appuis rapides sur Écouter : la voix est quand même lue');
  } else check(false, 'bouton Écouter trouvé dans le Codex');

  /* 3. Dialogue : « Écouter » une réplique pendant la lecture automatique → pas d’empilement */
  await page.goto(BASE + '#/chapter/1');
  await page.evaluate(() => { window.__t.maxQueue = 0; });
  await page.click('[data-act="quest"][data-id="q1-1"]');
  await page.waitForSelector('#play .dialogue');
  await page.waitForTimeout(380);
  await page.locator('#play [data-act="sayLine"]').first().dispatchEvent('click');
  await page.locator('#play [data-act="sayLine"]').first().dispatchEvent('click');
  await page.waitForTimeout(800);
  check((await T()).maxQueue <= 1, 'dialogue : réécouter pendant la lecture ne superpose pas les voix');

  /* 4. Appli mise en arrière-plan (téléphone verrouillé) : la voix s’arrête et la partie est enregistrée */
  await page.evaluate(() => { window.__t.cancels = 0; });
  await page.locator('#play [data-act="sayLine"]').first().dispatchEvent('click');
  await page.waitForTimeout(80);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const afterHide = await T();
  const saved = await page.evaluate(() => localStorage.getItem('lingua-quest-v1') === JSON.stringify(window.__LQ.ctx.S));
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check(afterHide.cancels >= 1, 'arrière-plan : la voix est coupée');
  check(saved, 'arrière-plan : la progression est enregistrée à l’instant');
  await page.click('#play [data-act="quit"]');

  /* 5. Serveur voix qui ne répond jamais : la voix du navigateur prend le relais (pas de blocage) */
  await page.route('https://voix-lente.test/**', () => { /* aucune réponse */ });
  await page.evaluate(() => { const s = window.__LQ.ctx.S.settings; s.voiceUrl = 'https://voix-lente.test'; s.voiceCode = 'x'; window.__LQ.ctx.save(); });
  await page.reload();
  await openWord();
  await page.evaluate(() => { window.__t.started = []; });
  const t0 = Date.now();
  await page.locator('#sheet [data-act="say"]').first().dispatchEvent('click');
  await page.waitForFunction(() => window.__t.started.length > 0, null, { timeout: 20000 }).catch(() => {});
  const waited = Math.round((Date.now() - t0) / 1000);
  check((await T()).started.length > 0 && waited <= 15, 'serveur voix muet : relais par la voix du navigateur en ' + waited + ' s (avant : attente sans fin)');

  /* 6. Son suspendu pendant une lecture (appel, verrouillage) : la lecture se termine quand même */
  await page.unroute('https://voix-lente.test/**');
  const mp3 = fs.readFileSync(path.join(__dirname, '..', 'sons', 'son-juste.mp3'));
  await page.route('https://voix-ok.test/**', r => r.fulfill({ status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*' }, body: mp3 }));
  await page.evaluate(() => { const s = window.__LQ.ctx.S.settings; s.voiceUrl = 'https://voix-ok.test'; s.voiceCode = 'x'; window.__LQ.ctx.save(); });
  await page.reload();
  await page.goto(BASE + '#/profile');
  await page.waitForTimeout(200);
  await page.evaluate(() => { AudioBufferSourceNode.prototype.start = function () { /* son suspendu : ne joue ni ne finit jamais */ }; });
  await page.click('[data-act="testVoice"]');
  await page.waitForSelector('#toast.show', { timeout: 8000 }).catch(() => {});
  const msg = await page.locator('#toast').textContent().catch(() => '');
  check(/Son : OK|Pas de son/.test(msg || ''), 'son suspendu : « Tester le son » répond au lieu de rester bloqué (' + (msg || 'rien').slice(0, 40) + ')');
  await page.evaluate(() => { const s = window.__LQ.ctx.S.settings; s.voiceUrl = ''; s.voiceCode = ''; window.__LQ.ctx.save(); });
  await page.reload();

  /* 7. Micro qui ne s’arrête jamais : libéré après le délai, message clair, bouton de nouveau utilisable */
  await page.goto(BASE + '#/oral');
  await page.click('[data-act="oralRun"]');
  let found = false;
  for (let k = 0; k < 20 && !found; k++) {
    const c = await page.evaluate(() => window.__LQ.current());
    if (c && c.kind === 'item' && c.item.type === 'speak') { found = true; break; }
    const b = page.locator('#play [data-act="next"], #play [data-act="continue"]').first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(400); continue; }
    const opt = page.locator('#play [data-act="pick"]').first();
    if (await opt.count()) { await opt.click(); await page.waitForTimeout(100); continue; }
    await page.waitForTimeout(200);
  }
  if (found) {
    await page.evaluate(() => { window.__t.recMode = 'jamais'; });
    await page.click('#play [data-act="mic"]');
    await page.waitForFunction(() => !document.querySelector('#play .mic.rec'), null, { timeout: 25000 }).catch(() => {});
    const st = await page.textContent('#micState');
    check(!(await page.locator('#play .mic.rec').count()) && /rien entendu/.test(st), 'micro bloqué : libéré après 18 s avec un message (' + st.slice(0, 40) + ')');
    await page.evaluate(() => { window.__t.recMode = 'ok'; });
    await page.click('#play [data-act="mic"]');
    await page.waitForSelector('#play [data-act="continue"], #play [data-act="endNow"]', { timeout: 4000 }).catch(() => {});
    check(await page.locator('#play [data-act="continue"], #play [data-act="endNow"]').count() > 0, 'micro : un nouvel essai fonctionne ensuite');
  } else check(false, 'séance orale : exercice de prononciation trouvé');
  await page.click('#play [data-act="quit"]').catch(() => {});

  /* 8. Deux onglets : la progression faite dans l’un n’est pas écrasée par l’autre */
  const tab2 = await context.newPage();
  await tab2.goto(BASE + '#/home');
  await tab2.waitForSelector('.home-screen');
  const xpBefore = await page.evaluate(() => window.__LQ.ctx.S.xp);
  await tab2.evaluate(() => { window.__LQ.ctx.S.xp += 500; window.__LQ.ctx.save(); });
  await page.waitForTimeout(300);
  check(await page.evaluate(() => window.__LQ.ctx.S.xp) === xpBefore + 500, 'deux onglets : le premier reprend la progression du second');
  await page.evaluate(() => window.__LQ.ctx.save());
  check(await tab2.evaluate(() => JSON.parse(localStorage.getItem('lingua-quest-v1')).xp) === xpBefore + 500, 'deux onglets : un enregistrement du premier ne fait plus perdre les 500 XP');
  await tab2.close();

  /* 9. Import d’un fichier qui vise un autre serveur : le code secret de l’appareil n’y est jamais envoyé */
  await page.evaluate(() => { const s = window.__LQ.ctx.S.settings; s.voiceUrl = 'https://mon-serveur.test'; s.voiceCode = 'code-perso'; window.__LQ.ctx.save(); });
  const evil = { ...(await page.evaluate(() => JSON.parse(JSON.stringify(window.__LQ.ctx.S)))) };
  evil.settings = { ...evil.settings, voiceUrl: 'https://piege.test', voiceCode: '' };
  const file = path.join(os.tmpdir(), 'lq-import.json');
  fs.writeFileSync(file, JSON.stringify(evil));
  await page.goto(BASE + '#/profile');
  await page.setInputFiles('input[data-act="importFile"]', file);
  await page.waitForTimeout(500);
  const vs = await page.evaluate(() => window.__LQ.ctx.S.settings);
  check(vs.voiceUrl === 'https://mon-serveur.test' && vs.voiceCode === 'code-perso', 'import : le code secret reste associé au serveur de l’appareil (' + vs.voiceUrl + ')');

  check(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' // ') : ''));
  await browser.close();
  console.log(problems.length ? `\n${problems.length} problème(s).` : '\nRobustesse : aucun problème.');
  process.exit(problems.length ? 1 : 0);
})();
