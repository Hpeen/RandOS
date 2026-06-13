// tests/notepad.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { SWAPS, chaoticAutocorrect } = require('../js/apps/notepad.js');

test('SWAPS is a non-empty map of word -> replacement', () => {
  const keys = Object.keys(SWAPS);
  assert.ok(keys.length >= 8);
  for (const k of keys) assert.ok(typeof SWAPS[k] === 'string' && SWAPS[k] !== k);
});

test('chaoticAutocorrect swaps exactly one known word when one is present', () => {
  // rng=()=>0 picks the first eligible occurrence.
  const out = chaoticAutocorrect('please send the file now', () => 0);
  assert.notStrictEqual(out, 'please send the file now');
  assert.ok(out.split(' ').length === 5, 'word count preserved');
});

test('chaoticAutocorrect returns text unchanged when no known word present', () => {
  assert.strictEqual(chaoticAutocorrect('zzz qqq', () => 0), 'zzz qqq');
});

test('chaoticAutocorrect never throws on empty input', () => {
  assert.strictEqual(chaoticAutocorrect('', () => 0), '');
});
