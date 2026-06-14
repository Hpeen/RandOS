// tests/qte.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { qteOutcome } = require('../js/qte.js');

test('meeting the requirement before timeout is a success', () => {
  assert.strictEqual(qteOutcome(5, 5, false), 'success');
  assert.strictEqual(qteOutcome(6, 5, false), 'success');
});

test('falling short is a fail', () => {
  assert.strictEqual(qteOutcome(4, 5, false), 'fail');
});

test('timing out is a fail even if the count was met at the buzzer', () => {
  assert.strictEqual(qteOutcome(5, 5, true), 'fail');
});

test('zero hits is a fail', () => {
  assert.strictEqual(qteOutcome(0, 3, false), 'fail');
});
