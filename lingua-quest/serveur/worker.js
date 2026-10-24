/* Serveur voix de Lingua Quest (Cloudflare Worker).
   Il garde la clé ElevenLabs à l’abri : l’appli ne la voit jamais, elle envoie seulement le code secret.

   Secrets à créer dans Cloudflare (Settings → Variables and Secrets, type « Secret ») :
     ELEVENLABS_API_KEY  la clé ElevenLabs
     ACCESS_CODE         le code secret que tu tapes dans l’appli
   Réglages facultatifs (type « Text ») :
     DAILY_CHARS   caractères de voix par jour (défaut 4000)
     DAILY_STT     transcriptions du micro par jour (défaut 80)
     VOICE_A, VOICE_B, TTS_MODEL, STT_MODEL
   Plafond par jour : il faut lier un espace KV nommé LQ_KV (sans lui, pas de plafond quotidien,
   seulement la limite de crédits réglée sur la clé ElevenLabs). */

const API = 'https://api.elevenlabs.io/v1';
const VOICES = { a: 'cgSgspJ2msm6clMCkdW9' /* Jessica, américaine */, b: 'JBFqnCBsd6RMkjVDRZzb' /* George, britannique */ };
const MAX_TEXT = 500;
const MAX_AUDIO = 3 * 1024 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-LQ-Code',
  'Access-Control-Max-Age': '86400'
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function sameCode(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function sha(text) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Compteurs du jour (KV) : approximatifs, suffisants pour un seul utilisateur */
const day = () => new Date().toISOString().slice(0, 10);
async function used(env, kind) {
  if (!env.LQ_KV) return 0;
  return +(await env.LQ_KV.get(kind + ':' + day())) || 0;
}
async function add(env, kind, n) {
  if (!env.LQ_KV) return;
  const k = kind + ':' + day();
  await env.LQ_KV.put(k, String((+(await env.LQ_KV.get(k)) || 0) + n), { expirationTtl: 3 * 86400 });
}

async function tts(req, env) {
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'format' }, 400); }
  const text = String(body.text || '').trim();
  if (!text || text.length > MAX_TEXT) return json({ error: 'texte' }, 400);
  const voice = body.voice === 'b' ? (env.VOICE_B || VOICES.b) : (env.VOICE_A || VOICES.a);
  const speed = Math.min(1.2, Math.max(0.7, +body.speed || 1));
  const model = env.TTS_MODEL || 'eleven_flash_v2_5';

  /* Même phrase, même voix, même vitesse : on resert l’audio déjà payé */
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request('https://lq-cache.invalid/tts/' + (await sha([voice, model, speed, text].join('|'))));
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { headers: { ...CORS, 'Content-Type': 'audio/mpeg', 'X-LQ-Cache': 'hit' } });
  }

  const limit = +env.DAILY_CHARS || 4000;
  if ((await used(env, 'chars')) + text.length > limit) return json({ error: 'limite' }, 429);

  const r = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, language_code: 'en', voice_settings: { speed } })
  });
  if (!r.ok) return json({ error: 'elevenlabs', status: r.status }, r.status === 401 ? 502 : r.status === 429 ? 429 : 502);
  const audio = await r.arrayBuffer();
  await add(env, 'chars', text.length);
  if (cache) await cache.put(key, new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=2592000' } }));
  return new Response(audio, { headers: { ...CORS, 'Content-Type': 'audio/mpeg' } });
}

async function stt(req, env) {
  const type = req.headers.get('Content-Type') || 'audio/webm';
  if (!/^(audio|video)\//.test(type)) return json({ error: 'format' }, 400);
  const audio = await req.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > MAX_AUDIO) return json({ error: 'taille' }, 400);
  const limit = +env.DAILY_STT || 80;
  if ((await used(env, 'stt')) >= limit) return json({ error: 'limite' }, 429);

  const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm';
  const form = new FormData();
  form.append('model_id', env.STT_MODEL || 'scribe_v1');
  form.append('language_code', 'en');
  form.append('tag_audio_events', 'false');
  form.append('file', new Blob([audio], { type }), 'reponse.' + ext);
  const r = await fetch(`${API}/speech-to-text`, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY }, body: form });
  if (!r.ok) return json({ error: 'elevenlabs', status: r.status }, r.status === 429 ? 429 : 502);
  const out = await r.json();
  await add(env, 'stt', 1);
  return json({ text: String(out.text || '').trim() });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!env.ELEVENLABS_API_KEY || !env.ACCESS_CODE) return json({ error: 'config' }, 500);
    if (!sameCode(req.headers.get('X-LQ-Code') || '', env.ACCESS_CODE)) return json({ error: 'code' }, 401);
    const path = new URL(req.url).pathname.replace(/\/+$/, '');
    try {
      if (path === '/ping') return json({ ok: true, plafond: !!env.LQ_KV, chars: await used(env, 'chars'), charsMax: +env.DAILY_CHARS || 4000, stt: await used(env, 'stt'), sttMax: +env.DAILY_STT || 80 });
      if (req.method !== 'POST') return json({ error: 'route' }, 404);
      if (path === '/tts') return await tts(req, env);
      if (path === '/stt') return await stt(req, env);
      return json({ error: 'route' }, 404);
    } catch (e) {
      return json({ error: 'serveur' }, 500);
    }
  }
};
