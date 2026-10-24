/* Audio : voix ElevenLabs via ton serveur Cloudflare (si configuré), sinon voix et reconnaissance du navigateur.
   Chaque fonction dit honnêtement si elle n’est pas disponible : l’appli bascule alors en mode texte. */

/* ---------- Serveur voix (facultatif) ---------- */
let server = null;
let serverDownUntil = 0;
export let lastServerError = '';
export function setVoiceServer(url, code) {
  url = String(url || '').trim().replace(/\/+$/, '');
  server = url && code ? { url, code: String(code) } : null;
  serverDownUntil = 0;
  lastServerError = '';
}
const serverOn = () => !!server && Date.now() > serverDownUntil;
function serverFailed(e) { serverDownUntil = Date.now() + 120000; lastServerError = e; }
/* 'elevenlabs' | 'secours' (serveur en panne, voix du navigateur) | 'navigateur' (aucun serveur) */
export function voiceMode() { return server ? (serverOn() ? 'elevenlabs' : 'secours') : 'navigateur'; }

async function call(srv, path, opts = {}) {
  let r;
  try { r = await fetch(srv.url + path, { ...opts, headers: { ...(opts.headers || {}), 'X-LQ-Code': srv.code } }); }
  catch (e) { throw new Error('reseau'); }
  if (!r.ok) { let e = 'serveur'; try { e = (await r.json()).error || e; } catch (x) { /* rien */ } throw new Error(e); }
  return r;
}
/* Test depuis le profil, avec l’adresse et le code tapés (pas encore enregistrés) */
export async function pingServer(url, code) {
  const r = await call({ url: String(url).trim().replace(/\/+$/, ''), code }, '/ping');
  return r.json();
}
export const SERVER_ERRORS = {
  code: 'Code secret refusé : vérifie qu’il est identique à ACCESS_CODE dans Cloudflare.',
  config: 'Le serveur n’a pas ses secrets : ajoute ELEVENLABS_API_KEY et ACCESS_CODE dans Cloudflare.',
  limite: 'Limite du jour atteinte : la voix du navigateur prend le relais jusqu’à demain.',
  elevenlabs: 'ElevenLabs a refusé la demande : vérifie la clé et les crédits restants.',
  reseau: 'Serveur injoignable : vérifie l’adresse (elle commence par https://) et ta connexion.',
  route: 'Adresse incorrecte : colle l’adresse du Worker, sans rien après.',
  serveur: 'Le serveur a rencontré une erreur. Réessaie plus tard.'
};

/* Lecture des MP3 : Web Audio, débloqué au premier geste (obligatoire sur iPhone) */
let actx = null;
function audioCtx() {
  if (!actx) { const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext); if (AC) actx = new AC(); }
  return actx;
}
if (typeof window !== 'undefined') {
  const unlock = () => { if (!server) return; const c = audioCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

/* Cache : en mémoire pour la séance, et dans le téléphone pour ne jamais payer deux fois la même phrase */
const mem = new Map();
const CACHE = 'lq-voix';
function voiceBuffer(text, slot, rate) {
  const voice = slot % 2 === 0 ? 'a' : 'b', speed = rate <= 0.8 ? 0.85 : rate >= 1 ? 1.1 : 1;
  const k = voice + '|' + speed + '|' + text;
  if (!mem.has(k)) {
    if (mem.size > 80) mem.delete(mem.keys().next().value);
    const p = fetchVoice(k, text, voice, speed);
    mem.set(k, p);
    p.catch(() => mem.delete(k));
  }
  return mem.get(k);
}
async function fetchVoice(k, text, voice, speed) {
  const req = new Request('https://lq-voix.invalid/' + encodeURIComponent(k));
  let store = null;
  try { store = typeof caches !== 'undefined' ? await caches.open(CACHE) : null; } catch (e) { store = null; }
  if (store) { const hit = await store.match(req); if (hit) return hit.arrayBuffer(); }
  const r = await call(server, '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice, speed }) });
  const buf = await r.arrayBuffer();
  if (store) try { await store.put(req, new Response(buf.slice(0), { headers: { 'Content-Type': 'audio/mpeg' } })); } catch (e) { /* stockage plein : tant pis */ }
  return buf;
}

let gen = 0, src = null;
async function playBuffer(buf, g) {
  const c = audioCtx();
  if (!c) throw new Error('audio');
  if (c.state !== 'running') await Promise.race([c.resume(), new Promise(r => setTimeout(r, 600))]);
  if (c.state !== 'running') throw new Error('audio');
  const data = await c.decodeAudioData(buf.slice(0));
  if (g !== gen) return false;
  return new Promise(res => {
    const s = c.createBufferSource();
    s.buffer = data;
    s.connect(c.destination);
    s.onended = () => { if (src === s) src = null; res(g === gen); };
    src = s;
    s.start();
  });
}

/* ---------- Voix du navigateur ---------- */
let voices = [];
let ttsBroken = false;
function loadVoices() {
  try { voices = window.speechSynthesis.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang)); } catch (e) { voices = []; }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}
function browserTTS() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window && !ttsBroken;
}

