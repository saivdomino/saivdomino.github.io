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
  taunt() { tone(500, .1, 'square', .1, 0, 900); },
  click() { tone(700, .04, 'sine', .08); }
};
export const isOn = () => on;
export const toggle = () => { on = !on; localStorage.setItem('snd', on ? '1' : '0'); return on; };
