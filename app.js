import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';
import { t, lang, setLang } from './i18n.js';
import { sfx, isOn, toggle } from './sound.js';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = i => document.getElementById(i);
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const TAUNTS = ['مليح', 'كتل', 'بلع', 'نزيدك خطرة', 'لا عجبك', 'راسي'];

let me = null, profile = null, G = null, seat = 0, ch = null, host = false, code = '';
let cur = 'auth', T, tt, quiet = false, savedMid = null, graceMv = -1, lobby = [], assign = {}, pend = null;

/* ---------- session persistence: come back to the same game after leaving the browser ---------- */
const SK = 'dom_session';
const saveSess = () => { try { if (me && (G || ch)) localStorage.setItem(SK, JSON.stringify({ uid: me.id, code: ch ? code : null, host, seat, G, ts: Date.now() })); } catch {} };
const clearSess = () => { try { localStorage.removeItem(SK); } catch {} };
function resume() {
  let r = null; try { r = JSON.parse(localStorage.getItem(SK)); } catch {}
  if (!r || r.uid !== me.id || Date.now() - r.ts > 6 * 3600e3) { clearSess(); return false; }
  if (r.G) fxS = { mid: r.G.mid, n: r.G.board.length, bone: r.G.bone.length, round: r.G.round, ps: r.G.passes, turn: r.G.turn, ro: !!r.G.roundOver, over: r.G.over, rd: r.G.rdId }; // no replayed sounds
  if (r.code) { joinRoom(r.code, r.host, r.G, r.seat); return true; }
  if (!r.G) return false;
  G = r.G; seat = r.seat; ch = null; host = false;
  history.pushState({ g: 1 }, ''); show('game'); tick(); return true;
}

let tnames = ['', '']; // group names chosen by the host
const tn = k => tnames[k] || t(k ? 'team2' : 'team1');

