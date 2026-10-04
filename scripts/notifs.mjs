/* Envoyeur des notifications Coach. Lancé toutes les 5 minutes par .github/workflows/notifs.yml.
   Lit le secret COACH_PUSH (code donné par l'appli) et envoie les rappels dont l'heure est arrivée.
   Les messages viennent de index.html (SESSIONS, MEALS, MSG) : une seule source pour l'appli et les notifs. */
import fs from 'node:fs';
import webpush from 'web-push';

const STATE = process.env.STATE_FILE || '.notifs-state.json';
const raw = (process.env.COACH_PUSH || '').trim();
if (!raw) { console.log('Secret COACH_PUSH absent : rien à envoyer.'); process.exit(0); }
const cfg = JSON.parse(Buffer.from(raw.replace(/^COACH1\./, ''), 'base64url').toString('utf8'));
process.env.TZ = cfg.tz || 'Europe/Paris';
webpush.setVapidDetails('https://github.com/mamoudoumm1075-cyber/Coach', cfg.pub, cfg.priv);

/* données et fonctions de l'appli */
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('index.html : bloc introuvable ' + a); return html.slice(i, j); };
const fn = name => { const m = html.match(new RegExp('^function ' + name + '\\(.*$', 'm')); if (!m) throw new Error('index.html : fonction introuvable ' + name); return m[0]; };
const { MSG, fill, pick } = new Function(
  cut('const SESSIONS=', '/* Contenu évolutif') + cut('const MEALS=', 'const GYM_DAYS') +
  'function meals(){ return MEALS; }\n' + [fn('dayNum'), fn('pick'), fn('fill')].join('\n') + '\nreturn {MSG,fill,pick,dayNum};')();
const dayNum = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

/* rappels d'une journée : même logique que l'export agenda, heure = moment de la notif */
function remindersFor(day) {
  const o = cfg.rem, dow = day.getDay(), n = dayNum(day), out = [];
  const at = (hm, before = 0) => { const [H, M] = hm.split(':').map(Number); return new Date(day.getFullYear(), day.getMonth(), day.getDate(), H, M - before); };
  if (dow >= 1 && dow <= 5) {
    if (o.pesee && dow === 5) out.push([at(o.peseeT), 'pesee', '⚖️ ' + pick(MSG.pesee, n)]);
    if (o.midi) out.push([at(o.midiT), 'midi', '🍽️ ' + fill(pick(MSG.midi, n), dow, n)]);
    if (o.gym) out.push([at(o.gymT, 30), 'gym', '💪 ' + fill(pick(MSG.gym, n), dow, n)]);
    if (o.soir) out.push([at(o.soirT), 'soir', '🌙 ' + pick(MSG.soirOk, n)]);
  } else if (o.we) out.push([at(dow === 6 ? '10:00' : '18:00'), 'we', (dow === 6 ? '⚽ ' : '🛒 ') + pick(dow === 6 ? MSG.sam : MSG.dim, n)]);
  return out;
}

const started = Date.now(), now = Number(process.env.NOW_MS) || started; /* NOW_MS : pour tester */
const clock = () => now + Date.now() - started;
const AHEAD = 5 * 60e3, MAX_LATE = 60 * 60e3;
let last = now - 15 * 60e3;
try { last = Math.max(JSON.parse(fs.readFileSync(STATE, 'utf8')).last, now - MAX_LATE); } catch (_) {}
if (process.env.TEST === '1') {
  /* lancement manuel : envoie une notif d'essai tout de suite */
  await send({ title: 'Coach', body: "Notif d'essai : l'envoyeur GitHub fonctionne 💪", tag: 'test' });
  process.exit(0);
}
const today = new Date(now); today.setHours(0, 0, 0, 0);
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
const due = [...remindersFor(yesterday), ...remindersFor(today)]
  .filter(([t]) => t.getTime() > last && t.getTime() <= now + AHEAD)
  .sort((a, b) => a[0] - b[0]);

async function send(p) {
  try { await webpush.sendNotification(cfg.sub, JSON.stringify(p), { TTL: 3600, urgency: 'high' }); console.log('Envoyé :', p.body); }
  catch (e) {
    console.error('Échec :', e.statusCode, e.body || e.message);
    if (e.statusCode === 404 || e.statusCode === 410) console.error("Abonnement expiré : rappuie sur « Activer les notifications » dans l'appli et recolle le code.");
    process.exitCode = 1;
  }
}
let sentUntil = last;
for (const [t, kind, body] of due) {
  const wait = t.getTime() - clock();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  await send({ title: 'Coach', body, tag: kind + '-' + dayNum(t) });
  sentUntil = t.getTime();
}
fs.writeFileSync(STATE, JSON.stringify({ last: Math.max(sentUntil, now) }));
console.log(due.length ? `${due.length} notif(s) traitée(s).` : 'Rien à envoyer maintenant.');
