/* Cohérence du contenu pédagogique : chaque référence existe et chaque réponse attendue est valide. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { TENSES, TENSE_BY_ID } from '../data/tenses.js';
import { TOEIC, PART_IDS } from '../data/toeic.js';
import { WORLD_ITEMS, CHAPTERS, CLASS_QUESTS, DIALOGUES, PLACEMENT, COSMETICS, CHARACTERS } from '../data/world.js';
import { VOCAB, VOCAB_BY_ID, DECODE, DECODE_BY_ID, IRREGULAR, MARKERS, AUX, lookupWord } from '../data/codex.js';
import { normalize } from '../js/logic.js';

const ALL = [...TENSES.flatMap(t => t.exercises), ...TOEIC, ...WORLD_ITEMS, ...PLACEMENT];
const BY_ID = Object.fromEntries(ALL.map(i => [i.id, i]));

test('identifiants uniques', () => {
  const ids = ALL.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length, 'doublon : ' + ids.filter((x, k) => ids.indexOf(x) !== k));
  assert.equal(new Set(VOCAB.map(v => v.id)).size, VOCAB.length);
});

test('chaque exercice est jouable', () => {
  for (const it of ALL) {
    assert.ok(it.prompt, it.id + ' : consigne manquante');
    assert.ok(['qcm', 'listen', 'type', 'order', 'speak', 'decode'].includes(it.type), it.id + ' : type inconnu');
    if (['qcm', 'listen', 'decode'].includes(it.type)) {
      assert.ok(Array.isArray(it.options) && it.options.length >= 2, it.id + ' : options');
      assert.ok(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < it.options.length, it.id + ' : réponse hors limites');
      if (it.why) assert.equal(it.why.length, it.options.length, it.id + ' : why ≠ options');
      assert.ok(it.explain, it.id + ' : explication manquante');
    }
    if (it.type === 'listen') assert.ok(Array.isArray(it.audio) && (it.audio.length || (it.img && it.audioOptions)) && it.transcript, it.id + ' : audio');
    if (it.img) assert.ok(existsSync(new URL('../' + it.img, import.meta.url)), it.id + ' : image manquante ' + it.img);
    if (it.type === 'type') assert.ok(Array.isArray(it.answer) && it.answer.length, it.id + ' : réponses acceptées');
    if (it.type === 'order') assert.deepEqual(normalize(it.words.join(' ')).split(' ').sort(), normalize(it.answer).split(' ').sort(), it.id + ' : mots ≠ réponse');
    if (it.type === 'speak') {
      if (it.mode === 'repeat') assert.ok(it.target, it.id);
      else { assert.ok(it.model && it.checks && it.checks.length, it.id); for (const [re] of it.checks) new RegExp(re, 'i'); }
    }
    if (it.type === 'decode') assert.ok(DECODE_BY_ID[it.decode], it.id + ' : phrase décodée');
    if (it.tense) assert.ok(TENSE_BY_ID[it.tense], it.id + ' : temps inconnu');
    if (it.part) assert.ok(PART_IDS.includes(it.part), it.id + ' : partie');
  }
});

test('les modèles oraux passent leurs propres vérifications', () => {
  for (const it of ALL.filter(i => i.type === 'speak' && i.mode === 'answer')) {
    const model = it.model.split(' / ')[0].toLowerCase().replace(/[‘’]/g, "'");
    for (const [re, label] of it.checks) assert.ok(new RegExp(re, 'i').test(model), it.id + ' : le modèle ne valide pas « ' + label + ' »');
  }
  for (const t of TENSES) {
    const model = t.oral.model.toLowerCase().replace(/[‘’]/g, "'");
    for (const [re, label] of t.oral.checks) assert.ok(new RegExp(re, 'i').test(model), t.id + ' : modèle oral ne valide pas « ' + label + ' »');
  }
});

test('fiches de temps complètes', () => {
  assert.equal(TENSES.length, 9);
  for (const t of TENSES) {
    for (const k of ['name', 'fr', 'when', 'aff', 'neg', 'qu', 'aux', 'examples', 'clues', 'errors', 'compare', 'exercises', 'oral']) assert.ok(t[k], t.id + ' : ' + k);
    assert.ok(TENSE_BY_ID[t.compare[0]], t.id + ' : comparaison');
    assert.ok(t.exercises.length >= 3, t.id + ' : exercices');
  }
});

test('quêtes, dialogues et boss référencent des contenus existants', () => {
  const quests = [...CHAPTERS.flatMap(c => c.quests), ...Object.values(CLASS_QUESTS)];
  for (const q of quests) {
    for (const k of ['id', 'cat', 'title', 'objective', 'mins', 'skill', 'diff', 'xp', 'steps']) assert.ok(q[k] !== undefined, q.id + ' : ' + k);
    for (const st of q.steps) {
      if (st.dialogue) assert.ok(DIALOGUES[st.dialogue], q.id + ' : dialogue ' + st.dialogue);
      if (st.vocab) for (const v of st.vocab) assert.ok(VOCAB_BY_ID[v], q.id + ' : mot ' + v);
      if (st.items) for (const id of st.items) assert.ok(BY_ID[id], q.id + ' : item ' + id);
      if (st.tense) assert.ok(TENSE_BY_ID[st.tense], q.id + ' : temps ' + st.tense);
      if (st.toeic) for (const p of st.toeic) assert.ok(TOEIC.some(i => i.part === p), q.id + ' : partie ' + p);
    }
  }
  assert.equal(CHAPTERS.length, 6);
  for (const ch of CHAPTERS) {
    const b = ch.boss;
    assert.ok(b.pass > 0 && b.pass < 1, ch.n + ' : seuil');
    assert.ok(COSMETICS.some(c => c.id === b.reward.item), ch.n + ' : récompense');
    if (b.items) for (const id of b.items) assert.ok(BY_ID[id], 'boss ' + ch.n + ' : ' + id);
  }
  for (const [id, lines] of Object.entries(DIALOGUES)) for (const ln of lines) {
    if (Array.isArray(ln)) { assert.ok(CHARACTERS[ln[0]], id + ' : personnage ' + ln[0]); if (ln[3]) assert.ok(DECODE_BY_ID[ln[3]], id + ' : décodage ' + ln[3]); }
    else assert.ok(ln.options.some(o => o[1]), id + ' : un choix correct');
  }
});

test('Codex : fiches et recherche', () => {
  assert.ok(VOCAB.length >= 80);
  assert.ok(IRREGULAR.length >= 40);
  assert.equal(MARKERS.length, 16);
  assert.equal(AUX.length, 10);
  /* une contraction peut être isolée pour montrer l’auxiliaire (I + ’ll) */
  for (const d of DECODE) assert.equal(normalize(d.parts.map(p => p[0]).join(' ')).replace(/ '/g, "'"), normalize(d.en), d.id + ' : segments ≠ phrase');
  assert.equal(lookupWord('working').item.id, 'work');
  assert.equal(lookupWord('went').item.inf, 'go');
  assert.equal(lookupWord('is').kind, 'aux');
  assert.equal(lookupWord('Yesterday').kind, 'marker');
  assert.equal(lookupWord('xyzzy'), null);
});

