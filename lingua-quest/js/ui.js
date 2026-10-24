/* Petits outils d’interface : échappement, icônes, avatar, messages. */
import { CLASS_INFO, PORTRAITS, PORTRAIT_BY_ID } from '../data/world.js';

export const $ = sel => document.querySelector(sel);
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function pl(n, one, many) { return n + ' ' + (n > 1 ? (many || one + 's') : one); }

const P = {
  home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  learn: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M7 9v5c0 1.5 2.5 3 5 3s5-1.5 5-3V9"/>',
  codex: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M10 8h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
  flame: '<path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .2 2 1.2 3 2.2 3C11 8.5 11 5 12 2z"/>',
  sword: '<path d="M14.5 3H21v6.5L9 21l-6-6z"/><path d="m6 13 5 5"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  tree: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="13" r="2"/><path d="M12 7v4M11 14.5 6.5 17.5M13 14.5l4.5 3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
export function icon(name, size = 22, extra = '') {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name] || ''}</svg>`;
}

/* ---------- Portrait du héros (illustrations de img/) ---------- */
export function heroPortrait(hero, cosmeticsList = []) {
  return PORTRAIT_BY_ID[hero && hero.portrait] || PORTRAITS.find(p => p.cls === (hero && hero.cls)) || PORTRAITS[0];
}
/* Médaillon rond : visage + aura et compagnon équipés (purement visuels) */
export function heroMedal(hero, equipped = {}, size = 64, cosmeticsList = []) {
  const p = heroPortrait(hero);
  const aura = cosmeticsList.find(c => c.id === equipped.aura);
  const form = equipped.form === 'form-lantern';
  const ring = form ? 'conic-gradient(#FFD166,#FF6B9A,#A894FF,#FFD166)' : aura ? aura.color : (CLASS_INFO[hero.cls] || {}).color || '#6C4CF1';
  const comp = equipped.companion ? `<span class="medal-comp" title="${esc((cosmeticsList.find(c => c.id === equipped.companion) || {}).name || '')}">${icon(equipped.companion === 'comp-drone' ? 'target' : 'heart', 12)}</span>` : '';
  return `<span class="medal ${aura || form ? 'aura' : ''}" style="--ring:${ring};width:${size}px;height:${size}px"><img src="${p.img}" alt="" style="object-position:${p.face}">${comp}</span>`;
}

/* Portrait des personnages du jeu (pastille + initiales) */
export function portrait(ch, size = 44) {
  return `<span class="portrait" style="--pc:${ch.color};width:${size}px;height:${size}px" aria-hidden="true">${esc(ch.initials || '?')}</span>`;
}

/* ---------- Messages ---------- */
let toastTimer;
/* Jauge en demi-cercle : pct de 0 à 100 */
export function gauge(pct, big, small, tone = 'violet') {
  const v = Math.max(0, Math.min(100, +pct || 0)), len = 163.4;
  return `<div class="gauge ${tone}" role="img" aria-label="${esc(big)} ${esc(small)}"><svg viewBox="0 0 120 68" aria-hidden="true"><path class="g-bg" d="M8 62 A52 52 0 0 1 112 62"/><path class="g-fg" d="M8 62 A52 52 0 0 1 112 62" style="stroke-dasharray:${len};stroke-dashoffset:${(len * (1 - v / 100)).toFixed(1)}"/></svg><b>${esc(big)}</b><small>${esc(small)}</small></div>`;
}

export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

export function bar(pct, cls = '') {
  return `<div class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;
}
