import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';
import { t, lang, setLang } from './i18n.js';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = i => document.getElementById(i);
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const TAUNTS = ['مليح', 'كتل', 'بلع', 'نزيدك خطرة', 'لعبك', 'راسي'];

let me = null, profile = null, G = null, seat = 0, ch = null, host = false, code = '';
let cur = 'auth', T, tt, quiet = false, savedMid = null, graceMv = -1, lobby = [], assign = {}, pend = null;

/* ---------- views / history ---------- */
const show = v => { cur = v; document.querySelectorAll('.v').forEach(e => e.classList.toggle('hidden', e.id !== 'v-' + v)); };
const toast = m => { const e = $('toast'); e.textContent = m; e.classList.remove('hidden'); clearTimeout(tt); tt = setTimeout(() => e.classList.add('hidden'), 2500); };
function leave() { clearTimeout(T); if (ch) { sb.removeChannel(ch); ch = null; } G = null; host = false; show('menu'); }
window.onpopstate = () => {
  if (quiet) { quiet = false; return; }
  if (cur === 'game' || cur === 'lobby') { if (confirm(t('leave'))) leave(); else history.pushState({ g: 1 }, ''); }
};
const goBack = () => { quiet = true; leave(); history.back(); };
$('backL').onclick = goBack; $('backG').onclick = goBack;

