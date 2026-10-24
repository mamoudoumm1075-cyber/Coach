/* Tests des règles du jeu : node --test tests/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';

test('dates : jours, écarts et semaine ISO', () => {
  assert.equal(L.addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(L.daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.equal(L.isoWeek('2026-10-24'), '2026-W43');
  assert.equal(L.isoWeek('2027-01-01'), '2026-W53');
});

test('niveaux : seuils croissants et progression', () => {
  assert.equal(L.levelInfo(0).level, 1);
  assert.equal(L.levelInfo(L.xpForLevel(2)).level, 2);
  assert.equal(L.levelInfo(L.xpForLevel(5) - 1).level, 4);
  const i = L.levelInfo(L.xpForLevel(3) + 10);
  assert.ok(i.pct >= 0 && i.pct < 100);
});

test('réponses : XP, compétences, erreurs, temps', () => {
  const S = L.newState();
  assert.equal(L.recordAnswer(S, { skill: 'grammar', ok: true, tense: 'past-simple' }), L.XP_OK);
  assert.equal(L.recordAnswer(S, { skill: 'grammar', ok: false, itemId: 'x', tags: ['past-simple'], given: 'a', expected: 'b' }), L.XP_TRY);
  assert.equal(S.skills.grammar.attempts, 2);
  assert.equal(S.skills.grammar.correct, 1);
  assert.equal(S.errors.length, 1);
  assert.equal(S.tenses['past-simple'].attempts, 1);
  assert.equal(S.xp, L.XP_OK + L.XP_TRY);
});

test('maîtrise : critères vérifiables', () => {
  const st = { attempts: 5, correct: 5, recent: [1, 1, 1, 1, 1] };
  assert.equal(L.skillStage(st).stage, 0);
  const good = { attempts: 25, correct: 24, recent: Array(20).fill(1) };
  assert.equal(L.skillStage(good).stage, 3);
  const mid = { attempts: 20, correct: 16, recent: [...Array(16).fill(1), 0, 0, 0, 0] };
  assert.equal(L.skillStage(mid).stage, 2);
  const S = L.newState();
  assert.equal(L.tenseStatus(S, 'present-simple').mastered, false);
});

test('révision espacée : réussite espacée, échec rapproché', () => {
  const S = L.newState();
  L.srsAdd(S, 'v:busy', '2026-10-24');
  assert.deepEqual(L.srsDue(S, '2026-10-24'), ['v:busy']);
  L.srsReview(S, 'v:busy', 'ok', '2026-10-24');
  assert.equal(S.srs['v:busy'].due, '2026-10-25');
  L.srsReview(S, 'v:busy', 'ok', '2026-10-25');
  assert.equal(S.srs['v:busy'].due, '2026-10-28');
  L.srsReview(S, 'v:busy', 'ko', '2026-10-28');
  assert.equal(S.srs['v:busy'].box, 1);
  assert.equal(S.srs['v:busy'].due, '2026-10-29');
  assert.deepEqual(L.srsDue(S, '2026-10-28'), []);
});

test('série : continue, joker une fois par semaine, sinon repart', () => {
  const S = L.newState();
  L.completeDay(S, '2026-10-19');
  L.completeDay(S, '2026-10-20');
  assert.equal(S.streak.count, 2);
  const j = L.completeDay(S, '2026-10-22');
  assert.equal(j.joker, true);
  assert.equal(S.streak.count, 3);
  L.completeDay(S, '2026-10-24');
  assert.equal(S.streak.count, 1, 'second trou la même semaine : pas de second joker');
  assert.equal(L.streakNow(S, '2026-10-25'), 1);
  assert.equal(L.streakNow(S, '2026-10-28'), 0);
  assert.equal(S.streak.best, 3);
});

test('monde : un chapitre s’ouvre après le boss précédent', () => {
  const S = L.newState();
  assert.equal(L.chapterUnlocked(S, 1), true);
  assert.equal(L.chapterUnlocked(S, 2), false);
  L.beatBoss(S, 1);
  assert.equal(L.chapterUnlocked(S, 2), true);
  assert.equal(L.chapterUnlocked(S, 3), false);
});

test('difficulté adaptative', () => {
  const S = L.newState();
  S.recent = Array(20).fill(1);
  assert.equal(L.adaptDifficulty(S), 2);
  S.recent = Array(20).fill(0);
  assert.equal(L.adaptDifficulty(S), 1);
});

test('comparaison des réponses écrites et orales', () => {
  assert.ok(L.checkTyped("  Doesn’t eat ", ["doesn't eat"]));
  assert.ok(L.checkTyped('does not eat', ["doesn't eat"]));
  assert.ok(!L.checkTyped('dont eat', ["doesn't eat"]));
  const m = L.wordMatch("I'd like a coffee please", 'I would like a coffee, please.');
  assert.equal(m.ratio, 1);
  const m2 = L.wordMatch('like coffee', 'I would like a coffee');
  assert.deepEqual(m2.missing, ['i', 'would', 'a']);
});

test('sauvegarde : refuse un fichier étranger, complète un état ancien', () => {
  assert.throws(() => L.sanitize({ hello: 1 }));
  assert.throws(() => L.sanitize([]));
  const s = L.sanitize({ xp: 50, skills: { grammar: { attempts: 3, correct: 2, recent: [1, 0, 1] } }, settings: { theme: 'light' } });
  assert.equal(s.xp, 50);
  assert.equal(s.settings.theme, 'light');
  assert.equal(s.settings.rate, 0.9);
  assert.equal(s.skills.listening.attempts, 0);
  assert.ok(Array.isArray(s.errors));
});

test('carnet : ajout sans doublon, nettoyage, révision, retrait', () => {
  const s = L.newState();
  const c = L.carnetAdd(s, ' Warehouse, ', 'entrepôt', '2026-01-01');
  assert.equal(c.en, 'Warehouse');
  assert.equal(L.carnetAdd(s, 'warehouse').id, c.id);
  assert.equal(s.carnet.length, 1);
  assert.ok(s.srs['c:' + c.id]);
  assert.equal(L.carnetAdd(s, '  ,, '), null);
  L.carnetRemove(s, c.id);
  assert.equal(s.carnet.length, 0);
  assert.equal(s.srs['c:' + c.id], undefined);
  assert.deepEqual([L.carnetGoal(0), L.carnetGoal(99), L.carnetGoal(100), L.carnetGoal(250), L.carnetGoal(300)], [100, 100, 200, 300, 400]);
});

test('carnet : une sauvegarde abîmée est nettoyée', () => {
  const s = L.sanitize({ xp: 1, skills: {}, carnet: [{ id: 'c1', en: 'ok' }, null, { en: 'sans id' }, 'x'] });
  assert.deepEqual(s.carnet.map(c => c.id), ['c1']);
  assert.ok(Array.isArray(L.sanitize({ xp: 1, skills: {} }).carnet));
});

test('plan d’examen : sprint de 4 semaines', () => {
  assert.equal(L.examPlan(''), null);
  assert.equal(L.examPlan('2026-03-01', '2026-03-02').phase, 'passe');
  const far = L.examPlan('2026-06-30', '2026-01-01');
  assert.equal(far.phase, 'long');
  assert.equal(far.sprintStart, '2026-06-02');
  assert.deepEqual([28, 22, 21, 15, 14, 8, 7, 0].map(n => L.examPlan(L.addDays('2026-01-01', n), '2026-01-01').week), [1, 1, 2, 2, 3, 3, 4, 4]);
});

test('analyse d’un test : la partie où l’on perd le plus de points', () => {
  assert.equal(L.mostLostPart({}), null);
  assert.equal(L.mostLostPart({ 5: [4, 4] }), null);
  assert.equal(L.mostLostPart({ 2: [1, 3], 5: [2, 6], 7: [3, 4] }).part, 5);
  assert.equal(L.mostLostPart({ 2: [0, 2], 6: [2, 4] }).part, 2);
});

test('jauge TOEIC : 0 au départ, prête seulement avec toutes les parties et 2 tests blancs réussis', () => {
  const s = L.newState();
  let r = L.toeicReadiness(s);
  assert.equal(r.pct, 0);
  assert.equal(r.ready, false);
  assert.equal(r.target, 85);
  const fill = (p, ok, n = 20) => { s.toeic.parts[p] = { attempts: n, correct: ok, recent: Array.from({ length: n }, (_, i) => (i < ok ? 1 : 0)) }; };
  for (const p of [1, 2, 3, 4, 5, 6, 7]) fill(p, 18);
  r = L.toeicReadiness(s);
  assert.equal(r.ready, false, 'sans test blanc, pas prêt');
  assert.equal(r.pct, 99);
  s.toeic.tests.push({ kind: 'blanc', ok: 27, total: 30 }, { kind: 'blanc', ok: 26, total: 30 });
  assert.equal(L.toeicReadiness(s).ready, true);
  fill(7, 10);
  r = L.toeicReadiness(s);
  assert.equal(r.ready, false, 'une partie faible bloque');
  assert.equal(r.todo[0].part, 7);
  s.settings.toeicGoal = 700;
  assert.equal(L.toeicReadiness(s).target, 70);
});

test('jauge de discussion : progresse avec l’oral, les temps et les mots', () => {
  const s = L.newState();
  assert.equal(L.talkLevel(s).score, 0);
  assert.equal(L.talkLevel(s).cefr, 'A1');
  s.skills.speaking = { attempts: 150, correct: 140, recent: Array(30).fill(1) };
  s.skills.reflexes = { attempts: 40, correct: 40, recent: Array(30).fill(1) };
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) s.tenses[id] = { mastered: true };
  const t = L.talkLevel(s, 9);
  assert.equal(t.score, 85);
  assert.equal(t.cefr, 'C1');
  assert.equal(t.next, null);
});

test('sauvegarde abîmée : chaque rubrique est nettoyée sans perdre ce qui est valable', () => {
  const s = L.sanitize({
    xp: '120', skills: { listening: null, reading: { attempts: 'x', recent: [1, 'a', 0] } }, hero: 'cassé',
    toeic: { parts: { 2: null, 5: { attempts: 3, recent: [1] } }, tests: [null, {}, { kind: 'blanc', ok: 3, total: 4 }] },
    days: { '2026-01-01': null, '2026-01-02': { mins: 5, done: 1 } }, srs: { 'v:a': { box: 9, due: '2026-01-01' }, 'v:b': null, 'v:c': { due: 'demain' } },
    errors: [null, { id: 'x' }], quests: { 'q1-1': null, 'q1-2': { done: true } }, chapters: { 1: null, 2: { bossBeaten: 1 } },
    inventory: { owned: null }, streak: null, settings: { theme: 42, rate: 'vite', sound: false, fr: 'peu' }
  });
  assert.equal(s.xp, 120);
  assert.equal(s.hero, null);
  assert.deepEqual(s.skills.reading, { attempts: 0, correct: 0, recent: [1, 0] });
  assert.deepEqual(Object.keys(s.toeic.parts), ['5']);
  assert.equal(s.toeic.tests.length, 1);
  assert.deepEqual(Object.keys(s.days), ['2026-01-02']);
  assert.deepEqual(Object.keys(s.srs), ['v:a']);
  assert.equal(s.srs['v:a'].box, 6);
  assert.equal(s.errors.length, 1);
  assert.deepEqual(Object.keys(s.quests), ['q1-2']);
  assert.equal(s.chapters[1].bossBeaten, false);
  assert.equal(s.chapters[2].bossBeaten, true);
  assert.deepEqual(s.inventory.owned, []);
  assert.equal(s.streak.count, 0);
  assert.equal(s.settings.theme, 'dark');
  assert.equal(s.settings.rate, 0.9);
  assert.equal(s.settings.sound, false);
  assert.equal(s.settings.fr, 'peu');
});

test('suivi par notion : réponses comptées, forces et difficultés, reconstruction des anciennes sauvegardes', () => {
  const s = L.newState();
  for (let i = 0; i < 6; i++) L.recordAnswer(s, { skill: 'grammar', ok: i < 1, notions: ['prepositions'] });
  for (let i = 0; i < 5; i++) L.recordAnswer(s, { skill: 'grammar', ok: true, notions: ['temps:past-simple'] });
  L.recordAnswer(s, { skill: 'grammar', ok: false, notions: ['irreguliers'] });
  assert.equal(s.notions.prepositions.n, 6);
  assert.deepEqual(L.weakNotions(s).map(x => x.key), ['prepositions']);
  assert.deepEqual(L.strongNotions(s).map(x => x.key), ['temps:past-simple']);
  const old = L.newState();
  old.tenses['present-simple'] = { attempts: 4, correct: 3, recent: [1, 1, 0, 1] };
  old.toeic.parts[5] = { attempts: 2, correct: 1, recent: [1, 0] };
  assert.ok(L.seedNotions(old));
  assert.deepEqual(Object.keys(old.notions).sort(), ['temps:present-simple', 'toeic:5']);
  assert.equal(L.seedNotions(old), false);
});

test('mots retenus : les exercices en révision ne comptent pas comme des mots', () => {
  const s = L.newState();
  s.srs['v:a'] = { box: 3, due: '2026-01-01' };
  s.srs['q:t5-1'] = { box: 4, due: '2026-01-01' };
  assert.equal(L.srsRetained(s), 1);
});
