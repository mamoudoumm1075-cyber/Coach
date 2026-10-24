/* Lingua Quest : règles du jeu, sans interface.
   Tout ce qui est ici fonctionne aussi sous Node (tests dans tests/). */

export const STATE_VERSION = 1;
export const SKILLS = ['listening', 'reading', 'speaking', 'grammar', 'reflexes'];
export const SKILL_LABEL = {
  listening: 'Listening',
  reading: 'Reading',
  speaking: 'Speaking',
  grammar: 'Vocabulaire et grammaire',
  reflexes: 'Réflexes en anglais'
};
export const CLASSES = ['combattant', 'stratege', 'explorateur', 'technicien'];

/* ---------- Dates (jour local, format AAAA-MM-JJ) ---------- */
export function today(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return today(new Date(y, m - 1, d + n));
}
export function daysBetween(a, b) {
  const t = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 864e5);
}
/* Semaine ISO (lundi → dimanche), pour le joker hebdomadaire */
export function isoWeek(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((dt - y0) / 864e5 + 1) / 7);
  return dt.getUTCFullYear() + '-W' + String(w).padStart(2, '0');
}

/* ---------- État ---------- */
export function newState() {
  const skills = {};
  for (const k of SKILLS) skills[k] = { attempts: 0, correct: 0, recent: [] };
  return {
    v: STATE_VERSION,
    created: Date.now(),
    hero: null,
    placement: null,
    difficulty: 1,
    xp: 0,
    streak: { count: 0, best: 0, last: null, jokerWeek: null },
    chapters: { 1: { bossBeaten: false, bossTries: 0 } },
    quests: {},
    srs: {},
    skills,
    tenses: {},
    recent: [],
    toeic: { parts: {}, tests: [], drills: 0 },
    errors: [],
    sessions: [],
    days: {},
    inventory: { owned: [], equipped: {} },
    badges: [],
    carnet: [],
    settings: { theme: 'dark', rate: 0.9, sound: true, fr: 'beaucoup', weeklyGoal: 5, voiceUrl: '', voiceCode: '', examDate: '' }
  };
}

/* Relit un état sauvegardé : complète les champs manquants, refuse ce qui n'est pas un état Lingua Quest */
export function sanitize(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('format');
  if (!('xp' in o) || !('skills' in o)) throw new Error('format');
  const base = newState();
  const s = { ...base, ...o };
  s.settings = { ...base.settings, ...(o.settings || {}) };
  s.streak = { ...base.streak, ...(o.streak || {}) };
  s.inventory = { ...base.inventory, ...(o.inventory || {}) };
  s.toeic = { ...base.toeic, ...(o.toeic || {}) };
  s.skills = { ...base.skills };
  for (const k of SKILLS) {
    const v = o.skills && o.skills[k];
    if (v && typeof v === 'object') s.skills[k] = { attempts: +v.attempts || 0, correct: +v.correct || 0, recent: Array.isArray(v.recent) ? v.recent.slice(-30) : [] };
  }
  for (const k of ['quests', 'srs', 'tenses', 'chapters', 'days']) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = base[k];
  for (const k of ['recent', 'errors', 'sessions', 'badges', 'carnet']) if (!Array.isArray(s[k])) s[k] = [];
  s.carnet = s.carnet.filter(c => c && typeof c === 'object' && typeof c.en === 'string' && c.id);
  if (!s.chapters[1]) s.chapters[1] = { bossBeaten: false, bossTries: 0 };
  s.xp = Math.max(0, +s.xp || 0);
  s.difficulty = Math.min(3, Math.max(1, +s.difficulty || 1));
  s.v = STATE_VERSION;
  return s;
}

/* ---------- Niveaux RPG (indépendants des compétences réelles) ---------- */
export function xpForLevel(n) { return n <= 1 ? 0 : Math.round(80 * Math.pow(n - 1, 1.5)); }
export function levelInfo(xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  const a = xpForLevel(n), b = xpForLevel(n + 1);
  return { level: n, into: xp - a, need: b - a, pct: Math.round(((xp - a) / (b - a)) * 100) };
}

/* ---------- Réponses et compétences ---------- */
export const XP_OK = 10, XP_TRY = 2;

/* Enregistre une réponse. Retourne l'XP gagnée. */
export function recordAnswer(S, a) {
  const sk = S.skills[a.skill] || S.skills.grammar;
  sk.attempts++;
  if (a.ok) sk.correct++;
  sk.recent.push(a.ok ? 1 : 0);
  if (sk.recent.length > 30) sk.recent.shift();
  S.recent.push(a.ok ? 1 : 0);
  if (S.recent.length > 40) S.recent.shift();
  if (a.tense) {
    const t = S.tenses[a.tense] || (S.tenses[a.tense] = { attempts: 0, correct: 0, recent: [], mastered: false });
    t.attempts++;
    if (a.ok) t.correct++;
    t.recent.push(a.ok ? 1 : 0);
    if (t.recent.length > 20) t.recent.shift();
  }
  if (!a.ok) {
    S.errors.push({ d: today(), id: a.itemId || '', skill: a.skill, tags: a.tags || [], q: a.prompt || '', given: a.given ?? '', expected: a.expected ?? '' });
    if (S.errors.length > 200) S.errors.shift();
  }
  const gain = a.ok ? XP_OK : XP_TRY;
  S.xp += gain;
  return gain;
}

