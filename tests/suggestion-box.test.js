// tests/suggestion-box.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { SUGGESTIONS, pickSuggestion } = require('../js/apps/suggestion-box.js');

test('SUGGESTIONS is a non-empty array of non-empty strings', () => {
  assert.ok(Array.isArray(SUGGESTIONS) && SUGGESTIONS.length >= 10);
  for (const s of SUGGESTIONS) assert.ok(typeof s === 'string' && s.length > 0);
});

test('pickSuggestion returns an in-range member via injected rng', () => {
  assert.strictEqual(pickSuggestion(SUGGESTIONS, () => 0), SUGGESTIONS[0]);
  assert.strictEqual(pickSuggestion(SUGGESTIONS, () => 0.999), SUGGESTIONS[SUGGESTIONS.length - 1]);
});

test('pickSuggestion avoids repeating the "previous" when possible', () => {
  const prev = SUGGESTIONS[0];
  const got = pickSuggestion(SUGGESTIONS, () => 0, prev); // would pick index 0 == prev
  assert.notStrictEqual(got, prev);
});
