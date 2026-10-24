/* Moteur de jeu : fait jouer une suite de cartes (quête, session, boss, évaluation…) puis affiche le bilan. */
import { ctx } from './ctx.js';
import { esc, icon, portrait, bar, toast, pl } from './ui.js';
import { recordAnswer, recordToeic, checkTyped, wordMatch, normalize, shuffle, levelInfo, srsReview, SKILL_LABEL, today } from './logic.js';
import { speak, speakLines, stopSpeaking, ttsAvailable, sttAvailable, listen, stopListening, STT_ERRORS, sfx } from './audio.js';
import { VOCAB_BY_ID, DECODE_BY_ID } from '../data/codex.js';
import { DIALOGUES, CHARACTERS, DIALOGUE_ART } from '../data/world.js';
import { TENSE_BY_ID } from '../data/tenses.js';
import { PARTS } from '../data/toeic.js';
import { IRR_BY_ID, learnWord } from './content.js';
import { openWordSheet, openTenseSheet, openDecodeSheet, openCodexSheet, wordEntryHTML } from './codexview.js';

let R = null;
const layer = () => document.getElementById('play');

/* ---------- Démarrage ---------- */
/* opts : { mode, title, subtitle, noHelp, seconds, boss: { name, pass }, pass, onDone(summary) → infos de bilan } */
export function startRun(cards, opts) {
  stopSpeaking();
  const S = ctx.S;
  R = {
    cards: cards.filter(Boolean), i: 0, results: [], opts, t0: Date.now(), xp0: S.xp, lvl0: levelInfo(S.xp).level,
    learned: [], reviewed: [], cur: null, dl: 0, ended: false, combo: 0
  };
  if (opts.boss) {
    const n = R.cards.length;
    R.allowed = n - Math.ceil(n * opts.boss.pass);
    R.hearts = R.allowed + 1;
  }
  if (opts.seconds) {
    R.deadline = Date.now() + opts.seconds * 1000;
    R.timer = setInterval(tick, 500);
  }
  const el = layer();
  el.hidden = false;
  document.body.classList.add('playing');
  render();
}

function tick() {
  if (!R || R.ended) return;
  const left = Math.max(0, Math.round((R.deadline - Date.now()) / 1000));
  const t = document.getElementById('runTimer');
  if (t) { t.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); t.classList.toggle('urgent', left <= 30); }
  if (left <= 0) { sfx('time'); finish('time'); }
}

function closeRun() {
  stopSpeaking(); stopListening();
  if (R && R.timer) clearInterval(R.timer);
  R = null;
  const el = layer();
  el.hidden = true;
  el.className = 'play';
  el.innerHTML = '';
  document.body.classList.remove('playing');
}

/* ---------- Rendu ---------- */
function header() {
  const n = R.cards.length, pct = n ? (R.i / n) * 100 : 0;
  const boss = R.opts.boss;
  return `<header class="run-head">
    <button class="icon-btn" data-act="quit" aria-label="Quitter">${icon('x')}</button>
    <div class="run-title"><span>${esc(R.opts.title)}</span>${bar(pct, 'thin')}</div>
    ${R.opts.seconds ? `<span id="runTimer" class="timer">${icon('clock', 16)} --:--</span>` : ''}
    ${R.opts.noHelp ? '' : `<button class="icon-btn" data-act="codex" aria-label="Ouvrir le Codex">${icon('codex')}</button>`}
  </header>
  ${boss ? `<div class="boss-bar"><div><b>${esc(boss.name)}</b>${bar(100 - ((R.results.filter(r => r.ok).length) / n) * 100, 'danger')}</div>
    <div class="hearts" aria-label="${R.hearts} vies restantes">${Array.from({ length: R.allowed + 1 }, (_, k) => `<span class="${k < R.hearts ? 'on' : ''}">${icon('heart', 18)}</span>`).join('')}</div></div>` : ''}`;
}