export function accuracy(arr) {
  if (!arr || !arr.length) return null;
  return Math.round((arr.reduce((x, y) => x + y, 0) / arr.length) * 100);
}

/* Étape de maîtrise d'une compétence, sur des critères vérifiables et affichés */
export function skillStage(stat) {
  const n = stat.attempts, acc = accuracy(stat.recent.slice(-20));
  if (n < 10) return { stage: 0, label: 'Découverte', acc, rule: 'Moins de 10 réponses : pas encore assez de données.' };
  if (n >= 20 && acc >= 90) return { stage: 3, label: 'Solide', acc, rule: '90 % ou plus sur les 20 dernières réponses.' };
  if (n >= 15 && acc >= 75) return { stage: 2, label: 'Consolidé', acc, rule: '75 % ou plus sur les 20 dernières réponses.' };
  return { stage: 1, label: 'En apprentissage', acc, rule: 'Moins de 75 % sur les 20 dernières réponses.' };
}

/* Un temps n'est « maîtrisé » qu'après une quête de maîtrise réussie sans aide (au moins 85 %) */
export function tenseStatus(S, id) {
  const t = S.tenses[id];
  if (!t) return { label: 'Pas commencé', acc: null, mastered: false };
  const acc = accuracy(t.recent);
  if (t.mastered) return { label: 'Maîtrisé', acc, mastered: true };
  if (t.attempts < 6) return { label: 'En découverte', acc, mastered: false };
  return { label: acc >= 75 ? 'Bien parti' : 'À travailler', acc, mastered: false };
}

/* Difficulté adaptative : suit la réussite réelle des 20 dernières réponses */
export function adaptDifficulty(S) {
  const r = S.recent.slice(-20);
  if (r.length < 12) return S.difficulty;
  const acc = accuracy(r);
  if (acc >= 85 && S.difficulty < 3) S.difficulty++;
  else if (acc < 55 && S.difficulty > 1) S.difficulty--;
  else return S.difficulty;
  S.recent = [];
  return S.difficulty;
}

/* ---------- Révision espacée ---------- */
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

export function srsAdd(S, id, d = today()) {
  if (!S.srs[id]) S.srs[id] = { box: 0, due: d, seen: 0, ok: 0, ko: 0 };
  return S.srs[id];
}
/* grade : 'ok' (su sans aide), 'hard' (hésitation), 'ko' (raté) */
export function srsReview(S, id, grade, d = today()) {
  const e = srsAdd(S, id, d);
  e.seen++;
  if (grade === 'ok') { e.ok++; e.box = Math.min(INTERVALS.length - 1, e.box + 1); }
  else if (grade === 'hard') { e.box = Math.max(1, e.box); }
  else { e.ko++; e.box = 1; }
  e.due = addDays(d, grade === 'ko' ? 1 : INTERVALS[e.box]);
  e.last = d;
  return e;
}
/* Les plus en retard d'abord, puis les plus souvent ratés */
export function srsDue(S, d = today(), limit = 99) {
  return Object.entries(S.srs)
    .filter(([, e]) => e.due <= d)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : b[1].ko - a[1].ko))
    .slice(0, limit)
    .map(([id]) => id);
}
/* ---------- Plan d’examen : sprint de 4 semaines avant la date du TOEIC ---------- */
export function examPlan(examDate, d = today()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate || '')) return null;
  const days = Math.round((Date.parse(examDate) - Date.parse(d)) / 86400000);
  if (isNaN(days)) return null;
  if (days < 0) return { days, phase: 'passe' };
  if (days > 28) return { days, phase: 'long', sprintStart: addDays(examDate, -28) };
  return { days, phase: 'sprint', week: Math.min(4, Math.floor((28 - days) / 7) + 1) };
}
/* Partie d’un test où l’on a perdu le plus de points (à égalité : le plus faible taux) */
export function mostLostPart(parts) {
  let best = null;
  for (const [p, [ok, n]] of Object.entries(parts || {})) {
    const lost = n - ok;
    if (lost <= 0) continue;
    if (!best || lost > best.lost || (lost === best.lost && ok / n < best.ok / best.n)) best = { part: +p, lost, ok, n };
  }
  return best;
}

