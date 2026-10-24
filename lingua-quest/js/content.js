/* Assemble les contenus en suites de « cartes » jouables : quêtes, session du jour, boss, révisions. */
import { TENSES, TENSE_ITEMS, TENSE_BY_ID } from '../data/tenses.js';
import { TOEIC, PART_IDS, PARTS } from '../data/toeic.js';
import { WORLD_ITEMS, CHAPTERS, CLASS_QUESTS, PLACEMENT } from '../data/world.js';
import { VOCAB, VOCAB_BY_ID, IRREGULAR, PREP_ITEMS } from '../data/codex.js';
import { shuffle, srsDue, srsAdd, weakestPart, chapterUnlocked, today, weakNotions, notionStats } from './logic.js';

export const ITEMS = Object.fromEntries([...TENSE_ITEMS, ...TOEIC, ...WORLD_ITEMS, ...PLACEMENT].map(i => [i.id, i]));
export const IRR_BY_ID = Object.fromEntries(IRREGULAR.map(r => [r.id, r]));

/* ---------- Vocabulaire de ton métier (CVC, VMC, BTP, data center) ---------- */
export const METIER_CATS = ['cvc', 'btp', 'datacenter'];
export function metierWords(cat) { return VOCAB.filter(v => (cat ? v.cat === cat : METIER_CATS.includes(v.cat))); }
/* Quiz dans les deux sens (anglais → français, français → anglais), options tirées du même domaine */
export function metierQuiz(words, pool, n = 6) {
  return shuffle(words).slice(0, n).map((v, k) => {
    const others = shuffle(pool.filter(o => o !== v && o.senses[0][0] !== v.senses[0][0])).slice(0, 3);
    const toFr = k % 2 === 0, fr = x => x.senses[0][0];
    return {
      id: 'm-' + v.id + (toFr ? '-fr' : '-en'), type: 'qcm', skill: 'reading', tags: ['metier'], diff: 1,
      prompt: toFr ? `Que veut dire « ${v.en} » ?` : `Comment dit-on « ${fr(v)} » en anglais ?`,
      text: toFr ? v.ex : '', options: toFr ? [fr(v), ...others.map(fr)] : [v.en, ...others.map(o => o.en)], answer: 0,
      explain: `${v.en} = ${fr(v)}. Exemple : ${v.ex} (${v.exFr})`
    };
  });
}
/* Une séance : jusqu’à 6 mots nouveaux du domaine, puis un quiz qui mélange nouveaux et anciens */
export function metierCards(S, cat) {
  const pool = metierWords(cat);
  const fresh = pool.filter(v => !S.srs['v:' + v.id]).slice(0, 6);
  const known = shuffle(pool.filter(v => S.srs['v:' + v.id]));
  const quizWords = [...fresh, ...known].slice(0, 8);
  return [...fresh.map(v => ({ kind: 'learn', id: v.id })), ...metierQuiz(quizWords, pool, 8).map(item => ({ kind: 'item', item }))];
}