/* ---------- auth + profile ---------- */
$('signup').onclick = async () => {
  const { error } = await sb.auth.signUp({ email: $('email').value, password: $('pass').value, options: { data: { username: $('uname').value.trim() } } });
  $('autherr').textContent = error ? error.message : t('checkMail');
};
$('login').onclick = async () => {
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value, password: $('pass').value });
  if (error) $('autherr').textContent = error.message;
};
$('logout').onclick = () => sb.auth.signOut();
sb.auth.onAuthStateChange((_, s) => setTimeout(async () => {
  me = s ? s.user : null;
  if (me) { await loadProfile(); show('menu'); } else show('auth');
}, 0));
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', me.id).single();
  profile = data; if (!data) return;
  const n = data.wins + data.losses, r = n ? Math.round(100 * data.wins / n) : 0;
  $('stats').innerHTML = `<b>${esc(data.username)}</b> · ${t('wins')} ${data.wins} · ${t('losses')} ${data.losses} · ${t('score')} ${data.total_score} · ${r}%`;
}
$('toLb').onclick = async () => {
  show('lb');
  const { data } = await sb.from('leaderboard').select('*');
  $('lbbody').innerHTML = (data || []).map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.username)}</td><td>${p.wins}</td><td>${p.losses}</td><td>${p.total_score}</td><td>${p.win_rate}%</td></tr>`).join('');
  const h = await sb.from('match_logs').select('*').contains('players', [me.id]).order('played_at', { ascending: false }).limit(10);
  $('hist').innerHTML = (h.data || []).map(m => `<li>${new Date(m.played_at).toLocaleDateString()} · ${esc(m.mode)} · ${m.team1_score} - ${m.team2_score}</li>`).join('');
};
$('backLb').onclick = () => show('menu');

/* ---------- Algerian dominoes engine ---------- */
const pips = h => h.reduce((a, x) => a + x[0] + x[1], 0);
const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const deck = () => { const d = []; for (let a = 0; a < 7; a++) for (let b = a; b < 7; b++) d.push([a, b]); return d; };

function newGame(players, target, room) {
  const g = { mid: crypto.randomUUID(), room, n: players.length, target, sc: [0, 0], round: 0, mv: 0, over: false,
    p: players.map((p, i) => ({ ...p, team: i % 2, hand: [] })) };
  newRound(g, null); return g;
}
function newRound(g, starter) {
  const d = shuf(deck());
  g.p.forEach(p => p.hand = d.splice(0, 7));
  g.bone = d; g.board = []; g.passes = 0; g.roundOver = null; g.must = null; g.round++;
  if (starter === null) { // round 1: highest double starts (else highest tile)
    let bk = -1;
    g.p.forEach((p, i) => p.hand.forEach(x => { const k = (x[0] === x[1] ? 100 : 0) + x[0] + x[1]; if (k > bk) { bk = k; g.must = x; g.turn = i; } }));
  } else g.turn = starter;
}
function legal(g, s) {
  const r = [];
  g.p[s].hand.forEach((x, i) => {
    if (!g.board.length) { if (!g.must || (x[0] === g.must[0] && x[1] === g.must[1])) r.push([i, 'R']); }
    else { if (x[0] === g.L || x[1] === g.L) r.push([i, 'L']); if (x[0] === g.R || x[1] === g.R) r.push([i, 'R']); }
  });
  return r;
}
function place(g, s, i, side) {
  const x = g.p[s].hand.splice(i, 1)[0];
  if (!g.board.length) { g.board.push(x); g.L = x[0]; g.R = x[1]; }
  else if (side === 'L') { const o = x[1] === g.L ? x : [x[1], x[0]]; g.board.unshift(o); g.L = o[0]; }
  else { const o = x[0] === g.R ? x : [x[1], x[0]]; g.board.push(o); g.R = o[1]; }
  g.passes = 0;
}
function endRound(g, s) { // empty hand or blocked game (مبلعة)
  const tot = [0, 0]; g.p.forEach(p => tot[p.team] += pips(p.hand));
  let w = -1;
  if (!g.p[s].hand.length) { w = g.p[s].team; g.next = s; }
  else { if (tot[0] !== tot[1]) w = tot[0] < tot[1] ? 0 : 1; g.next = w < 0 ? s : g.p.findIndex(p => p.team === w); }
  const pts = w >= 0 ? tot[1 - w] : 0;
  if (w >= 0) g.sc[w] += pts;
  g.roundOver = { w, pts };
  if (Math.max(...g.sc) >= g.target && g.sc[0] !== g.sc[1]) g.over = true;
}
function act(g, s, a) {
  if (g.over || g.roundOver || g.turn !== s) return false;
  const lg = legal(g, s);
  if (a.t === 'play') {
    if (!lg.some(([i, sd]) => i === a.i && (sd === a.side || !g.board.length))) return false;
    place(g, s, a.i, a.side); g.mv++;
    if (!g.p[s].hand.length) endRound(g, s); else g.turn = (s + 1) % g.n;
    return true;
  }
  if (a.t === 'draw') {
    if (lg.length || g.n !== 2 || !g.bone.length) return false;
    g.p[s].hand.push(g.bone.pop()); return true;
  }
  if (a.t === 'pass') {
    if (lg.length || (g.n === 2 && g.bone.length)) return false;
    g.passes++; g.mv++;
    if (g.passes >= g.n) endRound(g, s); else g.turn = (s + 1) % g.n;
    return true;
  }
  return false;
}

/* ---------- bots ---------- */
function botPick(g) {
  const s = g.turn, p = g.p[s], h = p.hand, lg = legal(g, s), pick = ([i, sd]) => ({ t: 'play', i, side: sd });
  if (p.lvl === 'easy') return pick(lg[Math.random() * lg.length | 0]);
  const seen = Array(7).fill(0), mine = Array(7).fill(0);
  g.board.forEach(x => { seen[x[0]]++; seen[x[1]]++; });
  h.forEach(x => { mine[x[0]]++; mine[x[1]]++; });
  let best = lg[0], bs = -1e9;
  for (const [i, sd] of lg) {
    const x = h[i]; let e;
    if (!g.board.length) e = [x[0], x[1]];
    else if (sd === 'L') e = [x[1] === g.L ? x[0] : x[1], g.R];
    else e = [g.L, x[0] === g.R ? x[1] : x[0]];
    let sc = x[0] + x[1] + (x[0] === x[1] ? 2 : 0) + Math.random();
    if (p.lvl === 'hard') { // card counting: keep suits I hold, leave ends opponents likely lack
      const m = mine.slice(), s2 = seen.slice();
      m[x[0]]--; m[x[1]]--; s2[x[0]]++; s2[x[1]]++;
      sc += e.reduce((a, v) => a + 2 * m[v] - 2 * Math.max(0, 8 - s2[v] - m[v]), 0);
    }
    if (sc > bs) { bs = sc; best = [i, sd]; }
  }
  return pick(best);
}

/* ---------- turn loop (offline or room host acts as authority) ---------- */
const authority = () => !ch || host;
function push() {
  if (ch && host) ch.send({ type: 'broadcast', event: 'state', payload: G });
  tick(); saveIfOver();
}
function tick() {
  render();
  const g = G; if (!g || !authority()) return;
  clearTimeout(T);
  if (g.over) return;
  if (g.roundOver) { T = setTimeout(() => { newRound(g, g.next); push(); }, 3500); return; }
  const p = g.p[g.turn], lg = legal(g, g.turn), s = g.turn;
  if (!lg.length) {
    if (g.n === 2 && g.bone.length) { if (p.bot) T = setTimeout(() => { act(g, s, { t: 'draw' }); push(); }, 500); }
    else T = setTimeout(() => { act(g, s, { t: 'pass' }); push(); }, 900);
    return;
  }
  if (p.bot) T = setTimeout(() => { act(g, s, botPick(g)); push(); }, 800);
}
function send(a) {
  if (a.t === 'play') graceMv = G.mv + 1;
  if (authority()) { if (act(G, seat, a)) push(); }
  else ch.send({ type: 'broadcast', event: 'intent', payload: { uid: me.id, seat, a } });
}

/* ---------- saving the result ---------- */
async function saveIfOver() {
  if (!G || !G.over || savedMid === G.mid || !me || !G.p.some(p => p.uid === me.id)) return;
  savedMid = G.mid;
  const ids = k => G.p.filter(p => p.team === k && p.uid).map(p => p.uid);
  const { error } = await sb.rpc('record_match', { p_match: G.mid, p_room: G.room, p_mode: G.n === 2 ? '1v1' : '2v2',
    p_t1: G.sc[0], p_t2: G.sc[1], p_team1: ids(0), p_team2: ids(1) });
  if (error) toast(error.message); else loadProfile();
}

/* ---------- rendering ---------- */
const P = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const half = n => `<div class="h">${[...Array(9).keys()].map(i => `<i class="${P[n].includes(i) ? 'on' : ''}"></i>`).join('')}</div>`;
const tile = (a, b, x = '', c = '') => `<div class="tile ${a === b ? 'v' : ''} ${c}" ${x}>${half(a)}${half(b)}</div>`;
const canTaunt = () => G && !G.over && (G.turn === seat || G.mv <= graceMv);

function render() {
  if (!G || cur !== 'game') return;
  const g = G, mine = g.p[seat], lg = legal(g, seat), ok = new Set(lg.map(x => x[0]));
  const my = g.turn === seat && !g.roundOver && !g.over;
  $('sc').textContent = `${t('team1')} ${g.sc[0]} - ${g.sc[1]} ${t('team2')} (${g.target})`;
  $('opps').innerHTML = g.p.map((p, i) => i === seat ? '' : `<div class="opp ${g.turn === i ? 'turn' : ''}">${esc(p.name)} ×${p.hand.length}</div>`).join('')
    + (g.bone.length ? `<div class="opp">🂠 ${g.bone.length}</div>` : '');
  $('board').innerHTML = g.board.map(([a, b]) => tile(a, b)).join('');
  $('hand').innerHTML = mine.hand.map(([a, b], i) => tile(a, b, `data-i="${i}"`, my && ok.has(i) ? 'ok' : '')).join('');
  $('msg').textContent = g.over ? (g.sc[mine.team] > g.sc[1 - mine.team] ? t('matchWin') : t('matchLose'))
    : g.roundOver ? (g.roundOver.w < 0 ? t('tie') : (g.roundOver.w === mine.team ? t('youWin') : t('youLose'))) + (g.roundOver.pts ? ' +' + g.roundOver.pts : '')
    : my ? t('yourTurn') : t('wait') + ' ' + g.p[g.turn].name;
  $('drawBtn').classList.toggle('hidden', !(my && !lg.length && g.n === 2 && g.bone.length));
  $('backG').classList.toggle('hidden', !g.over);
  if (!my) $('choose').classList.add('hidden');
  document.querySelectorAll('.tb').forEach(b => b.disabled = !canTaunt());
}
$('hand').onclick = e => {
  const el = e.target.closest('[data-i]'); if (!el || !G) return;
  const i = +el.dataset.i;
  if (G.turn !== seat || G.roundOver || G.over) return;
  const o = legal(G, seat).filter(x => x[0] === i);
  if (!o.length) return;
  if (o.length === 1 || !G.board.length) send({ t: 'play', i, side: o[0][1] });
  else { pend = i; $('choose').classList.remove('hidden'); }
};
const choose = side => { $('choose').classList.add('hidden'); send({ t: 'play', i: pend, side }); };
$('cl').onclick = () => choose('L'); $('cr').onclick = () => choose('R');
$('drawBtn').onclick = () => send({ t: 'draw' });

/* taunts: only on my turn, or the moment I finish it */
$('taunts').innerHTML = TAUNTS.map(x => `<button class="btn alt tb" disabled>${x}</button>`).join('');
$('taunts').onclick = e => {
  const b = e.target.closest('.tb'); if (!b || !canTaunt()) return;
  const m = `${profile ? profile.username : ''}: ${b.textContent}`;
  toast(m); if (ch) ch.send({ type: 'broadcast', event: 'taunt', payload: m });
};

/* ---------- vs bot ---------- */
$('startBot').onclick = () => {
  const n = +$('bn').value, lvl = $('bl').value, bot = x => ({ name: x, bot: 1, lvl });
  const bots = n === 2 ? [bot('🤖')] : [bot('🤖 1'), bot('🤝 🤖'), bot('🤖 2')]; // seats: me, opp, partner, opp
  seat = 0; ch = null; host = false;
  G = newGame([{ uid: me.id, name: profile.username }, ...bots], +$('bt').value, 'bot');
  history.pushState({ g: 1 }, ''); show('game'); tick();
};

/* ---------- online private rooms (Realtime Broadcast + Presence) ---------- */
$('createRoom').onclick = () => joinRoom(Math.random().toString(36).slice(2, 7).toUpperCase(), true);
$('joinRoom').onclick = () => { const c = $('rcode').value.trim().toUpperCase(); if (c) joinRoom(c, false); };
function joinRoom(c, h) {
  code = c; host = h; assign = {}; lobby = [];
  ch = sb.channel('dom:' + c, { config: { broadcast: { self: false }, presence: { key: me.id } } });
  ch.on('presence', { event: 'sync' }, () => {
    lobby = Object.values(ch.presenceState()).map(a => a[0]).sort((a, b) => a.at - b.at);
    if (host) {
      lobby.forEach(p => { if (assign[p.uid] === undefined) assign[p.uid] = Object.values(assign).filter(v => v === 0).length <= Object.values(assign).filter(v => v === 1).length ? 0 : 1; });
      ch.send({ type: 'broadcast', event: 'assign', payload: assign });
    }
    renderLobby();
  })
    .on('broadcast', { event: 'assign' }, ({ payload }) => { assign = payload; renderLobby(); })
    .on('broadcast', { event: 'state' }, ({ payload }) => {
      G = payload; seat = G.p.findIndex(p => p.uid === me.id); if (seat < 0) return;
      if (cur !== 'game') show('game');
      render(); saveIfOver();
    })
    .on('broadcast', { event: 'intent' }, ({ payload: p }) => {
      if (host && G && G.p[p.seat] && G.p[p.seat].uid === p.uid && act(G, p.seat, p.a)) push();
    })
    .on('broadcast', { event: 'taunt' }, ({ payload }) => toast(payload))
    .subscribe(async st => { if (st === 'SUBSCRIBED') await ch.track({ uid: me.id, name: profile.username, at: Date.now() }); });
  history.pushState({ g: 1 }, '');
  $('roomcode').textContent = c; $('hostbox').classList.toggle('hidden', !h);
  show('lobby');
}
function renderLobby() {
  $('lobbylist').innerHTML = lobby.map(p => `<div class="flex justify-between bg-slate-800 rounded p-2"><span>${esc(p.name)}</span>
    <button class="btn alt tg" data-u="${p.uid}" ${host ? '' : 'disabled'}>${t(assign[p.uid] === 1 ? 'team2' : 'team1')}</button></div>`).join('');
}
$('lobbylist').onclick = e => {
  const b = e.target.closest('.tg'); if (!b || !host) return;
  assign[b.dataset.u] = assign[b.dataset.u] === 1 ? 0 : 1;
  ch.send({ type: 'broadcast', event: 'assign', payload: assign }); renderLobby();
};
$('startRoom').onclick = () => {
  const t0 = lobby.filter(p => assign[p.uid] === 0), t1 = lobby.filter(p => assign[p.uid] === 1);
  if (t0.length !== t1.length || ![1, 2].includes(t0.length)) return toast(t('needTeams'));
  const o = t0.length === 1 ? [t0[0], t1[0]] : [t0[0], t1[0], t0[1], t1[1]]; // seats alternate teams
  G = newGame(o.map(p => ({ uid: p.uid, name: p.name })), +$('rt').value, code);
  seat = G.p.findIndex(p => p.uid === me.id);
  show('game'); push();
};

/* ---------- init ---------- */
$('lang').value = lang();
$('lang').onchange = e => { setLang(e.target.value); if (profile) loadProfile(); render(); if (cur === 'lobby') renderLobby(); };
setLang(lang());
