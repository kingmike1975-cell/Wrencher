// Wrencher playtest backend: name + PIN profiles, cloud saves, run log, feedback, admin page.
// Static game files come from ./public; this Worker only sees /api/* and /admin.

const PBKDF2_ITERS = 100000;          // the Workers runtime caps PBKDF2 at 100k
const MAX_FAILS = 5;                  // wrong PINs before a lockout
const LOCK_MS = 15 * 60 * 1000;
const MAX_SAVE = 20000;               // bytes of save JSON
const MAX_FEEDBACK = 4000;            // characters
const ENDINGS = ['gulag', 'retire', 'america'];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === '/api/ping') return json({ ok: true, cloud: true });
      if (p === '/api/login' && req.method === 'POST') return await login(req, env);
      if (p === '/api/save' && req.method === 'GET') return await withPlayer(req, env, getSave);
      if (p === '/api/save' && req.method === 'PUT') return await withPlayer(req, env, putSave);
      if (p === '/api/run' && req.method === 'POST') return await withPlayer(req, env, logRun);
      if (p === '/api/feedback' && req.method === 'POST') return await feedback(req, env);
      if (p === '/api/logout' && req.method === 'POST') return await logout(req, env);
      if (p === '/admin' && req.method === 'GET') return await adminPage(url, env);
      if (p === '/admin/reset' && req.method === 'POST') return await adminReset(req, env);
      if (p.startsWith('/api/')) return json({ error: 'not found' }, 404);
      return new Response('Not found', { status: 404 });
    } catch (e) {
      return json({ error: 'server error', detail: String(e && e.message || e) }, 500);
    }
  },
};

// ---------- helpers ----------
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
const now = () => Date.now();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
async function hashPin(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERS }, key, 256);
  return hex(bits);
}
function sameStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function body(req) { try { return await req.json(); } catch (e) { return null; } }
function cleanName(s) { return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : ''; }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function newSession(env, playerId) {
  const token = randHex(32);
  await env.DB.prepare('INSERT INTO sessions (token_hash, player_id, created_at) VALUES (?, ?, ?)').bind(await sha256(token), playerId, now()).run();
  return token;
}
async function sessionPlayer(req, env) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer ([0-9a-f]{64})$/);
  if (!m) return null;
  return await env.DB.prepare('SELECT p.id, p.name FROM sessions s JOIN players p ON p.id = s.player_id WHERE s.token_hash = ?').bind(await sha256(m[1])).first();
}
async function withPlayer(req, env, fn) {
  const player = await sessionPlayer(req, env);
  if (!player) return json({ error: 'not logged in' }, 401);
  await env.DB.prepare('UPDATE players SET last_seen = ? WHERE id = ?').bind(now(), player.id).run();
  return fn(req, env, player);
}

// ---------- profiles ----------
// One button: a new name creates the profile, a known name checks the PIN.
async function login(req, env) {
  const b = await body(req);
  const name = cleanName(b && b.name), pin = b && String(b.pin || '');
  if (!/^[A-Za-z0-9 _.-]{2,16}$/.test(name)) return json({ error: 'Name: 2 to 16 letters or numbers.' }, 400);
  if (!/^\d{4}$/.test(pin)) return json({ error: 'PIN: exactly 4 digits.' }, 400);
  const key = name.toLowerCase(), t = now();
  let p = await env.DB.prepare('SELECT * FROM players WHERE name_key = ?').bind(key).first();
  if (!p) {
    const salt = randHex(16);
    const r = await env.DB.prepare('INSERT INTO players (name, name_key, pin_hash, pin_salt, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(name, key, await hashPin(pin, salt), salt, t, t).run();
    const id = r.meta.last_row_id;
    return json({ token: await newSession(env, id), name, created: true });
  }
  if (p.locked_until > t) return json({ error: `Too many wrong PINs. Try again in ${Math.ceil((p.locked_until - t) / 60000)} min.` }, 429);
  if (!p.pin_hash) {
    // the admin reset this PIN: whatever they type now becomes the new one
    const salt = randHex(16);
    await env.DB.prepare('UPDATE players SET pin_hash = ?, pin_salt = ?, fails = 0, locked_until = 0, last_seen = ? WHERE id = ?').bind(await hashPin(pin, salt), salt, t, p.id).run();
    return json({ token: await newSession(env, p.id), name: p.name, pinReset: true });
  }
  if (!sameStr(await hashPin(pin, p.pin_salt), p.pin_hash)) {
    const fails = p.fails + 1, locked = fails >= MAX_FAILS ? t + LOCK_MS : 0;
    await env.DB.prepare('UPDATE players SET fails = ?, locked_until = ? WHERE id = ?').bind(locked ? 0 : fails, locked, p.id).run();
    return json({ error: locked ? 'Too many wrong PINs. Locked for 15 min.' : `Wrong PIN for ${p.name}. That name is taken: if it isn't you, pick another.` }, 401);
  }
  await env.DB.prepare('UPDATE players SET fails = 0, locked_until = 0, last_seen = ? WHERE id = ?').bind(t, p.id).run();
  return json({ token: await newSession(env, p.id), name: p.name });
}
async function logout(req, env) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer ([0-9a-f]{64})$/);
  if (m) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(m[1])).run();
  return json({ ok: true });
}

