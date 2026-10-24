/* Serveur voix : code secret, plafonds, appels ElevenLabs (simulés : aucun crédit dépensé) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../serveur/worker.js';

function kv() {
  const m = new Map();
  return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, m };
}
const ENV = () => ({ ELEVENLABS_API_KEY: 'cle-test', ACCESS_CODE: 'secret-123', LQ_KV: kv(), DAILY_CHARS: '30', DAILY_STT: '2' });
const req = (path, opts = {}) => new Request('https://voix.test' + path, { ...opts, headers: { 'X-LQ-Code': 'secret-123', ...(opts.headers || {}) } });

let calls = [];
globalThis.fetch = async (url, opts) => {
  calls.push({ url: String(url), opts });
  if (String(url).includes('/text-to-speech/')) return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } });
  if (String(url).endsWith('/speech-to-text')) return Response.json({ text: ' I have been working here. ' });
  return new Response('?', { status: 404 });
};

test('refuse sans le bon code, et sans secrets', async () => {
  let r = await worker.fetch(new Request('https://voix.test/ping', { headers: { 'X-LQ-Code': 'faux' } }), ENV());
  assert.equal(r.status, 401);
  r = await worker.fetch(req('/ping'), { ACCESS_CODE: 'secret-123' });
  assert.equal(r.status, 500);
  assert.equal((await r.json()).error, 'config');
});

test('CORS : la requête préalable passe', async () => {
  const r = await worker.fetch(new Request('https://voix.test/tts', { method: 'OPTIONS' }), ENV());
  assert.equal(r.status, 204);
  assert.match(r.headers.get('Access-Control-Allow-Headers'), /X-LQ-Code/);
});

test('voix : appelle ElevenLabs avec la clé, compte les caractères, applique le plafond', async () => {
  calls = [];
  const env = ENV();
  const body = t => JSON.stringify({ text: t, voice: 'b', speed: 1.1 });
  let r = await worker.fetch(req('/tts', { method: 'POST', body: body('Hello there, friend.') }), env);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Content-Type'), 'audio/mpeg');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /JBFqnCBsd6RMkjVDRZzb/);
  assert.equal(calls[0].opts.headers['xi-api-key'], 'cle-test');
  assert.equal(JSON.parse(calls[0].opts.body).voice_settings.speed, 1.1);
  r = await worker.fetch(req('/tts', { method: 'POST', body: body('This one is too long now.') }), env);
  assert.equal(r.status, 429);
  assert.equal((await r.json()).error, 'limite');
  assert.equal(calls.length, 1);
  r = await worker.fetch(req('/ping'), env);
  const p = await r.json();
  assert.equal(p.chars, 20);
  assert.equal(p.plafond, true);
});

test('voix : refuse un texte vide ou trop long', async () => {
  const env = ENV();
  for (const t of ['', 'x'.repeat(501)]) {
    const r = await worker.fetch(req('/tts', { method: 'POST', body: JSON.stringify({ text: t }) }), env);
    assert.equal(r.status, 400);
  }
});

test('micro : transcrit et applique le plafond', async () => {
  const env = ENV();
  const send = () => worker.fetch(req('/stt', { method: 'POST', headers: { 'Content-Type': 'audio/webm' }, body: new Uint8Array([9, 9, 9]) }), env);
  let r = await send();
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { text: 'I have been working here.' });
  await send();
  r = await send();
  assert.equal(r.status, 429);
});

test('micro : refuse ce qui n’est pas de l’audio', async () => {
  const r = await worker.fetch(req('/stt', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' }), ENV());
  assert.equal(r.status, 400);
});
