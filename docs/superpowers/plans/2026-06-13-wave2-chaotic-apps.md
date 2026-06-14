# Wave 2 — Chaotic Standard Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two "standard OS" apps with a chaotic twist — a Notepad whose text occasionally re-styles itself and chaotically "autocorrects", and a tiny Paint app whose brush fights back.

**Architecture:** Same app-factory pattern as Wave 1. Each app owns a pure, testable chaos helper behind a CommonJS guard. Chaos timers self-stop when the app's window is removed (guarded by `document.body.contains(root)`), respect `prefers-reduced-motion`, and Notepad has an in-app calm toggle.

**Tech Stack:** Vanilla HTML/CSS/JS, `<canvas>` for Paint, `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-13-feature-batch-design.md`
**Prereq:** Wave 1 merged (`2026-06-13-wave1-new-apps.md`).

---

## File map

- Create `js/apps/notepad.js` — Notepad factory + `chaoticAutocorrect` helper.
- Create `js/apps/paint.js` — Paint factory + `randomBrush` helper.
- Create `tests/notepad.test.js`, `tests/paint.test.js`.
- Modify `js/pixel-icons.js` — add `notepad`, `paint` builders + ambient entries.
- Modify `js/desktop.js` — add two `APPS` entries.
- Modify `index.html` — add two `<script>` tags.
- Modify `css/base.css` — Notepad + Paint styles.

---

## Task 1: Notepad — chaotic autocorrect helper

**Files:**
- Create: `js/apps/notepad.js` (helper first)
- Test: `tests/notepad.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/notepad.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the helper + data**

```js
// notepad.js — chaotic Notepad. Pure SWAPS + chaoticAutocorrect exported for
// node --test; makeNotepad builds the DOM. The chaos is occasional, cosmetic,
// and recoverable (a calm toggle stops it). Plain script + CommonJS guard.
var SWAPS = {
  the: 'teh', and: 'adn', you: 'yuo', file: 'fle', send: 'snd',
  now: 'noaw', meeting: 'meating', please: 'pls', tomorrow: 'tomorow',
  important: 'improtant', because: 'becuase', their: 'thier', would: 'wuold'
};

// chaoticAutocorrect(text, rng?) -> text with ONE eligible word swapped (the
// k-th eligible occurrence chosen by rng). Returns text unchanged when no word
// matches SWAPS. Never throws.
function chaoticAutocorrect(text, rng) {
  if (typeof text !== 'string' || text.length === 0) return text;
  var words = text.split(/(\s+)/); // keep whitespace tokens at odd indices
  var eligible = [];
  for (var i = 0; i < words.length; i++) {
    var bare = words[i].toLowerCase().replace(/[^a-z]/g, '');
    if (SWAPS[bare]) eligible.push(i);
  }
  if (!eligible.length) return text;
  var r = (typeof rng === 'function' ? rng : Math.random)();
  var pickIdx = Math.floor(r * eligible.length);
  if (pickIdx >= eligible.length) pickIdx = eligible.length - 1;
  var wi = eligible[pickIdx];
  var bareWord = words[wi].toLowerCase().replace(/[^a-z]/g, '');
  words[wi] = words[wi].replace(bareWord, SWAPS[bareWord]);
  return words.join('');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SWAPS: SWAPS, chaoticAutocorrect: chaoticAutocorrect };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/notepad.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add js/apps/notepad.js tests/notepad.test.js
git commit -m "feat(app): chaotic Notepad autocorrect helper with tests"
```

---

## Task 2: Notepad pixel icon

**Files:**
- Modify: `js/pixel-icons.js`

- [ ] **Step 1: Add the builder**

```js
function drawNotepad(g, R) {
  // A sheet with ruled lines + a pencil corner; one line glitch-blinks.
  g.appendChild(px(2, 1, R.ink, { w: 8, h: 10, rx: 0.5 }));  // page
  g.appendChild(px(3, 1, R.accent, { w: 1, h: 10, opacity: 0.5 })); // margin
  const lines = [3, 5, 7, 9];
  for (let i = 0; i < lines.length; i++) {
    const glitch = chance(0.3);
    g.appendChild(px(4, lines[i], glitch ? R.accent2 : R.ink2, {
      w: glitch ? 3 + randInt(3) : 5, h: 1, cls: glitch ? 'pxi-blink2' : undefined
    }));
  }
  g.appendChild(px(8, 8, R.accent2, { w: 2, h: 3 })); // pencil
  g.appendChild(px(8, 11, R.accent, { w: 2, h: 1 }));  // tip
}
```

- [ ] **Step 2: Register** — `BUILDERS`: `notepad: drawNotepad,`; `AMBIENT`: `notepad: 'pxi-bob',`.

- [ ] **Step 3: Verify** — `node --check js/pixel-icons.js` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add js/pixel-icons.js
git commit -m "feat(icons): notepad pixel icon"
```

