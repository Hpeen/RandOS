// tests/sound-manifest.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { SOUNDS, pickRandomSound } = require('../js/sound-manifest.js');

test('every sound has id, label, category, file; ids unique', () => {
  const ids = new Set();
  for (const s of SOUNDS) {
    assert.ok(s.id && s.label && s.category && s.file, 'missing field: ' + JSON.stringify(s));
    assert.ok(s.file.endsWith('.wav'), 'file must be .wav: ' + s.file);
    assert.ok(!ids.has(s.id), 'duplicate id: ' + s.id);
    ids.add(s.id);
  }
  assert.ok(SOUNDS.length >= 8);
});

test('pickRandomSound returns a member of SOUNDS, using injected rng', () => {
  const first = pickRandomSound(() => 0);
  assert.strictEqual(first, SOUNDS[0]);
  const last = pickRandomSound(() => 0.999);
  assert.strictEqual(last, SOUNDS[SOUNDS.length - 1]);
  const atOne = pickRandomSound(() => 1);
  assert.strictEqual(atOne, SOUNDS[SOUNDS.length - 1]);
});
