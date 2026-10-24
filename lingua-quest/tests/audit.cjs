/* Audit de robustesse dans Chromium (390 × 844) : sauvegarde abîmée, campagne complète des 6 chapitres,
   interruptions (sortie, chrono écoulé, rechargement), export puis import d’une sauvegarde.
   Lancer : python3 -m http.server 8765 (dans lingua-quest/), puis node tests/audit.cjs */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:8765/';
const problems = [];
const check = (cond, msg) => { if (!cond) { problems.push(msg); console.log('ÉCHEC : ' + msg); } else console.log('ok : ' + msg); };

async function answerCard(page, good) {
  const card = await page.evaluate(() => { const c = window.__LQ.current(); return c ? JSON.parse(JSON.stringify(c)) : null; });
  if (!card) return false;
  const click = sel => page.locator('#play ' + sel).first().click();
  if (card.kind === 'stage' || card.kind === 'learn') { await click('[data-act="next"]'); return true; }
  if (card.kind === 'recall') { await click('[data-act="reveal"]'); await click(`[data-act="grade"][data-g="${good ? 'ok' : 'ko'}"]`); return true; }
  if (card.kind === 'dialogue') {
    for (let k = 0; k < 30; k++) {
      const choice = page.locator('#play [data-act="dlgChoice"]:not([disabled])');
      if (await choice.count()) { await choice.first().click(); continue; }
      const nxt = page.locator('#play [data-act="dlgNext"]');
      if (await nxt.count()) { await nxt.click(); continue; }
      const cont = page.locator('#play [data-act="next"]');
      if (await cont.count()) { await cont.click(); return true; }
    }
    return true;
  }
  const it = card.item;
  if (['qcm', 'listen', 'decode'].includes(it.type)) await click(`[data-act="pick"][data-k="${good ? it.answer : (it.answer + 1) % it.options.length}"]`);
  else if (it.type === 'type') { await page.fill('#typeIn', good ? it.answer[0] : 'wrong answer'); await click('[data-act="checkType"]'); }
  else if (it.type === 'order') {
    const words = it.answer.split(' '), used = new Set();
    for (const w of (good ? words : words.slice().reverse())) {
      const k = it.words.findIndex((x, i) => !used.has(i) && x.toLowerCase() === w.toLowerCase());
      used.add(k);
      await click(`[data-act="orderAdd"][data-k="${k}"]`);
    }
    await click('[data-act="checkOrder"]');
  } else if (it.type === 'speak') {
    const alt = page.locator('#play details.alt');
    if (await alt.count()) await alt.evaluate(d => { d.open = true; });
    await page.fill('#speakIn', good ? (it.target || it.model.split(' / ')[0]) : 'no');
    await click('[data-act="speakText"]');
  }
  await page.locator('#play [data-act="continue"], #play [data-act="endNow"]').first().click();
  return true;
}
async function playRun(page, good = () => true, max = 120) {
  for (let n = 0; n < max; n++) {
    if (await page.locator('#play .bilan').count()) return true;
    if (!(await answerCard(page, good(n)))) await page.waitForTimeout(100);
  }
  return !!(await page.locator('#play .bilan').count());
}
const closeBilan = page => page.click('#play [data-act="close"]');
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__LQ.ctx.S)));
const ROUTES = ['home', 'world', 'chapter/1', 'chapter/6', 'quests', 'learn', 'academy', 'tense/present-perfect', 'codex', 'skills', 'stats', 'toeic', 'oral', 'review', 'carnet', 'metier', 'hero', 'inventory', 'profile', 'dialogues'];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  page.on('dialog', d => d.accept());
  const noNewErrors = async (label, from) => { const n = errors.length - from; check(n === 0, label + (n ? ' : ' + errors.slice(from).join(' // ') : '')); };

  /* 1. Sauvegarde abîmée ou très ancienne : l’appli s’ouvre et tous les écrans s’affichent */
  await page.goto(BASE);
  await page.evaluate(() => localStorage.setItem('lingua-quest-v1', JSON.stringify({
    xp: '120', skills: { listening: null, reading: { attempts: 'x' } }, hero: { name: '<b>Zed</b>', cls: 'inconnue' },
    toeic: { parts: { 2: null, 5: { attempts: 3 } }, tests: [null, {}, { kind: 'blanc', ok: 3 }] },
    days: { '2026-01-01': null }, srs: { 'v:nope': { box: 2, due: '2020-01-01' }, 'c:absent': null }, errors: [null, { id: 'x' }],
    quests: { 'q1-1': null }, chapters: { 1: null }, inventory: { owned: null, equipped: null }, streak: null,
    settings: { theme: 42, rate: 'vite' }, carnet: [{ id: 'c1', en: 'duct', fr: 'gaine' }], tenses: { 'present-simple': null }, placement: { pct: 50 }
  })));
  let e0 = errors.length;
  await page.reload();
  await page.waitForSelector('#app');
  for (const r of ROUTES) { await page.goto(BASE + '#/' + r); await page.waitForTimeout(60); }
  await noNewErrors('sauvegarde abîmée : tous les écrans s’ouvrent sans erreur', e0);
  e0 = errors.length;
  await page.goto(BASE + '#/review');
  await page.click('[data-act="reviewRun"]').catch(() => {});
  if (await page.locator('#play:not([hidden])').count()) { await playRun(page); await closeBilan(page).catch(() => {}); }
  await noNewErrors('sauvegarde abîmée : révisions jouables (mots inconnus ignorés)', e0);

  /* 2. Nouvelle partie, campagne complète */
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.reload();
  await page.waitForSelector('.title-screen');
  await page.click('text=Commencer l’aventure');
  await page.fill('#heroName', 'Audit');
  await page.click('[data-act="createDone"]');
  await page.click('[data-act="placementSkip"]');
  await page.waitForSelector('.home-screen');
  e0 = errors.length;
  let lastXp = 0, xpOk = true;
  for (let n = 1; n <= 6; n++) {
    await page.goto(BASE + '#/chapter/' + n);
    await page.waitForSelector('[data-act="boss"]');
    const ids = await page.$$eval('[data-act="quest"]:not([disabled])', bs => bs.map(b => b.dataset.id));
    for (const id of ids) {
      await page.goto(BASE + '#/chapter/' + n);
      await page.click(`[data-act="quest"][data-id="${id}"]`);
      const done = await playRun(page, k => k % 5 !== 4);
      if (!done) check(false, 'quête ' + id + ' jouée jusqu’au bilan');
      await closeBilan(page);
      const s = await state(page);
      if (s.xp < lastXp) xpOk = false;
      lastXp = s.xp;
      if (!(s.quests[id] && s.quests[id].done)) check(false, 'quête ' + id + ' validée à 80 % de bonnes réponses');
    }
    await page.goto(BASE + '#/chapter/' + n);
    await page.click(`[data-act="boss"][data-n="${n}"]`);
    check(await playRun(page), 'boss ' + n + ' joué jusqu’au bilan');
    await closeBilan(page);
    const s = await state(page);
    check(s.chapters[n] && s.chapters[n].bossBeaten, 'boss ' + n + ' vaincu avec 100 % (quêtes jouées : ' + ids.length + ')');
    if (s.xp < lastXp) xpOk = false;
    lastXp = s.xp;
  }
  check(xpOk, 'l’XP ne diminue jamais pendant la campagne');
  const lv = await page.evaluate(() => { const S = window.__LQ.ctx.S, L = window.__LQ.L; const i = L.levelInfo(S.xp); return { xp: S.xp, ok: L.xpForLevel(i.level) <= S.xp && S.xp < L.xpForLevel(i.level + 1), level: i.level }; });
  check(lv.ok, `niveau cohérent avec l’XP (${lv.xp} XP → niveau ${lv.level})`);
  await noNewErrors('campagne complète sans erreur JavaScript', e0);

  /* 3. Interruptions */
  e0 = errors.length;
  await page.goto(BASE + '#/chapter/1');
  const before = await state(page);
  await page.click('[data-act="quest"][data-id="q1-2"]');
  await answerCard(page, true); await answerCard(page, false);
  await page.click('#play [data-act="quit"]');
  await page.waitForSelector('#play', { state: 'hidden' });
  const after = await state(page);
  check(after.quests['q1-2'].attempts === before.quests['q1-2'].attempts, 'sortie en pleine quête : pas de tentative comptée ni de récompense');
  /* chrono écoulé */
  await page.goto(BASE + '#/toeic');
  await page.click('[data-act="toeicTest"][data-k="mini"]');
  await answerCard(page, true);
  await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 3600e3; });
  await page.waitForSelector('#play .bilan', { timeout: 5000 }).catch(() => {});
  check(await page.locator('#play .bilan').count() === 1, 'chrono écoulé : le test se termine et affiche le bilan');
  check(/sans réponse/.test(await page.textContent('#play .bilan')), 'chrono écoulé : les questions restantes sont comptées sans réponse');
  await closeBilan(page);
  await page.reload();
  await page.waitForSelector('#app');
  /* rechargement en pleine partie */
  await page.goto(BASE + '#/chapter/2');
  await page.click('[data-act="quest"]:not([disabled])');
  await answerCard(page, true);
  await page.reload();
  await page.waitForSelector('.home-screen, .page, .screen');
  check(await page.locator('#play[hidden]').count() === 1, 'rechargement en pleine partie : l’appli repart proprement');
  /* sortie pendant l’écoute du micro (simulée) */
  await page.goto(BASE + '#/oral');
  await page.click('[data-act="oralRun"]');
  await noNewErrors('interruptions sans erreur JavaScript', e0);
  await page.click('#play [data-act="quit"]').catch(() => {});

  /* 4. Export puis import : la progression revient à l’identique */
  e0 = errors.length;
  await page.goto(BASE + '#/profile');
  const ref = await state(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"]')]);
  const file = path.join(os.tmpdir(), 'lq-audit.json');
  await dl.saveAs(file);
  await page.click('[data-act="reset"]');
  await page.waitForSelector('.title-screen');
  check((await state(page)).xp === 0, 'remise à zéro effective');
  await page.setInputFiles('input[data-act="importFile"]', file);
  await page.waitForSelector('.home-screen');
  const back = await state(page);
  check(back.xp === ref.xp && JSON.stringify(back.chapters) === JSON.stringify(ref.chapters) && JSON.stringify(back.srs) === JSON.stringify(ref.srs), 'import : XP, chapitres et révisions restaurés à l’identique');
  await noNewErrors('export / import sans erreur', e0);

  await browser.close();
  console.log(problems.length ? `\n${problems.length} problème(s).` : '\nAudit : aucun problème.');
  process.exit(problems.length ? 1 : 0);
})();
