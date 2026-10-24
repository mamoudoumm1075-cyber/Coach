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