export function ttsAvailable() { return serverOn() || browserTTS(); }
export function voiceCount() { return voices.length; }

/* Deux voix différentes pour les dialogues quand l’appareil en propose plusieurs */
function pickVoice(slot) {
  if (!voices.length) return null;
  const us = voices.filter(v => /en-US/i.test(v.lang)), gb = voices.filter(v => /en-GB/i.test(v.lang));
  const pool = slot % 2 === 0 ? (us.length ? us : voices) : (gb.length ? gb : voices.length > 1 ? [voices[1]] : voices);
  return pool[0];
}

export function stopSpeaking() {
  gen++;
  try { if (src) { src.stop(); src = null; } } catch (e) { /* rien */ }
  try { window.speechSynthesis.cancel(); } catch (e) { /* rien */ }
}

function browserSpeak(text, slot, rate) {
  return new Promise(resolve => {
    if (!browserTTS()) return resolve(false);
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

export async function speak(text, { slot = 0, rate = 0.9 } = {}) {
  const g = gen;
  if (serverOn()) {
    try { return await playBuffer(await voiceBuffer(text, slot, rate), g); }
    catch (e) { if (g !== gen) return false; if (SERVER_ERRORS[e.message]) serverFailed(e.message); }
  }
  return browserSpeak(text, slot, rate);
}

/* Lit une suite de répliques [locuteur, texte] en alternant les voix */
export async function speakLines(lines, rate) {
  stopSpeaking();
  const g = gen;
  const slots = {};
  let n = 0;
  for (const [who] of lines) if (!(who in slots)) slots[who] = n++;
  /* le serveur prépare toutes les répliques en même temps : pas d’attente entre deux voix */
  if (serverOn()) for (const [who, text] of lines) voiceBuffer(text, slots[who], rate).catch(() => {});
  for (const [who, text] of lines) {
    const ok = await speak(text, { slot: slots[who], rate });
    if (!ok || g !== gen) return false;
    await new Promise(r => setTimeout(r, 250));
  }
  return true;
}

/* ---------- Micro ---------- */
function browserSTT() { return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
const canRecord = () => typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
export function sttAvailable() { return (serverOn() && canRecord()) || browserSTT(); }
/* Avec le serveur, on enregistre puis on transcrit : un second appui sur le micro termine la phrase */
export function micByServer() { return serverOn() && canRecord(); }

let current = null;
export function listen({ lang = 'en-US', maxMs = 15000, onPhase } = {}) {
  if (micByServer()) {
    return record({ maxMs, onPhase }).catch(e => {
      if (SERVER_ERRORS[e.message]) { serverFailed(e.message); throw new Error('server'); }
      throw e;
    });
  }
  return browserListen(lang, maxMs);
}

function browserListen(lang, maxMs) {
  return new Promise((resolve, reject) => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return reject(new Error('unavailable'));
    const rec = new R();
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
    current = () => rec.stop();
    try { rec.start(); } catch (e) { finish(e); }
  });
}

async function record({ maxMs, onPhase }) {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { throw new Error(e && e.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture'); }
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => { rec.onstop = r; });
  const stop = () => { if (rec.state !== 'inactive') rec.stop(); };
  let manual = false;
  current = () => { manual = true; stop(); };

  /* Arrêt automatique après 1,5 s de silence (si l’appareil permet de mesurer le volume) */
  let an = null, node = null, heard = false, quietSince = 0;
  const c = audioCtx();
  if (c) {
    try {
      if (c.state !== 'running') await Promise.race([c.resume(), new Promise(r => setTimeout(r, 300))]);
      if (c.state === 'running') { node = c.createMediaStreamSource(stream); an = c.createAnalyser(); an.fftSize = 1024; node.connect(an); }
    } catch (e) { an = null; }
  }
  const samples = an ? new Float32Array(an.fftSize) : null;
  const t0 = Date.now();
  rec.start(250);
  const timer = setInterval(() => {
    const t = Date.now() - t0;
    if (an) {
      an.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += v * v;
      if (Math.sqrt(sum / samples.length) > 0.02) { heard = true; quietSince = 0; }
      else if (heard) { quietSince = quietSince || Date.now(); if (Date.now() - quietSince > 1500) stop(); }
      else if (t > 8000) stop();
    }
    if (t > maxMs) stop();
  }, 100);
  await stopped;
  clearInterval(timer);
  current = null;
  stream.getTracks().forEach(tr => tr.stop());
  try { if (node) node.disconnect(); } catch (e) { /* rien */ }
  /* arrêt manuel : on envoie quand même, la transcription dira s’il y avait des mots */
  if (an && !heard && !manual) throw new Error('no-speech');
  const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
  if (!blob.size) throw new Error('no-speech');
  if (onPhase) onPhase('transcription');
  const r = await call(server, '/stt', { method: 'POST', headers: { 'Content-Type': blob.type.split(';')[0] }, body: blob });
  const { text } = await r.json();
  if (!text || !text.trim()) throw new Error('no-speech');
  return text.trim();
}
export function stopListening() { try { if (current) current(); } catch (e) { /* rien */ } }

export const STT_ERRORS = {
  'not-allowed': 'Le micro est refusé. Autorise-le dans les réglages du navigateur, ou réponds par écrit.',
  'service-not-allowed': 'La reconnaissance vocale n’est pas autorisée ici (fréquent dans une appli installée sur iPhone). Réponds par écrit, ou configure le serveur voix dans le profil.',
  'no-speech': 'Je n’ai rien entendu. Rapproche-toi du micro et réessaie.',
  'network': 'La reconnaissance vocale a besoin d’internet. Réponds par écrit.',
  'audio-capture': 'Aucun micro détecté. Réponds par écrit.',
  'unavailable': 'La reconnaissance vocale n’existe pas dans ce navigateur. Réponds par écrit.',
  'server': 'Le serveur voix n’a pas répondu (ou la limite du jour est atteinte). Réessaie : l’appli repasse sur le micro du navigateur s’il existe, sinon réponds par écrit.'
};

/* ---------- Bruitages (générés avec ElevenLabs) ---------- */
const SFX = { ok: 'son-juste', ko: 'son-faux', combo: 'son-combo', win: 'son-victoire', time: 'son-temps', mic: 'son-micro' };
const cache = {};
export let soundOn = true;
export function setSound(v) { soundOn = !!v; }
export function sfx(name) {
  if (!soundOn || typeof Audio === 'undefined') return;
  try {
    /* version fichier unique : les sons sont intégrés au HTML (window.__LQ_SONS) */
    const embedded = typeof window !== 'undefined' && window.__LQ_SONS && window.__LQ_SONS[SFX[name]];
    const a = cache[name] || (cache[name] = new Audio(embedded || 'sons/' + SFX[name] + '.mp3'));
    a.currentTime = 0;
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch (e) { /* rien */ }
}
