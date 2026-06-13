// paint.js — chaotic Paint. PALETTE + randomBrush exported for node --test;
// makePaint builds the canvas. The brush color/size randomizes on you and stray
// pixels appear. Plain script + CommonJS guard.
var PALETTE = ['#ff4d9d', '#28e0c8', '#ffd166', '#9aff3c', '#7cc4ff', '#ffffff', '#ff5234'];

// randomBrush(rng?) -> { color, size }. size is an integer 1..4.
function randomBrush(rng) {
  var r = (typeof rng === 'function' ? rng : Math.random);
  var ci = Math.floor(r() * PALETTE.length);
  if (ci >= PALETTE.length) ci = PALETTE.length - 1;
  var size = 1 + Math.floor(r() * 4); // 1..4
  if (size > 4) size = 4;
  return { color: PALETTE[ci], size: size };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PALETTE: PALETTE, randomBrush: randomBrush };
}