/* ---------- Apprentissage personnalisé : notions, domaines, entraînement ciblé ---------- */
const PREP_SET = new Set(PREP_ITEMS);
export const DOMAINS = { vocab: 'Vocabulaire', grammaire: 'Grammaire', ecoute: 'Compréhension orale', lecture: 'Compréhension écrite', oral: 'Oral et réflexes' };
const NOTION_LABELS = {
  prepositions: ['grammaire', 'Prépositions'], traduction: ['grammaire', 'Traduction et construction de phrases'],
  vocabulaire: ['vocab', 'Mots et carnet'], irreguliers: ['vocab', 'Verbes irréguliers'], metier: ['vocab', 'Vocabulaire de ton métier'],
  dialogues: ['oral', 'Réagir dans un dialogue'], oral: ['oral', 'Parler (exercices oraux)'],
  ecoute: ['ecoute', 'Écouter des dialogues et annonces'], lecture: ['lecture', 'Lire des textes courts']
};
export function notionInfo(key) {
  const [type, id] = key.split(':');
  if (type === 'temps') return { domain: 'grammaire', label: (TENSE_BY_ID[id] || {}).name || id };
  if (type === 'toeic') { const p = +id; return { domain: p <= 4 ? 'ecoute' : p === 7 ? 'lecture' : 'grammaire', label: PARTS[p] ? PARTS[p].name : 'TOEIC' }; }
  const m = NOTION_LABELS[key];
  return m ? { domain: m[0], label: m[1] } : { domain: 'grammaire', label: key };
}
/* Notions touchées par une réponse */
export function notionKeys(meta) {
  const k = new Set(), id = meta.id || '', tags = meta.tags || [];
  if (meta.tense) k.add('temps:' + meta.tense);
  if (meta.part) k.add('toeic:' + meta.part);
  if (PREP_SET.has(id)) k.add('prepositions');
  if (tags.includes('traduction')) k.add('traduction');
  if (tags.includes('metier')) k.add('metier');
  if (id.startsWith('v:') || id.startsWith('c:')) k.add('vocabulaire');
  if (id.startsWith('i:')) k.add('irreguliers');
  if (id.startsWith('dlg-')) k.add('dialogues');
  if (meta.skill === 'speaking') k.add('oral');
  if (!k.size && meta.skill === 'listening') k.add('ecoute');
  if (!k.size && meta.skill === 'reading') k.add('lecture');
  return [...k];
}
const asItems = list => list.filter(Boolean).map(item => ({ kind: 'item', item }));
/* Exercices pour travailler une notion précise */
export function notionCards(S, key, n = 4) {
  const [type, id] = key.split(':');
  if (type === 'temps') return TENSE_BY_ID[id] ? asItems(pickItems(TENSE_BY_ID[id].exercises, S, n)) : [];
  if (type === 'toeic') return asItems(toeicItems(S, [+id], n));
  if (key === 'prepositions') return asItems(shuffle(PREP_ITEMS.map(x => ITEMS[x])).slice(0, n));
  if (key === 'traduction') return asItems(shuffle(Object.values(ITEMS).filter(i => (i.tags || []).includes('traduction'))).slice(0, n));
  if (key === 'metier') return asItems(metierQuiz(metierWords(), metierWords(), n));
  if (key === 'vocabulaire') {
    const ids = shuffle(Object.keys(S.srs).filter(x => (x.startsWith('v:') || x.startsWith('c:')) && srsKnown(S, x)));
    return ids.slice(0, n + 2).map(x => ({ kind: 'recall', id: x }));
  }
  if (key === 'irreguliers') return shuffle(IRREGULAR).slice(0, n).map(r => ({ kind: 'recall', id: 'i:' + r.id }));
  if (key === 'dialogues') return asItems(shuffle(Object.values(ITEMS).filter(i => i.skill === 'reflexes' && i.type !== 'speak')).slice(0, n));
  if (key === 'oral') return asItems(oralItems(S, n));
  if (key === 'ecoute') return asItems(toeicItems(S, [2, 3, 4], n));
  if (key === 'lecture') return asItems(toeicItems(S, [7], n));
  return [];
}
/* Notions de base à essayer quand il n’y a pas encore assez de données */
const CORE_NOTIONS = ['temps:present-simple', 'temps:past-simple', 'temps:present-perfect', 'prepositions', 'toeic:2', 'toeic:5', 'toeic:7', 'irreguliers'];
export function targetNotions(S, max = 3) {
  const weak = weakNotions(S, max).map(x => x.key);
  if (weak.length >= max) return weak;
  const seen = new Map(notionStats(S).map(x => [x.key, x]));
  const fresh = CORE_NOTIONS.filter(k => !weak.includes(k) && !(seen.get(k) && seen.get(k).enough));
  return [...weak, ...fresh].slice(0, max);
}
/* Séance ciblée : tes notions les plus faibles, puis les exercices ratés à revoir */
export function targetedCards(S) {
  const keys = targetNotions(S, 3);
  const cards = [];
  for (const k of keys) {
    cards.push({ kind: 'stage', title: notionInfo(k).label, mins: 2, text: 'Notion choisie d’après tes réponses : on la travaille maintenant.' });
    cards.push(...notionCards(S, k, 4));
  }
  const dueQ = srsDue(S, today()).filter(id => id.startsWith('q:') && ITEMS[id.slice(2)]).slice(0, 3);
  for (const id of dueQ) cards.push({ kind: 'item', item: ITEMS[id.slice(2)] });
  return { keys, cards };
}

