// sound-manifest.js — RandOS sound library manifest.
// Each entry: { id, label, category, file }. `file` is relative to index.html.
// Real recorded CC0 clips can be dropped into assets/sounds/ and appended here
// with no code change. Plain script global + CommonJS guard for node --test.
var SOUNDS = [
  { id: 'blip',   label: 'Blip',   category: 'UI',      file: 'assets/sounds/blip.wav' },
  { id: 'zap',    label: 'Zap',    category: 'Zaps',    file: 'assets/sounds/zap.wav' },
  { id: 'chime',  label: 'Chime',  category: 'Chimes',  file: 'assets/sounds/chime.wav' },
  { id: 'coin',   label: 'Coin',   category: 'Game',    file: 'assets/sounds/coin.wav' },
  { id: 'drum',   label: 'Drum',   category: 'Drums',   file: 'assets/sounds/drum.wav' },
  { id: 'laser',  label: 'Laser',  category: 'Zaps',    file: 'assets/sounds/laser.wav' },
  { id: 'whoosh', label: 'Whoosh', category: 'FX',      file: 'assets/sounds/whoosh.wav' },
  { id: 'error',  label: 'Error',  category: 'UI',      file: 'assets/sounds/error.wav' }
];

// pickRandomSound(rng?) -> a SOUNDS entry. rng defaults to Math.random.
function pickRandomSound(rng) {
  var r = (typeof rng === 'function' ? rng : Math.random)();
  var i = Math.floor(r * SOUNDS.length);
  if (i >= SOUNDS.length) i = SOUNDS.length - 1;
  if (i < 0) i = 0;
  return SOUNDS[i];
}

if (typeof window !== 'undefined') {
  window.SOUNDS = SOUNDS;
  window.pickRandomSound = pickRandomSound;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SOUNDS: SOUNDS, pickRandomSound: pickRandomSound };
}