function render() {
  if (!R) return;
  if (R.i >= R.cards.length) return finish('done');
  const card = R.cards[R.i];
  R.cur = { card, answered: false };
  /* décor : illustration du dialogue, sinon celle de la mission ou du boss */
  const bg = card.kind === 'dialogue' ? (DIALOGUE_ART[card.id] || R.opts.bg) : R.opts.bg;
  const el = layer();
  el.classList.toggle('scene-on', !!bg);
  el.classList.toggle('dialogue-on', card.kind === 'dialogue');
  el.classList.toggle('boss-on', !!R.opts.boss);
  el.style.setProperty('--scene', bg ? `url(${bg})` : 'none');
  el.style.setProperty('--hue', (R.opts.hue || 0) + 'deg');
  let body = '';
  if (card.kind === 'stage') body = stageHTML(card);
  else if (card.kind === 'dialogue') { R.dl = 0; body = dialogueHTML(card); }
  else if (card.kind === 'learn') body = learnHTML(card);
  else if (card.kind === 'recall') body = recallHTML(card);
  else body = itemHTML(card.item);
  layer().innerHTML = header() + `<main class="run-body" id="runBody">${body}</main><footer class="run-foot" id="runFoot">${footInitial(card)}</footer>`;
  bindCard(card);
  if (R.opts.seconds) tick();
  const h = layer().querySelector('.run-body h2, .run-body .prompt');
  if (h) h.setAttribute('tabindex', '-1');
}

function footInitial(card) {
  if (card.kind === 'stage') return `<button class="btn primary" data-act="next">Commencer</button>`;
  if (card.kind === 'learn') return `<button class="btn primary" data-act="next">J’ai compris, continuer</button>`;
  if (card.kind === 'dialogue' || card.kind === 'recall') return '';
  const it = card.item;
  if (it.type === 'type') return `<button class="btn primary" data-act="checkType">Valider</button>`;
  if (it.type === 'order') return `<button class="btn ghost" data-act="orderReset">Effacer</button><button class="btn primary" data-act="checkOrder" disabled>Valider</button>`;
  if (it.type === 'speak') return `<button class="btn ghost" data-act="skipSpeak">Passer</button>`;
  return '';
}

/* --- Étapes --- */
function stageHTML(c) {
  return `<section class="stage-card"><span class="chip gold">${icon('clock', 14)} ${c.mins} min</span><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p></section>`;
}

/* --- Phrase anglaise cliquable (chaque mot ouvre le Codex) --- */
export function clickable(en) {
  return String(en).split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok)) return tok;
    const m = tok.match(/^([“"(]*)([A-Za-z’'\-]+)([^A-Za-z’'\-]*)$/);
    if (!m) return esc(tok);
    return `<span class="wt">${esc(m[1])}<button class="w" data-w="${esc(m[2])}">${esc(m[2])}</button>${esc(m[3])}</span>`;
  }).join('');
}

/* --- Dialogues --- */
function dialogueHTML(card) {
  const lines = DIALOGUES[card.id] || [];
  const show = lines.slice(0, R.dl + 1);
  const frMode = ctx.S.settings.fr;
  const html = show.map((ln, k) => {
    if (!Array.isArray(ln)) {
      const done = R.cur.choice && R.cur.choice.k === k;
      return `<div class="choice-block"><p class="prompt">${esc(ln.choice)}</p>
        <div class="options">${ln.options.map((o, j) => `<button class="opt ${done ? (o[1] ? 'good' : (R.cur.choice.j === j ? 'bad' : '')) : ''}" data-act="dlgChoice" data-k="${k}" data-j="${j}" ${done ? 'disabled' : ''}>${esc(o[0])}</button>`).join('')}</div>
        ${done ? `<p class="fb ${ln.options[R.cur.choice.j][1] ? 'ok' : 'ko'}">${esc(ln.options[R.cur.choice.j][2])}</p>` : ''}</div>`;
    }
    const [who, en, fr, dec] = ln;
    const ch = CHARACTERS[who] || CHARACTERS.hero;
    return `<div class="line ${who === 'shadow' ? 'enemy' : ''}">${portrait(ch, 40)}<div class="bubble">
      <span class="who">${esc(ch.name)}</span>
      <p class="en">${clickable(en)}</p>
      <details class="fr" ${frMode === 'beaucoup' ? 'open' : ''}><summary>Traduction</summary><p>${esc(fr)}</p></details>
      <div class="line-actions"><button class="mini" data-act="sayLine" data-k="${k}">${icon('speaker', 16)} Écouter</button>
      ${dec ? `<button class="mini" data-act="decode" data-id="${dec}">${icon('eye', 16)} Décoder</button>` : ''}</div>
    </div></div>`;
  }).join('');
  return `<section class="dialogue"><p class="hint">Touche un mot anglais pour l’ouvrir dans le Codex.</p>${html}</section>`;
}
function dialogueFoot(card) {
  const lines = DIALOGUES[card.id] || [];
  const ln = lines[R.dl];
  if (ln && !Array.isArray(ln) && !(R.cur.choice && R.cur.choice.k === R.dl)) return '';
  if (R.dl >= lines.length - 1) return `<button class="btn primary" data-act="next">Continuer</button>`;
  return `<button class="btn primary" data-act="dlgNext">Suite</button>`;
}