export function allQuests(S) {
  const list = [];
  for (const ch of CHAPTERS) for (const q of ch.quests) list.push({ ...q, ch: ch.n });
  if (S.hero && CLASS_QUESTS[S.hero.cls]) list.push(CLASS_QUESTS[S.hero.cls]);
  return list;
}
export function questById(S, id) { return allQuests(S).find(q => q.id === id); }
export function currentChapter(S) {
  let n = 1;
  for (const ch of CHAPTERS) if (chapterUnlocked(S, ch.n)) n = ch.n;
  return CHAPTERS.find(c => c.n === n);
}

/* Choisit des exercices adaptés à la difficulté du joueur, en remettant d’abord ceux ratés récemment */
function pickItems(pool, S, count) {
  const fit = pool.filter(i => (i.diff || 1) <= S.difficulty + 1);
  const src = fit.length >= count ? fit : pool;
  const seenOk = new Set(S.errors.slice(-60).map(e => e.id));
  const ordered = shuffle(src).sort((a, b) => (seenOk.has(b.id) ? 1 : 0) - (seenOk.has(a.id) ? 1 : 0));
  return ordered.slice(0, count);
}
export function toeicItems(S, parts, count) {
  const out = [];
  const remaining = new Set();
  for (let k = 0; k < count; k++) {
    const order = [weakestPart(S, parts), ...shuffle(parts)];
    for (const p of order) {
      const pool = TOEIC.filter(i => i.part === p && !out.includes(i) && i.diff <= S.difficulty + 1);
      if (pool.length) { out.push(shuffle(pool)[0]); break; }
      remaining.add(p);
    }
  }
  if (out.length < count) out.push(...shuffle(TOEIC.filter(i => parts.includes(i.part) && !out.includes(i))).slice(0, count - out.length));
  /* alterne écoute / lecture */
  const L = out.filter(i => i.skill === 'listening'), R = out.filter(i => i.skill !== 'listening');
  const mixed = [];
  while (L.length || R.length) { if (L.length) mixed.push(L.shift()); if (R.length) mixed.push(R.shift()); }
  return mixed;
}

/* Une quête → une suite de cartes */
export function questCards(S, quest) {
  const cards = [];
  for (const st of quest.steps) {
    if (st.dialogue) cards.push({ kind: 'dialogue', id: st.dialogue });
    if (st.vocab) for (const v of st.vocab) if (VOCAB_BY_ID[v]) cards.push({ kind: 'learn', id: v });
    if (st.items) for (const id of st.items) if (ITEMS[id]) cards.push({ kind: 'item', item: ITEMS[id] });
    if (st.tense) for (const it of pickItems(TENSE_BY_ID[st.tense].exercises, S, st.count)) cards.push({ kind: 'item', item: it });
    if (st.toeic) for (const it of toeicItems(S, st.toeic, st.count)) cards.push({ kind: 'item', item: it });
  }
  return cards;
}

/* Cartes de réactivation : révisions dues, sinon nouveaux mots du chapitre en cours */
/* Une révision n’est proposée que si l’élément existe encore (mot, verbe ou entrée du carnet) */
export function srsKnown(S, id) {
  const k = id.slice(2);
  return id.startsWith('v:') ? !!VOCAB_BY_ID[k] : id.startsWith('i:') ? !!IRR_BY_ID[k] : id.startsWith('c:') ? S.carnet.some(c => c.id === k) : id.startsWith('q:') ? !!ITEMS[k] : false;
}
export function recallCards(S, max = 5, min = 3) {
  const due = srsDue(S, today()).filter(id => srsKnown(S, id)).slice(0, max);
  const cards = due.map(id => ({ kind: 'recall', id }));
  if (cards.length < min) {
    const ch = currentChapter(S);
    const cats = ch.n <= 1 ? ['quotidien', 'conversation'] : ch.n === 2 ? ['achats', 'transports', 'conversation'] : ch.n === 4 ? ['voyages', 'transports'] : ['travail', 'toeic', 'reunions', 'emails'];
    const fresh = shuffle(VOCAB.filter(v => cats.includes(v.cat) && !S.srs['v:' + v.id])).slice(0, min - cards.length);
    for (const v of fresh) cards.push({ kind: 'learn', id: v.id });
  }
  return cards;
}

