/* Audit du son dans Chromium : bruitages (Web Audio), voix du navigateur, dialogues, son bloqué.
   La voix du navigateur est simulée pour compter les phrases et reproduire ses pannes connues.
   Lancer : python3 -m http.server 8765 (dans lingua-quest/), puis node tests/son.cjs [fichier-unique.html] */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:8765/';
const SINGLE = process.argv[2];
const problems = [];
const check = (cond, msg) => { if (!cond) { problems.push(msg); console.log('ÉCHEC : ' + msg); } else console.log('ok : ' + msg); };

/* Instrumentation chargée avant l’appli */
const INIT = () => {
  window.__son = { sfx: 0, said: [], mode: 'ok' };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer && this.buffer.length > 1) window.__son.sfx++; return start.apply(this, a); };
  const synth = { speaking: false, pending: false, paused: false, cancel() { this.speaking = false; }, resume() {}, getVoices: () => [], onvoiceschanged: null,
    speak(u) {
      if (u.text.trim()) window.__son.said.push(u.text);
      const mode = window.__son.mode;
      if (mode === 'bloque') return setTimeout(() => u.onerror && u.onerror({ error: 'not-allowed' }), 20);
      if (mode === 'muet' && u.text.trim()) return; /* aucun événement : bug connu de certains navigateurs */
      setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 30); }, 10);
    } };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
};

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const son = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__son)));

  await page.goto(SINGLE ? 'file://' + SINGLE : BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.title-screen');
  await page.click('text=Commencer l’aventure');
  await page.waitForTimeout(600);
  const st = await page.evaluate(() => { const AC = window.AudioContext; return typeof AC; });
  check(st === 'function', 'Web Audio disponible');
  await page.fill('#heroName', 'Son');
  await page.click('[data-act="createDone"]');
  await page.click('[data-act="placementSkip"]');
  await page.waitForSelector('.home-screen');

  /* bruitage à chaque réponse */
  await page.goto((SINGLE ? 'file://' + SINGLE : BASE) + '#/chapter/1');
  await page.click('[data-act="quest"][data-id="q1-4"]');
  for (let k = 0; k < 12; k++) {
    const c = await page.evaluate(() => window.__LQ.current());
    if (c && c.kind === 'item') break;
    await page.locator('#play [data-act="next"]').first().click();
  }
  const before = (await son()).sfx;
  const it = await page.evaluate(() => window.__LQ.current().item);
  await page.click(`#play [data-act="pick"][data-k="${it.answer}"]`);
  await page.waitForTimeout(300);
  check((await son()).sfx > before, 'bruitage joué après une réponse (Web Audio)');
  await page.click('#play [data-act="quit"]');

  /* voix : bouton Écouter d’un exercice d’écoute */
  await page.goto((SINGLE ? 'file://' + SINGLE : BASE) + '#/toeic');
  await page.click('[data-act="toeicPart"][data-p="2"]');
  await page.waitForSelector('#play [data-act="play"]');
  await page.waitForTimeout(1200);
  const auto = (await son()).said.length;
  check(auto >= 2, 'écoute : question et réponses lues automatiquement (' + auto + ' phrases)');
  await page.click('#play [data-act="play"]');
  await page.waitForTimeout(1500);
  check((await son()).said.length >= auto + 2, 'écoute : « Écouter » relit la question et les réponses');

  /* une phrase qui n’annonce jamais sa fin ne bloque plus la suite */
  await page.evaluate(() => { window.__son.mode = 'muet'; window.__son.said = []; });
  await page.click('#play [data-act="play"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__son.mode = 'ok'; });
  await page.waitForTimeout(9000);
  check((await son()).said.length >= 2, 'phrase sans fin annoncée : la lecture passe quand même à la suivante');

  /* son bloqué : message d’aide */
  await page.evaluate(() => { window.__son.mode = 'bloque'; });
  await page.click('#play [data-act="play"]');
  await page.waitForSelector('#toast:has-text("mode silencieux")', { timeout: 4000 }).catch(() => {});
  check(await page.locator('#toast:has-text("mode silencieux")').count() === 1, 'son bloqué : l’appli explique quoi faire');
  await page.evaluate(() => { window.__son.mode = 'ok'; });
  await page.click('#play [data-act="quit"]');

  /* dialogue : chaque réplique est lue */
  await page.goto((SINGLE ? 'file://' + SINGLE : BASE) + '#/chapter/1');
  await page.evaluate(() => { window.__son.said = []; });
  await page.click('[data-act="quest"][data-id="q1-1"]');
  await page.waitForSelector('#play .dialogue');
  await page.waitForTimeout(700);
  check((await son()).said.length === 1, 'dialogue : la première réplique est lue dès l’ouverture');
  for (let k = 0; k < 2; k++) { await page.click('#play [data-act="dlgNext"]'); await page.waitForTimeout(400); }
  check((await son()).said.length >= 3, 'dialogue : les répliques sont lues (' + (await son()).said.length + ')');
  await page.click('#play [data-act="quit"]');

  /* bouton « Tester le son » du profil */
  await page.goto((SINGLE ? 'file://' + SINGLE : BASE) + '#/profile');
  await page.click('[data-act="testVoice"]');
  await page.waitForSelector('#toast:has-text("Son : OK")', { timeout: 4000 }).catch(() => {});
  check(await page.locator('#toast:has-text("Son : OK")').count() === 1, 'profil : « Tester le son » confirme que le son sort');

  check(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' // ') : ''));
  await browser.close();
  console.log(problems.length ? `\n${problems.length} problème(s).` : '\nSon : aucun problème.');
  process.exit(problems.length ? 1 : 0);
})();
