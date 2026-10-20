// Synthesized sound effects (WebAudio) - no audio files needed
let ctx, on = localStorage.getItem('snd') !== '0';
const A = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
addEventListener('pointerdown', () => { try { A(); } catch {} }, { once: true });
function tone(f, d = .15, type = 'sine', v = .2, at = 0, f2) {
  if (!on) return; const c = A(), t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + d);
}
function noise(d = .06, v = .3, fq = 1800) {
  if (!on) return; const c = A(), n = c.sampleRate * d | 0, b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = fq; g.gain.value = v; s.connect(f).connect(g).connect(c.destination); s.start();
}
// voice-like synth: sawtooth/square source through two formant filters (+ vibrato / growl)
function vox(o) {
  if (!on) return; const c = A(), t0 = c.currentTime + (o.at || 0), d = o.d || 2;
  const s = c.createOscillator(), out = c.createGain(); s.type = o.type || 'sawtooth';
  o.f.forEach(([t, hz], i) => i ? s.frequency.linearRampToValueAtTime(hz, t0 + t) : s.frequency.setValueAtTime(hz, t0 + t));
  out.gain.setValueAtTime(0, t0); o.a.forEach(([t, v]) => out.gain.linearRampToValueAtTime(v, t0 + t));
  if (o.vib) { const l = c.createOscillator(), g = c.createGain(); l.frequency.value = o.vib[0]; g.gain.value = o.vib[1]; l.connect(g).connect(s.frequency); l.start(t0); l.stop(t0 + d); }
  let src = s;
  if (o.am) { const m = c.createGain(), l = c.createOscillator(), g = c.createGain(); m.gain.value = 1 - o.am[1]; l.frequency.value = o.am[0]; g.gain.value = o.am[1]; l.connect(g).connect(m.gain); l.start(t0); l.stop(t0 + d); s.connect(m); src = m; }
  (o.fm || [800, 1300]).forEach(hz => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = hz; b.Q.value = 6; src.connect(b); b.connect(out); });
  out.connect(c.destination); s.start(t0); s.stop(t0 + d);
}
export const sfx = {
  place() { noise(.05, .5, 1400); tone(160, .09, 'sine', .35, 0, 70); navigator.vibrate && navigator.vibrate(12); },
  draw() { noise(.14, .2, 3200); },
  pass() { tone(220, .18, 'triangle', .2); tone(165, .25, 'triangle', .2, .14); },
  turn() { tone(660, .12, 'sine', .12); tone(880, .18, 'sine', .1, .09); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .2, i * .1)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, .3, 'sawtooth', .08, i * .16)); },
  fan() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .4, 'triangle', .22, i * .12)); },
  capot() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .35, 'square', .12, i * .09)); noise(.5, .4, 500); },
  d66() { tone(880, .2, 'triangle', .25); tone(1320, .35, 'triangle', .25, .12); noise(.1, .3, 4000); },
  laugh() { // ha-ha-ha-ha-ha-ha, ~1.8s
    for (let i = 0; i < 6; i++) { const f = 330 - i * 18; vox({ at: i * .3, d: .26, f: [[0, f], [.22, f * .8]], a: [[.02, .5 - i * .03], [.22, 0]], fm: [850, 1350] }); setTimeout(() => noise(.1, .15, 3500), i * 300); }
  },
  angry() { // growl then a shout, 2s
    vox({ d: .95, f: [[0, 120], [.9, 85]], a: [[.05, .55], [.85, .5], [.95, 0]], fm: [450, 900], am: [38, .6], type: 'square' });
    vox({ at: .95, d: 1.05, f: [[0, 230], [.2, 330], [.9, 190]], a: [[.04, .6], [.7, .45], [1.05, 0]], fm: [900, 1400], vib: [14, 10] });
    setTimeout(() => noise(.3, .3, 1200), 950);
  },
  cry() { // wailing with sobs, 2s
    vox({ d: 2, f: [[0, 360], [.4, 520], [.8, 400], [1.2, 540], [1.6, 380], [2, 300]], a: [[.08, .45], [.35, .2], [.55, .5], [.9, .2], [1.1, .5], [1.5, .22], [1.75, .35], [2, 0]], fm: [650, 1700], vib: [6.5, 14] });
    [.3, .75, 1.15, 1.6].forEach(t => setTimeout(() => noise(.08, .12, 2500), t * 1000));
  },
  taunt() { tone(500, .1, 'square', .1, 0, 900); },
  click() { tone(700, .04, 'sine', .08); }
};
export const isOn = () => on;
export const toggle = () => { on = !on; localStorage.setItem('snd', on ? '1' : '0'); return on; };
