/* Audio : voix du navigateur (lecture), reconnaissance vocale (micro), bruitages ElevenLabs.
   Chaque fonction dit honnêtement si elle n’est pas disponible : l’appli bascule alors en mode texte. */

let voices = [];
let ttsBroken = false;
function loadVoices() {
  try { voices = window.speechSynthesis.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang)); } catch (e) { voices = []; }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function ttsAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window && !ttsBroken;
}
export function voiceCount() { return voices.length; }

/* Deux voix différentes pour les dialogues quand l’appareil en propose plusieurs */
function pickVoice(slot) {
  if (!voices.length) return null;
  const us = voices.filter(v => /en-US/i.test(v.lang)), gb = voices.filter(v => /en-GB/i.test(v.lang));
  const pool = slot % 2 === 0 ? (us.length ? us : voices) : (gb.length ? gb : voices.length > 1 ? [voices[1]] : voices);
  return pool[0];
}

export function stopSpeaking() {
  try { window.speechSynthesis.cancel(); } catch (e) { /* rien */ }
}

export function speak(text, { slot = 0, rate = 0.9 } = {}) {
  return new Promise(resolve => {
    if (!ttsAvailable()) return resolve(false);
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = slot % 2 === 0 ? 'en-US' : 'en-GB';
      const v = pickVoice(slot);
      if (v) u.voice = v;
      u.rate = rate;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      window.speechSynthesis.speak(u);
    } catch (e) { ttsBroken = true; resolve(false); }
  });
}

/* Lit une suite de répliques [locuteur, texte] en alternant les voix */
export async function speakLines(lines, rate) {
  stopSpeaking();
  const slots = {};
  let n = 0;
  for (const [who, text] of lines) {
    if (!(who in slots)) slots[who] = n++;
    const ok = await speak(text, { slot: slots[who], rate });
    if (!ok) return false;
    await new Promise(r => setTimeout(r, 250));
  }
  return true;
}

/* ---------- Reconnaissance vocale ---------- */
export function sttAvailable() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
let current = null;
export function listen({ lang = 'en-US', maxMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return reject(new Error('unavailable'));
    const rec = new R();
    current = rec;
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    let text = '', done = false;
    const finish = (err) => { if (done) return; done = true; clearTimeout(timer); current = null; err ? reject(err) : resolve(text.trim()); };
    rec.onresult = e => { for (const r of e.results) text += ' ' + r[0].transcript; };
    rec.onerror = e => finish(new Error(e.error || 'error'));
    rec.onend = () => finish(text.trim() ? null : new Error('no-speech'));
    const timer = setTimeout(() => { try { rec.stop(); } catch (e) { /* rien */ } }, maxMs);
    try { rec.start(); } catch (e) { finish(e); }
  });
}
export function stopListening() { try { current && current.stop(); } catch (e) { /* rien */ } }

export const STT_ERRORS = {
  'not-allowed': 'Le micro est refusé. Autorise-le dans les réglages du navigateur, ou réponds par écrit.',
  'service-not-allowed': 'La reconnaissance vocale n’est pas autorisée ici (fréquent dans une appli installée sur iPhone). Réponds par écrit, ou ouvre l’appli dans Safari.',
  'no-speech': 'Je n’ai rien entendu. Rapproche-toi du micro et réessaie.',
  'network': 'La reconnaissance vocale a besoin d’internet. Réponds par écrit.',
  'audio-capture': 'Aucun micro détecté. Réponds par écrit.',
  'unavailable': 'La reconnaissance vocale n’existe pas dans ce navigateur. Réponds par écrit.'
};

/* ---------- Bruitages (générés avec ElevenLabs) ---------- */
const SFX = { ok: 'son-juste', ko: 'son-faux', combo: 'son-combo', win: 'son-victoire', time: 'son-temps', mic: 'son-micro' };
const cache = {};
export let soundOn = true;
export function setSound(v) { soundOn = !!v; }
export function sfx(name) {
  if (!soundOn || typeof Audio === 'undefined') return;
  try {
    const a = cache[name] || (cache[name] = new Audio('sons/' + SFX[name] + '.mp3'));
    a.currentTime = 0;
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch (e) { /* rien */ }
}