test('chaque boss a son illustration', async () => {
  const { BOSS_ART, CHAPTERS } = await import('../data/world.js');
  for (const ch of CHAPTERS) assert.ok(BOSS_ART[ch.n] && existsSync(new URL('../' + BOSS_ART[ch.n], import.meta.url)), 'boss ' + ch.n);
});

test('prépositions : les questions d’entraînement existent', async () => {
  const { PREP_ITEMS, PREPOSITIONS } = await import('../data/codex.js');
  const { TOEIC_BY_ID } = await import('../data/toeic.js');
  for (const id of PREP_ITEMS) assert.ok(TOEIC_BY_ID[id], id);
  for (const g of PREPOSITIONS) for (const r of g.rows) assert.equal(r.length, 4, g.id + ' ' + r[0]);
});

test('vocabulaire métier : 3 domaines, quiz jouable dans les deux sens', async () => {
  const C = await import('../js/content.js');
  const { newState } = await import('../js/logic.js');
  for (const cat of C.METIER_CATS) assert.ok(C.metierWords(cat).length >= 12, cat);
  const cards = C.metierCards(newState(), 'cvc');
  assert.equal(cards.filter(c => c.kind === 'learn').length, 6);
  const quiz = cards.filter(c => c.kind === 'item').map(c => c.item);
  assert.ok(quiz.length >= 6);
  for (const it of quiz) {
    assert.equal(new Set(it.options).size, it.options.length, it.id + ' : options en double');
    assert.ok(it.options.length === 4 && it.answer === 0 && it.explain);
  }
});

test('apprentissage ciblé : chaque notion produit des exercices jouables', async () => {
  const C = await import('../js/content.js');
  const { newState } = await import('../js/logic.js');
  const s = newState();
  const keys = ['temps:present-perfect', 'toeic:3', 'prepositions', 'traduction', 'metier', 'irreguliers', 'dialogues', 'oral', 'ecoute', 'lecture'];
  for (const k of keys) {
    assert.ok(C.notionCards(s, k, 4).length >= 3, k);
    assert.ok(C.DOMAINS[C.notionInfo(k).domain], k + ' : domaine');
  }
  assert.deepEqual(C.notionKeys({ id: 't5-11', part: 5, skill: 'reading', tags: ['toeic-p5'] }).sort(), ['prepositions', 'toeic:5']);
  assert.deepEqual(C.notionKeys({ id: 'i:irr-go', skill: 'grammar' }), ['irreguliers']);
  const t = C.targetedCards(s);
  assert.equal(t.keys.length, 3);
  assert.ok(t.cards.filter(c => c.kind !== 'stage').length >= 9);
  s.srs['q:t5-1'] = { box: 1, due: '2000-01-01' };
  assert.ok(C.reviewCards(s).some(c => c.kind === 'item' && c.item.id === 't5-1'), 'exercice raté dû en révision');
});

test('Tour des examens : 30 questions, ordre du vrai test, difficulté qui monte d’étage en étage', async () => {
  const C = await import('../js/content.js');
  const { ARENA } = await import('../data/world.js');
  const { newState } = await import('../js/logic.js');
  const s = newState();
  const avg = f => { let t = 0; for (let k = 0; k < 20; k++) { const it = C.arenaItems(s, f, 30); t += it.reduce((a, i) => a + i.diff, 0) / it.length; } return t / 20; };
  const diffs = ARENA.map(avg);
  for (let k = 1; k < diffs.length; k++) assert.ok(diffs[k] >= diffs[k - 1] - 0.02, `étage ${k + 1} au moins aussi dur (${diffs.map(d => d.toFixed(2)).join(' < ')})`);
  assert.ok(diffs[5] - diffs[0] > 0.8, 'nette différence entre le premier et le dernier étage');
  const it = C.arenaItems(s, ARENA[2], 30);
  assert.equal(it.length, 30);
  assert.equal(new Set(it.map(i => i.id)).size, 30, 'pas de doublon');
  assert.deepEqual(it.map(i => i.part), it.map(i => i.part).slice().sort((a, b) => a - b), 'écoute puis lecture');
  s.arena.last = it.map(i => i.id);
  const again = C.arenaItems(s, ARENA[2], 30);
  assert.ok(again.filter(i => s.arena.last.includes(i.id)).length < 30, 'le test suivant change de questions');
});