/* Session quotidienne d’environ 20 minutes : réactivation 2 min, donjon TOEIC 7 min, épreuve orale 8 min, bilan 3 min */
export function dailyCards(S) {
  const cards = [{ kind: 'stage', title: 'Réactivation', mins: 2, text: 'Retrouve le sens de mots déjà vus, sans regarder la réponse tout de suite.' }];
  cards.push(...recallCards(S, 5, 3));
  cards.push({ kind: 'stage', title: 'Donjon du TOEIC', mins: 7, text: 'Écoute et lecture au format TOEIC, en alternance. Les parties où tu es le plus faible passent en premier.' });
  for (const it of toeicItems(S, PART_IDS, 7)) cards.push({ kind: 'item', item: it });
  cards.push({ kind: 'stage', title: 'Épreuve orale', mins: 8, text: 'Écoute, répète, puis réponds avec tes propres mots.' });
  for (const it of oralItems(S, 4)) cards.push({ kind: 'item', item: it });
  return cards;
}

/* Oral : répétition + réponses libres du chapitre en cours + mission orale d’un temps en apprentissage */
export function oralItems(S, count) {
  const ch = currentChapter(S);
  const world = WORLD_ITEMS.filter(i => i.type === 'speak' && i.id.startsWith('w') && Number(i.id[1]) <= ch.n);
  const rep = shuffle(world.filter(i => i.mode === 'repeat')).slice(0, 1);
  const ans = shuffle(world.filter(i => i.mode === 'answer')).slice(0, Math.max(1, count - 2));
  const out = [...rep, ...ans];
  const tense = TENSES.find(t => !(S.tenses[t.id] && S.tenses[t.id].mastered) && (S.tenses[t.id] || t.id === 'present-simple'));
  if (tense) out.push(tenseOralItem(tense));
  return out.slice(0, count);
}
export function tenseOralItem(t) {
  return { id: 'oral-' + t.id, type: 'speak', mode: 'answer', skill: 'speaking', diff: 1, tags: [t.id], tense: t.id, prompt: 'Mission orale : ' + t.name, question: '', fr: t.oral.prompt, model: t.oral.model, checks: t.oral.checks };
}

/* Quête de maîtrise d’un temps : sans aide, 85 % requis */
export function masteryCards(t) {
  return shuffle(t.exercises).slice(0, Math.min(8, t.exercises.length)).map(item => ({ kind: 'item', item }));
}

/* Révisions : mots et verbes dus + exercices récemment ratés */
export function reviewCards(S, max = 12) {
  const due = srsDue(S, today()).filter(id => srsKnown(S, id));
  /* mots et verbes à réactiver, puis exercices ratés dont la révision est due (révision espacée) */
  const cards = due.filter(id => !id.startsWith('q:')).slice(0, 8).map(id => ({ kind: 'recall', id }));
  const seen = new Set();
  for (const id of due.filter(x => x.startsWith('q:')).slice(0, 6)) { seen.add(id.slice(2)); cards.push({ kind: 'item', item: ITEMS[id.slice(2)] }); }
  for (const e of S.errors.slice().reverse()) {
    if (cards.length >= max) break;
    if (ITEMS[e.id] && !seen.has(e.id)) { seen.add(e.id); cards.push({ kind: 'item', item: ITEMS[e.id] }); }
  }
  return cards;
}

/* Quête de renforcement après un échec : notions des erreurs */
export function reinforcementCards(S, tags, failedIds) {
  const cards = [];
  for (const id of failedIds) if (ITEMS[id] && ITEMS[id].type !== 'speak') cards.push({ kind: 'item', item: ITEMS[id] });
  for (const tag of tags) if (TENSE_BY_ID[tag]) for (const it of pickItems(TENSE_BY_ID[tag].exercises, S, 3)) cards.push({ kind: 'item', item: it });
  return cards.slice(0, 10);
}

export function bossCards(S, ch) {
  if (ch.boss.toeicTest) return toeicItems(S, ch.boss.toeicTest.parts, ch.boss.toeicTest.count).map(item => ({ kind: 'item', item }));
  return ch.boss.items.map(id => ({ kind: 'item', item: ITEMS[id] }));
}

export function placementCards() { return PLACEMENT.map(item => ({ kind: 'item', item })); }

/* Ajoute un mot / un verbe aux révisions (dû demain : on vient de le voir) */
export function learnWord(S, srsId) {
  const e = srsAdd(S, srsId);
  if (e.seen === 0) { const d = new Date(); d.setDate(d.getDate() + 1); e.due = today(d); }
  return e;
}
