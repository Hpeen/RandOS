// tests/spinner.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { winnerForAngle } = require('../js/apps/spinner.js');

test('no rotation -> slot 0 is under the top pointer', () => {
  assert.strictEqual(winnerForAngle(4, 0), 0);
  assert.strictEqual(winnerForAngle(6, 0), 0);
});

test('rotating clockwise moves later slots under the pointer', () => {
  // 4 slots, seg=90. Rotate 90deg cw -> slot that was at 270 (index 3) is on top.
  assert.strictEqual(winnerForAngle(4, 90), 3);
  // Rotate 180 -> index 2.
  assert.strictEqual(winnerForAngle(4, 180), 2);
});

test('normalizes multi-turn and negative angles', () => {
  assert.strictEqual(winnerForAngle(4, 360 + 90), 3);
  assert.strictEqual(winnerForAngle(4, -90), 1);
});

test('handles a single slot', () => {
  assert.strictEqual(winnerForAngle(1, 123), 0);
});
