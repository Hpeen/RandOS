// tests/backrooms.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { rollBackrooms } = require('../js/backrooms.js');

test('fires when the roll is below the chance threshold', () => {
  assert.strictEqual(rollBackrooms(() => 0.05, 0.10), true);
  assert.strictEqual(rollBackrooms(() => 0.0, 0.10), true);
});

test('does not fire at or above the threshold', () => {
  assert.strictEqual(rollBackrooms(() => 0.10, 0.10), false);
  assert.strictEqual(rollBackrooms(() => 0.5, 0.10), false);
});

test('defaults to a 0.10 chance', () => {
  assert.strictEqual(rollBackrooms(() => 0.099), true);
  assert.strictEqual(rollBackrooms(() => 0.11), false);
});
