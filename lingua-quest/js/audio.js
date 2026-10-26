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

/* ---------- Déblocage du son (indispensable sur iPhone) ----------
   - mode silencieux : Safari 17+ laisse sortir le son d’une appli qui le demande (audioSession « playback »)
   - Web Audio et la voix du navigateur doivent être lancés une première fois pendant un toucher
   - après une mise en veille, le son est suspendu : on le relance au retour et au toucher suivant */
let actx = null, unlocked = false;
function audioCtx() {
  if (!actx) { const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext); if (AC) try { actx = new AC(); } catch (e) { actx = null; } }
  return actx;
}
/* Mode « lecture » (son malgré le mode silencieux) ; pendant le micro, mode « lecture et enregistrement »,
   sinon iOS refuse le micro (« Aucun micro détecté ») */
let micActive = false;
function setSession(type) {
  try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch (e) { /* non pris en charge */ }
}
function setPlayback() { if (!micActive) setSession('playback'); }
function micStart(type = 'play-and-record') { micActive = true; setSession(type); }
function micEnd() { micActive = false; setPlayback(); }
export function unlockAudio() {
  setPlayback();
  const c = audioCtx();
  if (c && c.state !== 'running') c.resume().catch(() => {});
  if (unlocked) return;
  unlocked = true;
  if (c) {
    try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch (e) { /* rien */ }
    loadSfx();
  }
  /* la voix du navigateur se « réveille » avec une première phrase muette pendant le toucher */
  if (browserTTS()) try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) { /* rien */ }
}
if (typeof window !== 'undefined') {
  setPlayback();
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlockAudio, true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && actx && actx.state !== 'running') actx.resume().catch(() => {}); });
}
/* Message honnête quand le son ne sort pas */
export const SOUND_HELP = 'Pas de son ? Sur iPhone, coupe le mode silencieux (bouton sur le côté) et monte le volume, puis touche à nouveau « Écouter ».';

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
  const data = await new Promise((ok, ko) => c.decodeAudioData(buf.slice(0), ok, ko));
  if (g !== gen) return null;
  return new Promise(res => {
    const s = c.createBufferSource();
    s.buffer = data;
    s.connect(c.destination);
    s.onended = () => { if (src === s) src = null; res(g === gen ? true : null); };
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

let cancelAt = 0;
export function stopSpeaking() {
  gen++;
  try { if (src) { src.stop(); src = null; } } catch (e) { /* rien */ }
  try { const sy = window.speechSynthesis; if (sy.speaking || sy.pending) { sy.cancel(); cancelAt = Date.now(); } } catch (e) { /* rien */ }
}

/* Résultat d’une lecture : true (lue), false (échec : son bloqué ou indisponible), null (interrompue par l’appli) */
async function browserSpeak(text, slot, rate, g) {
  if (!browserTTS()) return false;
  /* Safari perd une phrase lancée juste après une annulation : on laisse passer un instant */
  const wait = 120 - (Date.now() - cancelAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (g !== gen) return null;
  return new Promise(resolve => {
    try {
      const sy = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = slot % 2 === 0 ? 'en-US' : 'en-GB';
      const v = pickVoice(slot);
      if (v) u.voice = v;
      u.rate = rate;
      let done = false;
      const end = ok => { if (done) return; done = true; clearTimeout(guard); resolve(g !== gen ? null : ok); };
      u.onend = () => end(true);
      u.onerror = e => end(e && (e.error === 'interrupted' || e.error === 'canceled') ? null : false);
      /* filet de sécurité : certains navigateurs n’annoncent jamais la fin d’une phrase */
      /* (certains lisent la phrase sans aucun événement : on considère qu’elle est passée) */
      const guard = setTimeout(() => end(true), 2500 + (text.length * 110) / rate);
      if (sy.paused) sy.resume();
      sy.speak(u);
    } catch (e) { ttsBroken = true; resolve(false); }
  });
}

export async function speak(text, { slot = 0, rate = 0.9 } = {}) {
  const g = gen;
  if (serverOn()) {
    try { return await playBuffer(await voiceBuffer(text, slot, rate), g); }
    catch (e) { if (g !== gen) return null; if (SERVER_ERRORS[e.message]) serverFailed(e.message); }
  }
  return browserSpeak(text, slot, rate, g);
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
    if (g !== gen) return null;
    if (ok !== true) return ok;
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
  /* iOS : « audio-capture » si la session audio n’a pas encore basculé ; on réessaie une fois en mode automatique */
  return browserListen(lang, maxMs).catch(e => {
    if (e.message !== 'audio-capture') throw e;
    return new Promise(r => setTimeout(r, 300)).then(() => browserListen(lang, maxMs, 'auto'));
  });
}

function browserListen(lang, maxMs, session = 'play-and-record') {
  return new Promise((resolve, reject) => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return reject(new Error('unavailable'));
    const rec = new R();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    let text = '', done = false;
    const finish = (err) => { if (done) return; done = true; clearTimeout(timer); current = null; micEnd(); err ? reject(err) : resolve(text.trim()); };
    rec.onresult = e => { for (const r of e.results) text += ' ' + r[0].transcript; };
    rec.onerror = e => finish(new Error(e.error || 'error'));
    rec.onend = () => finish(text.trim() ? null : new Error('no-speech'));
    const timer = setTimeout(() => { try { rec.stop(); } catch (e) { /* rien */ } }, maxMs);
    current = () => rec.stop();
    micStart(session);
    try { rec.start(); } catch (e) { finish(e); }
  });
}

async function record({ maxMs, onPhase }) {
  let stream;
  micStart();
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) {
    /* deuxième essai : iOS peut refuser tant que la session audio n’a pas basculé */
    try { await new Promise(r => setTimeout(r, 300)); setSession('auto'); stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e2) {
      micEnd();
      const n = (e2 && e2.name) || (e && e.name);
      throw new Error(n === 'NotAllowedError' || n === 'SecurityError' ? 'not-allowed' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'audio-capture' : 'mic-busy');
    }
  }
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
  /* iPhone : après le micro, le son repasserait par l’écouteur du haut ; on revient en mode lecture */
  micEnd();
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
  'mic-busy': 'Le micro n’a pas pu démarrer (il est peut-être utilisé par une autre appli). Réessaie, ou réponds par écrit.',
  'unavailable': 'La reconnaissance vocale n’existe pas dans ce navigateur. Réponds par écrit.',
  'server': 'Le serveur voix n’a pas répondu (ou la limite du jour est atteinte). Réessaie : l’appli repasse sur le micro du navigateur s’il existe, sinon réponds par écrit.'
};

/* ---------- Bruitages (générés avec ElevenLabs) ---------- */
const SFX = { ok: 'son-juste', ko: 'son-faux', combo: 'son-combo', win: 'son-victoire', time: 'son-temps', mic: 'son-micro' };
const cache = {}, sfxBuf = {};
let sfxLoading = null;
const sfxUrl = file => (typeof window !== 'undefined' && window.__LQ_SONS && window.__LQ_SONS[file]) || 'sons/' + file + '.mp3';
/* Bruitages décodés une fois dans Web Audio : fiables sur iPhone une fois le son débloqué */
function loadSfx() {
  const c = audioCtx();
  if (!c || sfxLoading) return sfxLoading;
  sfxLoading = Promise.all(Object.entries(SFX).map(async ([k, f]) => {
    try { const ab = await (await fetch(sfxUrl(f))).arrayBuffer(); sfxBuf[k] = await new Promise((ok, ko) => c.decodeAudioData(ab, ok, ko)); } catch (e) { /* secours : élément audio */ }
  }));
  return sfxLoading;
}
export let soundOn = true;
export function setSound(v) { soundOn = !!v; }
export function sfx(name) {
  if (!soundOn) return;
  const c = actx;
  if (c && sfxBuf[name]) {
    try {
      if (c.state !== 'running') c.resume().catch(() => {});
      const s = c.createBufferSource(), gain = c.createGain();
      s.buffer = sfxBuf[name];
      gain.gain.value = 0.6;
      s.connect(gain); gain.connect(c.destination);
      s.start();
      return;
    } catch (e) { /* secours ci-dessous */ }
  }
  if (typeof Audio === 'undefined') return;
  try {
    /* version fichier unique : les sons sont intégrés au HTML (window.__LQ_SONS) */
    const embedded = typeof window !== 'undefined' && window.__LQ_SONS && window.__LQ_SONS[SFX[name]];
    const a = cache[name] || (cache[name] = new Audio(embedded || 'sons/' + SFX[name] + '.mp3'));
    a.currentTime = 0;
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch (e) { /* rien */ }
}