/* --- Apprendre un mot --- */
function learnHTML(card) {
  const v = VOCAB_BY_ID[card.id];
  learnWord(ctx.S, 'v:' + v.id);
  if (!R.learned.includes(v.id)) R.learned.push(v.id);
  ctx.save();
  return `<section class="learn"><span class="chip violet">Nouveau mot · ajouté à tes révisions</span>${wordEntryHTML(v, { compact: false, noAdd: true })}</section>`;
}

/* --- Réactivation (mot ou verbe irrégulier) --- */
function recallHTML(card) {
  const id = card.id;
  if (id.startsWith('v:')) {
    const v = VOCAB_BY_ID[id.slice(2)];
    if (!v) return `<p>Mot introuvable.</p>`;
    return `<section class="recall"><p class="prompt">Que veut dire ce mot ? Réponds dans ta tête avant de regarder.</p>
      <h2 class="big-word">${esc(v.en)}</h2><button class="mini" data-act="sayText" data-t="${esc(v.en)}">${icon('speaker', 16)} Écouter</button>
      <p class="example en">${clickable(v.ex)}</p>
      <div id="reveal" hidden><div class="answer-box"><b>${v.senses.map(s => esc(s[0]) + (s[1] ? ` <small>(${esc(s[1])})</small>` : '')).join(' · ')}</b><p>${esc(v.exFr)}</p></div>
      <p class="prompt">Tu le savais ?</p><div class="grade">
      <button class="btn bad" data-act="grade" data-g="ko">Non</button><button class="btn ghost" data-act="grade" data-g="hard">J’hésitais</button><button class="btn good" data-act="grade" data-g="ok">Oui</button></div></div>
      <button class="btn primary wide" id="revealBtn" data-act="reveal">Voir la réponse</button></section>`;
  }
  const r = IRR_BY_ID[id.slice(2)];
  if (!r) return `<p>Verbe introuvable.</p>`;
  return `<section class="recall"><p class="prompt">Verbe irrégulier : donne le prétérit et le participe passé dans ta tête.</p>
    <h2 class="big-word">${esc(r.inf)}</h2><p class="muted">${esc(r.fr)}</p>
    <div id="reveal" hidden><div class="answer-box"><b>${esc(r.inf)} → ${esc(r.past)} → ${esc(r.pp)}</b><p class="en">${esc(r.ex)}</p><p>${esc(r.exFr)}</p></div>
    <p class="prompt">Tu le savais ?</p><div class="grade">
    <button class="btn bad" data-act="grade" data-g="ko">Non</button><button class="btn ghost" data-act="grade" data-g="hard">J’hésitais</button><button class="btn good" data-act="grade" data-g="ok">Oui</button></div></div>
    <button class="btn primary wide" id="revealBtn" data-act="reveal">Voir la réponse</button></section>`;
}

/* --- Exercices --- */
function itemHTML(it) {
  const listening = it.type === 'listen';
  const textMode = listening && !ttsAvailable();
  R.cur.textMode = textMode;
  let h = `<section class="item">`;
  if (it.part) h += `<span class="chip blue">${esc(PARTS[it.part].name)}</span>`;
  if (it.tense && TENSE_BY_ID[it.tense] && !R.opts.noHelp) h += ` <button class="chip violet as-btn" data-act="tense" data-id="${it.tense}">${esc(TENSE_BY_ID[it.tense].name)}</button>`;
  h += `<p class="prompt">${esc(it.prompt)}</p>`;
  if (listening) {
    if (textMode) h += `<div class="notice">L’audio n’est pas disponible sur cet appareil : l’exercice passe en mode texte. Il compte alors comme de la lecture, pas de l’écoute.</div><pre class="passage">${esc(it.transcript)}</pre>`;
    else h += `<button class="btn listen" data-act="play">${icon('speaker')} Écouter</button>`;
    if (it.question) h += `<p class="question">${esc(it.question)}</p>`;
  }
  if (it.type === 'decode') {
    const d = DECODE_BY_ID[it.decode];
    h += `<p class="sentence en">${clickable(d.en)}</p>`;
  }
  if (it.passage) h += `<pre class="passage">${esc(it.passage)}</pre>`;
  if (it.text) h += `<p class="sentence en">${clickable(it.text).replace(/___/g, '<span class="gap">_____</span>')}</p>`;
  if (['qcm', 'listen', 'decode'].includes(it.type)) {
    R.cur.order = shuffle(it.options.map((_, k) => k));
    const letters = 'ABCD';
    h += `<div class="options">${R.cur.order.map((k, pos) => `<button class="opt" data-act="pick" data-k="${k}">${it.audioOptions && !textMode ? `<b>${letters[pos]}</b>` : esc(it.options[k])}</button>`).join('')}</div>`;
  }
  if (it.type === 'type') h += `<label class="field"><span>Ta réponse</span><input id="typeIn" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"></label>`;
  if (it.type === 'order') {
    R.cur.words = shuffle(it.words.map((w, k) => ({ w, k })));
    R.cur.built = [];
    h += `<p class="muted">${esc(it.fr || '')}</p><div class="built" id="built" aria-live="polite"></div><div class="chips" id="chips">${R.cur.words.map(o => `<button class="wchip" data-act="orderAdd" data-k="${o.k}">${esc(o.w)}</button>`).join('')}</div>`;
  }
  if (it.type === 'speak') h += speakHTML(it);
  h += `<div id="fb"></div></section>`;
  return h;
}