/* ---------- Carnet de vocabulaire : chaque mot inconnu est noté, puis révisé ---------- */
export const CARNET_GOALS = [100, 200, 300];
export function carnetGoal(n) { return CARNET_GOALS.find(g => n < g) || (Math.floor(n / 100) + 1) * 100; }
const normWord = w => String(w || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' -]/g, '').replace(/\s+/g, ' ').trim();
export function carnetFind(S, en) { const k = normWord(en); return k ? S.carnet.find(c => normWord(c.en) === k) : null; }
export function carnetAdd(S, en, fr = '', d = today()) {
  en = String(en || '').trim().replace(/\s+/g, ' ').replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').slice(0, 60);
  fr = String(fr || '').trim().slice(0, 120);
  if (!normWord(en)) return null;
  const old = carnetFind(S, en);
  if (old) { if (fr && !old.fr) old.fr = fr; return old; }
  const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), en, fr, d };
  S.carnet.push(c);
  srsAdd(S, 'c:' + c.id, d);
  return c;
}
export function carnetRemove(S, id) {
  S.carnet = S.carnet.filter(c => c.id !== id);
  delete S.srs['c:' + id];
}

export function srsRetained(S) { return Object.values(S.srs).filter(e => e.box >= 3).length; }

/* ---------- Série quotidienne (1 joker par semaine) ---------- */
export function completeDay(S, d = today()) {
  const st = S.streak;
  if (st.last === d) return { count: st.count, joker: false };
  let joker = false;
  if (!st.last) st.count = 1;
  else {
    const gap = daysBetween(st.last, d);
    if (gap === 1) st.count++;
    else if (gap === 2 && st.jokerWeek !== isoWeek(d)) { st.count++; st.jokerWeek = isoWeek(d); joker = true; }
    else st.count = 1;
  }
  st.last = d;
  st.best = Math.max(st.best || 0, st.count);
  return { count: st.count, joker };
}
/* Série affichée : tombe à 0 si elle est déjà perdue (sans rien enregistrer) */
export function streakNow(S, d = today()) {
  const st = S.streak;
  if (!st.last) return 0;
  const gap = daysBetween(st.last, d);
  if (gap <= 1) return st.count;
  if (gap === 2 && st.jokerWeek !== isoWeek(d)) return st.count;
  return 0;
}

/* ---------- Monde ---------- */
export function chapterUnlocked(S, n) {
  return n === 1 || !!(S.chapters[n - 1] && S.chapters[n - 1].bossBeaten);
}
export function beatBoss(S, n) {
  const c = S.chapters[n] || (S.chapters[n] = { bossBeaten: false, bossTries: 0 });
  c.bossBeaten = true;
  if (!S.chapters[n + 1]) S.chapters[n + 1] = { bossBeaten: false, bossTries: 0 };
}

/* ---------- TOEIC ---------- */
export function recordToeic(S, part, ok) {
  const p = S.toeic.parts[part] || (S.toeic.parts[part] = { attempts: 0, correct: 0, recent: [] });
  p.attempts++;
  if (ok) p.correct++;
  p.recent.push(ok ? 1 : 0);
  if (p.recent.length > 30) p.recent.shift();
}
/* Partie la plus faible (ou jamais travaillée) : sert à équilibrer l'entraînement */
export function weakestPart(S, parts) {
  let best = null, score = Infinity;
  for (const p of parts) {
    const st = S.toeic.parts[p];
    const v = !st || st.attempts < 4 ? -1 : accuracy(st.recent);
    if (v < score) { score = v; best = p; }
  }
  return best;
}

/* ---------- Comparaison de réponses ---------- */
const CONTRACTIONS = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not',
  "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not', "won't": 'will not', "can't": 'cannot', "i've": 'i have',
  "you've": 'you have', "we've": 'we have', "they've": 'they have', "i'll": 'i will', "you'll": 'you will', "it'll": 'it will',
  "i'd": 'i would', "let's": 'let us', "that's": 'that is', "there's": 'there is', "what's": 'what is', "couldn't": 'could not',
  "shouldn't": 'should not', "wouldn't": 'would not', "mustn't": 'must not'
};
export function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[.,!?;:"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function expand(str) {
  return normalize(str).split(' ').map(w => CONTRACTIONS[w] || w).join(' ').replace('can not', 'cannot');
}
export function checkTyped(given, answers) {
  const g = expand(given);
  return answers.some(a => expand(a) === g);
}
/* Mots reconnus par la reconnaissance vocale. Ce n'est PAS une analyse de l'accent. */
export function wordMatch(transcript, target) {
  const want = expand(target).split(' ').filter(Boolean);
  const got = expand(transcript).split(' ').filter(Boolean);
  const pool = {};
  for (const w of got) pool[w] = (pool[w] || 0) + 1;
  const found = [], missing = [];
  for (const w of want) {
    if (pool[w]) { pool[w]--; found.push(w); } else missing.push(w);
  }
  return { ratio: want.length ? found.length / want.length : 0, found, missing };
}

/* ---------- Tirage ---------- */
export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