---

## Task 3: Notepad app factory

**Files:**
- Modify: `js/apps/notepad.js` (add factory), `js/desktop.js`, `index.html`, `css/base.css`

- [ ] **Step 1: Add the factory** (above the CommonJS guard)

```js
// makeNotepad() -> root element. A contenteditable note with two chaos streaks:
//   - autocorrect: on a timer, swaps one word for a wrong one (chaoticAutocorrect)
//   - restyle: on a timer, wraps one random word in an inline span with a
//     random font/size/color (suppressed under reduced motion)
// A "Calm" toggle stops all chaos. Timers self-clear when the window is removed.
function makeNotepad() {
  const root = document.createElement('div');
  root.className = 'notepad';

  const bar = document.createElement('div');
  bar.className = 'np-bar';
  const calm = document.createElement('button');
  calm.type = 'button';
  calm.className = 'np-calm';
  calm.textContent = 'Calm: OFF';
  const note = document.createElement('div');
  note.className = 'np-note';
  note.contentEditable = 'true';
  note.spellcheck = false;
  note.textContent = 'Type here. This notepad gets a little chaotic... the and you file please.';
  bar.appendChild(calm);
  root.append(bar, note);

  let calmOn = false;
  calm.addEventListener('click', () => {
    calmOn = !calmOn;
    calm.textContent = 'Calm: ' + (calmOn ? 'ON' : 'OFF');
  });

  function reduced() { return window.FX && window.FX.reducedMotion && window.FX.reducedMotion(); }
  function alive() { return document.body && document.body.contains(root); }

  const FONTS = ['Georgia, serif', "'Comic Sans MS', cursive", 'Impact, sans-serif', 'monospace'];
  const COLORS = ['var(--rand-accent)', 'var(--rand-accent-2)', '#ff4d4d', '#ffd166'];

  // Autocorrect tick: swap one word in the live text. Preserves caret-less edit
  // by only acting when the note is NOT focused (so we never fight the typist).
  const acTimer = setInterval(() => {
    if (!alive()) { clearInterval(acTimer); return; }
    if (calmOn || document.activeElement === note) return;
    const before = note.textContent;
    const after = chaoticAutocorrect(before, Math.random);
    if (after !== before) note.textContent = after;
  }, 4200);

  // Restyle tick: wrap one random word in a styled span (cosmetic only).
  const rsTimer = setInterval(() => {
    if (!alive()) { clearInterval(rsTimer); return; }
    if (calmOn || reduced() || document.activeElement === note) return;
    const words = note.textContent.split(' ');
    if (words.length < 2) return;
    const i = Math.floor(Math.random() * words.length);
    const span = document.createElement('span');
    span.className = 'np-wild';
    span.style.fontFamily = FONTS[Math.floor(Math.random() * FONTS.length)];
    span.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    span.style.fontSize = (0.8 + Math.random() * 1.2).toFixed(2) + 'em';
    span.textContent = words[i] + ' ';
    words[i] = ' '; // placeholder
    // Rebuild as text + the one styled span (keeps it simple + safe, no innerHTML).
    note.textContent = '';
    words.forEach((w, idx) => {
      if (w === ' ') { note.appendChild(span); }
      else note.appendChild(document.createTextNode(w + (idx < words.length - 1 ? ' ' : '')));
    });
  }, 5300);

  return root;
}

if (typeof window !== 'undefined') window.makeNotepad = makeNotepad;
```

- [ ] **Step 2: Register in `js/desktop.js` APPS**

```js
  { name: 'notepad', title: 'Notepad', size: { w: 420, h: 460 }, factory: () => makeNotepad() },
```

- [ ] **Step 3: Script tag in `index.html`** (after the Wave 1 app tags)

```html
  <script src="js/apps/notepad.js"></script>
```

- [ ] **Step 4: Add CSS to `css/base.css`**

```css
.notepad { display: flex; flex-direction: column; height: 100%; gap: 8px; }
.np-bar { display: flex; justify-content: flex-end; }
.np-calm { padding: 4px 12px; border: 2px solid var(--rand-accent-2, #28e0c8);
  border-radius: var(--rand-radius, 8px); background: var(--rand-surface);
  color: var(--rand-text); cursor: pointer; font-size: 12px; }
.np-note { flex: 1; overflow: auto; padding: 10px; border-radius: var(--rand-radius, 8px);
  background: var(--rand-surface); color: var(--rand-text); line-height: 1.5;
  outline: none; border: 1px solid color-mix(in srgb, var(--rand-text) 15%, transparent); }
.np-wild { transition: all .2s ease; }
```

- [ ] **Step 5: Verify** — `node --check js/apps/notepad.js && node --test tests/notepad.test.js` → parses + tests pass.

