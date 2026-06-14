// tests/quote.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { QUOTES, pickQuote } = require('../js/apps/quote.js');

test('QUOTES entries have text + kind; >= 12 of them', () => {
  assert.ok(QUOTES.length >= 12);
  const kinds = new Set();
  for (const q of QUOTES) {
    assert.ok(typeof q.text === 'string' && q.text.length > 0);
    assert.ok(['famous', 'movie', 'joke'].includes(q.kind), 'bad kind: ' + q.kind);
    kinds.add(q.kind);
  }
  assert.strictEqual(kinds.size, 3, 'all three kinds represented');
});

test('pickQuote returns an in-range member via injected rng', () => {
  assert.strictEqual(pickQuote(QUOTES, () => 0), QUOTES[0]);
  assert.strictEqual(pickQuote(QUOTES, () => 0.999), QUOTES[QUOTES.length - 1]);
});
