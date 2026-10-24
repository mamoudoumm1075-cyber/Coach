/* Parcours complet dans Chromium, en taille téléphone (390 × 844).
   Lancer : python3 -m http.server 8765 (dans lingua-quest/), puis node tests/e2e.cjs [dossier-captures] */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:8765/';
const OUT = process.argv[2] || path.join(__dirname, '..', '.captures');
fs.mkdirSync(OUT, { recursive: true });
const problems = [];
const check = (cond, msg) => { if (!cond) { problems.push(msg); console.log('ÉCHEC : ' + msg); } else console.log('ok : ' + msg); };

/* Répond à la carte en cours. good = bonne réponse (lue dans le jeu), sinon mauvaise réponse. */
async function answerCard(page, good) {
  const card = await page.evaluate(() => { const c = window.__LQ.current(); return c ? JSON.parse(JSON.stringify(c)) : null; });
  if (!card) return false;
  const click = sel => page.locator('#play ' + sel).first().click();
  if (card.kind === 'stage' || card.kind === 'learn') { await click('[data-act="next"]'); return true; }
  if (card.kind === 'recall') { await click('[data-act="reveal"]'); await click(`[data-act="grade"][data-g="${good ? 'ok' : 'ko'}"]`); return true; }
  if (card.kind === 'dialogue') {
    for (let k = 0; k < 20; k++) {
      const choice = page.locator('#play [data-act="dlgChoice"]:not([disabled])');
      if (await choice.count()) {
        const btns = await choice.all();
        await btns[0].click();
        continue;
      }
      const nxt = page.locator('#play [data-act="dlgNext"]');
      if (await nxt.count()) { await nxt.click(); continue; }
      const cont = page.locator('#play [data-act="next"]');
      if (await cont.count()) { await cont.click(); return true; }
    }
    return true;
  }
  const it = card.item;
  if (['qcm', 'listen', 'decode'].includes(it.type)) {
    const k = good ? it.answer : (it.answer + 1) % it.options.length;
    await click(`[data-act="pick"][data-k="${k}"]`);
  } else if (it.type === 'type') {
    await page.fill('#typeIn', good ? it.answer[0] : 'wrong answer');
    await click('[data-act="checkType"]');
  } else if (it.type === 'order') {
    const words = it.answer.split(' ');
    const used = new Set();
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
async function playRun(page, good = true, max = 80) {
  for (let n = 0; n < max; n++) {
    if (await page.locator('#play .bilan').count()) return true;
    const ok = await answerCard(page, typeof good === 'function' ? good(n) : good);
    if (!ok) await page.waitForTimeout(100);
  }
  return !!(await page.locator('#play .bilan').count());
}
const noOverflow = async (page, label) => {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check(w <= 390, `pas de défilement horizontal (${label}) : ${w}px`);
};

(async () => {
  const browser = await chromium.launch();
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctxB.newPage();
  page.on('pageerror', e => problems.push('Erreur JS : ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) problems.push('Console : ' + m.text()); });
  page.on('dialog', d => d.accept());
  const shot = name => page.screenshot({ path: path.join(OUT, name + '.png') });

  await page.goto(BASE);
  await page.waitForSelector('.title-screen');
  await shot('01-bienvenue');
  await noOverflow(page, 'bienvenue');

  await page.click('text=Commencer l’aventure');
  await page.waitForSelector('.create-screen');
  await page.fill('#heroName', 'Alex');
  await page.click('[data-act="draft"][data-v="explorateur"]');
  await page.click('[data-act="draft"][data-v="heros-toi"]');
  check((await page.inputValue('#heroName')) === 'Alex', 'le nom reste saisi après un choix de héros');
  check((await page.textContent('.class-name')) === 'Combattant', 'la classe suit le héros choisi');
  await shot('02-creation');
  await noOverflow(page, 'création');
  await page.click('[data-act="createDone"]');
  await page.waitForSelector('[data-act="placementStart"]');

  await page.click('[data-act="placementStart"]');
  await page.waitForSelector('#play:not([hidden])');
  check(await playRun(page, n => n % 3 !== 0), 'évaluation initiale jouée jusqu’au bilan');
  await page.click('#play [data-act="close"]');
  await page.waitForSelector('text=Tes résultats');
  await shot('03-resultats-evaluation');
  await page.click('text=C’est parti');
  await page.waitForSelector('.home-screen');
  await shot('04-accueil');
  await noOverflow(page, 'accueil');

  await page.click('.nav a[href="#/world"]');
  await page.waitForSelector('.city-map');
  await page.waitForTimeout(300);
  await shot('05-carte');
  const locked = await page.locator('.node.locked').count();
  check(locked === 5, 'chapitres 2 à 6 verrouillés au départ (' + locked + ')');
  await page.click('.marker.current');
  await page.waitForSelector('.boss-card');
  await shot('06-chapitre-1');

  /* Quête 1 avec dialogue, Codex ouvert en plein exercice */
  await page.click('[data-act="quest"][data-id="q1-1"]');
  await page.waitForSelector('#play .dialogue');
  await page.waitForTimeout(200);
  await shot('07-dialogue');
  await page.locator('#play .w').first().click();
  await page.waitForSelector('#sheet:not([hidden]) .sheet-panel');
  await shot('08-codex-mot-dans-dialogue');
  await page.click('#sheet .sheet-head [data-act="sheetClose"]');
  await answerCard(page, true);
  let card = await page.evaluate(() => window.__LQ.current().kind);
  while (card === 'learn') { await answerCard(page, true); card = await page.evaluate(() => window.__LQ.current().kind); }
  const before = await page.evaluate(() => window.__LQ.current().item.id);
  await page.click('#play [data-act="codex"]');
  await page.waitForSelector('#sheet .tabs');
  await page.click('#sheet [data-act="codexTab"][data-tab="temps"]');
  await page.click('#sheet [data-act="tense"][data-id="present-simple"]');
  await page.waitForSelector('#sheet .tense');
  await shot('09-codex-par-dessus-exercice');
  await page.click('#sheet .sheet-head [data-act="sheetClose"]');
  const after = await page.evaluate(() => window.__LQ.current().item.id);
  check(before === after, 'le Codex ne fait pas perdre l’exercice en cours');
  await answerCard(page, false);
  await shot('10-correction-erreur');
  check(await playRun(page, true), 'quête 1 terminée');
  await shot('11-bilan-quete');
  await page.click('#play [data-act="close"]');
  const q = await page.evaluate(() => window.__LQ.ctx.S.quests['q1-1']);
  check(q && q.done, 'quête 1 enregistrée comme réussie');

  /* Session du jour */
  await page.click('.nav a[href="#/home"]');
  await page.click('[data-act="daily"]');
  await page.waitForSelector('#play .stage-card');
  await shot('12-session-etape');
  check(await playRun(page, n => n % 4 !== 1, 60), 'session du jour terminée');
  await shot('13-bilan-session');
  await page.click('#play [data-act="close"]');
  const st = await page.evaluate(() => ({ streak: window.__LQ.ctx.S.streak.count, done: Object.values(window.__LQ.ctx.S.days).some(d => d.done) }));
  check(st.streak === 1 && st.done, 'série démarrée après la session (' + st.streak + ')');

  /* Boss 1 : défaite puis victoire */
  await page.goto(BASE + '#/chapter/1');
  await page.click('[data-act="boss"][data-n="1"]');
  await page.waitForSelector('#play .boss-bar');
  await shot('14-boss');
  check(await playRun(page, false), 'défaite contre le boss affichée');
  check(await page.locator('#play [data-act="reinforce"]').count() === 1, 'quête de renforcement proposée après la défaite');
  await shot('15-defaite');
  await page.click('#play [data-act="retry"]');
  check(await playRun(page, true), 'boss 1 vaincu');
  await shot('16-victoire');
  await page.click('#play [data-act="close"]');
  const open2 = await page.evaluate(() => window.__LQ.L.chapterUnlocked(window.__LQ.ctx.S, 2));
  check(open2, 'chapitre 2 débloqué après le boss');

  /* Écrans principaux */
  for (const [r, name, sel] of [['academy', '17-academie', '.list'], ['tense/present-perfect', '18-fiche-temps', '.tense'], ['codex', '19-codex', '.tabs'], ['skills', '20-competences', '.tree'], ['hero', '21-heros', '.hero-screen'], ['inventory', '22-inventaire', '.inv'], ['dialogues', '33-dialogues', '.district'], ['stats', '23-stats', '.chart'], ['toeic', '24-toeic', '.part-row'], ['oral', '25-oral', '.card'], ['review', '26-revisions', '.card'], ['quests', '27-journal', '.quest'], ['learn', '28-apprendre', '.tile'], ['profile', '29-profil', '.seg']]) {
    await page.goto(BASE + '#/' + r);
    await page.waitForSelector(sel);
    await shot(name);
    await noOverflow(page, r);
  }
  await page.goto(BASE + '#/codex');
  await page.click('[data-act="codexTab"][data-tab="decode"]');
  await page.click('[data-act="decode"][data-id="d-she-working"]');
  await page.waitForSelector('#sheet .decoded');
  await shot('30-decodeur');
  await page.click('#sheet .sheet-head [data-act="sheetClose"]');

  /* Méthode TOEIC : date d’examen, plan, test blanc, analyse, enchaînement de la partie faible */
  await page.goto(BASE + '#/toeic');
  await page.waitForSelector('.plan');
  check(await page.locator('.plan-step').count() === 5, 'plan TOEIC en étapes affiché');
  await page.fill('#examDate', new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10));
  await page.click('[data-act="examSave"]');
  await page.waitForSelector('.exam');
  check(/Semaine 3/.test(await page.textContent('.exam')), 'sprint : semaine 3 à J-10');
  await shot('34-methode-toeic');
  await page.click('[data-act="toeicTest"][data-k="blanc"]');
  await page.waitForSelector('#runTimer');
  await shot('31-simulation-toeic');
  let sawPhoto = false;
  for (let n = 0; n < 80 && !(await page.locator('#play .bilan').count()); n++) {
    if (!sawPhoto && await page.locator('#play .toeic-photo img').count()) {
      sawPhoto = await page.locator('#play .toeic-photo img').evaluate(i => i.complete && i.naturalWidth > 0);
      if (sawPhoto) await shot('35-photo-partie1');
    }
    await answerCard(page, n % 2 === 0);
  }
  check(await page.locator('#play .bilan').count() === 1, 'test blanc terminé');
  check(await page.locator('#play .bilan h3:has-text("Résultats par partie TOEIC")').count() === 1, 'bilan par partie TOEIC');
  check(/Analyse : tu as perdu le plus de points/.test(await page.textContent('#play .bilan-top')), 'analyse de la partie la plus ratée');
  await shot('36-analyse-test');
  await page.click('#play [data-act="reinforce"]');
  check(await playRun(page, true), 'enchaînement des questions de la partie faible');
  await page.click('#play [data-act="close"]');
  const tests = await page.evaluate(() => window.__LQ.ctx.S.toeic.tests.map(t => t.kind));
  check(tests.includes('blanc'), 'test blanc enregistré');

  /* Partie 1 : chaque photo se charge */
  for (const img of ['photo-bureau', 'photo-livraison', 'photo-restaurant']) {
    const ok = await page.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = src; }), 'img/' + img + '.webp');
    check(ok, 'photo partie 1 : ' + img);
  }

  /* Carnet : noter un mot touché, ajouter à la main, réviser */
  await page.goto(BASE + '#/codex');
  await page.click('[data-act="codexTab"][data-tab="prep"]');
  await page.waitForSelector('.prep-row');
  await shot('37-prepositions');
  await page.locator('.prep-row .wt').nth(3).click();
  await page.waitForSelector('#sheet .carnet-box');
  await page.fill('#carnetFr', 'traduction test');
  await page.click('#sheet [data-act="carnetAdd"]');
  await page.waitForSelector('#sheet .carnet-box:has-text("est dans ton carnet")');
  await shot('38-mot-note');
  await page.click('#sheet .sheet-head [data-act="sheetClose"]');
  await page.goto(BASE + '#/carnet');
  await page.fill('#cEn', 'warehouse');
  await page.fill('#cFr', 'entrepôt');
  await page.click('[data-act="carnetForm"]');
  await page.waitForTimeout(200);
  check(await page.locator('.carnet-row').count() === 2, 'carnet : 2 mots notés');
  await shot('39-carnet');
  await page.click('[data-act="carnetRun"]');
  check(await playRun(page, true), 'révision du carnet');
  await page.click('#play [data-act="close"]');

  /* Jauges : accueil, TOEIC, oral */
  await page.goto(BASE + '#/home');
  check(await page.locator('.gauges .gauge').count() === 2, 'deux jauges sur l’accueil');
  await page.locator('.gauges').scrollIntoViewIfNeeded();
  await shot('41-jauges-accueil');
  await page.goto(BASE + '#/toeic');
  check(await page.locator('.readiness .gauge').count() === 1, 'jauge « prêt pour le TOEIC »');
  await page.click('.readiness [data-act="set"][data-v="900"]');
  check(/environ 90 %/.test(await page.textContent('.readiness')), 'objectif 900 → 90 % visé');
  await shot('42-jauge-toeic');
  await page.goto(BASE + '#/oral');
  check(await page.locator('.talk .gauge').count() === 1, 'jauge du niveau de discussion');
  await shot('43-jauge-discussion');

  /* Apprentissage personnalisé : suivi par notion, entraînement ciblé, révision des exercices ratés */
  await page.goto(BASE + '#/progres');
  await page.waitForSelector('.targeted');
  const notions = await page.evaluate(() => Object.keys(window.__LQ.ctx.S.notions).length);
  check(notions >= 5, 'suivi par notion alimenté (' + notions + ' notions)');
  const qDue = await page.evaluate(() => Object.keys(window.__LQ.ctx.S.srs).filter(k => k.startsWith('q:')).length);
  check(qDue > 0, 'exercices ratés programmés en révision espacée (' + qDue + ')');
  await shot('45-progres');
  await page.click('.targeted [data-act="targeted"]');
  check(await playRun(page, n => n % 3 !== 0), 'entraînement ciblé joué jusqu’au bilan');
  await page.click('#play [data-act="close"]');

  /* Skins évolutifs : verrouillé → prêt → débloqué → équipé → gardé après rechargement */
  await page.goto(BASE + '#/appearance');
  await page.waitForSelector('.skin-list');
  await page.click('[data-act="skinPreview"][data-id="maitre"]');
  check(await page.locator('.skin-stage .btn:has-text("Verrouillée")').count() === 1 && await page.locator('ul.reqs li').count() >= 5, 'skin final verrouillé, conditions affichées');
  await page.evaluate(() => { const S = window.__LQ.ctx.S; ['busy', 'tired', 'job', 'task', 'staff', 'hire', 'late', 'early', 'weekend', 'manager', 'colleague'].forEach(id => { S.srs['v:' + id] = { box: 3, due: '2099-01-01', seen: 3, ok: 3, ko: 0 }; }); ['q1-2', 'q1-3', 'q1-4'].forEach(id => { S.quests[id] = { done: true, best: 90, attempts: 1 }; }); });
  await page.click('[data-act="skinPreview"][data-id="eveil"]');
  await shot('46-apparence-pret');
  check(await page.locator('[data-act="skinUnlock"][data-id="eveil"]').count() === 1, 'évolution « Éveil » prête à débloquer');
  await page.click('[data-act="skinUnlock"][data-id="eveil"]');
  await page.reload();
  await page.waitForSelector('#app');
  const sk = await page.evaluate(() => window.__LQ.ctx.S.skins);
  check(sk.owned.includes('eveil') && sk.equipped === 'eveil', 'skin débloqué et équipé, gardé après rechargement');
  await page.goto(BASE + '#/home');
  check(await page.locator('.home-screen .scene.skin-eveil').count() === 1 && await page.locator('.hud .medal.skin-eveil').count() === 1, 'skin visible sur l’accueil et le médaillon');
  await page.goto(BASE + '#/appearance');
  await page.click('[data-act="skinPreview"][data-id="recrue"]');
  await page.click('[data-act="skinEquip"][data-id="recrue"]');
  check(await page.evaluate(() => window.__LQ.ctx.S.skins.equipped) === 'recrue', 'changement de skin équipé');
  await page.click('[data-act="skinPreview"][data-id="eveil"]');
  await page.click('[data-act="skinEquip"][data-id="eveil"]');
  await shot('47-apparence');

  /* Vocabulaire du métier */
  await page.goto(BASE + '#/metier');
  await page.waitForSelector('[data-act="metierRun"]');
  await shot('44-metier');
  await page.click('[data-act="metierRun"][data-c="cvc"]');
  check(await playRun(page, true), 'séance vocabulaire CVC');
  await page.click('#play [data-act="close"]');
  const seen = await page.evaluate(() => Object.keys(window.__LQ.ctx.S.srs).filter(k => ['v:duct', 'v:hvac', 'v:damper', 'v:airflow', 'v:mech-vent', 'v:humidity-controlled', 'v:ahu', 'v:exhaust-fan'].includes(k)).length);
  check(seen >= 6, 'mots du métier ajoutés aux révisions (' + seen + ')');

  /* Chaque boss a son illustration */
  for (const n of [1, 6]) {
    await page.goto(BASE + '#/chapter/' + n);
    const src = await page.waitForSelector('.boss-art img').then(e => e.getAttribute('src')).catch(() => '');
    check(src === 'img/boss-' + n + '.webp', 'illustration du boss ' + n);
  }
  await page.locator('.boss-art').scrollIntoViewIfNeeded().catch(() => {});
  await shot('40-boss-6');

  /* Persistance et thème clair */
  const xp = await page.evaluate(() => window.__LQ.ctx.S.xp);
  await page.reload();
  await page.waitForSelector('#app');
  const xp2 = await page.evaluate(() => window.__LQ.ctx.S.xp);
  check(xp > 0 && xp === xp2, `progression gardée après rechargement (${xp} XP)`);
  await page.goto(BASE + '#/profile');
  await page.click('[data-act="set"][data-k="theme"][data-v="light"]');
  await page.goto(BASE + '#/home');
  await page.waitForSelector('.home-screen');
  await shot('32-accueil-clair');

  /* Données illisibles : jamais écrasées */
  await page.evaluate(() => localStorage.setItem('lingua-quest-v1', '{cassé'));
  await page.reload();
  await page.waitForSelector('.title-screen');
  const kept = await page.evaluate(() => [localStorage.getItem('lingua-quest-v1'), localStorage.getItem('lingua-quest-illisible')]);
  check(kept[0] === '{cassé' && kept[1] === '{cassé', 'données illisibles conservées, pas écrasées');

  /* Hors ligne : l'appli se recharge sans réseau une fois installée */
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForTimeout(500);
  await ctxB.setOffline(true);
  await page.reload();
  await page.waitForSelector('.title-screen', { timeout: 5000 }).then(() => check(true, 'l’appli s’ouvre hors ligne')).catch(() => check(false, 'l’appli s’ouvre hors ligne'));
  await ctxB.setOffline(false);

  await browser.close();
  console.log('\n' + (problems.length ? problems.length + ' problème(s) :\n- ' + problems.join('\n- ') : 'Aucun problème.'));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
