const { test } = require('node:test');
const assert = require('node:assert');
const { evalCalc } = require('../js/calc-math.js');
test('basic arithmetic', () => {
  assert.strictEqual(evalCalc('2+3'), 5);
  assert.strictEqual(evalCalc('10-4'), 6);
  assert.strictEqual(evalCalc('6*7'), 42);
  assert.strictEqual(evalCalc('8/2'), 4);
});
test('respects operator precedence', () => {
  assert.strictEqual(evalCalc('2+3*4'), 14);
});
test('invalid input returns Error string, never throws', () => {
  assert.strictEqual(evalCalc('2++'), 'Error');
  assert.strictEqual(evalCalc('abc'), 'Error');
});
test('divide by zero returns Error', () => {
  assert.strictEqual(evalCalc('5/0'), 'Error');
});
