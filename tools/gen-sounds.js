// tools/gen-sounds.js — one-time generator for RandOS's CC0 sound pack.
// Run with: node tools/gen-sounds.js
// Writes 16-bit/44.1kHz mono WAV files into assets/sounds/. NOT loaded at runtime.
const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

function encodeWav(samples) {
  // samples: Float32-ish array in [-1, 1]. Returns a Buffer (PCM16 mono WAV).
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

function render(dur, fn) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / SR, i, n);
  return out;
}
const env = (t, dur, a = 0.005, r = 0.08) =>
  Math.min(1, t / a) * Math.min(1, (dur - t) / r);
const sine = (t, f) => Math.sin(2 * Math.PI * f * t);
const noise = () => Math.random() * 2 - 1;

const SOUNDS = {
  blip:  () => render(0.18, (t, i, n) => 0.5 * sine(t, 660) * env(t, 0.18)),
  zap:   () => render(0.30, (t) => 0.45 * sine(t, 900 - 700 * t) * env(t, 0.30)),
  chime: () => render(0.60, (t) => 0.3 * (sine(t, 880) + sine(t, 1320) + sine(t, 1760)) / 3 * env(t, 0.60, 0.005, 0.4)),
  coin:  () => render(0.35, (t) => 0.4 * sine(t, t < 0.07 ? 988 : 1319) * env(t, 0.35, 0.002, 0.2)),
  drum:  () => render(0.25, (t) => (0.7 * sine(t, 120 - 80 * t) + 0.3 * noise() * Math.exp(-30 * t)) * env(t, 0.25, 0.001, 0.05)),
  laser: () => render(0.40, (t) => 0.4 * sine(t, 1200 - 1000 * t) * env(t, 0.40)),
  whoosh:() => render(0.45, (t) => 0.35 * noise() * Math.exp(-6 * t) * env(t, 0.45, 0.05, 0.2)),
  error: () => render(0.45, (t) => 0.4 * sine(t, t < 0.2 ? 300 : 200) * env(t, 0.45, 0.005, 0.1))
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, gen] of Object.entries(SOUNDS)) {
  fs.writeFileSync(path.join(OUT, name + '.wav'), encodeWav(gen()));
  console.log('wrote', name + '.wav');
}