// ---------- saves ----------
async function getSave(req, env, player) {
  const row = await env.DB.prepare('SELECT data, updated_at FROM saves WHERE player_id = ?').bind(player.id).first();
  return json({ name: player.name, save: row ? JSON.parse(row.data) : null, updated_at: row ? row.updated_at : 0 });
}
function cleanSave(b) {
  if (!b || typeof b !== 'object' || !b.shop || typeof b.shop !== 'object') return null;
  const coins = Math.max(0, Math.min(100000, Math.floor(+b.shop.coins || 0)));
  const upg = {};
  if (b.shop.upg && typeof b.shop.upg === 'object') for (const [k, v] of Object.entries(b.shop.upg).slice(0, 50)) {
    if (/^[a-z]{1,16}$/.test(k)) upg[k] = Math.max(0, Math.min(20, Math.floor(+v || 0)));
  }
  return { shop: { coins, upg }, best: Math.max(0, Math.floor(+b.best || 0)), bestScore: Math.max(0, Math.floor(+b.bestScore || 0)) };
}
async function putSave(req, env, player) {
  const text = await req.text();
  if (text.length > MAX_SAVE) return json({ error: 'save too big' }, 413);
  let b; try { b = JSON.parse(text); } catch (e) { return json({ error: 'bad json' }, 400); }
  const save = cleanSave(b);
  if (!save) return json({ error: 'bad save' }, 400);
  // bests never go down, whatever device sent the save
  const old = await env.DB.prepare('SELECT data FROM saves WHERE player_id = ?').bind(player.id).first();
  if (old) { const o = JSON.parse(old.data); save.best = Math.max(save.best, o.best || 0); save.bestScore = Math.max(save.bestScore, o.bestScore || 0); }
  await env.DB.prepare('INSERT INTO saves (player_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(player_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
    .bind(player.id, JSON.stringify(save), now()).run();
  return json({ ok: true, save });
}

// ---------- runs and feedback ----------
async function logRun(req, env, player) {
  const b = await body(req);
  if (!b || !ENDINGS.includes(b.ending)) return json({ error: 'bad run' }, 400);
  const int = v => Math.max(0, Math.min(1e9, Math.floor(+v || 0)));
  await env.DB.prepare('INSERT INTO runs (player_id, ending, reason, shift, score, coins, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(player.id, b.ending, String(b.reason || '').slice(0, 40), int(b.shift), int(b.score), int(b.coins), now()).run();
  return json({ ok: true });
}
async function feedback(req, env) {
  const player = await sessionPlayer(req, env);   // anonymous feedback is fine too
  const b = await body(req);
  const text = b && typeof b.text === 'string' ? b.text.trim().slice(0, MAX_FEEDBACK) : '';
  if (!text) return json({ error: 'Write something first.' }, 400);
  const context = b.context && typeof b.context === 'object' ? JSON.stringify(b.context).slice(0, 1000) : null;
  await env.DB.prepare('INSERT INTO feedback (player_id, text, context, created_at) VALUES (?, ?, ?, ?)').bind(player ? player.id : null, text, context, now()).run();
  return json({ ok: true });
}

// ---------- admin ----------
function adminOk(token, env) { return env.ADMIN_TOKEN && typeof token === 'string' && sameStr(token, env.ADMIN_TOKEN); }
async function adminReset(req, env) {
  const form = await req.formData();
  const t = form.get('t');
  if (!adminOk(t, env)) return new Response('Forbidden', { status: 403 });
  const id = +form.get('id');
  // clear the PIN and any lockout, and sign out their devices; their next login sets a new PIN
  await env.DB.prepare('UPDATE players SET pin_hash = NULL, pin_salt = NULL, fails = 0, locked_until = 0 WHERE id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM sessions WHERE player_id = ?').bind(id).run();
  return Response.redirect(new URL('/admin?t=' + encodeURIComponent(t) + '&done=' + id, req.url).toString(), 303);
}
const when = ms => ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '';
async function adminPage(url, env) {
  const t = url.searchParams.get('t');
  if (!adminOk(t, env)) return new Response('Forbidden: add ?t=YOUR_ADMIN_TOKEN', { status: 403 });
  const players = (await env.DB.prepare(`SELECT p.id, p.name, p.created_at, p.last_seen, p.pin_hash IS NULL AS reset, p.locked_until, s.data,
      (SELECT COUNT(*) FROM runs r WHERE r.player_id = p.id) AS runs,
      (SELECT MAX(shift) FROM runs r WHERE r.player_id = p.id) AS top_shift
    FROM players p LEFT JOIN saves s ON s.player_id = p.id ORDER BY p.last_seen DESC`).all()).results;
  const runs = (await env.DB.prepare('SELECT r.*, p.name FROM runs r JOIN players p ON p.id = r.player_id ORDER BY r.id DESC LIMIT 100').all()).results;
  const fb = (await env.DB.prepare('SELECT f.*, p.name FROM feedback f LEFT JOIN players p ON p.id = f.player_id ORDER BY f.id DESC LIMIT 200').all()).results;
  const endings = (await env.DB.prepare('SELECT ending, COUNT(*) AS n, MAX(score) AS top FROM runs GROUP BY ending').all()).results;
  const T = esc(t);
  const pRows = players.map(p => {
    const s = p.data ? JSON.parse(p.data) : { shop: { coins: 0, upg: {} } };
    const upg = Object.entries(s.shop.upg || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(', ');
    const status = p.reset ? 'PIN reset' : p.locked_until > Date.now() ? 'locked' : '';
    return `<tr><td>${esc(p.name)}</td><td>${when(p.created_at)}</td><td>${when(p.last_seen)}</td><td>${s.shop.coins}</td><td>${esc(upg)}</td>
      <td>${(s.bestScore || 0).toLocaleString()}</td><td>${p.runs}</td><td>${p.top_shift || ''}</td><td>${status}</td>
      <td><form method="post" action="/admin/reset" onsubmit="return confirm('Reset PIN for ${esc(p.name)}?')"><input type="hidden" name="t" value="${T}"><input type="hidden" name="id" value="${p.id}"><button>Reset PIN</button></form></td></tr>`;
  }).join('');
  const rRows = runs.map(r => `<tr><td>${when(r.created_at)}</td><td>${esc(r.name)}</td><td>${esc(r.ending)}</td><td>${esc(r.reason)}</td><td>${r.shift}</td><td>${(r.score || 0).toLocaleString()}</td><td>${r.coins}</td></tr>`).join('');
  const fRows = fb.map(f => `<tr><td>${when(f.created_at)}</td><td>${esc(f.name || 'anonymous')}</td><td class="fb">${esc(f.text)}</td><td class="ctx">${esc(f.context || '')}</td></tr>`).join('');
  const eLine = endings.map(e => `${esc(e.ending)}: ${e.n} (top ${(e.top || 0).toLocaleString()})`).join(' · ') || 'no runs yet';
  const done = url.searchParams.get('done') ? '<p class="ok">PIN cleared. Their next login sets a new one.</p>' : '';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wrencher Playtest Admin</title><style>
:root{color-scheme:dark}body{background:#0b0a10;color:#f3e9d2;font:15px/1.4 ui-monospace,Menlo,monospace;margin:0;padding:16px}
h1{color:#e8c547;font-size:20px;margin:0 0 4px}h2{color:#e8c547;font-size:16px;margin:24px 0 8px}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:640px}th,td{border-bottom:1px solid #2b2836;padding:6px 8px;text-align:left;vertical-align:top}
th{color:#a59eb2;font-weight:normal}.fb{white-space:pre-wrap;max-width:520px}.ctx{color:#a59eb2;font-size:12px;max-width:260px;word-break:break-all}
button{background:#c8323a;color:#f3e9d2;border:1px solid #e8c547;padding:4px 8px;font:inherit;cursor:pointer}.ok{color:#7fd17f}.sum{color:#a59eb2}
</style></head><body><h1>Wrencher playtest</h1><p class="sum">${players.length} players · ${runs.length} recent runs · ${fb.length} feedback notes · ${eLine}</p>${done}
<h2>Feedback</h2><div class="wrap"><table><tr><th>When (UTC)</th><th>Player</th><th>Note</th><th>Where</th></tr>${fRows || '<tr><td colspan="4">None yet</td></tr>'}</table></div>
<h2>Players</h2><div class="wrap"><table><tr><th>Name</th><th>Joined</th><th>Last seen</th><th>Coins</th><th>Upgrades</th><th>Best score</th><th>Runs</th><th>Top shift</th><th>Status</th><th></th></tr>${pRows || '<tr><td colspan="10">None yet</td></tr>'}</table></div>
<h2>Recent runs</h2><div class="wrap"><table><tr><th>When (UTC)</th><th>Player</th><th>Ending</th><th>Reason</th><th>Shift</th><th>Score</th><th>Coins</th></tr>${rRows || '<tr><td colspan="7">None yet</td></tr>'}</table></div>
</body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