/* ---------- views / history ---------- */
const show = v => { cur = v; document.body.dataset.v = v; document.querySelectorAll('.v').forEach(e => e.classList.toggle('hidden', e.id !== 'v-' + v)); };
const toast = m => { const e = $('toast'); e.textContent = m; e.classList.remove('hidden'); clearTimeout(tt); tt = setTimeout(() => e.classList.add('hidden'), 2500); };
function leave() { clearSess(); clearTimeout(T); if (ch) { sb.removeChannel(ch); ch = null; } G = null; host = false; show('menu'); }
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
sb.auth.onAuthStateChange((ev, sess) => setTimeout(async () => {
  const u = sess ? sess.user : null;
  if (u && me && u.id === me.id) { me = u; return; } // token refresh / tab focus: leave the screen alone
  me = u;
  if (me) { await loadProfile(); if (!resume()) show('menu'); }
  else { if (ev === 'SIGNED_OUT') clearSess(); if (ch) { sb.removeChannel(ch); ch = null; } clearTimeout(T); G = null; show('auth'); }
}, 0));
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', me.id).single();
  profile = data; if (!data) return;
  const n = data.wins + data.losses, r = n ? Math.round(100 * data.wins / n) : 0;
  $('stats').innerHTML = `<div class="who">${esc(data.username)}</div><div class="stats">${[[t('wins'), data.wins], [t('losses'), data.losses], [t('score'), data.total_score], [t('rate'), r + '%']].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>`;
}
$('toLb').onclick = async () => {
  show('lb'); $('statsBox').innerHTML = '…';
  const { data } = await sb.from('match_logs').select('*').contains('players', [me.id]).order('played_at', { ascending: false }).limit(500);
  const rows = (data || []).map(m => {
    const side = (m.team1 || []).includes(me.id) ? 0 : (m.team2 || []).includes(me.id) ? 1 : -1;
    const won = side >= 0 ? (side === 0 ? m.team1_score > m.team2_score : m.team2_score > m.team1_score) : m.winner_id === me.id;
    const hi = Math.max(m.team1_score, m.team2_score), lo = Math.min(m.team1_score, m.team2_score);
    const my = side < 0 ? (won ? hi : lo) : side ? m.team2_score : m.team1_score, opp = side < 0 ? (won ? lo : hi) : side ? m.team1_score : m.team2_score;
    return { m, won, my, opp, bot: m.room_id === 'bot' };
  });
  const n = rows.length, W = rows.filter(r => r.won).length, cnt = f => rows.filter(f).length, pf = rows.reduce((a, r) => a + r.my, 0);
  let best = 0, run = 0, cur = 0; [...rows].reverse().forEach(r => { run = r.won ? run + 1 : 0; best = Math.max(best, run); });
  for (const r of rows) { if (r.won) cur++; else break; }
  const wl = f => { const x = rows.filter(f), w = x.filter(r => r.won).length; return `${w} - ${x.length - w}`; };
  const card = (v, k) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`;
  $('statsBox').innerHTML = n ? `<div class="stats">${card(n, t('played'))}${card(W, t('wins'))}${card(n - W, t('losses'))}${card(Math.round(100 * W / n) + '%', t('rate'))}`
    + `${card(pf, t('points'))}${card(Math.round(pf / n), t('avg'))}${card(cur, t('streak'))}${card(best, t('bestStreak'))}`
    + `${card(cnt(r => r.won && r.opp === 0), t('capots'))}${card(cnt(r => !r.won && r.my === 0), t('capotsAg'))}${card(Math.max(0, ...rows.filter(r => r.won).map(r => r.my - r.opp)), t('margin'))}${card(cnt(r => !r.bot), t('online'))}</div>`
    + [['1v1', r => r.m.mode === '1v1'], ['2v2', r => r.m.mode === '2v2'], [t('vsBotS'), r => r.bot], [t('online'), r => !r.bot]].map(([k, f]) => `<div class="lrow"><span>${k}</span><b>${wl(f)}</b></div>`).join('')
    : `<p style="text-align:center;opacity:.7">${t('noData')}</p>`;
  $('hist').innerHTML = rows.slice(0, 15).map(r => `<li><span class="${r.won ? 'w' : 'l'}">${r.won ? '✔' : '✘'}</span> ${new Date(r.m.played_at).toLocaleDateString()} · ${esc(r.m.mode)}${r.bot ? ' 🤖' : ''} · ${r.my} - ${r.opp}</li>`).join('');
};
$('backLb').onclick = () => show('menu');

/* ---------- Algerian dominoes engine ---------- */
const pips = h => h.reduce((a, x) => a + x[0] + x[1], 0);
const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const deck = () => { const d = []; for (let a = 0; a < 7; a++) for (let b = a; b < 7; b++) d.push([a, b]); return d; };

function newGame(players, target, room) {
  const g = { mid: crypto.randomUUID(), room, n: players.length, target, sc: [0, 0], wins: [0, 0], round: 0, mv: 0, over: false,
    p: players.map((p, i) => ({ ...p, team: i % 2, hand: [] })) };
  newRound(g, null); return g;
}
const hasMate = (h, x) => h.some(y => y !== x && (y[0] === x[0] || y[1] === x[0]));
const openIdx = h => { // opening: a double that has a mate in hand first; a lone double never opens; else a normal tile
  const all = h.map((_, i) => i), d = all.filter(i => h[i][0] === h[i][1] && hasMate(h, h[i]));
  if (d.length) return d;
  const n = all.filter(i => h[i][0] !== h[i][1]); return n.length ? n : all;
};
const badHand = h => { // redeal: 5+ doubles, or 6+ tiles sharing one number
  if (h.filter(x => x[0] === x[1]).length >= 5) return 'dbl';
  for (let n = 0; n < 7; n++) if (h.filter(x => x[0] === n || x[1] === n).length >= 6) return 'six';
  return null;
};
function newRound(g, starter) {
  let d, first = null, tries = 0;
  for (;;) {
    d = shuf(deck()); g.p.forEach(p => p.hand = d.splice(0, 7));
    const b = g.p.map(p => badHand(p.hand)), i = b.findIndex(Boolean);
    if (i < 0 || tries++ > 50) break;
    first = first || { by: g.p[i].name, why: b[i] };
  }
  g.rdInfo = first; g.rdId = (g.rdId || 0) + 1;
  g.bone = d; g.board = []; g.passes = 0; g.roundOver = null; g.must = null; g.round++;
  if (starter === null) { // round 1: highest eligible double starts, else highest normal tile
    let bk = -1;
    g.p.forEach((p, i) => openIdx(p.hand).forEach(j => { const x = p.hand[j], k = (x[0] === x[1] ? 100 : 0) + x[0] + x[1]; if (k > bk) { bk = k; g.must = x[0] === x[1] ? x : null; g.turn = i; } }));
  } else g.turn = starter;
}
function legal(g, s) {
  const r = [], h = g.p[s].hand;
  if (!g.board.length) return (g.must ? h.map((x, i) => i).filter(i => h[i][0] === g.must[0] && h[i][1] === g.must[1]) : openIdx(h)).map(i => [i, 'R']);
  g.p[s].hand.forEach((x, i) => {
    if (!g.board.length) { if (!g.must || (x[0] === g.must[0] && x[1] === g.must[1])) r.push([i, 'R']); }
    else { if (x[0] === g.L || x[1] === g.L) r.push([i, 'L']); if (x[0] === g.R || x[1] === g.R) r.push([i, 'R']); }
  });
  return r;
}
function place(g, s, i, side) {
  const x = g.p[s].hand.splice(i, 1)[0];
  if (!g.board.length) { g.board.push(x); g.L = x[0]; g.R = x[1]; g.cI = 0; }
  else if (side === 'L') { const o = x[1] === g.L ? x : [x[1], x[0]]; g.board.unshift(o); g.L = o[0]; g.cI++; }
  else { const o = x[0] === g.R ? x : [x[1], x[0]]; g.board.push(o); g.R = o[1]; }
  g.passes = 0; g.last = x;
}
function endRound(g, s) { // empty hand or blocked game (مبلعة)
  const tot = [0, 0]; g.p.forEach(p => tot[p.team] += pips(p.hand));
  let w = -1;
  if (!g.p[s].hand.length) { w = g.p[s].team; g.next = s; }
  else { if (tot[0] !== tot[1]) w = tot[0] < tot[1] ? 0 : 1; g.next = w < 0 ? s : g.p.findIndex(p => p.team === w); }
  const pts = w >= 0 ? tot[1 - w] : 0;
  if (w >= 0) g.sc[w] += pts;
  g.roundOver = { w, pts, by: s, d6: !g.p[s].hand.length && !!g.last && g.last[0] === 6 && g.last[1] === 6 };
  if (Math.max(...g.sc) >= g.target && g.sc[0] !== g.sc[1]) { g.over = true; g.wins = g.wins || [0, 0]; g.wins[g.sc[0] > g.sc[1] ? 0 : 1]++; }
}
function nextGame() { // another game: scores restart, the games-won tally stays
  const g = G; clearTimeout(T); g.mid = crypto.randomUUID(); g.sc = [0, 0]; g.over = false; g.round = 0; g.mv = 0; graceMv = -1; newRound(g, null); push();
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
  saveSess(); tick(); saveIfOver();
}
function tick() {
  render();
  const g = G; if (!g || !authority()) return;
  clearTimeout(T);
  if (g.over) return;
  if (g.roundOver) { T = setTimeout(() => { newRound(g, g.next); push(); }, 6500); return; }
  const p = g.p[g.turn], lg = legal(g, g.turn), s = g.turn;
  if (!lg.length) {
    if (g.n === 2 && g.bone.length) { if (p.bot) T = setTimeout(() => { act(g, s, { t: 'draw' }); push(); }, 500); }
    else T = setTimeout(() => { act(g, s, { t: 'pass' }); push(); }, 900);
    return;
  }
  if (p.bot) { const d = lg.length > 2 ? 3000 + Math.random() * 2000 : lg.length === 2 ? 1800 + Math.random() * 1200 : 1000; T = setTimeout(() => { act(g, s, botPick(g)); push(); }, d); }
}
function send(a) {
  if (a.t === 'again') { if (authority()) nextGame(); else ch.send({ type: 'broadcast', event: 'intent', payload: { uid: me.id, seat, a } }); return; }
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
const tile = (a, b, x = '', c = '') => `<div class="tile ${c}" ${x}>${half(a)}${half(b)}</div>`;
const canTaunt = () => G && !G.over && (G.turn === seat || G.mv <= graceMv);
const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360;
const key = x => x[0] < x[1] ? x[0] + '-' + x[1] : x[1] + '-' + x[0];
const bEls = {};
let fxS = { mid: '', n: 0, bone: 99, round: 0, ps: 0, turn: -1, ro: false, over: false };

/* snake layout: units where tile = 2x1; right branch snakes down, left branch snakes up */
function layout(g, M) {
  const B = g.board, c = g.cI || 0, out = [], o = B[c], d0 = o[0] === o[1];
  out.push({ x: d0 ? -.5 : -1, y: d0 ? -1 : -.5, w: d0 ? 1 : 2, h: d0 ? 2 : 1, t: o, k: key(o) });
  const walk = (tiles, nat) => {
    let hd = nat, ex = (d0 ? .5 : 1) * nat, cy = 0;
    for (const x of tiles) {
      const dbl = x[0] === x[1], k = key(x);
      if (dbl && Math.abs(ex + hd) <= M) { out.push({ x: hd > 0 ? ex : ex - 1, y: cy - 1, w: 1, h: 2, t: x, k }); ex += hd; }
      else if (!dbl && Math.abs(ex + 2 * hd) <= M) { out.push({ x: hd > 0 ? ex : ex - 2, y: cy - .5, w: 2, h: 1, t: hd === nat ? x : [x[1], x[0]], k }); ex += 2 * hd; }
      else { out.push({ x: hd > 0 ? ex : ex - 1, y: nat > 0 ? cy - .5 : cy - 1.5, w: 1, h: 2, t: x, k }); ex += hd; hd = -hd; cy += 2 * nat; } // corner
    }
  };
  walk(B.slice(c + 1), 1); walk(B.slice(0, c).reverse(), -1);
  return out;
}
function fit(g, W, H) { // tiles stay big: rows wrap by width; shrink only if height runs out (never below 24px)
  let best;
  for (let S = Math.min(48, Math.max(28, W / 11)); S >= 24; S -= 2) {
    const M = Math.max(3, Math.floor(W / S / 2) - 1), L = layout(g, M);
    best = { S, L, x0: Math.min(...L.map(p => p.x)), x1: Math.max(...L.map(p => p.x + p.w)), y0: Math.min(...L.map(p => p.y)), y1: Math.max(...L.map(p => p.y + p.h)) };
    if ((best.y1 - best.y0) * S <= H && (best.x1 - best.x0) * S <= W) break;
  }
  return best;
}
function drawBoard(g) {
  const box = $('board');
  if (!g.board.length) { box.innerHTML = ''; for (const k in bEls) delete bEls[k]; return; }
  const W = box.clientWidth, H = box.clientHeight, { S, L, x0, x1, y0, y1 } = fit(g, W, H);
  const ox = (W - (x1 - x0) * S) / 2, oy = (H - (y1 - y0) * S) / 2, seen = new Set(), ends = [key(g.board[0]), key(g.board[g.board.length - 1])];
  L.forEach(p => {
    seen.add(p.k); let el = bEls[p.k];
    const sig = p.t.join('') + (p.h > p.w ? 'v' : 'h');
    if (!el) { el = bEls[p.k] = document.createElement('div'); el.className = 'tile drop'; box.appendChild(el); }
    if (el.dataset.s !== sig) { el.dataset.s = sig; el.classList.toggle('v', p.h > p.w); el.innerHTML = half(p.t[0]) + half(p.t[1]); }
    el.classList.toggle('end', ends.includes(p.k)); // open ends glow
    Object.assign(el.style, { left: ox + (p.x - x0) * S + 'px', top: oy + (p.y - y0) * S + 'px', width: p.w * S - 2 + 'px', height: p.h * S - 2 + 'px' });
  });
  for (const k in bEls) if (!seen.has(k)) { bEls[k].remove(); delete bEls[k]; }
}
function confetti() {
  const cols = ['#ffc247', '#4ade9b', '#ff6b6b', '#6ea8ff', '#fff'];
  for (let i = 0; i < 46; i++) {
    const e = document.createElement('i'); e.className = 'cf';
    e.style.cssText = `left:${Math.random() * 100}vw;background:${cols[i % 5]};animation-delay:${Math.random() * .6}s;animation-duration:${1.8 + Math.random()}s`;
    document.body.appendChild(e); setTimeout(() => e.remove(), 3500);
  }
}
function special(cls, big, sub, ms = 3400) {
  const e = document.createElement('div'); e.className = 'sp ' + cls;
  e.innerHTML = `<div class="spb">${[...big].map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</div><div class="sps">${esc(sub)}</div>`;
  document.body.appendChild(e); setTimeout(() => e.remove(), ms);
  confetti(); setTimeout(confetti, 700); if (cls.startsWith('capot')) setTimeout(confetti, 1500);
}
function fx(g) { // sounds + effects from state changes
  const f = fxS, mineTeam = g.p[seat].team;
  if (f.mid !== g.mid) Object.assign(f, { mid: g.mid, n: 0, bone: g.bone.length, round: g.round, ps: 0, turn: -1, ro: false, over: false, rd: 0 });
  if (g.round !== f.round) Object.assign(f, { n: 0, bone: g.bone.length, round: g.round, ps: 0, ro: false });
  if (g.board.length > f.n) sfx.place(); else if (g.bone.length < f.bone) sfx.draw();
  if (g.passes > f.ps) sfx.pass();
  if (g.turn === seat && f.turn !== seat && !g.roundOver && !g.over) sfx.turn();
  if (g.over && !f.over) { const w = g.sc[mineTeam] > g.sc[1 - mineTeam]; w ? (sfx.fan(), confetti()) : sfx.lose(); }
  else if (g.roundOver && !f.ro) { if (g.roundOver.w === mineTeam) { sfx.win(); confetti(); } else if (g.roundOver.w >= 0) sfx.lose(); }
  if (g.roundOver && !f.ro && g.roundOver.d6) { sfx.d66(); special('d66', 'DOUBLE SIX', t('d66') + ' · ' + g.p[g.roundOver.by].name); }
  if (g.over && !f.over && Math.min(...g.sc) === 0) { const w = g.sc[mineTeam] > g.sc[1 - mineTeam]; sfx.capot(); special('capot' + (w ? '' : ' bad'), 'CAPOOO!', t(w ? 'capotW' : 'capotL'), 5000); }
  if (g.rdInfo && g.rdId !== f.rd) { toast(g.rdInfo.by + ' · ' + t(g.rdInfo.why === 'dbl' ? 'rdDbl' : 'rdSix')); sfx.draw(); }
  Object.assign(f, { n: g.board.length, bone: g.bone.length, ps: g.passes, turn: g.turn, ro: !!g.roundOver, over: g.over, rd: g.rdId });
}
function render() {
  if (!G || cur !== 'game') return;
  const g = G, mine = g.p[seat], lg = legal(g, seat), ok = new Set(lg.map(x => x[0]));
  const my = g.turn === seat && !g.roundOver && !g.over;
  fx(g);
  const nm = k => esc((g.names && g.names[k]) || t(k ? 'team2' : 'team1')), ser = g.wins && g.wins[0] + g.wins[1] ? `<span class="ser">${g.wins[0]} - ${g.wins[1]}</span>` : '';
  $('sc').innerHTML = `<span class="tm ${mine.team === 0 ? 'me' : ''}">${nm(0)}<b>${g.sc[0]}</b></span>${ser}<span class="tm ${mine.team === 1 ? 'me' : ''}">${nm(1)}<b>${g.sc[1]}</b></span><span class="tg2">/${g.target}</span>`;
  const order = []; for (let k = g.n - 1; k >= 1; k--) order.push((seat + k) % g.n); // all others on top: left → right
  $('opps').className = g.n > 2 ? 'many' : '';
  $('opps').innerHTML = order.map(i => {
    const p = g.p[i];
    return `<div class="seat ${p.team === mine.team ? 'ally' : ''} ${g.turn === i && !g.roundOver ? 'turn' : ''}"><span class="av" style="background:hsl(${hue(p.name)} 65% 50%)">${esc([...p.name][0])}</span><span class="nm">${esc(p.name)}</span>${g.turn === i && p.bot && !g.roundOver ? '<span class="dots"><i></i><i></i><i></i></span>' : ''}<span class="bks">${'<i></i>'.repeat(Math.min(p.hand.length, 7))}</span><b>${p.hand.length}</b></div>`;
  }).join('');
  $('bone').textContent = '🂠 ' + g.bone.length; $('bone').classList.toggle('hidden', !g.bone.length);
  drawBoard(g);
  $('hand').innerHTML = mine.hand.map(([a, b], i) => tile(a, b, `data-i="${i}"`, 'v' + (my && ok.has(i) ? ' ok' : ''))).join('');
  $('msg').textContent = g.over ? (g.sc[mine.team] > g.sc[1 - mine.team] ? t('matchWin') : t('matchLose'))
    : g.roundOver ? (g.roundOver.w < 0 ? t('tie') : (g.roundOver.w === mine.team ? t('youWin') : t('youLose'))) + (g.roundOver.pts ? ' +' + g.roundOver.pts : '')
    : my ? t('yourTurn') : t('wait') + ' ' + g.p[g.turn].name;
  $('msg').className = 'msg' + (my ? ' go' : '');
  const ro = g.roundOver; $('result').classList.toggle('hidden', !ro);
  if (ro) $('result').innerHTML = `<h3>${esc($('msg').textContent)}</h3>`
    + (g.over && g.wins ? `<div class="ser2">${nm(0)} <b>${g.wins[0]}</b> - <b>${g.wins[1]}</b> ${nm(1)}</div>` : '')
    + `<small style="text-align:center;opacity:.7">${t('tilesLeft')}</small>`
    + g.p.map(p => `<div class="rp"><span class="av" style="background:hsl(${hue(p.name)} 65% 50%)">${esc([...p.name][0])}</span><span class="nm2">${esc(p.name)}</span><div class="tl">${p.hand.length ? p.hand.map(([a, b]) => tile(a, b, '', 'sm')).join('') : '🏁'}</div><b>${pips(p.hand)}</b></div>`).join('')
    + (g.over ? `<div class="ra"><button class="btn" id="again">${t('again')}</button></div>` : '');
  $('drawBtn').classList.toggle('hidden', !(my && !lg.length && g.n === 2 && g.bone.length));
  $('backG').classList.toggle('hidden', !g.over);
  if (!my) $('choose').classList.add('hidden');
  document.querySelectorAll('.tb').forEach(b => b.disabled = !canTaunt());
}
addEventListener('resize', () => render());
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
  toast(m); sfx.taunt(); if (ch) ch.send({ type: 'broadcast', event: 'taunt', payload: m });
};

/* ---------- vs bot ---------- */
$('startBot').onclick = () => {
  const n = +$('bn').value, lvl = $('bl').value, bot = x => ({ name: x, bot: 1, lvl });
  const bots = n === 2 ? [bot('🤖')] : [bot('🤖 1'), bot('🤝 🤖'), bot('🤖 2')]; // seats: me, opp, partner, opp
  seat = 0; ch = null; host = false;
  G = newGame([{ uid: me.id, name: profile.username }, ...bots], +$('bt').value, 'bot');
  history.pushState({ g: 1 }, ''); show('game'); saveSess(); tick();
};

/* ---------- online private rooms (Realtime Broadcast + Presence) ---------- */
$('createRoom').onclick = () => { tnames = ['', '']; $('tn1').value = $('tn2').value = ''; joinRoom(Math.random().toString(36).slice(2, 7).toUpperCase(), true); };
$('joinRoom').onclick = () => { const c = $('rcode').value.trim().toUpperCase(); if (c) { tnames = ['', '']; joinRoom(c, false); } };
function joinRoom(c, h, g0 = null, s0 = 0) {
  code = c; host = h; assign = {}; lobby = []; G = g0; seat = s0;
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
      render(); saveIfOver(); saveSess();
    })
    .on('broadcast', { event: 'intent' }, ({ payload: p }) => {
      if (!host || !G || !G.p[p.seat] || G.p[p.seat].uid !== p.uid) return;
      if (p.a.t === 'again') { if (G.over) nextGame(); } else if (act(G, p.seat, p.a)) push();
    })
    .on('broadcast', { event: 'tnames' }, ({ payload }) => { tnames = payload; renderLobby(); })
    .on('broadcast', { event: 'hello' }, () => { if (!host) return; ch.send({ type: 'broadcast', event: 'tnames', payload: tnames }); ch.send({ type: 'broadcast', event: 'assign', payload: assign }); if (G) ch.send({ type: 'broadcast', event: 'state', payload: G }); })
    .on('broadcast', { event: 'taunt' }, ({ payload }) => { sfx.taunt(); toast(payload); })
    .subscribe(async st => {
      if (st !== 'SUBSCRIBED') return; // also fires again after every automatic reconnect
      await ch.track({ uid: me.id, name: profile.username, at: Date.now() });
      if (host && G) { ch.send({ type: 'broadcast', event: 'state', payload: G }); tick(); }
      else if (!host) ch.send({ type: 'broadcast', event: 'hello', payload: me.id });
    });
  if (cur !== 'game' && cur !== 'lobby') history.pushState({ g: 1 }, '');
  $('roomcode').textContent = c; $('hostbox').classList.toggle('hidden', !h);
  if (g0) { show('game'); render(); } else show('lobby');
  saveSess();
}
function renderLobby() {
  $('lobbylist').innerHTML = lobby.map(p => `<div class="lrow"><span>${esc(p.name)}</span>
    <button class="tg t${assign[p.uid] === 1 ? 2 : 1}" data-u="${p.uid}" ${host ? '' : 'disabled'}>${esc(tn(assign[p.uid] === 1 ? 1 : 0))}</button></div>`).join('');
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
  G = newGame(o.map(p => ({ uid: p.uid, name: p.name })), +$('rt').value, code); G.names = [tn(0), tn(1)];
  seat = G.p.findIndex(p => p.uid === me.id);
  show('game'); push();
};

/* ---------- init ---------- */
$('lang').value = lang();
$('lang').onchange = e => { setLang(e.target.value); if (profile) loadProfile(); render(); if (cur === 'lobby') renderLobby(); };
setLang(lang());
$('hero').innerHTML = tile(6, 6, '', 'v') + tile(5, 3, '', 'v');
document.querySelectorAll('.snd').forEach(b => {
  b.textContent = isOn() ? '🔊' : '🔇';
  b.onclick = () => { const v = toggle(); document.querySelectorAll('.snd').forEach(x => x.textContent = v ? '🔊' : '🔇'); };
});
$('exitG').onclick = () => history.back();
['tn1', 'tn2'].forEach(id => $(id).oninput = () => { tnames = [$('tn1').value.trim(), $('tn2').value.trim()]; if (ch && host) ch.send({ type: 'broadcast', event: 'tnames', payload: tnames }); renderLobby(); });
$('result').onclick = e => { if (e.target.closest('#again')) send({ t: 'again' }); };

/* themes: day/night, 10 tables, 10 tile styles */
const TABLES = [['#31497b', '#141f3d'], ['#1f7a4a', '#0d3b25'], ['#8a2c3c', '#3a0f19'], ['#5b3f9a', '#1d1238'], ['#b98a4e', '#5c3d1c'], ['#1c8a93', '#0a3a40'], ['#4a4f5a', '#14161b'], ['#d9693a', '#5a2210'], ['#c0507a', '#4a1230'], ['#6ba6d6', '#1d3a57']];
const TILES = [['#fffdf4', '#e7dfc6', '#b3a781', '#4c5372', '#10152a', '#1a203640'], ['#3a3a42', '#16161b', '#000000', '#ffffff', '#cfd3e6', '#ffffff55'], ['#3f7be0', '#1b3f94', '#102a66', '#ffffff', '#dbe6ff', '#ffffff66'],
  ['#2fbf86', '#0f6a4b', '#094a34', '#ffffff', '#d4ffe9', '#ffffff66'], ['#e5484d', '#8f1d24', '#5e1117', '#ffffff', '#ffe0e0', '#ffffff66'], ['#ffe08a', '#d9a521', '#9a7312', '#3a2a00', '#1a1200', '#3a2a0066'],
  ['#c98f56', '#8c5a2d', '#5a3a1a', '#2a1a0a', '#120a04', '#2a1a0a66'], ['#8b5cf6', '#4c2a9c', '#311a6b', '#ffffff', '#ebe0ff', '#ffffff66'], ['#b8f2d8', '#7ed3b0', '#4a9a7c', '#17493a', '#0a251c', '#17493a55'], ['#ffffff55', '#ffffff22', '#ffffff44', '#ffffff', '#d8e6ff', '#ffffff66']];
let th = {}; try { th = JSON.parse(localStorage.getItem('dom_theme')) || {}; } catch {}
th = { mode: th.mode === 'light' ? 'light' : 'dark', table: (th.table | 0) % 10, tile: (th.tile | 0) % 10 };
function applyTheme() {
  const r = document.documentElement, k = TILES[th.tile];
  r.dataset.mode = th.mode; r.style.setProperty('--felt1', TABLES[th.table][0]); r.style.setProperty('--felt2', TABLES[th.table][1]);
  ['t1', 't2', 'te', 'p1', 'p2', 'dv'].forEach((n, i) => r.style.setProperty('--' + n, k[i]));
  localStorage.setItem('dom_theme', JSON.stringify(th));
  $('tblGrid').querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === th.table));
  $('tileGrid').querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === th.tile));
  $('mDark').classList.toggle('on', th.mode === 'dark'); $('mLight').classList.toggle('on', th.mode === 'light');
}
$('tblGrid').innerHTML = TABLES.map(([a, b], i) => `<button data-i="${i}" style="background:radial-gradient(circle,${a},${b})"></button>`).join('');
$('tileGrid').innerHTML = TILES.map((k, i) => `<button data-i="${i}" style="background:linear-gradient(145deg,${k[0]},${k[1]});color:${k[4]}">●</button>`).join('');
$('tblGrid').onclick = e => { const b = e.target.closest('button'); if (b) { th.table = +b.dataset.i; applyTheme(); } };
$('tileGrid').onclick = e => { const b = e.target.closest('button'); if (b) { th.tile = +b.dataset.i; applyTheme(); } };
$('mDark').onclick = () => { th.mode = 'dark'; applyTheme(); }; $('mLight').onclick = () => { th.mode = 'light'; applyTheme(); };
$('pv').innerHTML = tile(6, 6, '', 'v') + tile(5, 3, '', 'v') + tile(2, 0, '', 'v');
applyTheme();
$('toSet').onclick = () => show('settings'); $('backSet').onclick = () => show('menu');

/* profile: username, email, password */
$('toProf').onclick = () => { $('pname').value = profile ? profile.username : ''; $('pemail').value = me.email || ''; show('profile'); };
$('backProf').onclick = () => show('menu');
$('saveName').onclick = async () => {
  const u = $('pname').value.trim(); if (u.length < 3) return toast(t('nameShort'));
  const { error } = await sb.from('profiles').update({ username: u }).eq('id', me.id);
  if (error) return toast(error.code === '23505' ? t('nameTaken') : error.message);
  await sb.auth.updateUser({ data: { username: u } }); await loadProfile(); toast('✔');
};
$('saveEmail').onclick = async () => { const { error } = await sb.auth.updateUser({ email: $('pemail').value.trim() }); toast(error ? error.message : t('checkMail')); };
$('savePass').onclick = async () => {
  const p = $('np').value; if (p.length < 6) return toast(t('passShort')); if (p !== $('np2').value) return toast(t('passMismatch'));
  const { error } = await sb.auth.updateUser({ password: p }); toast(error ? error.message : '✔'); if (!error) $('np').value = $('np2').value = '';
};
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !me) return;
  if (ch && ch.state !== 'joined' && ch.state !== 'joining') { const c = code, h = host, g = G, sd = seat; await sb.removeChannel(ch); ch = null; joinRoom(c, h, g, sd); return; }
  if (G) { tick(); if (ch && !host) ch.send({ type: 'broadcast', event: 'hello', payload: me.id }); }
});
document.addEventListener('click', e => { if (e.target.closest('.btn,.tb,.tg')) sfx.click(); });