function speakHTML(it) {
  const stt = sttAvailable();
  R.cur.stt = stt;
  let h = '';
  if (it.mode === 'repeat') {
    h += `<p class="sentence en">${clickable(it.target)}</p><p class="muted">${esc(it.fr)}</p>
      <button class="btn listen" data-act="sayText" data-t="${esc(it.target)}">${icon('speaker')} Écouter le modèle</button>`;
  } else {
    if (it.question) h += `<p class="sentence en">${clickable(it.question)}</p><button class="btn listen" data-act="sayText" data-t="${esc(it.question)}">${icon('speaker')} Écouter la question</button>`;
    h += `<p class="muted">${esc(it.fr)}</p>`;
    if (it.checks && it.checks.length) h += `<p class="hint">Ta réponse devrait contenir : ${it.checks.map(c => esc(c[1])).join(' · ')}</p>`;
  }
  if (stt) h += `<div class="mic-zone"><button class="mic" data-act="mic" aria-label="Parler">${icon('mic', 34)}</button><span id="micState">Appuie et parle en anglais</span></div>
    <details class="alt"><summary>Je préfère écrire</summary><label class="field"><span>Ta réponse écrite</span><input id="speakIn" autocomplete="off" autocapitalize="sentences"></label><button class="btn ghost" data-act="speakText">Valider l’écrit</button></details>`;
  else h += `<div class="notice">Micro indisponible sur ce navigateur : mode texte. Ta prononciation n’est pas évaluée, seulement ta phrase.</div>
    <label class="field"><span>Ta réponse écrite</span><input id="speakIn" autocomplete="off" autocapitalize="sentences"></label><button class="btn primary" data-act="speakText">Valider</button>`;
  return h;
}

/* ---------- Événements ---------- */
function bindCard(card) {
  const el = layer();
  el.onclick = e => {
    const b = e.target.closest('[data-act], .w');
    if (!b || !el.contains(b)) return;
    if (b.classList.contains('w')) return openWordSheet(b.dataset.w);
    handle(b.dataset.act, b, card);
  };
  const inp = el.querySelector('#typeIn');
  if (inp) { inp.addEventListener('keydown', e => { if (e.key === 'Enter') handle('checkType', null, card); }); setTimeout(() => inp.focus(), 50); }
  if (card.kind === 'item' && card.item.type === 'listen' && !R.cur.textMode) {
    const cur = R.cur;
    /* lecture automatique, seulement si la question est toujours affichée et sans réponse */
    setTimeout(() => { if (R && R.cur === cur && !cur.answered) playItem(card.item); }, 350);
  }
  if (card.kind === 'dialogue') document.getElementById('runFoot').innerHTML = dialogueFoot(card);
}

