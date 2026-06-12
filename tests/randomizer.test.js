const { test } = require('node:test');
const assert = require('node:assert');
const { rollSkin, POOLS, REQUIRED_TOKENS } = require('../js/randomizer.js');

test('rollSkin returns all required token keys', () => {
  const skin = rollSkin('calculator');
  for (const key of REQUIRED_TOKENS) {
    assert.ok(skin[key] !== undefined, `missing token: ${key}`);
  }
});
test('rollSkin only draws from curated pools', () => {
  for (let i = 0; i < 200; i++) {
    const skin = rollSkin('clock');
    assert.ok(POOLS.palette.includes(skin.palette));
    assert.ok(POOLS.radius.includes(skin.radius));
    assert.ok(POOLS.shadow.includes(skin.shadow));
    assert.ok(POOLS.chrome.includes(skin.chrome));
  }
});
test('palettes include at least one monochrome set', () => {
  const mono = POOLS.palette.filter(p => p.mono === true);
  assert.ok(mono.length >= 1, 'expected a monochrome palette');
});
test('layout respects per-app variants', () => {
  const skin = rollSkin('calculator');
  assert.ok(POOLS.layout.calculator.includes(skin.layout));
});
