// tests/paint.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { PALETTE, randomBrush } = require('../js/apps/paint.js');

test('PALETTE is a non-empty array of color strings', () => {
  assert.ok(Array.isArray(PALETTE) && PALETTE.length >= 4);
  for (const c of PALETTE) assert.ok(typeof c === 'string' && c.length > 0);
});

test('randomBrush returns a palette color and a size in range', () => {
  const b0 = randomBrush(() => 0);
  assert.strictEqual(b0.color, PALETTE[0]);
  assert.ok(b0.size >= 1 && b0.size <= 4);
  const b1 = randomBrush(() => 0.999);
  assert.strictEqual(b1.color, PALETTE[PALETTE.length - 1]);
  assert.ok(b1.size >= 1 && b1.size <= 4);
});