function handle(act, b, card) {
  const it = card.item;
  switch (act) {
    case 'quit':
      if (R.results.length && !confirm('Quitter ? Les réponses données sont gardées, mais la quête ne sera pas validée.')) return;
      ctx.save(); closeRun(); ctx.refresh(); return;
    case 'codex': return openCodexSheet();
    case 'tense': return openTenseSheet(b.dataset.id);
    case 'decode': return openDecodeSheet(b.dataset.id);
    case 'next': R.i++; return render();
    case 'play': return playItem(it);
    case 'sayText': return speak(b.dataset.t, { rate: ctx.S.settings.rate });
    case 'sayLine': { const ln = DIALOGUES[card.id][+b.dataset.k]; return speakLines([[ln[0], ln[1]]], ctx.S.settings.rate); }
    case 'dlgNext': R.dl++; return rerenderDialogue(card);
    case 'dlgChoice': {
      const k = +b.dataset.k, j = +b.dataset.j, ln = DIALOGUES[card.id][k];
      R.cur.choice = { k, j };
      const ok = ln.options[j][1];
      answer({ id: 'dlg-' + card.id + '-' + k, skill: 'reflexes', prompt: ln.choice, tags: [] }, ok, ln.options[j][0], ln.options.filter(o => o[1]).map(o => o[0]).join(' / '));
      return rerenderDialogue(card);
    }
    case 'reveal': document.getElementById('reveal').hidden = false; b.remove(); return;
    case 'grade': return gradeRecall(card, b.dataset.g);
    case 'pick': return pick(it, +b.dataset.k);
    case 'checkType': {
      if (R.cur.answered) return;
      const v = document.getElementById('typeIn').value;
      if (!v.trim()) return toast('Écris ta réponse d’abord.');
      const ok = checkTyped(v, it.answer);
      document.getElementById('typeIn').disabled = true;
      return resolveItem(it, ok, v, it.answer[0]);
    }
    case 'orderAdd': {
      const k = +b.dataset.k;
      R.cur.built.push(k);
      b.disabled = true;
      document.getElementById('built').innerHTML = R.cur.built.map(x => `<span class="wchip on">${esc(it.words[x])}</span>`).join(' ');
      layer().querySelector('[data-act="checkOrder"]').disabled = R.cur.built.length !== it.words.length;
      return;
    }
    case 'orderReset':
      if (R.cur.answered) return;
      R.cur.built = [];
      document.getElementById('built').innerHTML = '';
      layer().querySelectorAll('#chips .wchip').forEach(x => { x.disabled = false; });
      layer().querySelector('[data-act="checkOrder"]').disabled = true;
      return;
    case 'checkOrder': {
      if (R.cur.answered) return;
      const given = R.cur.built.map(x => it.words[x]).join(' ');
      return resolveItem(it, normalize(given) === normalize(it.answer), given, it.answer);
    }
    case 'mic': return doMic(it, b);
    case 'speakText': {
      if (R.cur.answered) return;
      const v = (document.getElementById('speakIn') || {}).value || '';
      if (!v.trim()) return toast('Écris ta réponse d’abord.');
      return evaluateSpeech(it, v, true);
    }
    case 'skipSpeak':
      if (R.cur.answered) return;
      return resolveItem(it, false, '(passé)', it.target || it.model, { skipped: true });
    case 'continue': R.i++; return render();
    case 'endNow': return finish('quit');
  }
}

