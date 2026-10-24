/* Petits outils d’interface : échappement, icônes, avatar, messages. */
import { CLASS_INFO } from '../data/world.js';

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

/* ---------- Avatar ---------- */
export const SKINS = ['#F6D7C3', '#E9B892', '#C98E62', '#A0663F', '#734328', '#4A2A19'];
export const HAIR_COLORS = ['#1B1B1F', '#4B2E1E', '#8A5A2B', '#D9A55B', '#B8423A', '#9C8CF0'];
export const HAIR_STYLES = ['Court', 'Long', 'Bouclé', 'Chignon', 'Rasé', 'Tresses'];
export const OUTFITS = { 'outfit-start': 'Tenue de départ', 'outfit-street': 'Veste urbaine', 'outfit-agent': 'Manteau d’agent', 'outfit-traveller': 'Tenue de voyageur' };
export const BUILDS = ['Masculin', 'Féminin', 'Neutre'];
export const FACES = ['Doux', 'Déterminé', 'Souriant'];

function hairPath(style, c) {
  switch (style) {
    case 0: return `<path d="M70 78c0-26 18-40 30-40s30 14 30 40c-6-12-18-18-30-18s-24 6-30 18z" fill="${c}"/>`;
    case 1: return `<path d="M66 82c0-30 18-46 34-46s34 16 34 46v52c-6-2-10-8-10-16V86c-8-10-16-14-24-14s-16 4-24 14v32c0 8-4 14-10 16z" fill="${c}"/>`;
    case 2: return `<g fill="${c}"><circle cx="76" cy="66" r="13"/><circle cx="92" cy="54" r="14"/><circle cx="110" cy="54" r="14"/><circle cx="125" cy="66" r="13"/><circle cx="70" cy="82" r="10"/><circle cx="130" cy="82" r="10"/></g>`;
    case 3: return `<g fill="${c}"><circle cx="100" cy="36" r="14"/><path d="M70 80c0-24 16-38 30-38s30 14 30 38c-8-10-18-14-30-14s-22 4-30 14z"/></g>`;
    case 4: return `<path d="M72 74c2-20 16-32 28-32s26 12 28 32c-8-6-18-9-28-9s-20 3-28 9z" fill="${c}" opacity=".55"/>`;
    default: return `<g fill="${c}"><path d="M70 80c0-26 16-40 30-40s30 14 30 40c-8-10-18-14-30-14s-22 4-30 14z"/><rect x="62" y="80" width="8" height="54" rx="4"/><rect x="130" y="80" width="8" height="54" rx="4"/></g>`;
  }
}
export function avatarSVG(hero, equipped = {}, size = 160, cosmeticsList = []) {
  if (!hero) return '';
  const cls = CLASS_INFO[hero.cls] || CLASS_INFO.combattant;
  const skin = SKINS[hero.skin] || SKINS[2];
  const hairC = HAIR_COLORS[hero.hairColor] || HAIR_COLORS[0];
  const outfit = equipped.outfit || 'outfit-start';
  const aura = cosmeticsList.find(c => c.id === equipped.aura);
  const form = equipped.form === 'form-lantern';
  const shoulders = hero.build === 1 ? 'M54 196c4-34 22-50 46-50s42 16 46 50z' : hero.build === 0 ? 'M46 196c4-36 26-52 54-52s50 16 54 52z' : 'M50 196c4-35 24-51 50-51s46 16 50 51z';
  const coat = { 'outfit-start': '#3A3550', 'outfit-street': cls.color, 'outfit-agent': '#1E1B2E', 'outfit-traveller': '#8A6A2B' }[outfit] || '#3A3550';
  const trim = outfit === 'outfit-agent' ? cls.color : '#F8F4EF';
  const brows = hero.face === 1 ? '<path d="M84 92l10 3M116 92l-10 3" stroke="#1E1B2E" stroke-width="3" stroke-linecap="round"/>' : '<path d="M84 93h10M106 93h10" stroke="#1E1B2E" stroke-width="3" stroke-linecap="round"/>';
  const mouth = hero.face === 2 ? '<path d="M92 116c4 5 12 5 16 0" stroke="#1E1B2E" stroke-width="3" fill="none" stroke-linecap="round"/>' : '<path d="M94 117h12" stroke="#1E1B2E" stroke-width="3" stroke-linecap="round"/>';
  const comp = equipped.companion === 'comp-fox'
    ? '<g transform="translate(150 150)"><path d="M0 30 6 6l10 12 10-12 6 24c0 8-8 14-16 14S0 38 0 30z" fill="#FF6B9A" stroke="#F8F4EF" stroke-width="2"/><circle cx="11" cy="28" r="2" fill="#1E1B2E"/><circle cx="21" cy="28" r="2" fill="#1E1B2E"/></g>'
    : equipped.companion === 'comp-drone'
      ? '<g transform="translate(150 40)"><rect x="4" y="10" width="26" height="12" rx="6" fill="#2F80ED" stroke="#F8F4EF" stroke-width="2"/><path d="M0 8h12M22 8h12" stroke="#F8F4EF" stroke-width="2"/><circle cx="17" cy="16" r="3" fill="#FFD166"/></g>'
      : '';
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 200 200" role="img" aria-label="Ton héros">
    ${aura || form ? `<circle cx="100" cy="104" r="92" fill="none" stroke="${form ? '#FFD166' : aura.color}" stroke-width="5" opacity=".9"/><circle cx="100" cy="104" r="80" fill="${form ? '#FFD166' : aura.color}" opacity=".14"/>` : ''}
    <path d="${shoulders}" fill="${coat}"/>
    <path d="M86 150l14 22 14-22" fill="none" stroke="${trim}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="90" y="124" width="20" height="22" rx="8" fill="${skin}"/>
    ${hero.hair === 1 || hero.hair === 5 ? hairPath(hero.hair, hairC) : ''}
    <ellipse cx="100" cy="96" rx="30" ry="34" fill="${skin}"/>
    ${hero.hair === 1 || hero.hair === 5 ? '' : hairPath(hero.hair, hairC)}
    ${hero.hair === 1 ? '<path d="M70 80c6-12 18-18 30-18s24 6 30 18c-8-6-18-8-30-8s-22 2-30 8z" fill="' + hairC + '"/>' : ''}
    ${hero.hair === 5 ? '<path d="M70 80c0-26 16-40 30-40s30 14 30 40c-8-10-18-14-30-14s-22 4-30 14z" fill="' + hairC + '"/>' : ''}
    ${brows}
    <circle cx="89" cy="101" r="3.6" fill="#1E1B2E"/><circle cx="111" cy="101" r="3.6" fill="#1E1B2E"/>
    ${mouth}
    ${form ? '<path d="M100 150v24" stroke="#FFD166" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="182" r="8" fill="#FFD166"/>' : ''}
    ${comp}
  </svg>`;
}

/* Portrait des personnages du jeu (pastille + initiales) */
export function portrait(ch, size = 44) {
  return `<span class="portrait" style="--pc:${ch.color};width:${size}px;height:${size}px" aria-hidden="true">${esc(ch.initials || '?')}</span>`;
}

/* ---------- Messages ---------- */
let toastTimer;
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
