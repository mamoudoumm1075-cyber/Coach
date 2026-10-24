/* Lingua Quest : état, sauvegarde, navigation et écrans. */
import { ctx } from './ctx.js';
import * as L from './logic.js';
import { esc, icon, avatarSVG, bar, toast, pl, SKINS, HAIR_COLORS, HAIR_STYLES, BUILDS, FACES } from './ui.js';
import { startRun, isRunning, currentCard } from './play.js';
import { codexHTML, wordListHTML, tenseHTML, handleCodexAct, openWordSheet, closeSheet } from './codexview.js';
import * as C from './content.js';
import { ttsAvailable, sttAvailable, setSound, speak, voiceCount } from './audio.js';
import { CHAPTERS, CLASS_INFO, COSMETICS, BADGES, QUEST_CATS, PLACEMENT_AREAS } from '../data/world.js';
import { TENSES, TENSE_BY_ID } from '../data/tenses.js';
import { PARTS, PART_IDS } from '../data/toeic.js';
import { VOCAB_BY_ID } from '../data/codex.js';

/* ---------- Sauvegarde (jamais d’écrasement d’une donnée illisible) ---------- */
const KEY = 'lingua-quest-v1', KEY_BAD = 'lingua-quest-illisible';
let lockSave = false;
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function load() {
  const raw = lsGet(KEY);
  if (raw == null) return L.newState();
  try { return L.sanitize(JSON.parse(raw)); }
  catch (e) {
    lockSave = true;
    if (lsGet(KEY_BAD) !== raw) lsSet(KEY_BAD, raw);
    return L.newState();
  }
}
let saveWarned = false;
function save() {
  if (lockSave) return;
  if (!lsSet(KEY, JSON.stringify(ctx.S)) && !saveWarned) { saveWarned = true; toast('Enregistrement impossible sur cet appareil (mode privé ?). Exporte une sauvegarde dans Profil.'); }
}

ctx.S = load();
ctx.save = save;
ctx.go = route => { location.hash = '#/' + route; };
ctx.refresh = () => render();
ctx.afterRun = () => checkUnlocks();

const S = () => ctx.S;
const CRIT_QUEST = 0.6;

/* ---------- Thème ---------- */
function applyTheme() {
  const t = S().settings.theme;
  document.documentElement.dataset.theme = t === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  setSound(S().settings.sound);
}

/* ---------- Déblocages : objets et badges (cosmétiques uniquement) ---------- */
function own(id) { const inv = S().inventory; if (!inv.owned.includes(id)) { inv.owned.push(id); return true; } return false; }
function badge(id) { if (!S().badges.includes(id)) { S().badges.push(id); toast('Badge : ' + BADGES[id]); } }
function checkUnlocks() {
  const s = S(), lvl = L.levelInfo(s.xp).level;
  for (const c of COSMETICS) {
    if (c.level && lvl >= c.level && own(c.id) && c.level > 1) toast('Nouvel objet : ' + c.name);
    if (c.streak && s.streak.best >= c.streak && own(c.id)) toast('Nouvel objet : ' + c.name);
  }
  if (!s.inventory.equipped.outfit) s.inventory.equipped.outfit = 'outfit-start';
  if (s.streak.best >= 7) badge('streak-7');
  if (s.streak.best >= 30) badge('streak-30');
  if (L.srsRetained(s) >= 25) badge('words-25');
  if (Object.values(s.tenses).some(t => t.mastered)) badge('tense-master');
  L.adaptDifficulty(s);
}

/* ---------- Mission conseillée ---------- */
function dailyDone() { const d = S().days[L.today()]; return !!(d && d.done); }
function nextMission() {
  const s = S();
  if (!s.placement) return { label: 'Évaluation initiale (environ 5 min)', route: 'placement' };
  if (!dailyDone()) return { label: 'Session du jour (20 min)', route: 'daily' };
  const ch = C.currentChapter(s);
  const q = ch.quests.find(x => x.cat === 'principale' && !(s.quests[x.id] && s.quests[x.id].done));
  if (q) return { label: 'Quête : ' + q.title, route: 'chapter/' + ch.n };
  if (!(s.chapters[ch.n] && s.chapters[ch.n].bossBeaten)) return { label: 'Boss : ' + ch.boss.name, route: 'chapter/' + ch.n };
  if (L.srsDue(s).length) return { label: 'Révisions dues', route: 'review' };
  return { label: 'Académie des temps', route: 'academy' };
}

/* ---------- Lancements ---------- */
function runQuest(q) {
  const s = S();
  startRun(C.questCards(s, q), {
    mode: 'quest', title: q.title, seconds: q.timed,
    onDone(sum) {
      const st = s.quests[q.id] || (s.quests[q.id] = { done: false, best: 0, attempts: 0 });
      st.attempts++;
      st.best = Math.max(st.best, Math.round(sum.pct * 100));
      const passed = sum.total === 0 || sum.pct >= CRIT_QUEST;
      const rewards = [];
      if (passed) {
        const gain = st.done ? Math.round(q.xp / 3) : q.xp;
        s.xp += gain;
        rewards.push('Récompense de quête : +' + gain + ' XP');
        st.done = true;
      }
      return {
        title: passed ? 'Quête réussie : ' + q.title : 'Quête à retenter',
        text: passed ? 'Critère atteint (' + Math.round(CRIT_QUEST * 100) + ' % de bonnes réponses).' : 'Il faut ' + Math.round(CRIT_QUEST * 100) + ' % de bonnes réponses. Relis les corrections ci-dessous, puis retente.',
        win: passed, rewards, next: nextMission(), retry: passed ? null : () => runQuest(q)
      };
    }
  });
}

function runBoss(ch) {
  const s = S(), b = ch.boss;
  const cards = C.bossCards(s, ch);
  const c = s.chapters[ch.n] || (s.chapters[ch.n] = { bossBeaten: false, bossTries: 0 });
  c.bossTries++;
  startRun(cards, {
    mode: 'boss', title: 'Boss · ' + b.name, boss: { name: b.name, pass: b.pass }, seconds: b.toeicTest ? b.toeicTest.seconds : 0,
    onDone(sum) {
      const win = sum.pct >= b.pass && sum.reason !== 'quit';
      const rewards = [];
      if (b.toeicTest) s.toeic.tests.push(testRecord(sum));
      const tags = [...new Set(sum.results.filter(r => !r.ok).flatMap(r => r.tags))];
      if (win) {
        const first = !c.bossBeaten;
        L.beatBoss(s, ch.n);
        if (first) {
          s.xp += b.reward.xp;
          rewards.push('+' + b.reward.xp + ' XP');
          const item = COSMETICS.find(x => x.id === b.reward.item);
          if (item && own(item.id)) rewards.push('Objet débloqué : ' + item.name);
          badge('boss-' + ch.n);
          const nx = CHAPTERS.find(x => x.n === ch.n + 1);
          if (nx) rewards.push('Nouvelle région : ' + nx.title);
        }
      }
      const failed = sum.results.filter(r => !r.ok).map(r => r.id);
      return {
        win, rewards,
        title: win ? b.name + ' est vaincu !' : 'Défaite… pour cette fois',
        text: win ? 'Tu as démontré les compétences du chapitre.' : 'Il fallait ' + Math.round(b.pass * 100) + ' % de réussite. Les notions à revoir sont listées ci-dessous. Une quête de renforcement est prête.',
        next: win ? nextMission() : null,
        retry: () => runBoss(ch),
        reinforce: win ? null : () => startRun(C.reinforcementCards(s, tags, failed), { mode: 'reinforce', title: 'Renforcement', onDone: () => ({ title: 'Renforcement terminé', text: 'Tu peux retenter le boss quand tu veux.', next: { label: 'Retenter ' + b.name, route: 'chapter/' + ch.n } }) })
      };
    }
  });
}
function testRecord(sum) {
  const parts = {};
  for (const r of sum.results) if (r.part) { parts[r.part] = parts[r.part] || [0, 0]; parts[r.part][1]++; if (r.ok) parts[r.part][0]++; }
  return { d: L.today(), ok: sum.okN, total: sum.total, seconds: sum.seconds, parts };
}