- [ ] **Step 6: Manual check** — open the Notepad, leave it unfocused for ~5s; a word swaps to a typo and another word restyles. Toggle "Calm: ON" and confirm the chaos stops. Type freely — chaos pauses while focused.

- [ ] **Step 7: Commit**

```bash
git add js/apps/notepad.js js/desktop.js index.html css/base.css
git commit -m "feat(app): chaotic Notepad window"
```

---

## Task 4: Paint — random brush helper

**Files:**
- Create: `js/apps/paint.js` (helper first)
- Test: `tests/paint.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/paint.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { PALETTE, randomBrush } = require('../js/apps/paint.js');

test('PALETTE is a non-empty array of color strings', () => {
  assert.ok(Array.isArray(PALETTE) && PALETTE.length >= 4);
  for (const c of PALETTE) assert.ok(typeof c === 'string' && c.length > 0);
});

test('randomBrush returns a palette color and a size in range', () => {
  const b0 = randomBrush(() => 0);
  assert.strictEqual(b0.color, PALETTE[0]);
  assert.ok(b0.size >= 1 && b0.size <= 4);
  const b1 = randomBrush(() => 0.999);
  assert.strictEqual(b1.color, PALETTE[PALETTE.length - 1]);
  assert.ok(b1.size >= 1 && b1.size <= 4);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/paint.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the helper**

```js
// paint.js — chaotic Paint. PALETTE + randomBrush exported for node --test;
// makePaint builds the canvas. The brush color/size randomizes on you and stray
// pixels appear. Plain script + CommonJS guard.
var PALETTE = ['#ff4d9d', '#28e0c8', '#ffd166', '#9aff3c', '#7cc4ff', '#ffffff', '#ff5234'];

// randomBrush(rng?) -> { color, size }. size is an integer 1..4.
function randomBrush(rng) {
  var r = (typeof rng === 'function' ? rng : Math.random);
  var ci = Math.floor(r() * PALETTE.length);
  if (ci >= PALETTE.length) ci = PALETTE.length - 1;
  var size = 1 + Math.floor(r() * 4); // 1..4
  if (size > 4) size = 4;
  return { color: PALETTE[ci], size: size };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PALETTE: PALETTE, randomBrush: randomBrush };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/paint.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add js/apps/paint.js tests/paint.test.js
git commit -m "feat(app): chaotic Paint random-brush helper with tests"
```

---

## Task 5: Paint pixel icon

**Files:**
- Modify: `js/pixel-icons.js`

- [ ] **Step 1: Add the builder**

```js
function drawPaint(g, R) {
  // A paint palette blob with dabs of color + a brush.
  g.appendChild(px(2, 4, R.ink, { w: 7, h: 6, rx: 3, opacity: 0.85 })); // palette
  const dabs = [[3, 5], [5, 5], [4, 7], [6, 6]];
  const cols = [R.accent, R.accent2, R.ink2];
  for (let i = 0; i < dabs.length; i++) {
    if (chance(0.8)) g.appendChild(px(dabs[i][0], dabs[i][1], cols[randInt(cols.length)], { cls: chance(0.4) ? 'pxi-blink' : undefined }));
  }
  g.appendChild(px(8, 1, R.ink, { w: 1, h: 5 }));    // brush handle
  g.appendChild(px(8, 6, R.accent, { w: 1, h: 2 }));  // bristles
}
```

- [ ] **Step 2: Register** — `BUILDERS`: `paint: drawPaint,`; `AMBIENT`: `paint: 'pxi-sway',`.

- [ ] **Step 3: Verify** — `node --check js/pixel-icons.js` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add js/pixel-icons.js
git commit -m "feat(icons): paint pixel icon"
```

---

## Task 6: Paint app factory

**Files:**
- Modify: `js/apps/paint.js` (add factory), `js/desktop.js`, `index.html`, `css/base.css`

- [ ] **Step 1: Add the factory** (above the CommonJS guard)

