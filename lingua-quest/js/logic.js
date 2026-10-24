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
    notions: {},
    skins: { owned: ['recrue'], equipped: 'recrue' },
    arena: { floor: null, beaten: [], best: {}, last: [] },
    settings: { theme: 'dark', rate: 0.9, sound: true, fr: 'beaucoup', weeklyGoal: 5, voiceUrl: '', voiceCode: '', examDate: '', toeicGoal: 850 }
  };
}

/* Relit un état sauvegardé : complète les champs manquants, refuse ce qui n'est pas un état Lingua Quest */
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
const isDay = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
/* Garde seulement les valeurs d’un objet qui passent fix(v) (qui renvoie la valeur nettoyée ou null) */
function cleanMap(o, fix) {
  const out = {};
  if (isObj(o)) for (const [k, v] of Object.entries(o)) { const c = fix(v); if (c) out[k] = c; }
  return out;
}
const cleanRecent = r => (Array.isArray(r) ? r.filter(x => x === 0 || x === 1).slice(-30) : []);
const cleanStat = v => (isObj(v) ? { ...v, attempts: num(v.attempts), correct: num(v.correct), recent: cleanRecent(v.recent) } : null);
const SETTING_CHOICES = { theme: ['dark', 'light', 'auto'], fr: ['beaucoup', 'moyen', 'peu'] };
export function sanitize(o) {
  if (!isObj(o)) throw new Error('format');
  if (!('xp' in o) || !('skills' in o)) throw new Error('format');
  const base = newState();
  const s = { ...base, ...o };
  /* réglages : chaque valeur garde son type, sinon valeur par défaut */
  s.settings = { ...base.settings };
  if (isObj(o.settings)) for (const [k, v] of Object.entries(o.settings)) {
    if (!(k in base.settings)) { s.settings[k] = v; continue; }
    const d = base.settings[k];
    if (SETTING_CHOICES[k] ? SETTING_CHOICES[k].includes(v) : typeof v === typeof d && (typeof v !== 'number' || Number.isFinite(v))) s.settings[k] = v;
  }
  s.streak = { ...base.streak, ...(isObj(o.streak) ? o.streak : {}) };
  s.streak.count = num(s.streak.count); s.streak.best = num(s.streak.best);
  const inv = isObj(o.inventory) ? o.inventory : {};
  s.inventory = { owned: Array.isArray(inv.owned) ? inv.owned.filter(x => typeof x === 'string') : [], equipped: isObj(inv.equipped) ? inv.equipped : {} };
  const t = isObj(o.toeic) ? o.toeic : {};
  s.toeic = {
    ...base.toeic, ...t,
    parts: cleanMap(t.parts, cleanStat),
    tests: (Array.isArray(t.tests) ? t.tests : []).filter(x => isObj(x) && num(x.total) > 0).map(x => ({ ...x, ok: num(x.ok), total: num(x.total), seconds: num(x.seconds), parts: isObj(x.parts) ? x.parts : {} })),
    drills: num(t.drills)
  };
  s.skills = { ...base.skills };
  for (const k of SKILLS) { const v = cleanStat(o.skills && o.skills[k]); if (v) s.skills[k] = { attempts: v.attempts, correct: v.correct, recent: v.recent }; }
  s.srs = cleanMap(o.srs, e => (isObj(e) && isDay(e.due) ? { ...e, box: Math.min(6, Math.max(0, num(e.box))), seen: num(e.seen), ok: num(e.ok), ko: num(e.ko) } : null));
  s.tenses = cleanMap(o.tenses, cleanStat);
  s.notions = cleanMap(o.notions, v => (isObj(v) ? { n: num(v.n), ok: num(v.ok), recent: cleanRecent(v.recent), last: isDay(v.last) ? v.last : null } : null));
  s.quests = cleanMap(o.quests, q => (isObj(q) ? { ...q, done: !!q.done, best: num(q.best), attempts: num(q.attempts) } : null));
  s.chapters = cleanMap(o.chapters, c => (isObj(c) ? { ...c, bossBeaten: !!c.bossBeaten, bossTries: num(c.bossTries) } : null));
  s.days = cleanMap(o.days, d => (isObj(d) ? { ...d, mins: num(d.mins), xp: num(d.xp), done: !!d.done } : null));
  for (const k of ['recent', 'errors', 'sessions', 'badges', 'carnet']) if (!Array.isArray(s[k])) s[k] = [];
  s.recent = cleanRecent(s.recent);
  s.errors = s.errors.filter(e => isObj(e) && e.id).slice(-200);
  s.sessions = s.sessions.filter(isObj);
  s.badges = s.badges.filter(b => typeof b === 'string');
  s.carnet = s.carnet.filter(c => isObj(c) && typeof c.en === 'string' && c.id);
  const ar = isObj(o.arena) ? o.arena : {};
  s.arena = {
    floor: Number.isInteger(ar.floor) && ar.floor >= 1 ? ar.floor : null,
    beaten: Array.isArray(ar.beaten) ? ar.beaten.filter(Number.isInteger) : [],
    best: cleanMap(ar.best, v => (Number.isFinite(v) ? v : null)),
    last: Array.isArray(ar.last) ? ar.last.filter(x => typeof x === 'string').slice(-40) : []
  };
  const sk = isObj(o.skins) ? o.skins : {};
  const owned = ['recrue', ...(Array.isArray(sk.owned) ? sk.owned.filter(x => typeof x === 'string' && x !== 'recrue') : [])];
  s.skins = { owned: [...new Set(owned)], equipped: owned.includes(sk.equipped) ? sk.equipped : 'recrue' };
  if (!s.chapters[1]) s.chapters[1] = { bossBeaten: false, bossTries: 0 };
  if (s.hero && !(isObj(s.hero) && typeof s.hero.name === 'string')) s.hero = null;
  if (s.placement && !isObj(s.placement)) s.placement = null;
  s.xp = Math.max(0, num(s.xp));
  s.difficulty = Math.min(3, Math.max(1, num(s.difficulty, 1)));
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
  /* suivi par notion (temps, partie TOEIC, prépositions, vocabulaire…) */
  for (const k of a.notions || []) {
    const n = S.notions[k] || (S.notions[k] = { n: 0, ok: 0, recent: [], last: null });
    n.n++;
    if (a.ok) n.ok++;
    n.recent.push(a.ok ? 1 : 0);
    if (n.recent.length > 20) n.recent.shift();
    n.last = today();
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
/* ---------- Jauge « Prêt pour le TOEIC » ----------
   Ce n’est PAS un score TOEIC : c’est ta réussite dans l’appli, pondérée comme le vrai test
   (nombre de questions par partie sur 200), comparée au taux de réussite que tu vises. */
export const PART_WEIGHT = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 };
export const MIN_ANSWERS = 8;
/* Repère indicatif : viser 850 ≈ réussir environ 85 % des questions partout */
export const goalRate = goal => Math.min(95, Math.max(50, Math.round((+goal || 850) / 10)));
export function toeicReadiness(S) {
  const target = goalRate(S.settings.toeicGoal);
  const parts = Object.keys(PART_WEIGHT).map(Number).map(p => {
    const st = S.toeic.parts[p] || {};
    const n = st.attempts || 0, acc = accuracy(st.recent);
    return { part: p, n, acc, enough: n >= MIN_ANSWERS && acc !== null };
  });
  let level = 0;
  for (const x of parts) if (x.enough) level += x.acc * PART_WEIGHT[x.part] / 200;
  level = Math.round(level);
  const blancs = S.toeic.tests.filter(t => t.kind === 'blanc' && t.total).slice(-3).map(t => Math.round((t.ok / t.total) * 100));
  const goodBlancs = blancs.filter(v => v >= target).length;
  const ready = level >= target && goodBlancs >= 2 && parts.every(x => x.enough && x.acc >= target - 10);
  const pct = ready ? 100 : Math.min(99, Math.round((level / target) * 100));
  const todo = [];
  for (const x of parts.slice().sort((a, b) => (a.enough ? a.acc : -1) - (b.enough ? b.acc : -1))) {
    if (!x.enough) todo.push({ part: x.part, text: `pas assez travaillée (${x.n}/${MIN_ANSWERS} réponses)` });
    else if (x.acc < target) todo.push({ part: x.part, text: `${x.acc} % de réussite, vise ${target} %` });
  }
  if (goodBlancs < 2) todo.push({ part: 0, text: `Réussir 2 tests blancs à ${target} % ou plus (${goodBlancs}/2 sur les 3 derniers)` });
  const label = ready ? 'Prêt pour ton objectif' : pct >= 90 ? 'Presque prêt' : pct >= 60 ? 'En bonne route' : pct >= 25 ? 'En préparation' : 'Début de préparation';
  return { pct, level, target, ready, parts, blancs, todo, label };
}

/* ---------- Jauge « Niveau de discussion » ----------
   Indicateur maison (pas une certification) : réussite à l’oral, volume d’oral, temps maîtrisés,
   mots retenus et réflexes. Les niveaux reprennent l’esprit de l’échelle européenne (A1 à C1). */
export const TALK_LEVELS = [
  [0, 'Débutant', 'A1', 'Tu reconnais des mots et des phrases toutes faites.'],
  [20, 'Survie', 'A2', 'Tu te présentes, tu commandes, tu demandes ton chemin.'],
  [40, 'Conversation simple', 'B1', 'Tu racontes ta journée, ton passé et tes projets avec des phrases simples.'],
  [60, 'À l’aise', 'B2', 'Tu tiens une discussion sur des sujets courants et pros sans bloquer.'],
  [80, 'Fluide', 'C1', 'Tu réagis vite, avec les bons temps et un vocabulaire riche.']
];
export function talkLevel(S, tenseCount = 9) {
  const sp = S.skills.speaking || { attempts: 0, recent: [] }, rf = S.skills.reflexes || { attempts: 0, recent: [] };
  const rate = (sk, min) => (sk.attempts >= 5 ? (accuracy(sk.recent) || 0) / 100 : 0) * Math.min(1, sk.attempts / min);
  const parts = [
    { id: 'oral', label: 'Réussite à l’oral', w: 30, v: rate(sp, 20), tip: 'Fais des séances orales et réponds au micro plutôt qu’à l’écrit.' },
    { id: 'volume', label: 'Pratique de l’oral', w: 20, v: Math.min(1, sp.attempts / 150), tip: 'Parle tous les jours : chaque exercice oral compte.' },
    { id: 'temps', label: 'Temps maîtrisés', w: 20, v: Object.values(S.tenses).filter(t => t && t.mastered).length / tenseCount, tip: 'Valide la maîtrise des temps dans l’Académie.' },
    { id: 'mots', label: 'Mots retenus', w: 15, v: Math.min(1, srsRetained(S) / 300), tip: 'Fais tes révisions et remplis ton carnet.' },
    { id: 'reflexes', label: 'Réflexes en anglais', w: 15, v: rate(rf, 20), tip: 'Joue les dialogues et les quêtes de construction de phrases.' }
  ];
  const score = Math.round(parts.reduce((a, x) => a + x.w * x.v, 0));
  let i = 0;
  while (i + 1 < TALK_LEVELS.length && score >= TALK_LEVELS[i + 1][0]) i++;
  const [, name, cefr, desc] = TALK_LEVELS[i];
  const next = TALK_LEVELS[i + 1] || null;
  const tips = parts.slice().sort((a, b) => a.v - b.v).slice(0, 2).map(x => x.tip);
  return { score, name, cefr, desc, next: next ? { name: next[1], at: next[0] } : null, parts, tips };
}

/* ---------- Skins évolutifs : état de chaque condition ----------
   m : mesures du joueur { level, quests, bosses: [n…], tenses, words, talk, toeic, carnet } */
export const MASTERY_REQS = ['tenses', 'words', 'talk', 'toeic', 'carnet'];
export function skinReqs(skin, m) {
  return skin.req.map(r => {
    const cur = r.t === 'boss' ? ((m.bosses || []).includes(r.n) ? 1 : 0) : num(m[r.t]);
    const need = r.t === 'boss' ? 1 : r.n;
    return { ...r, cur: Math.min(cur, need), need, ok: cur >= need, mastery: MASTERY_REQS.includes(r.t) };
  });
}
export function skinState(S, skin, m) {
  const reqs = skinReqs(skin, m), owned = S.skins.owned.includes(skin.id);
  const done = reqs.filter(r => r.ok).length;
  return { owned, ready: !owned && reqs.every(r => r.ok), equipped: S.skins.equipped === skin.id, reqs, pct: reqs.length ? Math.round((done / reqs.length) * 100) : 100 };
}
export function unlockSkin(S, skin, m) {
  const st = skinState(S, skin, m);
  if (!st.ready) return false;
  S.skins.owned.push(skin.id);
  return true;
}
export function equipSkin(S, id) {
  if (!S.skins.owned.includes(id)) return false;
  S.skins.equipped = id;
  return true;
}

/* ---------- Tour des examens ---------- */
/* Seuil de victoire : 55 % au premier étage, puis monte jusqu’au taux visé par ton objectif au dernier */
export function arenaPass(floor, goal, floors = 6) {
  const top = goalRate(goal) / 100;
  return Math.round((0.55 + (top - 0.55) * (Math.min(floor, floors) - 1) / (floors - 1)) * 100) / 100;
}
/* Étage de départ selon ton niveau : difficulté réglée par l’évaluation, +1 si la jauge TOEIC dépasse 60 % */
export function arenaStart(S) {
  return Math.min(4, Math.max(1, S.difficulty + (toeicReadiness(S).pct >= 60 ? 1 : 0)));
}
/* Répartition des questions par partie, proportionnelle au vrai TOEIC (plus forts restes) */
export function partQuota(count) {
  const raw = Object.entries(PART_WEIGHT).map(([p, w]) => [+p, (w / 200) * count]);
  const q = raw.map(([p, x]) => [p, Math.floor(x), x - Math.floor(x)]);
  let left = count - q.reduce((a, x) => a + x[1], 0);
  for (const x of q.slice().sort((a, b) => b[2] - a[2])) { if (left <= 0) break; x[1]++; left--; }
  return q.map(([p, n]) => [p, n]);
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

/* mots et verbes retenus (les exercices ratés en révision « q: » ne comptent pas comme des mots) */
export function srsRetained(S) { return Object.entries(S.srs).filter(([id, e]) => !id.startsWith('q:') && e.box >= 3).length; }

/* ---------- Suivi par notion : forces, difficultés, notions à travailler ---------- */
/* Une notion est jugée sur ses 20 dernières réponses ; il en faut au moins 4 pour conclure. */
export const NOTION_MIN = 4;
export function notionStats(S) {
  return Object.entries(S.notions).map(([key, v]) => ({ key, n: v.n, ok: v.ok, acc: accuracy(v.recent), last: v.last, enough: v.recent.length >= NOTION_MIN }));
}
export function weakNotions(S, max = 3) {
  return notionStats(S).filter(x => x.enough && x.acc < 75).sort((a, b) => a.acc - b.acc || b.n - a.n).slice(0, max);
}
export function strongNotions(S, max = 3) {
  return notionStats(S).filter(x => x.enough && x.acc >= 80).sort((a, b) => b.acc - a.acc || b.n - a.n).slice(0, max);
}
/* Anciennes sauvegardes : on reconstruit le suivi à partir des temps et des parties TOEIC déjà enregistrés */
export function seedNotions(S) {
  if (Object.keys(S.notions).length) return false;
  for (const [id, t] of Object.entries(S.tenses)) if (t.recent && t.recent.length) S.notions['temps:' + id] = { n: t.attempts, ok: t.correct, recent: t.recent.slice(-20), last: null };
  for (const [p, t] of Object.entries(S.toeic.parts)) if (t.recent && t.recent.length) S.notions['toeic:' + p] = { n: t.attempts, ok: t.correct, recent: t.recent.slice(-20), last: null };
  return true;
}

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
