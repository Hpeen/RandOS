// tests/busy-lock.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const lock = require('../js/busy-lock.js');

// The module is a singleton with shared mutable state. Each test resets the
// lock via release() (no-tag) at the top so tests are order-independent.

test('starts free: isBusy() false, owner() null', () => {
  lock.release();
  assert.strictEqual(lock.isBusy(), false);
  assert.strictEqual(lock.owner(), null);
});

test('acquire("chaos") returns true, marks busy, sets owner', () => {
  lock.release();
  assert.strictEqual(lock.acquire('chaos'), true);
  assert.strictEqual(lock.isBusy(), true);
  assert.strictEqual(lock.owner(), 'chaos');
  lock.release(); // cleanup
});

test('second acquire while held returns false and does not change owner', () => {
  lock.release();
  lock.acquire('chaos');
  assert.strictEqual(lock.acquire('qte'), false);
  assert.strictEqual(lock.owner(), 'chaos');
  lock.release(); // cleanup
});

test('release with wrong tag does not free the lock', () => {
  lock.release();
  lock.acquire('chaos');
  lock.release('qte');
  assert.strictEqual(lock.isBusy(), true);
  assert.strictEqual(lock.owner(), 'chaos');
  lock.release(); // cleanup
});

test('release with correct tag frees the lock', () => {
  lock.release();
  lock.acquire('chaos');
  lock.release('chaos');
  assert.strictEqual(lock.isBusy(), false);
  assert.strictEqual(lock.owner(), null);
});

test('acquire() with no tag sets owner to "anon"', () => {
  lock.release();
  assert.strictEqual(lock.acquire(), true);
  assert.strictEqual(lock.owner(), 'anon');
  lock.release(); // cleanup
});

test('release() with no tag frees the lock regardless of current owner', () => {
  lock.release();
  lock.acquire('any-holder');
  lock.release();
  assert.strictEqual(lock.isBusy(), false);
  assert.strictEqual(lock.owner(), null);
});
