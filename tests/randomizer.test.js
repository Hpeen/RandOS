const { test } = require('node:test');
const assert = require('node:assert');
const { rollSkin, applySkin, POOLS, REQUIRED_TOKENS } = require('../js/randomizer.js');

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

test('applySkin writes all scoped CSS vars and dataset attrs', () => {
  const props = {};
  const fakeEl = { style: { setProperty: (k, v) => { props[k] = v; } }, dataset: {} };
  const skin = rollSkin('calculator');
  applySkin(fakeEl, skin);
  for (const name of ['--rand-bg', '--rand-surface', '--rand-text', '--rand-accent', '--rand-accent-2', '--rand-font-head', '--rand-font-body', '--rand-radius', '--rand-shadow']) {
    assert.ok(props[name] !== undefined, `missing CSS var: ${name}`);
  }
  assert.strictEqual(props['--rand-bg'],       skin.palette.bg);
  assert.strictEqual(props['--rand-surface'],  skin.palette.surface);
  assert.strictEqual(props['--rand-text'],     skin.palette.text);
  assert.strictEqual(props['--rand-accent'],   skin.palette.accent);
  assert.strictEqual(props['--rand-accent-2'], skin.palette.accent2);
  assert.strictEqual(props['--rand-font-head'],skin.font.head);
  assert.strictEqual(props['--rand-font-body'],skin.font.body);
  assert.strictEqual(props['--rand-radius'],   skin.radius);
  assert.strictEqual(props['--rand-shadow'],   skin.shadow);
  assert.strictEqual(fakeEl.dataset.chrome,    skin.chrome);
  assert.strictEqual(fakeEl.dataset.layout,    skin.layout);
});