function rerenderDialogue(card) {
  document.getElementById('runBody').innerHTML = dialogueHTML(card);
  document.getElementById('runFoot').innerHTML = dialogueFoot(card);
  const lines = DIALOGUES[card.id];
  const ln = lines[R.dl];
  if (Array.isArray(ln) && R.opts.autoplay !== false) speakLines([[ln[0], ln[1]]], ctx.S.settings.rate);
  const last = layer().querySelector('.dialogue > :last-child');
  if (last) last.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function playItem(it) {
  if (!it.audioOptions) return speakLines(it.audio, ctx.S.settings.rate);
  /* Partie 2 : les réponses sont lues dans l’ordre affiché (A, B, C) */
  const opts = R.cur.order.map((k, pos) => ['opt', 'ABCD'[pos] + '. ' + it.options[k]]);
  return speakLines([...it.audio, ...opts], ctx.S.settings.rate);
}

function gradeRecall(card, g) {
  if (R.cur.answered) return;
  R.cur.answered = true;
  const S = ctx.S;
  srsReview(S, card.id, g);
  R.reviewed.push({ id: card.id, g });
  const label = card.id.startsWith('v:') ? (VOCAB_BY_ID[card.id.slice(2)] || {}).en : (IRR_BY_ID[card.id.slice(2)] || {}).inf;
  answer({ id: card.id, skill: 'grammar', prompt: 'Révision : ' + label, tags: ['revision'] }, g === 'ok', g === 'ok' ? 'su' : g === 'hard' ? 'hésitation' : 'pas su', 'à retenir');
  next();
}

function pick(it, k) {
  if (R.cur.answered) return;
  const ok = k === it.answer;
  layer().querySelectorAll('.opt').forEach(o => {
    const kk = +o.dataset.k;
    o.disabled = true;
    if (kk === it.answer) o.classList.add('good');
    else if (kk === k) o.classList.add('bad');
    if (it.audioOptions) o.innerHTML = `<b>${o.textContent}</b> ${esc(it.options[kk])}`;
  });
  resolveItem(it, ok, it.options[k], it.options[it.answer], { chosen: k });
}

/* Enregistre une réponse et met à jour les compteurs du jeu */
function answer(meta, ok, given, expected) {
  const S = ctx.S;
  const skill = meta.textMode && meta.skill === 'listening' ? 'reading' : meta.skill;
  if (R.opts.mode !== 'placement') recordAnswer(S, { skill, ok, tags: meta.tags, itemId: meta.id, prompt: meta.prompt, given, expected, tense: meta.tense });
  if (meta.part && R.opts.mode !== 'placement' && !meta.textMode) recordToeic(S, meta.part, ok);
  R.results.push({ id: meta.id, ok, given, expected, skill, tags: meta.tags || [], prompt: meta.prompt, explain: meta.explain, part: meta.part, tense: meta.tense, skipped: meta.skipped });
  if (ok) { R.combo++; sfx(R.combo >= 3 ? 'combo' : 'ok'); } else { R.combo = 0; sfx('ko'); }
  if (R.opts.boss && !ok) {
    R.hearts--;
    const bb = layer().querySelector('.hearts');
    if (bb) bb.outerHTML = `<div class="hearts shake" aria-label="${R.hearts} vies restantes">${Array.from({ length: R.allowed + 1 }, (_, k) => `<span class="${k < R.hearts ? 'on' : ''}">${icon('heart', 18)}</span>`).join('')}</div>`;
  }
  if (R.opts.boss && ok) {
    const bar0 = layer().querySelector('.boss-bar .bar span');
    if (bar0) bar0.style.width = (100 - (R.results.filter(r => r.ok).length / R.cards.length) * 100) + '%';
    const bossBox = layer().querySelector('.boss-bar');
    if (bossBox) { bossBox.classList.remove('hit'); void bossBox.offsetWidth; bossBox.classList.add('hit'); }
  }
  ctx.save();
}

function resolveItem(it, ok, given, expected, extra = {}) {
  R.cur.answered = true;
  answer({ id: it.id, skill: it.skill, tags: it.tags, prompt: it.prompt + (it.text ? ' ' + it.text : '') + (it.question ? ' ' + it.question : ''), part: it.part, tense: it.tense, explain: it.explain, textMode: R.cur.textMode, skipped: extra.skipped }, ok, given, expected);
  let fb = `<div class="feedback ${ok ? 'ok' : 'ko'}" role="status"><h3>${ok ? icon('check') + ' Bonne réponse' : icon('x') + (extra.skipped ? ' Passé' : ' Pas tout à fait')}</h3>`;
  if (!ok && expected && it.type !== 'speak') fb += `<p>Réponse attendue : <b class="en">${esc(expected)}</b></p>`;
  if (it.explain) fb += `<p>${esc(it.explain)}</p>`;
  if (!ok && it.why && extra.chosen !== undefined && it.why[extra.chosen]) fb += `<p class="why">Pourquoi ta réponse ne marche pas : ${esc(it.why[extra.chosen])}</p>`;
  if (it.type === 'listen' && !R.cur.textMode) fb += `<details><summary>Transcription</summary><pre class="passage">${esc(it.transcript)}</pre></details>`;
  if (it.type === 'decode' || it.decode) fb += `<button class="mini" data-act="decode" data-id="${it.decode}">${icon('eye', 16)} Voir la phrase décodée</button>`;
  if (it.tense && !ok && !R.opts.noHelp) fb += ` <button class="mini" data-act="tense" data-id="${it.tense}">Revoir la fiche ${esc(TENSE_BY_ID[it.tense] ? TENSE_BY_ID[it.tense].name : '')}</button>`;
  if (extra.html) fb += extra.html;
  fb += `</div>`;
  document.getElementById('fb').innerHTML = fb;
  const isLast = R.i >= R.cards.length - 1;
  const bossDead = R.opts.boss && R.hearts <= 0;
  document.getElementById('runFoot').innerHTML = bossDead ? `<button class="btn primary" data-act="endNow">Voir le bilan</button>` : `<button class="btn primary" data-act="continue">${isLast ? 'Terminer' : 'Continuer'}</button>`;
  document.getElementById('fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function next() { R.i++; render(); }

/* ---------- Oral ---------- */
async function doMic(it, btn) {
  if (R.cur.answered || R.cur.listening) return;
  R.cur.listening = true;
  stopSpeaking();
  sfx('mic');
  btn.classList.add('rec');
  const st = document.getElementById('micState');
  st.textContent = 'J’écoute… parle maintenant.';
  try {
    const text = await listen({ lang: 'en-US' });
    btn.classList.remove('rec');
    R.cur.listening = false;
    evaluateSpeech(it, text, false);
  } catch (e) {
    btn.classList.remove('rec');
    R.cur.listening = false;
    st.textContent = STT_ERRORS[e.message] || 'La reconnaissance vocale a échoué. Réessaie ou réponds par écrit.';
    const alt = layer().querySelector('details.alt');
    if (alt && ['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'unavailable'].includes(e.message)) alt.open = true;
  }
}

function evaluateSpeech(it, text, written) {
  const how = written ? 'Ta réponse écrite' : 'Ce que la reconnaissance vocale a compris';
  let ok, html = `<p>${how} : <b class="en">« ${esc(text)} »</b></p>`;
  if (it.mode === 'repeat') {
    const m = wordMatch(text, it.target);
    ok = m.ratio >= 0.8;
    html += `<p>Mots retrouvés : ${Math.round(m.ratio * 100)} %${m.missing.length ? ' · manquants : <b class="en">' + esc(m.missing.join(', ')) + '</b>' : ''}</p>`;
    html += written ? `<p class="hint">Mode écrit : la prononciation n’est pas évaluée.</p>` : `<p class="hint">C’est la reconnaissance vocale du navigateur : elle vérifie les mots compris, elle n’analyse pas ton accent.</p>`;
  } else {
    const plain = text.toLowerCase().replace(/[‘’]/g, "'");
    const res = (it.checks || []).map(([re, label]) => [new RegExp(re, 'i').test(plain) || new RegExp(re, 'i').test(normalize(text)), label]);
    ok = text.trim().split(/\s+/).length >= 3 && res.every(r => r[0]);
    html += `<ul class="checks">${res.map(([v, l]) => `<li class="${v ? 'ok' : 'ko'}">${icon(v ? 'check' : 'x', 16)} ${esc(l)}</li>`).join('')}${text.trim().split(/\s+/).length < 3 ? `<li class="ko">${icon('x', 16)} Une phrase d’au moins 3 mots</li>` : ''}</ul>`;
    html += `<p>Exemple de réponse naturelle : <b class="en">${esc(it.model)}</b> <button class="mini" data-act="sayText" data-t="${esc(it.model)}">${icon('speaker', 14)}</button></p>`;
    html += `<p class="hint">La vérification automatique se limite aux éléments ci-dessus : elle ne juge ni l’accent ni toutes les fautes possibles. Compare avec l’exemple.</p>`;
  }
  resolveItem(it, ok, text, it.target || it.model, { html });
}

/* ---------- Fin et bilan ---------- */
function finish(reason) {
  if (!R || R.ended) return;
  R.ended = true;
  if (R.timer) clearInterval(R.timer);
  stopSpeaking(); stopListening();
  const S = ctx.S;
  /* temps écoulé : les questions restantes comptent comme non répondues */
  if (reason === 'time') for (let k = R.i + (R.cur && R.cur.answered ? 1 : 0); k < R.cards.length; k++) {
    const c = R.cards[k];
    if (c.kind === 'item') R.results.push({ id: c.item.id, ok: false, given: '(temps écoulé)', expected: c.item.options ? c.item.options[c.item.answer] : '', skill: c.item.skill, tags: c.item.tags || [], prompt: c.item.prompt, explain: c.item.explain, part: c.item.part, unanswered: true });
  }
  const graded = R.results;
  const okN = graded.filter(r => r.ok).length;
  const mins = Math.max(1, Math.round((Date.now() - R.t0) / 60000));
  const d = today();
  const day = S.days[d] || (S.days[d] = { mins: 0, xp: 0, done: false });
  day.mins += mins;
  const summary = { reason, okN, total: graded.length, pct: graded.length ? okN / graded.length : 0, results: graded, mins, seconds: Math.round((Date.now() - R.t0) / 1000), learned: R.learned, reviewed: R.reviewed, heartsLeft: R.hearts };
  const info = (R.opts.onDone && R.opts.onDone(summary)) || {};
  day.xp += S.xp - R.xp0;
  ctx.afterRun();
  ctx.save();
  const lvl = levelInfo(S.xp);
  if (lvl.level > R.lvl0 || info.win) sfx('win');
  layer().innerHTML = bilanHTML(summary, info, lvl);
  layer().onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'close') { closeRun(); ctx.refresh(); }
    if (a === 'go') { const r = b.dataset.r; closeRun(); ctx.go(r); }
    if (a === 'retry' && info.retry) { closeRun(); info.retry(); }
    if (a === 'reinforce' && info.reinforce) { closeRun(); info.reinforce(); }
    if (a === 'tense') openTenseSheet(b.dataset.id);
    if (a === 'sayText') speak(b.dataset.t, { rate: S.settings.rate });
  };
}

function bilanHTML(s, info, lvl) {
  const gained = ctx.S.xp - R.xp0;
  const errors = s.results.filter(r => !r.ok);
  const bySkill = {};
  for (const r of s.results) { bySkill[r.skill] = bySkill[r.skill] || [0, 0]; bySkill[r.skill][1]++; if (r.ok) bySkill[r.skill][0]++; }
  const words = [...s.learned.map(id => VOCAB_BY_ID[id] && VOCAB_BY_ID[id].en), ...s.reviewed.filter(x => x.g !== 'ok').map(x => x.id.startsWith('v:') ? (VOCAB_BY_ID[x.id.slice(2)] || {}).en : (IRR_BY_ID[x.id.slice(2)] || {}).inf)].filter(Boolean);
  const parts = {};
  for (const r of s.results) if (r.part) { parts[r.part] = parts[r.part] || [0, 0]; parts[r.part][1]++; if (r.ok) parts[r.part][0]++; }
  return `<header class="run-head"><div class="run-title"><span>Bilan</span></div><button class="icon-btn" data-act="close" aria-label="Fermer">${icon('x')}</button></header>
  <main class="run-body bilan">
    <section class="bilan-top ${info.win === false ? 'lose' : ''}">
      <h2>${esc(info.title || 'Mission terminée')}</h2>
      ${info.text ? `<p>${esc(info.text)}</p>` : ''}
      <div class="score-row"><div><b>${s.okN}/${s.total}</b><span>réussites</span></div><div><b>+${gained}</b><span>XP</span></div><div><b>${s.mins}</b><span>min</span></div></div>
      ${lvl.level > R.lvl0 ? `<p class="levelup">${icon('star', 18)} Niveau ${lvl.level} atteint !</p>` : ''}
      ${(info.rewards || []).map(r => `<p class="reward">${icon('star', 16)} ${esc(r)}</p>`).join('')}
    </section>
    ${Object.keys(parts).length ? `<section class="card"><h3>Résultats par partie TOEIC</h3>${Object.entries(parts).map(([p, [a, b]]) => `<div class="row"><span>${esc(PARTS[p].name)}</span><b>${a}/${b}</b></div>`).join('')}
      ${s.reason === 'time' ? `<p class="hint">Temps écoulé : ${pl(s.results.filter(r => r.unanswered).length, 'question')} sans réponse.</p>` : `<p class="hint">Temps utilisé : ${Math.floor(s.seconds / 60)} min ${s.seconds % 60} s.</p>`}
      <p class="hint">Ce mini-test est un entraînement : il ne donne pas de score TOEIC officiel.</p></section>` : ''}
    ${Object.keys(bySkill).length ? `<section class="card"><h3>Compétences travaillées</h3>${Object.entries(bySkill).map(([k, [a, b]]) => `<div class="row"><span>${esc(SKILL_LABEL[k] || k)}</span><b>${a}/${b}</b></div>`).join('')}</section>` : ''}
    ${errors.length ? `<section class="card"><h3>Erreurs à corriger</h3>${errors.map(e => `<div class="err"><p>${esc(e.prompt)}</p><p>Ta réponse : <span class="ko-t">${esc(e.given)}</span></p>${e.expected ? `<p>Attendu : <b class="en">${esc(e.expected)}</b></p>` : ''}${e.explain ? `<p class="muted">${esc(e.explain)}</p>` : ''}${e.tense ? `<button class="mini" data-act="tense" data-id="${e.tense}">Revoir la fiche</button>` : ''}</div>`).join('')}</section>` : `<section class="card"><p>Aucune erreur. Bravo.</p></section>`}
    ${words.length ? `<section class="card"><h3>Mots à revoir</h3><p class="en">${esc([...new Set(words)].join(' · '))}</p><p class="hint">Ils reviendront dans tes révisions au bon moment.</p></section>` : ''}
    ${info.next ? `<section class="card next"><h3>Prochaine mission conseillée</h3><p>${esc(info.next.label)}</p><button class="btn primary" data-act="go" data-r="${esc(info.next.route)}">Y aller</button></section>` : ''}
  </main>
  <footer class="run-foot">
    ${info.reinforce ? `<button class="btn ghost" data-act="reinforce">Quête de renforcement</button>` : ''}
    ${info.retry ? `<button class="btn ${info.win === false ? 'primary' : 'ghost'}" data-act="retry">Retenter</button>` : ''}
    <button class="btn ${info.retry && info.win === false ? 'ghost' : 'primary'}" data-act="close">Continuer l’aventure</button>
  </footer>`;
}

export function isRunning() { return !!R; }
/* carte en cours (utilisée par les tests automatisés) */
export function currentCard() { return R && !R.ended ? R.cards[R.i] : null; }
