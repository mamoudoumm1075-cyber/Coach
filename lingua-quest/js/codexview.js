/* Codex anglais : rendu des fiches (mots, phrases décodées, temps…) en page ou en panneau par-dessus un exercice. */
import { ctx } from './ctx.js';
import { esc, icon, toast } from './ui.js';
import { speak } from './audio.js';
import { srsAdd, tenseStatus } from './logic.js';
import { VOCAB, VOCAB_BY_ID, CATEGORIES, REGISTRES, MARKERS, AUX, IRREGULAR, DECODE, DECODE_BY_ID, ROLE_LABEL, lookupWord } from '../data/codex.js';
import { TENSES, TENSE_BY_ID } from '../data/tenses.js';

const say = t => `<button class="mini" data-act="say" data-t="${esc(t)}" aria-label="Écouter « ${esc(t)} »">${icon('speaker', 16)}</button>`;
function clickableEn(en) {
  return String(en).split(/(\s+)/).map(tok => {
    const m = tok.match(/^([“"(]*)([A-Za-z’'\-]+)([^A-Za-z’'\-]*)$/);
    return m ? esc(m[1]) + `<button class="w" data-w="${esc(m[2])}">${esc(m[2])}</button>` + esc(m[3]) : esc(tok);
  }).join('');
}

/* ---------- Fiches ---------- */
export function wordEntryHTML(v, { noAdd = false } = {}) {
  const inSrs = ctx.S && ctx.S.srs['v:' + v.id];
  return `<article class="entry">
    <div class="entry-head"><h2 class="en">${esc(v.en)}</h2>${say(v.en)}</div>
    <p class="pron">Prononciation : <b>${esc(v.pron)}</b></p>
    <p class="tags"><span class="chip">${esc(REGISTRES[v.reg] || v.reg)}</span> <span class="chip">${esc(CATEGORIES[v.cat] || v.cat)}</span></p>
    <ol class="senses">${v.senses.map(s => `<li><b>${esc(s[0])}</b>${s[1] ? ` <span class="muted">· ${esc(s[1])}</span>` : ''}</li>`).join('')}</ol>
    <div class="example"><p class="en">${clickableEn(v.ex)} ${say(v.ex)}</p><p class="muted">${esc(v.exFr)}</p></div>
    ${v.syn ? `<p class="muted">Mots proches : <span class="en">${esc(v.syn)}</span></p>` : ''}
    ${noAdd ? '' : inSrs ? `<p class="ok-t">${icon('check', 16)} Dans ta liste de révision</p>` : `<button class="btn ghost" data-act="addSrs" data-id="v:${v.id}">${icon('plus', 18)} Ajouter à mes révisions</button>`}
  </article>`;
}
export function irregularHTML(r) {
  const inSrs = ctx.S && ctx.S.srs['i:' + r.id];
  return `<article class="entry"><div class="entry-head"><h2 class="en">${esc(r.inf)} → ${esc(r.past)} → ${esc(r.pp)}</h2>${say(r.inf + ', ' + r.past.replace(/\(.*\)/, '') + ', ' + r.pp.replace(/\(.*\)/, ''))}</div>
    <p><b>${esc(r.fr)}</b></p><p class="muted">Infinitif · prétérit · participe passé</p>
    <div class="example"><p class="en">${clickableEn(r.ex)} ${say(r.ex)}</p><p class="muted">${esc(r.exFr)}</p></div>
    ${inSrs ? `<p class="ok-t">${icon('check', 16)} Dans ta liste de révision</p>` : `<button class="btn ghost" data-act="addSrs" data-id="i:${r.id}">${icon('plus', 18)} Ajouter à mes révisions</button>`}</article>`;
}
export function markerHTML(m) {
  return `<article class="entry"><div class="entry-head"><h2 class="en">${esc(m.en)}</h2>${say(m.en)}</div><p><b>${esc(m.fr)}</b></p><p>${esc(m.usage)}</p>
    ${m.ex.map(([en, fr]) => `<div class="example"><p class="en">${clickableEn(en)} ${say(en)}</p><p class="muted">${esc(fr)}</p></div>`).join('')}
    <p class="hint">Un marqueur est un indice, pas une règle automatique : c’est le sens de la phrase qui choisit le temps.</p></article>`;
}
export function auxHTML(a) {
  return `<article class="entry"><div class="entry-head"><h2 class="en">${esc(a.en)}</h2>${say(a.en)}</div><p>${esc(a.role)}</p><p class="muted">Formes : <span class="en">${esc(a.forms)}</span></p>
    ${a.ex.map(([en, fr]) => `<div class="example"><p class="en">${clickableEn(en)} ${say(en)}</p><p class="muted">${esc(fr)}</p></div>`).join('')}
    <p><b>Question :</b> ${esc(a.q)}</p><p><b>Négation :</b> ${esc(a.neg)}</p></article>`;
}
export function decodeHTML(d) {
  return `<article class="entry decode">
    <div class="entry-head"><h2 class="en">${esc(d.en)}</h2>${say(d.en)}</div>
    <p class="decoded">${d.parts.map(([w, role]) => `<span class="seg r-${role}"><span class="en">${esc(w)}</span><small>${esc(ROLE_LABEL[role])}</small></span>`).join('')}</p>
    <table class="dtable"><tbody>${d.parts.map(([w, role, fr]) => `<tr><th class="en">${esc(w)}</th><td><span class="r-${role} dot"></span>${esc(ROLE_LABEL[role])}</td><td>${esc(fr)}</td></tr>`).join('')}</tbody></table>
    <p><b>Traduction naturelle :</b> ${esc(d.fr)}</p>
    <p>${esc(d.explain)}</p>
    ${d.tense ? `<button class="chip violet as-btn" data-act="tense" data-id="${d.tense}">Fiche : ${esc(TENSE_BY_ID[d.tense].name)}</button>` : ''}
  </article>`;
}
export function tenseHTML(t, { page = false } = {}) {
  const st = ctx.S ? tenseStatus(ctx.S, t.id) : { label: '' };
  const cmp = TENSE_BY_ID[t.compare[0]];
  const row = (label, f) => `<div class="form-row"><h4>${label}</h4><p class="formula">${esc(f[0])}</p>${f[1] ? `<p class="en">${clickableEn(f[1])} ${say(f[1])}</p><p class="muted">${esc(f[2])}</p>` : ''}</div>`;
  return `<article class="entry tense">
    <p class="tags"><span class="chip violet">${esc(st.label)}${st.acc != null ? ' · ' + st.acc + ' %' : ''}</span></p>
    <h2 class="en">${esc(t.name)}</h2>
    <p class="lead">${esc(t.fr)}</p>
    <h3>Quand l’utiliser</h3><ul>${t.when.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
    <h3>Construction</h3>${row('Affirmative', t.aff)}${row('Négative', t.neg)}${row('Interrogative', t.qu)}
    <p><b>Auxiliaires :</b> ${esc(t.aux)}</p>
    <h3>Exemples</h3>${t.examples.map(([en, fr]) => `<div class="example"><p class="en">${clickableEn(en)} ${say(en)}</p><p class="muted">${esc(fr)}</p></div>`).join('')}
    <h3>Indices possibles</h3><p class="en">${t.clues.map(esc).join(' · ')}</p>
    <p class="hint">Ces mots aident souvent, mais ils ne décident pas seuls du temps : le sens et le contexte comptent davantage.</p>
    <h3>Erreurs fréquentes</h3>${t.errors.map(([bad, good, why]) => `<div class="err-pair"><p><span class="ko-t">✗ ${esc(bad)}</span></p><p><span class="ok-t">✓ ${esc(good)}</span></p><p class="muted">${esc(why)}</p></div>`).join('')}
    <h3>À comparer avec ${cmp ? esc(cmp.name) : ''}</h3><p>${esc(t.compare[1])}</p>
    ${cmp && !page ? '' : cmp ? `<a class="chip as-btn" href="#/tense/${cmp.id}">Ouvrir la fiche ${esc(cmp.name)}</a>` : ''}
    ${page ? `<h3>Mission orale</h3><p>${esc(t.oral.prompt)}</p>
      <div class="actions"><button class="btn primary" data-act="tensePractice" data-id="${t.id}">S’entraîner (${t.exercises.length} exercices)</button>
      <button class="btn ghost" data-act="tenseOral" data-id="${t.id}">${icon('mic', 18)} Mission orale</button>
      <button class="btn ghost" data-act="tenseMastery" data-id="${t.id}">${icon('target', 18)} Quête de maîtrise (sans aide, 85 %)</button></div>` : ''}
  </article>`;
}

/* ---------- Page Codex (onglets) ---------- */
export const CODEX_TABS = { dico: 'Dictionnaire', decode: 'Décodeur', temps: 'Temps', marqueurs: 'Marqueurs', aux: 'Auxiliaires', irr: 'Verbes irréguliers' };
export function codexHTML(tab = 'dico', q = '', cat = '') {
  const tabs = `<nav class="tabs" role="tablist">${Object.entries(CODEX_TABS).map(([k, v]) => `<button role="tab" aria-selected="${k === tab}" class="tab ${k === tab ? 'on' : ''}" data-act="codexTab" data-tab="${k}">${v}</button>`).join('')}</nav>`;
  let body = '';
  if (tab === 'dico') {
    body = `<label class="search">${icon('search', 18)}<input id="codexSearch" type="search" placeholder="Chercher un mot (anglais ou français)" value="${esc(q)}" autocomplete="off"></label>
      <div class="chips cats"><button class="chip as-btn ${!cat ? 'on' : ''}" data-act="codexCat" data-cat="">Tout</button>${Object.entries(CATEGORIES).map(([k, v]) => `<button class="chip as-btn ${cat === k ? 'on' : ''}" data-act="codexCat" data-cat="${k}">${v}</button>`).join('')}</div>
      <div id="codexList">${wordListHTML(q, cat)}</div>`;
  } else if (tab === 'decode') {
    body = `<p class="hint">Touche une phrase pour voir le rôle de chaque mot. Le décodeur fonctionne sur les phrases du jeu annotées une par une ; il ne décode pas encore n’importe quelle phrase tapée.</p>
      <div class="list">${DECODE.map(d => `<button class="list-item" data-act="decode" data-id="${d.id}"><span class="en">${esc(d.en)}</span><small>${esc(d.fr)}</small></button>`).join('')}</div>`;
  } else if (tab === 'temps') {
    body = `<div class="list">${TENSES.map(t => { const st = ctx.S ? tenseStatus(ctx.S, t.id) : { label: '' }; return `<button class="list-item" data-act="tense" data-id="${t.id}"><span class="en">${esc(t.name)}</span><small>${esc(st.label)}</small></button>`; }).join('')}</div>`;
  } else if (tab === 'marqueurs') {
    body = `<div class="list">${MARKERS.map(m => `<button class="list-item" data-act="marker" data-id="${m.id}"><span class="en">${esc(m.en)}</span><small>${esc(m.fr)}</small></button>`).join('')}</div>`;
  } else if (tab === 'aux') {
    body = `<div class="list">${AUX.map(a => `<button class="list-item" data-act="aux" data-id="${a.id}"><span class="en">${esc(a.en)}</span><small>${esc(a.role.split('.')[0])}</small></button>`).join('')}</div>`;
  } else {
    body = `<div class="list">${IRREGULAR.map(r => `<button class="list-item" data-act="irr" data-id="${r.id}"><span class="en">${esc(r.inf)} · ${esc(r.past)} · ${esc(r.pp)}</span><small>${esc(r.fr)}</small></button>`).join('')}</div>`;
  }
  return tabs + `<div class="tab-body">${body}</div>`;
}
export function wordListHTML(q, cat) {
  const n = String(q || '').toLowerCase().trim();
  const list = VOCAB.filter(v => (!cat || v.cat === cat) && (!n || v.en.toLowerCase().includes(n) || v.senses.some(s => s[0].toLowerCase().includes(n)) || v.forms.some(f => f.includes(n))));
  if (!list.length) return `<p class="muted">Aucun mot trouvé. Le Codex s’enrichit à chaque chapitre.</p>`;
  return `<div class="list">${list.map(v => `<button class="list-item" data-act="word" data-id="${v.id}"><span class="en">${esc(v.en)}</span><small>${esc(v.senses.map(s => s[0]).join(', '))}</small>${ctx.S && ctx.S.srs['v:' + v.id] ? `<span class="dot-ok" title="Dans tes révisions"></span>` : ''}</button>`).join('')}</div>`;
}

/* ---------- Panneau par-dessus l’écran en cours ---------- */
const sheet = () => document.getElementById('sheet');
const history = [];
function openSheet(title, html, push = true) {
  const el = sheet();
  if (push) history.push({ title, html });
  el.innerHTML = `<div class="sheet-backdrop" data-act="sheetClose"></div><div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header class="sheet-head">${history.length > 1 ? `<button class="icon-btn" data-act="sheetBack" aria-label="Retour">${icon('back')}</button>` : '<span></span>'}<h2>${esc(title)}</h2><button class="icon-btn" data-act="sheetClose" aria-label="Fermer">${icon('x')}</button></header>
    <div class="sheet-body">${html}</div></div>`;
  el.hidden = false;
  el.onclick = e => {
    const b = e.target.closest('[data-act], .w');
    if (!b) return;
    if (b.classList.contains('w')) return openWordSheet(b.dataset.w);
    if (b.dataset.act === 'sheetClose') return closeSheet();
    if (b.dataset.act === 'sheetBack') { history.pop(); const prev = history[history.length - 1]; return openSheet(prev.title, prev.html, false); }
    handleCodexAct(b.dataset.act, b, true);
  };
  const inp = el.querySelector('#codexSearch');
  if (inp) inp.oninput = () => { el.querySelector('#codexList').innerHTML = wordListHTML(inp.value, ''); };
  setTimeout(() => { const h = el.querySelector('.sheet-head h2'); h && h.focus && h.setAttribute('tabindex', '-1'); h && h.focus(); }, 30);
}
export function closeSheet() { history.length = 0; const el = sheet(); el.hidden = true; el.innerHTML = ''; }
let sheetTab = 'dico';
export function openCodexSheet(tab = sheetTab) { sheetTab = tab; history.length = 0; openSheet('Codex anglais', codexHTML(tab)); }
export function openWordSheet(word) {
  const r = lookupWord(word);
  if (!r) return openSheet('Codex', `<p>« <b class="en">${esc(word)}</b> » n’est pas encore dans le Codex.</p><p class="hint">Le Codex s’enrichit au fil des chapitres. Tu peux chercher un autre mot dans le dictionnaire.</p><button class="btn ghost" data-act="codexTab" data-tab="dico">Ouvrir le dictionnaire</button>`);
  const html = r.kind === 'vocab' ? wordEntryHTML(r.item) : r.kind === 'irregular' ? irregularHTML(r.item) : r.kind === 'marker' ? markerHTML(r.item) : auxHTML(r.item);
  openSheet('Codex', html);
}
export function openTenseSheet(id) { const t = TENSE_BY_ID[id]; if (t) openSheet('Académie des temps', tenseHTML(t)); }
export function openDecodeSheet(id) { const d = DECODE_BY_ID[id]; if (d) openSheet('Décodeur de phrases', decodeHTML(d)); }

/* Actions communes au Codex (page et panneau) */
export function handleCodexAct(act, b, inSheet) {
  const id = b && b.dataset.id;
  switch (act) {
    case 'say': speak(b.dataset.t, { rate: ctx.S ? ctx.S.settings.rate : 0.9 }); return true;
    case 'addSrs':
      srsAdd(ctx.S, id); ctx.save(); toast('Ajouté à tes révisions');
      b.outerHTML = `<p class="ok-t">${icon('check', 16)} Dans ta liste de révision</p>`; return true;
    case 'word': { const v = VOCAB_BY_ID[id]; if (v) openSheet('Codex', wordEntryHTML(v)); return true; }
    case 'irr': { const r = IRREGULAR.find(x => x.id === id); if (r) openSheet('Verbes irréguliers', irregularHTML(r)); return true; }
    case 'marker': { const m = MARKERS.find(x => x.id === id); if (m) openSheet('Marqueurs de temps', markerHTML(m)); return true; }
    case 'aux': { const a = AUX.find(x => x.id === id); if (a) openSheet('Auxiliaires', auxHTML(a)); return true; }
    case 'decode': openDecodeSheet(id); return true;
    case 'tense': openTenseSheet(id); return true;
    case 'codexTab':
      if (inSheet) { sheetTab = b.dataset.tab; history.length = 0; openSheet('Codex anglais', codexHTML(b.dataset.tab)); return true; }
      return false;
    case 'codexCat':
      if (inSheet) { history.pop(); openSheet('Codex anglais', codexHTML('dico', '', b.dataset.cat)); return true; }
      return false;
  }
  return false;
}