function runDaily() {
  const s = S();
  startRun(C.dailyCards(s), {
    mode: 'daily', title: 'Session du jour',
    onDone(sum) {
      if (sum.reason === 'quit') return { title: 'Session interrompue', text: 'Elle ne compte pas pour ta série. Tes réponses sont gardées.' };
      const d = L.today();
      const day = s.days[d] || (s.days[d] = { mins: 0, xp: 0, done: false });
      const wasDone = day.done;
      day.done = true;
      const st = L.completeDay(s, d);
      s.sessions.push({ d, ok: sum.okN, total: sum.total, mins: sum.mins });
      if (s.sessions.length > 400) s.sessions.shift();
      badge('first-session');
      const rewards = [];
      if (!wasDone) { s.xp += 30; rewards.push('Session complète : +30 XP'); }
      rewards.push('Série : ' + pl(st.count, 'jour') + (st.joker ? ' (joker de la semaine utilisé)' : ''));
      return { title: 'Session du jour terminée', text: 'Réactivation, donjon du TOEIC, épreuve orale : c’est fait.', win: true, rewards, next: nextMission() };
    }
  });
}

function runPlacement() {
  startRun(C.placementCards(), {
    mode: 'placement', title: 'Évaluation initiale', noHelp: true,
    onDone(sum) {
      const areas = {};
      let pts = 0, max = 0;
      for (const r of sum.results) {
        const it = C.ITEMS[r.id];
        if (!it) continue;
        areas[it.area] = areas[it.area] || [0, 0];
        areas[it.area][1]++;
        if (r.ok) areas[it.area][0]++;
        max += it.diff; if (r.ok) pts += it.diff;
      }
      const pct = max ? pts / max : 0;
      const rec = pct < 0.45 ? 1 : pct < 0.75 ? 2 : 3;
      S().placement = { d: L.today(), areas, pct: Math.round(pct * 100), rec };
      S().difficulty = rec;
      setTimeout(() => ctx.go('placement-result'), 0);
      return { title: 'Évaluation terminée', text: 'Tes résultats servent à régler la difficulté de départ. Tu pourras la changer.', next: { label: 'Voir mes résultats', route: 'placement-result' } };
    }
  });
}

function runTenseMastery(t) {
  startRun(C.masteryCards(t), {
    mode: 'mastery', title: 'Maîtrise · ' + t.name, noHelp: true,
    onDone(sum) {
      const win = sum.pct >= 0.85;
      const st = S().tenses[t.id] || (S().tenses[t.id] = { attempts: 0, correct: 0, recent: [], mastered: false });
      const rewards = [];
      if (win && !st.mastered) { st.mastered = true; S().xp += 80; rewards.push('Temps maîtrisé : +80 XP'); badge('tense-master'); }
      return { win, rewards, title: win ? t.name + ' maîtrisé' : 'Pas encore maîtrisé', text: win ? 'Réussi sans aide avec au moins 85 %.' : 'Il faut 85 % sans aide. Revois la fiche, entraîne-toi, puis retente.', retry: () => runTenseMastery(t), next: { label: 'Fiche ' + t.name, route: 'tense/' + t.id } };
    }
  });
}
function simpleRun(cards, title, mode, extra = {}) {
  if (!cards.length) return toast('Rien à faire ici pour l’instant.');
  startRun(cards, { mode, title, ...extra, onDone: sum => ({ title: title + ' terminé', win: sum.pct >= 0.6, next: nextMission() }) });
}
function runToeicTest() {
  startRun(C.toeicItems(S(), PART_IDS, 12).map(item => ({ kind: 'item', item })), {
    mode: 'toeic-test', title: 'Simulation chronométrée', seconds: 600,
    onDone(sum) { S().toeic.tests.push(testRecord(sum)); return { title: 'Simulation terminée', text: 'Regarde tes résultats par partie : c’est là que se trouvent tes prochains progrès.', next: { label: 'Progression TOEIC', route: 'toeic' } }; }
  });
}