```js
// makePaint() -> root element. A pixel grid you draw on; the brush color/size
// randomizes periodically and stray pixels appear. Clear button resets. Timers
// self-clear when the window is removed.
function makePaint() {
  const root = document.createElement('div');
  root.className = 'paint-app';

  const CELL = 12, COLS = 28, ROWS = 22;
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL; canvas.height = ROWS * CELL;
  canvas.className = 'paint-canvas';
  const ctx = canvas.getContext('2d');

  const bar = document.createElement('div');
  bar.className = 'paint-bar';
  const swatch = document.createElement('span');
  swatch.className = 'paint-swatch';
  const info = document.createElement('span');
  info.className = 'paint-info';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'paint-clear';
  clearBtn.textContent = 'Clear';
  bar.append(swatch, info, clearBtn);
  root.append(bar, canvas);

  let brush = randomBrush(Math.random);
  function showBrush() {
    swatch.style.background = brush.color;
    info.textContent = 'size ' + brush.size;
  }
  showBrush();

  function paintCell(px_, py, b) {
    ctx.fillStyle = b.color;
    const half = Math.floor(b.size / 2);
    for (let dx = -half; dx <= half; dx++) {
      for (let dy = -half; dy <= half; dy++) {
        ctx.fillRect((px_ + dx) * CELL, (py + dy) * CELL, CELL, CELL);
      }
    }
  }
  function cellFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / CELL),
      y: Math.floor((e.clientY - r.top) / CELL)
    };
  }

  let drawing = false;
  canvas.addEventListener('mousedown', (e) => { drawing = true; const c = cellFromEvent(e); paintCell(c.x, c.y, brush); });
  canvas.addEventListener('mousemove', (e) => { if (!drawing) return; const c = cellFromEvent(e); paintCell(c.x, c.y, brush); });
  window.addEventListener('mouseup', () => { drawing = false; });
  clearBtn.addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

  function alive() { return document.body && document.body.contains(root); }
  function reduced() { return window.FX && window.FX.reducedMotion && window.FX.reducedMotion(); }

  // Chaos: rebrush on you periodically.
  const brushTimer = setInterval(() => {
    if (!alive()) { clearInterval(brushTimer); return; }
    brush = randomBrush(Math.random);
    showBrush();
  }, 3500);

  // Chaos: a stray pixel appears somewhere (rarer under reduced motion).
  const strayTimer = setInterval(() => {
    if (!alive()) { clearInterval(strayTimer); return; }
    if (reduced() && Math.random() < 0.7) return;
    const sx = Math.floor(Math.random() * COLS);
    const sy = Math.floor(Math.random() * ROWS);
    paintCell(sx, sy, randomBrush(Math.random));
  }, 2600);

  return root;
}

if (typeof window !== 'undefined') window.makePaint = makePaint;
```

- [ ] **Step 2: Register in `js/desktop.js` APPS**

```js
  { name: 'paint', title: 'Paint', size: { w: 460, h: 420 }, factory: () => makePaint() },
```

- [ ] **Step 3: Script tag in `index.html`** (after the notepad tag)

```html
  <script src="js/apps/paint.js"></script>
```

- [ ] **Step 4: Add CSS to `css/base.css`**

```css
.paint-app { display: flex; flex-direction: column; height: 100%; gap: 8px; }
.paint-bar { display: flex; align-items: center; gap: 10px; }
.paint-swatch { width: 22px; height: 22px; border-radius: 4px; border: 2px solid var(--rand-text); }
.paint-info { font-size: 12px; opacity: .8; }
.paint-clear { margin-left: auto; padding: 4px 12px; border: none; border-radius: var(--rand-radius, 8px);
  background: var(--rand-accent); color: var(--rand-accent-text, #fff); cursor: pointer; }
.paint-canvas { flex: 1; align-self: center; background: var(--rand-surface);
  border-radius: var(--rand-radius, 8px); cursor: crosshair;
  image-rendering: pixelated; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--rand-text) 15%, transparent); }
```

- [ ] **Step 5: Verify** — `node --check js/apps/paint.js && node --test tests/paint.test.js` → parses + tests pass.

- [ ] **Step 6: Manual check** — open Paint; draw with the mouse; watch the swatch/size change on you every few seconds and stray pixels appear; Clear empties the canvas.

- [ ] **Step 7: Commit**

```bash
git add js/apps/paint.js js/desktop.js index.html css/base.css
git commit -m "feat(app): chaotic Paint"
```

---

## Task 7: Full-suite verification

- [ ] **Step 1: Run the whole test suite** — Run: `node --test` → all pass (Wave 1 + Notepad + Paint).
- [ ] **Step 2: Syntax-check** — Run: `node --check js/pixel-icons.js && node --check js/desktop.js` → exit 0.
- [ ] **Step 3: Manual smoke test** — open `index.html`; both new icons appear; both apps open and behave; closing each window stops its chaos (no console errors after close). Verify by opening then closing Notepad/Paint and watching the console stays quiet for ~10s.
- [ ] **Step 4: Final commit if adjusted**

```bash
git add -A
git commit -m "test: wave 2 full-suite verification"
```

---

## Self-review notes (spec coverage)

- Notepad (chaotic) → Tasks 1–3 ✓ (autocorrect swap + random restyle, calm toggle, reduced-motion suppresses restyle, timers self-clear).
- Paint (chaotic) → Tasks 4–6 ✓ (draw grid, brush randomizes, stray pixels, clear, reduced-motion eases stray rate).
- Pixel icons → Tasks 2, 5 ✓.
- Tests for pure helpers → Tasks 1, 4 ✓.

**Next:** execute + verify this wave, create a handoff doc, then proceed to Wave 3 (`2026-06-13-wave3-os-systems.md`).