/* ---------- Composants ---------- */
const DIFF = ['', 'Facile', 'Moyen', 'Difficile'];
function questCardHTML(q, locked) {
  const st = S().quests[q.id];
  return `<article class="quest ${st && st.done ? 'done' : ''}">
    <div class="quest-top"><span class="chip ${q.cat === 'principale' ? 'violet' : q.cat === 'orale' ? 'rose' : q.cat === 'toeic' ? 'blue' : ''}">${esc(QUEST_CATS[q.cat])}</span>${st && st.done ? `<span class="chip green">${icon('check', 14)} Réussie</span>` : ''}</div>
    <h3>${esc(q.title)}</h3>
    <p>${esc(q.objective)}</p>
    <dl class="meta"><div><dt>Durée</dt><dd>${q.mins} min</dd></div><div><dt>Compétence</dt><dd>${esc(L.SKILL_LABEL[q.skill])}</dd></div><div><dt>Difficulté</dt><dd>${DIFF[q.diff]}</dd></div><div><dt>Récompense</dt><dd>${q.xp} XP</dd></div></dl>
    <p class="crit">${icon('target', 14)} Réussite : ${Math.round(CRIT_QUEST * 100)} % de bonnes réponses${q.timed ? ` en ${q.timed} s` : ''}. Les erreurs sont corrigées à la fin.</p>
    ${st ? `<p class="muted">Meilleur score : ${st.best} % · ${pl(st.attempts, 'tentative')}</p>` : ''}
    <button class="btn ${st && st.done ? 'ghost' : 'primary'}" data-act="quest" data-id="${q.id}" ${locked ? 'disabled' : ''}>${locked ? icon('lock', 16) + ' Verrouillée' : st && st.done ? 'Rejouer' : 'Commencer'}</button>
  </article>`;
}
function skillMini(k) {
  const st = L.skillStage(S().skills[k]);
  return `<div class="skill-mini"><div class="row"><span>${esc(L.SKILL_LABEL[k])}</span><small>${esc(st.label)}${st.acc != null ? ' · ' + st.acc + ' %' : ''}</small></div>${bar(st.acc ?? 0, 's' + st.stage)}</div>`;
}
function weekDone() {
  const wk = L.isoWeek(L.today());
  return Object.entries(S().days).filter(([d, v]) => v.done && L.isoWeek(d) === wk).length;
}
function topErrors(n = 4) {
  const count = {};
  for (const e of S().errors.slice(-80)) for (const t of e.tags || []) if (t !== 'revision') count[t] = (count[t] || 0) + 1;
  return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function tagLabel(t) {
  if (TENSE_BY_ID[t]) return TENSE_BY_ID[t].name;
  const m = t.match(/^toeic-p(\d)$/); if (m) return PARTS[m[1]].name;
  const c = t.match(/^ch(\d)$/); if (c) return 'Chapitre ' + c[1];
  return t;
}
function tagLink(t) { return TENSE_BY_ID[t] ? `#/tense/${t}` : /^toeic/.test(t) ? '#/toeic' : '#/review'; }

/* ---------- Écrans ---------- */
const V = {};

V.welcome = () => `<section class="welcome">
  <div class="hero-art" aria-hidden="true"><svg viewBox="0 0 360 220" width="100%"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A263B"/><stop offset="1" stop-color="#1E1B2E"/></linearGradient></defs><rect width="360" height="220" fill="url(#sky)"/><circle cx="270" cy="60" r="26" fill="#FFD166" opacity=".9"/><path d="M0 220V150h30v-40h26v40h18V90h34v60h20v-30h28v30h24V70h40v80h22v-50h30v50h26v-30h30v100z" fill="#120F1D"/><g fill="#FFD166" opacity=".8"><rect x="84" y="104" width="6" height="8"/><rect x="96" y="120" width="6" height="8"/><rect x="190" y="90" width="6" height="8"/><rect x="204" y="110" width="6" height="8"/><rect x="262" y="118" width="6" height="8"/></g><path d="M40 210c60-30 120-40 280-20" stroke="#6C4CF1" stroke-width="3" fill="none" opacity=".7"/><circle cx="180" cy="196" r="6" fill="#FF6B9A"/></svg></div>
  <p class="kicker">Halden City</p>
  <h1 class="display">Lingua Quest</h1>
  <p class="lead">Dans cette ville, les Ombres volent le sens des mots. Chaque mot d’anglais que tu apprends devient une lumière. Prépare le TOEIC et apprends à parler, en jouant.</p>
  ${lockSave ? `<div class="notice">Tes données enregistrées sont illisibles. Elles ont été mises de côté sans être effacées. Va dans Profil pour les exporter avant de recommencer.</div>` : ''}
  <button class="btn primary big" data-act="go" data-r="create">Commencer l’aventure</button>
  <label class="btn ghost file">J’ai une sauvegarde<input type="file" accept="application/json,.json" data-act="importFile" hidden></label>
  <p class="hint">Tes données restent dans ce téléphone. Aucun compte n’est nécessaire.</p>
</section>`;

let draft = null;
V.create = () => {
  const s = S();
  if (!draft) draft = s.hero ? { ...s.hero } : { name: '', build: 2, skin: 2, hair: 0, hairColor: 0, face: 0, cls: 'explorateur' };
  const sw = (key, n, labels, colors) => `<div class="swatches" role="radiogroup">${Array.from({ length: n }, (_, k) => `<button role="radio" aria-checked="${draft[key] === k}" class="sw ${draft[key] === k ? 'on' : ''}" data-act="draft" data-k="${key}" data-v="${k}" ${colors ? `style="--sw:${colors[k]}" aria-label="${key === 'skin' ? 'Teint' : 'Couleur'} ${k + 1}"` : ''}>${colors ? '' : esc(labels[k])}</button>`).join('')}</div>`;
  return `<section class="create">
    <h1 class="display">CHOISIS TON DESTIN</h1>
    <p class="lead">Ton aventure. Ton héros. Ta progression.</p>
    <div class="preview" id="avatarPreview">${avatarSVG(draft, { outfit: 'outfit-start' }, 180, COSMETICS)}</div>
    <label class="field"><span>Nom de ton héros</span><input id="heroName" maxlength="20" value="${esc(draft.name)}" placeholder="Ex. Alex" autocomplete="off"></label>
    <h3>Apparence</h3>
    <p class="label">Silhouette</p>${sw('build', 3, BUILDS)}
    <p class="label">Teint</p>${sw('skin', 6, null, SKINS)}
    <p class="label">Coiffure</p>${sw('hair', 6, HAIR_STYLES)}
    <p class="label">Couleur des cheveux</p>${sw('hairColor', 6, null, HAIR_COLORS)}
    <p class="label">Expression</p>${sw('face', 3, FACES)}
    <p class="hint">L’apparence n’a aucun effet sur l’apprentissage. Tu débloqueras des tenues, des auras et des compagnons en jouant.</p>
    <h3>Classe</h3>
    <div class="classes">${Object.entries(CLASS_INFO).map(([k, c]) => `<button class="class-card ${draft.cls === k ? 'on' : ''}" data-act="draft" data-k="cls" data-v="${k}" style="--cc:${c.color}" aria-pressed="${draft.cls === k}">
      <b>${esc(c.name)}</b><span>${esc(c.desc)}</span><small>Pouvoir : ${esc(c.power)} · Quête bonus : ${esc(c.side)}</small></button>`).join('')}</div>
    <p class="hint">La classe change le style des épreuves et une quête secondaire. Elle ne donne aucun avantage sur les exercices d’anglais.</p>
    <button class="btn primary big" data-act="createDone">${s.hero ? 'Enregistrer' : 'Entrer dans Halden City'}</button>
  </section>`;
};

V.placement = () => `<section class="page"><h1 class="display sm">Évaluation initiale</h1>
  <p class="lead">12 questions, environ 5 minutes : vocabulaire, phrases simples, temps, lecture${ttsAvailable() ? ', écoute' : ''} et construction de phrases.</p>
  <p>Ce n’est pas un examen : il sert seulement à choisir la difficulté de tes premières quêtes. Tu pourras la changer à tout moment.</p>
  ${ttsAvailable() ? '' : '<div class="notice">L’audio n’est pas disponible sur cet appareil : les questions d’écoute passeront en mode texte.</div>'}
  <button class="btn primary big" data-act="placementStart">Commencer l’évaluation</button>
  <button class="btn ghost" data-act="placementSkip">Passer et commencer au niveau facile</button></section>`;

V['placement-result'] = () => {
  const p = S().placement;
  if (!p) return V.placement();
  return `<section class="page"><h1 class="display sm">Tes résultats</h1>
    <div class="card">${Object.entries(PLACEMENT_AREAS).map(([k, label]) => { const a = p.areas[k]; return a ? `<div class="row"><span>${esc(label)}</span><b>${a[0]}/${a[1]}</b></div>` : ''; }).join('')}</div>
    <p>Difficulté conseillée : <b>${DIFF[p.rec]}</b>. Elle évoluera ensuite selon tes vraies réponses.</p>
    <p class="hint">Si ça ne te ressemble pas, choisis toi-même :</p>
    <div class="seg">${[1, 2, 3].map(n => `<button class="${S().difficulty === n ? 'on' : ''}" data-act="setDiff" data-v="${n}">${DIFF[n]}</button>`).join('')}</div>
    <button class="btn primary big" data-act="go" data-r="home">C’est parti</button></section>`;
};

V.home = () => {
  const s = S(), h = s.hero, lvl = L.levelInfo(s.xp), ch = C.currentChapter(s), nm = nextMission();
  const streak = L.streakNow(s), due = L.srsDue(s).length, done = dailyDone();
  const errs = topErrors(3);
  const weekMins = Object.entries(s.days).filter(([d]) => L.isoWeek(d) === L.isoWeek(L.today())).reduce((a, [, v]) => a + v.mins, 0);
  const tl = s.toeic.parts;
  const acc = sk => { let a = 0, b = 0; for (const p of PART_IDS) if (PARTS[p].skill === sk && tl[p]) { a += tl[p].correct; b += tl[p].attempts; } return b ? Math.round((a / b) * 100) + ' %' : '—'; };
  return `<section class="page home">
    <div class="hero-row" data-act="go" data-r="hero">
      <div class="av">${avatarSVG(h, s.inventory.equipped, 84, COSMETICS)}</div>
      <div class="who"><b>${esc(h.name)}</b><span>${esc(CLASS_INFO[h.cls].name)} · niveau ${lvl.level}</span>${bar(lvl.pct, 'gold')}<small>${lvl.into} / ${lvl.need} XP</small></div>
    </div>
    <div class="stats-row">
      <div class="stat"><span class="flame">${icon('flame', 20)}</span><b>${streak}</b><small>jours de série</small></div>
      <div class="stat"><b>${weekDone()}/${s.settings.weeklyGoal}</b><small>sessions cette semaine</small></div>
      <div class="stat"><b>${weekMins}</b><small>min cette semaine</small></div>
    </div>
    <p class="hint">La série mesure ta régularité, pas ton niveau d’anglais. 1 jour manqué par semaine est couvert par un joker.</p>
    <article class="daily ${done ? 'done' : ''}">
      <span class="chip gold">${icon('clock', 14)} 20 min</span>
      <h2>${done ? 'Session du jour faite' : 'Session du jour'}</h2>
      <ol class="steps"><li>Réactivation <small>2 min</small></li><li>Donjon du TOEIC <small>7 min</small></li><li>Épreuve orale <small>8 min</small></li><li>Bilan <small>3 min</small></li></ol>
      <button class="btn ${done ? 'ghost' : 'primary'} big" data-act="daily">${done ? 'Refaire une session' : 'Commencer'}</button>
    </article>
    <article class="card chapter-card" style="--cc:${ch.color}" data-act="go" data-r="chapter/${ch.n}">
      <span class="kicker">Chapitre ${ch.n} · ${esc(ch.region)}</span><h2>${esc(ch.title)}</h2>
      <p>Prochaine étape : <b>${esc(nm.label)}</b></p>
    </article>
    <section class="card"><div class="card-head"><h3>Compétences</h3><a href="#/skills">Détails</a></div>${L.SKILLS.map(skillMini).join('')}</section>
    <section class="grid2">
      <a class="card tile" href="#/toeic"><small>TOEIC · réussite</small><b>Écoute ${acc('listening')}</b><b>Lecture ${acc('reading')}</b></a>
      <a class="card tile" href="#/review"><small>Vocabulaire</small><b>${L.srsRetained(s)} mots retenus</b><span>${pl(due, 'révision due', 'révisions dues')}</span></a>
    </section>
    ${errs.length ? `<section class="card"><h3>Erreurs récurrentes</h3>${errs.map(([t, n]) => `<a class="row link" href="${tagLink(t)}"><span>${esc(tagLabel(t))}</span><b>${n}</b></a>`).join('')}</section>` : ''}
  </section>`;
};

V.world = () => {
  const s = S();
  return `<section class="page"><h1 class="display sm">Carte du monde</h1><p class="lead">Halden City et ses régions. Une région s’ouvre quand tu bats le boss de la précédente : ce sont tes compétences qui comptent, pas le temps passé.</p>
  <div class="map">${CHAPTERS.map(ch => {
    const open = L.chapterUnlocked(s, ch.n), beaten = s.chapters[ch.n] && s.chapters[ch.n].bossBeaten;
    const doneQ = ch.quests.filter(q => s.quests[q.id] && s.quests[q.id].done).length;
    return `<button class="node ${open ? '' : 'locked'} ${beaten ? 'beaten' : ''}" style="--cc:${ch.color}" data-act="go" data-r="chapter/${ch.n}" ${open ? '' : 'aria-disabled="true"'}>
      <span class="num">${beaten ? icon('check', 20) : open ? ch.n : icon('lock', 18)}</span>
      <span class="txt"><b>${esc(ch.title)}</b><small>${esc(ch.region)} · ${open ? `${doneQ}/${ch.quests.length} quêtes${beaten ? ' · boss vaincu' : ''}` : 'Bats le boss précédent'}</small></span></button>`;
  }).join('')}</div>
  <p class="hint">La campagne est pensée pour environ 12 semaines à 20 minutes par jour, mais c’est une indication : tu avances à ton rythme réel.</p></section>`;
};

V.chapter = n => {
  const s = S(), ch = CHAPTERS.find(c => c.n === +n);
  if (!ch) return V.world();
  const open = L.chapterUnlocked(s, ch.n), c = s.chapters[ch.n] || {};
  const cq = s.hero && C.allQuests(s).find(q => q.id && q.id.startsWith('qc-') && q.ch === ch.n);
  return `<section class="page"><a class="back" href="#/world">${icon('back', 18)} Carte</a>
    <span class="kicker">Chapitre ${ch.n} · ${esc(ch.region)}</span><h1 class="display sm">${esc(ch.title)}</h1>
    <p class="lead">${esc(ch.intro)}</p><p><b>Objectifs :</b> ${esc(ch.goals)}</p>
    ${open ? '' : '<div class="notice">Région verrouillée : bats le boss du chapitre précédent pour y entrer.</div>'}
    <h2>Quêtes</h2>${ch.quests.map(q => questCardHTML({ ...q, ch: ch.n }, !open)).join('')}
    ${cq ? `<h2>Quête de ta classe</h2>${questCardHTML(cq, !open)}` : ''}
    <h2>Boss</h2>
    <article class="boss-card ${c.bossBeaten ? 'beaten' : ''}">
      <h3>${esc(ch.boss.name)}</h3><p>${esc(ch.boss.desc)}</p>
      <p class="crit">${icon('target', 14)} Victoire : ${Math.round(ch.boss.pass * 100)} % de bonnes réponses${ch.boss.toeicTest ? ` en ${ch.boss.toeicTest.seconds / 60} min` : ''}. En cas d’échec : corrections, quête de renforcement, et tu retentes quand tu veux.</p>
      <p class="muted">Récompense : ${ch.boss.reward.xp} XP · ${esc((COSMETICS.find(x => x.id === ch.boss.reward.item) || {}).name || '')}${c.bossTries ? ' · ' + pl(c.bossTries, 'tentative') : ''}</p>
      <p class="hint">Tu peux affronter le boss sans finir toutes les quêtes : si tu réussis, c’est que tu maîtrises déjà le chapitre.</p>
      <button class="btn ${c.bossBeaten ? 'ghost' : 'danger'}" data-act="boss" data-n="${ch.n}" ${open ? '' : 'disabled'}>${icon('sword', 18)} ${c.bossBeaten ? 'Rejouer le combat' : 'Affronter'}</button>
    </article></section>`;
};

V.quests = () => {
  const s = S(), all = C.allQuests(s);
  const groups = {};
  for (const q of all) { const open = L.chapterUnlocked(s, q.ch); if (!open) continue; (groups[q.cat] = groups[q.cat] || []).push(q); }
  const due = L.srsDue(s).length;
  return `<section class="page"><h1 class="display sm">Journal des quêtes</h1>
    <article class="quest"><span class="chip gold">${esc(QUEST_CATS.quotidienne)}</span><h3>Session du jour</h3><p>Réactivation, TOEIC, oral et bilan, en 20 minutes.</p>
      <dl class="meta"><div><dt>Durée</dt><dd>20 min</dd></div><div><dt>Compétences</dt><dd>Toutes</dd></div><div><dt>Récompense</dt><dd>30 XP + série</dd></div></dl>
      <p class="crit">${icon('target', 14)} Réussite : terminer la session.</p><button class="btn primary" data-act="daily">${dailyDone() ? 'Refaire' : 'Commencer'}</button></article>
    <article class="quest"><span class="chip">${esc(QUEST_CATS.revision)}</span><h3>Révisions</h3><p>${pl(due, 'élément dû', 'éléments dus')} + tes erreurs récentes.</p>
      <p class="crit">${icon('target', 14)} Objectif : retrouver sans aide ce que tu avais oublié.</p><a class="btn ghost" href="#/review">Ouvrir</a></article>
    <article class="quest"><span class="chip violet">${esc(QUEST_CATS.maitrise)}</span><h3>Quêtes de maîtrise</h3><p>Prouve que tu sais utiliser un temps sans aide (85 % requis). Dans l’Académie.</p><a class="btn ghost" href="#/academy">Ouvrir l’Académie</a></article>
    ${['principale', 'orale', 'toeic', 'secondaire'].map(cat => groups[cat] ? `<h2>${esc(QUEST_CATS[cat])}s</h2>` + groups[cat].map(q => questCardHTML(q, false)).join('') : '').join('')}
  </section>`;
};

V.learn = () => {
  const due = L.srsDue(S()).length;
  const tile = (r, ic, t, d) => `<a class="card tile big" href="#/${r}">${icon(ic, 26)}<b>${t}</b><small>${d}</small></a>`;
  return `<section class="page"><h1 class="display sm">Apprendre</h1><div class="grid2">
    ${tile('academy', 'learn', 'Académie des temps', '9 fiches complètes')}
    ${tile('review', 'repeat', 'Révisions', pl(due, 'élément dû', 'éléments dus'))}
    ${tile('oral', 'mic', 'Entraînement oral', 'Écouter, répéter, répondre')}
    ${tile('toeic', 'target', 'Progression TOEIC', 'Parties 2 à 7')}
    ${tile('skills', 'tree', 'Arbre de compétences', '5 branches')}
    ${tile('stats', 'chart', 'Résultats et statistiques', 'Ton suivi')}
    ${tile('quests', 'map', 'Journal des quêtes', 'Toutes tes missions')}
    ${tile('codex', 'codex', 'Codex anglais', 'Dictionnaire et décodeur')}
  </div></section>`;
};

V.academy = () => `<section class="page"><h1 class="display sm">Académie des temps</h1>
  <p class="lead">Chaque fiche explique le temps en français, sa construction, ses pièges, et se termine par une mission orale et une quête de maîtrise.</p>
  <div class="list">${TENSES.map(t => { const st = L.tenseStatus(S(), t.id); return `<a class="list-item" href="#/tense/${t.id}"><span class="en">${esc(t.name)}</span><small>${esc(t.fr)}</small><span class="chip ${st.mastered ? 'green' : ''}">${esc(st.label)}</span></a>`; }).join('')}</div></section>`;

V.tense = id => { const t = TENSE_BY_ID[id]; return t ? `<section class="page"><a class="back" href="#/academy">${icon('back', 18)} Académie</a>${tenseHTML(t, { page: true })}</section>` : V.academy(); };

let codexState = { tab: 'dico', q: '', cat: '' };
V.codex = tab => { if (tab) codexState.tab = tab; return `<section class="page"><h1 class="display sm">Codex anglais</h1>${codexHTML(codexState.tab, codexState.q, codexState.cat)}</section>`; };

V.skills = () => {
  const s = S();
  const rec = { listening: ['toeic', 'Partie 2 à 4 du TOEIC'], reading: ['toeic', 'Parties 5 à 7 du TOEIC'], speaking: ['oral', 'Entraînement oral'], grammar: ['academy', 'Académie des temps'], reflexes: ['quests', 'Quêtes de construction de phrases'] };
  const steps = ['Découverte', 'En apprentissage', 'Consolidé', 'Solide'];
  return `<section class="page"><h1 class="display sm">Arbre de compétences</h1>
    <p class="lead">Chaque branche avance seulement avec tes vraies réponses. Les critères sont affichés : pas de niveau inventé.</p>
    ${L.SKILLS.map(k => { const st = L.skillStage(s.skills[k]), sk = s.skills[k]; return `<article class="card tree">
      <h3>${esc(L.SKILL_LABEL[k])}</h3>
      <ol class="tree-steps">${steps.map((l, i) => `<li class="${i <= st.stage ? 'on' : ''}">${esc(l)}</li>`).join('')}</ol>
      <p class="muted">${pl(sk.attempts, 'réponse')} · ${pl(sk.correct, 'réussie')} · réussite récente : ${st.acc != null ? st.acc + ' %' : '—'}</p>
      <p class="hint">${esc(st.rule)}</p>
      ${k === 'grammar' ? `<div class="tense-mini">${TENSES.map(t => `<a href="#/tense/${t.id}" class="chip as-btn ${L.tenseStatus(s, t.id).mastered ? 'green' : ''}">${esc(t.name)} · ${esc(L.tenseStatus(s, t.id).label)}</a>`).join('')}</div>` : ''}
      <a class="btn ghost" href="#/${rec[k][0]}">Mission conseillée : ${esc(rec[k][1])}</a></article>`; }).join('')}
  </section>`;
};

V.hero = () => {
  const s = S(), h = s.hero, c = CLASS_INFO[h.cls], lvl = L.levelInfo(s.xp), ch = C.currentChapter(s);
  return `<section class="page center"><div class="big-av">${avatarSVG(h, s.inventory.equipped, 200, COSMETICS)}</div>
    <h1 class="display sm">${esc(h.name)}</h1><p class="lead">${esc(c.name)} · Pouvoir : ${esc(c.power)}</p>
    <div class="card"><div class="row"><span>Niveau</span><b>${lvl.level}</b></div>${bar(lvl.pct, 'gold')}<div class="row"><span>XP totale</span><b>${s.xp}</b></div>
      <div class="row"><span>Chapitre</span><b>${ch.n} · ${esc(ch.title)}</b></div><div class="row"><span>Meilleure série</span><b>${pl(s.streak.best || 0, 'jour')}</b></div></div>
    <p class="hint">Le niveau du héros récompense ta participation. Il ne mesure pas ton anglais : pour ça, regarde l’arbre de compétences.</p>
    <h2>Badges</h2><div class="badges">${Object.entries(BADGES).map(([k, v]) => `<span class="badge ${s.badges.includes(k) ? 'on' : ''}">${icon(s.badges.includes(k) ? 'star' : 'lock', 16)} ${esc(v)}</span>`).join('')}</div>
    <div class="actions"><a class="btn primary" href="#/inventory">${icon('bag', 18)} Inventaire</a><button class="btn ghost" data-act="go" data-r="create">Modifier l’apparence</button></div></section>`;
};

V.inventory = () => {
  const s = S(), inv = s.inventory;
  const kinds = { outfit: 'Tenues', aura: 'Auras', companion: 'Compagnons', form: 'Formes évoluées' };
  return `<section class="page"><a class="back" href="#/hero">${icon('back', 18)} Héros</a><h1 class="display sm">Inventaire</h1>
    <div class="center">${avatarSVG(s.hero, inv.equipped, 150, COSMETICS)}</div>
    ${Object.entries(kinds).map(([k, label]) => `<h2>${label}</h2><div class="list">${COSMETICS.filter(c => c.kind === k).map(c => {
      const has = inv.owned.includes(c.id) || c.id === 'outfit-start', on = inv.equipped[k] === c.id;
      return `<div class="list-item inv ${has ? '' : 'locked'}"><span>${esc(c.name)}</span><small>${has ? (on ? 'Équipé' : 'Disponible') : 'À débloquer : ' + esc(c.unlock)}</small>
        ${has ? `<button class="btn ${on ? 'ghost' : 'primary'} sm" data-act="equip" data-kind="${k}" data-id="${c.id}">${on ? (k === 'outfit' ? 'Porté' : 'Retirer') : 'Équiper'}</button>` : icon('lock', 18)}</div>`;
    }).join('')}</div>`).join('')}
    <p class="hint">Ces objets sont purement visuels. Ils ne remplacent jamais une compétence.</p></section>`;
};

V.stats = () => {
  const s = S();
  const days = Array.from({ length: 14 }, (_, k) => L.addDays(L.today(), k - 13));
  const max = Math.max(20, ...days.map(d => (s.days[d] || {}).mins || 0));
  const totalMin = Object.values(s.days).reduce((a, v) => a + (v.mins || 0), 0);
  return `<section class="page"><h1 class="display sm">Résultats et statistiques</h1>
    <section class="card"><h3>Temps d’entraînement (14 derniers jours)</h3>
      <div class="chart" role="img" aria-label="Minutes par jour sur 14 jours">${days.map(d => { const m = (s.days[d] || {}).mins || 0; return `<div class="col"><span style="height:${(m / max) * 100}%" class="${(s.days[d] || {}).done ? 'done' : ''}"></span><small>${d.slice(8)}</small></div>`; }).join('')}</div>
      <p class="muted">Total : ${Math.floor(totalMin / 60)} h ${totalMin % 60} min · ${pl(s.sessions.length, 'session complète', 'sessions complètes')} · objectif : ${s.settings.weeklyGoal} par semaine</p></section>
    <section class="card"><h3>Réussite par compétence</h3>${L.SKILLS.map(k => { const sk = s.skills[k]; return `<div class="row"><span>${esc(L.SKILL_LABEL[k])}</span><b>${sk.attempts ? Math.round((sk.correct / sk.attempts) * 100) + ' %' : '—'}</b><small>${sk.attempts} rép.</small></div>`; }).join('')}</section>
    <section class="card"><h3>Vocabulaire</h3><div class="row"><span>Mots et verbes suivis</span><b>${Object.keys(s.srs).length}</b></div><div class="row"><span>Retenus (révisés avec succès plusieurs fois)</span><b>${L.srsRetained(s)}</b></div></section>
    <section class="card"><h3>Erreurs récurrentes</h3>${topErrors(6).map(([t, n]) => `<a class="row link" href="${tagLink(t)}"><span>${esc(tagLabel(t))}</span><b>${n}</b></a>`).join('') || '<p class="muted">Pas encore assez de données.</p>'}</section>
    <section class="card"><h3>Dernières erreurs</h3>${s.errors.slice(-6).reverse().map(e => `<div class="err"><p>${esc(e.q)}</p><p>Ta réponse : <span class="ko-t">${esc(e.given)}</span> · attendu : <b class="en">${esc(e.expected)}</b></p></div>`).join('') || '<p class="muted">Aucune erreur enregistrée.</p>'}</section>
  </section>`;
};

V.toeic = () => {
  const s = S(), w = L.weakestPart(s, PART_IDS);
  return `<section class="page"><h1 class="display sm">Progression TOEIC</h1>
    <div class="notice">Les questions sont des entraînements originaux au format du TOEIC Listening & Reading, pas des questions officielles. Lingua Quest ne calcule pas de score TOEIC : seul le test officiel en donne un. Tu vois ici ta réussite réelle par partie. La partie 1 (photographies) arrive dans une prochaine version.</div>
    <section class="card">${PART_IDS.map(p => { const st = s.toeic.parts[p]; return `<div class="part-row"><div><b>${esc(PARTS[p].name)}</b><small>${st ? st.correct + '/' + st.attempts + ' · récent ' + L.accuracy(st.recent) + ' %' : 'Pas encore travaillée'}</small>${bar(st ? L.accuracy(st.recent) : 0, PARTS[p].skill === 'listening' ? 'blue' : 'violet')}</div><button class="btn ghost sm" data-act="toeicPart" data-p="${p}">S’entraîner</button></div>`; }).join('')}</section>
    <p>Partie à travailler en priorité : <b>${esc(PARTS[w].name)}</b></p>
    <article class="card"><h3>Simulation chronométrée</h3><p>12 questions, écoute et lecture mélangées, 10 minutes. Bilan par partie à la fin.</p><button class="btn primary" data-act="toeicTest">${icon('clock', 18)} Lancer la simulation</button></article>
    <section class="card"><h3>Historique des tests</h3>${s.toeic.tests.slice(-8).reverse().map(t => `<div class="row"><span>${esc(t.d)}</span><b>${t.ok}/${t.total}</b><small>${Math.floor(t.seconds / 60)} min ${t.seconds % 60} s</small></div>`).join('') || '<p class="muted">Aucun test pour l’instant.</p>'}</section>
  </section>`;
};

V.oral = () => {
  const tts = ttsAvailable(), stt = sttAvailable();
  return `<section class="page"><h1 class="display sm">Entraînement oral</h1>
    <section class="card"><h3>Sur cet appareil</h3>
      <div class="row"><span>Écoute des phrases (voix du navigateur)</span><b class="${tts ? 'ok-t' : 'ko-t'}">${tts ? 'Disponible' + (voiceCount() ? ' · ' + pl(voiceCount(), 'voix anglaise', 'voix anglaises') : '') : 'Indisponible'}</b></div>
      <div class="row"><span>Micro (reconnaissance vocale)</span><b class="${stt ? 'ok-t' : 'ko-t'}">${stt ? 'Disponible' : 'Indisponible : mode texte'}</b></div>
      <p class="hint">La reconnaissance vocale vérifie les mots compris. Elle n’analyse pas ton accent : Lingua Quest ne prétend pas le noter. ${stt ? '' : 'Sur iPhone, elle peut ne pas marcher dans l’appli installée : essaie dans Safari.'}</p>
      ${tts ? `<button class="btn ghost" data-act="testVoice">${icon('speaker', 18)} Tester la voix</button>` : ''}</section>
    <article class="card"><h3>Séance orale</h3><p>6 exercices : écouter, répéter, construire une phrase, répondre librement.</p><button class="btn primary" data-act="oralRun">${icon('mic', 18)} Commencer</button></article>
    <h2>Missions orales des temps</h2><div class="list">${TENSES.map(t => `<button class="list-item" data-act="tenseOral" data-id="${t.id}"><span class="en">${esc(t.name)}</span><small>${esc(t.oral.prompt)}</small></button>`).join('')}</div></section>`;
};

V.review = () => {
  const s = S(), due = L.srsDue(s);
  const items = Object.entries(s.srs).sort((a, b) => (a[1].due < b[1].due ? -1 : 1));
  const name = id => id.startsWith('v:') ? (VOCAB_BY_ID[id.slice(2)] || {}).en : (C.IRR_BY_ID[id.slice(2)] || {}).inf;
  return `<section class="page"><h1 class="display sm">Révisions</h1>
    <p class="lead">Révision espacée : un mot réussi revient de plus en plus tard (1, 3, 7, 14, 30 jours…). Un mot raté revient dès le lendemain.</p>
    <article class="card"><h3>${pl(due.length, 'élément dû', 'éléments dus')} aujourd’hui</h3><p>Plus les exercices que tu as ratés récemment.</p><button class="btn primary" data-act="reviewRun">${icon('repeat', 18)} Réviser</button></article>
    <article class="card"><h3>Verbes irréguliers</h3><p>Ajoute 5 verbes à ta liste de révision.</p><button class="btn ghost" data-act="addIrr">${icon('plus', 18)} Ajouter 5 verbes</button></article>
    <section class="card"><h3>Ta liste (${items.length})</h3>${items.slice(0, 60).map(([id, e]) => `<div class="row"><span class="en">${esc(name(id) || id)}</span><small>${e.due <= L.today() ? 'à revoir' : 'le ' + esc(e.due.slice(8) + '/' + e.due.slice(5, 7))}</small><b>${'●'.repeat(Math.min(6, e.box))}${'○'.repeat(Math.max(0, 6 - e.box))}</b></div>`).join('') || '<p class="muted">Ta liste est vide : elle se remplit avec les mots des quêtes et ceux que tu ajoutes depuis le Codex.</p>'}</section></section>`;
};

V.profile = () => {
  const s = S(), st = s.settings;
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(st[key]) === String(v) ? 'on' : ''}" data-act="set" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  return `<section class="page"><h1 class="display sm">Profil et paramètres</h1>
    <section class="card"><h3>Affichage</h3><p class="label">Thème</p>${seg('theme', [['dark', 'Sombre'], ['light', 'Clair'], ['auto', 'Automatique']])}
      <p class="label">Aide en français</p>${seg('fr', [['beaucoup', 'Beaucoup'], ['moyen', 'Sur demande'], ['peu', 'Peu']])}
      <p class="hint">« Beaucoup » affiche la traduction des dialogues. Réduis-la quand tu te sens prêt : plus d’anglais, plus de progrès.</p></section>
    <section class="card"><h3>Son</h3><p class="label">Vitesse de la voix</p>${seg('rate', [['0.75', 'Lente'], ['0.9', 'Normale'], ['1', 'Rapide']])}
      <p class="label">Bruitages</p>${seg('sound', [['true', 'Activés'], ['false', 'Coupés']])}</section>
    <section class="card"><h3>Parcours</h3><p class="label">Difficulté actuelle (elle s’adapte aussi toute seule)</p><div class="seg">${[1, 2, 3].map(n => `<button class="${s.difficulty === n ? 'on' : ''}" data-act="setDiff" data-v="${n}">${DIFF[n]}</button>`).join('')}</div>
      <p class="label">Objectif de sessions par semaine</p>${seg('weeklyGoal', [[3, '3'], [5, '5'], [7, '7']])}
      <button class="btn ghost" data-act="go" data-r="placement">Refaire l’évaluation initiale</button></section>
    <section class="card"><h3>Sauvegarde</h3><p>Tes données restent dans ce téléphone. Exporte-les régulièrement pour ne rien perdre.</p>
      ${lockSave ? `<div class="notice">Des données illisibles ont été mises de côté. Exporte-les avant de continuer.</div><button class="btn ghost" data-act="exportBad">Exporter les données illisibles</button>` : ''}
      <button class="btn primary" data-act="export">Télécharger ma sauvegarde</button>
      <label class="btn ghost file">Importer une sauvegarde<input type="file" accept="application/json,.json" data-act="importFile" hidden></label>
      <button class="btn danger" data-act="reset">Tout effacer</button></section>
    <section class="card"><h3>Ce qui fonctionne vraiment</h3><ul class="honest">
      <li>Exercices, corrections, XP, niveaux, boss, révisions espacées, sauvegarde locale : opérationnels.</li>
      <li>Écoute : voix de synthèse du navigateur (${ttsAvailable() ? 'disponible ici' : 'indisponible ici, mode texte'}).</li>
      <li>Micro : reconnaissance vocale du navigateur (${sttAvailable() ? 'disponible ici' : 'indisponible ici, mode texte'}), qui vérifie les mots, pas l’accent.</li>
      <li>Pas de compte ni de synchronisation en ligne dans cette version.</li>
      <li>Pas de score TOEIC estimé : seulement ta réussite réelle par partie.</li></ul></section></section>`;
};

/* ---------- Routeur ---------- */
const NAV = [['home', 'home', 'Accueil'], ['world', 'map', 'Monde'], ['learn', 'learn', 'Apprendre'], ['codex', 'codex', 'Codex'], ['profile', 'user', 'Profil']];
const NAV_OF = { chapter: 'world', quests: 'learn', academy: 'learn', tense: 'learn', skills: 'learn', stats: 'learn', toeic: 'learn', oral: 'learn', review: 'learn', hero: 'home', inventory: 'home' };
function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  return { name: parts[0] || '', arg: parts[1] };
}
function render() {
  const s = S();
  let { name, arg } = parse();
  if (name === 'daily') { location.replace('#/home'); setTimeout(runDaily, 0); return; }
  if (!s.hero && !['welcome', 'create'].includes(name)) name = 'welcome';
  if (s.hero && (name === '' || name === 'welcome')) name = s.placement ? 'home' : 'placement';
  if (!V[name]) name = 'home';
  const app = document.getElementById('app');
  app.innerHTML = V[name](arg);
  const showNav = s.hero && !['welcome', 'create'].includes(name);
  const nav = document.getElementById('nav');
  nav.hidden = !showNav;
  const cur = NAV_OF[name] || name;
  nav.innerHTML = NAV.map(([r, ic, l]) => `<a href="#/${r}" class="${cur === r ? 'on' : ''}" ${cur === r ? 'aria-current="page"' : ''}>${icon(ic, 22)}<span>${l}</span></a>`).join('');
  const search = app.querySelector('#codexSearch');
  if (search) search.oninput = () => { codexState.q = search.value; app.querySelector('#codexList').innerHTML = wordListHTML(search.value, codexState.cat); };
  const nameIn = app.querySelector('#heroName');
  if (nameIn) nameIn.oninput = () => { draft.name = nameIn.value; };
  if (!isRunning()) window.scrollTo(0, 0);
}

/* ---------- Actions ---------- */
function onAction(act, b) {
  const s = S();
  switch (act) {
    case 'go': return ctx.go(b.dataset.r);
    case 'draft': {
      const k = b.dataset.k, v = k === 'cls' ? b.dataset.v : +b.dataset.v;
      draft[k] = v;
      return render();
    }
    case 'createDone': {
      const nm = (document.getElementById('heroName').value || '').trim();
      if (!nm) { toast('Donne un nom à ton héros.'); return document.getElementById('heroName').focus(); }
      draft.name = nm;
      const first = !s.hero;
      s.hero = { ...draft };
      draft = null;
      if (first) { s.inventory.owned = ['outfit-start']; s.inventory.equipped = { outfit: 'outfit-start' }; }
      save();
      return ctx.go(first ? 'placement' : 'hero');
    }
    case 'placementStart': return runPlacement();
    case 'placementSkip': s.placement = { d: L.today(), areas: {}, pct: null, rec: 1, skipped: true }; s.difficulty = 1; save(); return ctx.go('home');
    case 'setDiff': s.difficulty = +b.dataset.v; s.recent = []; save(); return render();
    case 'daily': return runDaily();
    case 'quest': { const q = C.questById(s, b.dataset.id); if (q) runQuest(q); return; }
    case 'boss': { const ch = CHAPTERS.find(c => c.n === +b.dataset.n); if (ch) runBoss(ch); return; }
    case 'tensePractice': { const t = TENSE_BY_ID[b.dataset.id]; return simpleRun(C.masteryCards(t).concat([]), 'Entraînement · ' + t.name, 'practice'); }
    case 'tenseOral': { const t = TENSE_BY_ID[b.dataset.id]; return simpleRun([{ kind: 'item', item: C.tenseOralItem(t) }], 'Mission orale · ' + t.name, 'oral'); }
    case 'tenseMastery': return runTenseMastery(TENSE_BY_ID[b.dataset.id]);
    case 'reviewRun': return simpleRun(C.reviewCards(s), 'Révisions', 'review');
    case 'addIrr': {
      const fresh = C.IRR_BY_ID ? Object.keys(C.IRR_BY_ID).filter(id => !s.srs['i:' + id]).slice(0, 5) : [];
      fresh.forEach(id => L.srsAdd(s, 'i:' + id));
      save(); toast(fresh.length ? pl(fresh.length, 'verbe ajouté', 'verbes ajoutés') : 'Tous les verbes sont déjà dans ta liste.');
      return render();
    }
    case 'oralRun': return simpleRun(C.oralItems(s, 6).map(item => ({ kind: 'item', item })), 'Séance orale', 'oral');
    case 'testVoice': return speak('Hello! Welcome to Halden City.', { rate: s.settings.rate });
    case 'toeicPart': { const p = +b.dataset.p; return simpleRun(C.toeicItems(s, [p], 5).map(item => ({ kind: 'item', item })), PARTS[p].name, 'toeic'); }
    case 'toeicTest': return runToeicTest();
    case 'equip': {
      const k = b.dataset.kind, id = b.dataset.id, eq = s.inventory.equipped;
      if (eq[k] === id) { if (k !== 'outfit') delete eq[k]; } else eq[k] = id;
      save(); return render();
    }
    case 'set': {
      const k = b.dataset.k; let v = b.dataset.v;
      if (k === 'rate') v = +v; if (k === 'weeklyGoal') v = +v; if (k === 'sound') v = v === 'true';
      s.settings[k] = v; save(); applyTheme(); return render();
    }
    case 'export': return download('lingua-quest-' + L.today() + '.json', JSON.stringify(s, null, 1));
    case 'exportBad': return download('lingua-quest-illisible-' + L.today() + '.json', lsGet(KEY_BAD) || '');
    case 'reset':
      if (!confirm('Effacer toute ta progression sur ce téléphone ? Pense à exporter une sauvegarde avant.')) return;
      if (!confirm('Vraiment tout effacer ? Cette action est définitive.')) return;
      ctx.S = L.newState(); lockSave = false; save(); draft = null; applyTheme(); return ctx.go('welcome');
    case 'codexTab': codexState = { tab: b.dataset.tab, q: '', cat: '' }; return render();
    case 'codexCat': codexState.cat = b.dataset.cat; return render();
    default: handleCodexAct(act, b, false);
  }
}
function download(name, text) {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Sauvegarde téléchargée : vérifie qu’elle est bien dans tes fichiers.');
  } catch (e) { toast('Téléchargement impossible sur cet appareil.'); }
}
function importFile(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  if (f.size > 5e6) { toast('Fichier trop gros pour être une sauvegarde.'); input.value = ''; return; }
  const r = new FileReader();
  r.onload = () => {
    let n;
    try { n = L.sanitize(JSON.parse(String(r.result || ''))); } catch (e) { toast('Ce fichier n’est pas une sauvegarde Lingua Quest. Rien n’a changé.'); return; }
    if (!n.hero) { toast('Cette sauvegarde ne contient pas de héros. Rien n’a changé.'); return; }
    if (S().hero && !confirm('Remplacer ta progression actuelle par cette sauvegarde (' + n.hero.name + ', ' + n.xp + ' XP) ?')) return;
    ctx.S = n; lockSave = false; save(); applyTheme(); toast('Sauvegarde restaurée.'); ctx.go('home'); render();
  };
  r.onerror = () => toast('Impossible de lire ce fichier.');
  r.readAsText(f);
  input.value = '';
}

/* ---------- Démarrage ---------- */
document.getElementById('app').addEventListener('click', e => {
  const b = e.target.closest('[data-act], .w');
  if (!b) return;
  if (b.classList.contains('w')) return openWordSheet(b.dataset.w);
  if (b.tagName === 'INPUT') return;
  if (b.closest('[aria-disabled="true"]')) return toast('Région verrouillée : bats le boss précédent.');
  e.preventDefault();
  onAction(b.dataset.act, b);
});
document.addEventListener('change', e => { if (e.target.matches('input[data-act="importFile"]')) importFile(e.target); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('sheet').hidden) closeSheet(); });
window.addEventListener('hashchange', () => { closeSheet(); render(); });
matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);
applyTheme();
checkUnlocks();
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

/* pour les tests automatisés */
window.__LQ = { ctx, L, current: currentCard };
