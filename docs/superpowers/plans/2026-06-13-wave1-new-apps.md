# Wave 1 — New Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new RandOS apps — Random Sound Board, Suggestion Box, Quote of the Session, and Customizable Spinner — each as a DOM-factory app following the existing pattern.

**Architecture:** Each app is a factory file in `js/apps/` returning a root element, with a `makePixelIcon` builder in `js/pixel-icons.js`, one `APPS` entry in `js/desktop.js` (fixed window size), and a `<script>` tag in `index.html`. Pure logic (random pickers, spinner geometry, sound manifest) is extracted into small functions behind CommonJS guards and unit-tested with `node --test`. Styling extends `css/base.css` using the scoped `--rand-*` skin vars.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step, `<script>` tags, Web Audio not used here (sounds are pre-generated WAV files played via `<audio>`), `node --test` for tests.

**Spec:** `docs/superpowers/specs/2026-06-13-feature-batch-design.md`

---

## File map

- Create `tools/gen-sounds.js` — one-time Node script writing CC0 WAVs.
- Create `assets/sounds/*.wav` — generated audio (committed).
- Create `js/sound-manifest.js` — sound list + `pickRandomSound` helper.
- Create `js/apps/soundboard.js` — Sound Board factory.
- Create `js/apps/suggestion-box.js` — Suggestion Box factory + `pickSuggestion`.
- Create `js/apps/quote.js` — Quote factory + `pickQuote`.
- Create `js/apps/spinner.js` — Spinner factory + `winnerForAngle`.
- Create `tests/sound-manifest.test.js`, `tests/suggestion-box.test.js`, `tests/quote.test.js`, `tests/spinner.test.js`.
- Modify `js/pixel-icons.js` — add `soundboard`, `suggestionbox`, `quote`, `spinner` builders + ambient entries.
- Modify `js/desktop.js` — add four `APPS` entries.
- Modify `index.html` — add four `<script>` tags + sound-manifest tag.
- Modify `css/base.css` — app styles.

---

## Task 1: Sound generation tooling

**Files:**
- Create: `tools/gen-sounds.js`
- Output: `assets/sounds/blip.wav`, `zap.wav`, `chime.wav`, `coin.wav`, `drum.wav`, `laser.wav`, `whoosh.wav`, `error.wav`

- [ ] **Step 1: Write the generator script**

`tools/gen-sounds.js` synthesizes 16-bit mono PCM WAVs (44.1kHz) and writes them. These are original works → CC0/public domain.

```js
// tools/gen-sounds.js — one-time generator for RandOS's CC0 sound pack.
// Run with: node tools/gen-sounds.js
// Writes 16-bit/44.1kHz mono WAV files into assets/sounds/. NOT loaded at runtime.
const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

function encodeWav(samples) {
  // samples: Float32-ish array in [-1, 1]. Returns a Buffer (PCM16 mono WAV).
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

function render(dur, fn) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / SR, i, n);
  return out;
}
const env = (t, dur, a = 0.005, r = 0.08) =>
  Math.min(1, t / a) * Math.min(1, (dur - t) / r);
const sine = (t, f) => Math.sin(2 * Math.PI * f * t);
const noise = () => Math.random() * 2 - 1;

const SOUNDS = {
  blip:  () => render(0.18, (t, i, n) => 0.5 * sine(t, 660) * env(t, 0.18)),
  zap:   () => render(0.30, (t) => 0.45 * sine(t, 900 - 700 * t) * env(t, 0.30)),
  chime: () => render(0.60, (t) => 0.3 * (sine(t, 880) + sine(t, 1320) + sine(t, 1760)) / 3 * env(t, 0.60, 0.005, 0.4)),
  coin:  () => render(0.35, (t) => 0.4 * sine(t, t < 0.07 ? 988 : 1319) * env(t, 0.35, 0.002, 0.2)),
  drum:  () => render(0.25, (t) => (0.7 * sine(t, 120 - 80 * t) + 0.3 * noise() * Math.exp(-30 * t)) * env(t, 0.25, 0.001, 0.05)),
  laser: () => render(0.40, (t) => 0.4 * sine(t, 1200 - 1000 * t) * env(t, 0.40)),
  whoosh:() => render(0.45, (t) => 0.35 * noise() * Math.exp(-6 * t) * env(t, 0.45, 0.05, 0.2)),
  error: () => render(0.45, (t) => 0.4 * sine(t, t < 0.2 ? 300 : 200) * env(t, 0.45, 0.005, 0.1))
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, gen] of Object.entries(SOUNDS)) {
  fs.writeFileSync(path.join(OUT, name + '.wav'), encodeWav(gen()));
  console.log('wrote', name + '.wav');
}
```

- [ ] **Step 2: Run the generator**

Run: `node tools/gen-sounds.js`
Expected: prints `wrote blip.wav` … `wrote error.wav`; `assets/sounds/` now holds 8 `.wav` files.

- [ ] **Step 3: Verify the files exist and are non-empty**

Run: `node -e "const fs=require('fs');const d='assets/sounds';console.log(fs.readdirSync(d).map(f=>f+':'+fs.statSync(d+'/'+f).size))"`
Expected: each file listed with a size > 1000 bytes.

- [ ] **Step 4: Commit**

```bash
git add tools/gen-sounds.js assets/sounds
git commit -m "feat(sound): generate CC0 WAV sound pack + generator script"
```

---

## Task 2: Sound manifest + random picker

**Files:**
- Create: `js/sound-manifest.js`
- Test: `tests/sound-manifest.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/sound-manifest.test.js`
Expected: FAIL — `Cannot find module '../js/sound-manifest.js'`.

- [ ] **Step 3: Write the manifest**

```js
// sound-manifest.js — RandOS sound library manifest.
// Each entry: { id, label, category, file }. `file` is relative to index.html.
// Real recorded CC0 clips can be dropped into assets/sounds/ and appended here
// with no code change. Plain script global + CommonJS guard for node --test.
var SOUNDS = [
  { id: 'blip',   label: 'Blip',   category: 'UI',      file: 'assets/sounds/blip.wav' },
  { id: 'zap',    label: 'Zap',    category: 'Zaps',    file: 'assets/sounds/zap.wav' },
  { id: 'chime',  label: 'Chime',  category: 'Chimes',  file: 'assets/sounds/chime.wav' },
  { id: 'coin',   label: 'Coin',   category: 'Game',    file: 'assets/sounds/coin.wav' },
  { id: 'drum',   label: 'Drum',   category: 'Drums',   file: 'assets/sounds/drum.wav' },
  { id: 'laser',  label: 'Laser',  category: 'Zaps',    file: 'assets/sounds/laser.wav' },
  { id: 'whoosh', label: 'Whoosh', category: 'FX',      file: 'assets/sounds/whoosh.wav' },
  { id: 'error',  label: 'Error',  category: 'UI',      file: 'assets/sounds/error.wav' }
];

// pickRandomSound(rng?) -> a SOUNDS entry. rng defaults to Math.random.
function pickRandomSound(rng) {
  var r = (typeof rng === 'function' ? rng : Math.random)();
  var i = Math.floor(r * SOUNDS.length);
  if (i >= SOUNDS.length) i = SOUNDS.length - 1;
  if (i < 0) i = 0;
  return SOUNDS[i];
}

if (typeof window !== 'undefined') {
  window.SOUNDS = SOUNDS;
  window.pickRandomSound = pickRandomSound;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SOUNDS: SOUNDS, pickRandomSound: pickRandomSound };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/sound-manifest.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add js/sound-manifest.js tests/sound-manifest.test.js
git commit -m "feat(sound): sound manifest + random picker with tests"
```

---

## Task 3: Sound Board pixel icon

**Files:**
- Modify: `js/pixel-icons.js` (add `drawSoundboard`, register in `BUILDERS` + `AMBIENT`)

- [ ] **Step 1: Add the builder function**

Add this near the other `draw*` functions in `js/pixel-icons.js` (before the `BUILDERS` map):

```js
function drawSoundboard(g, R) {
  // A speaker cone on the left, animated sound waves on the right.
  g.appendChild(px(2, 4, R.ink, { w: 2, h: 4 }));           // speaker neck
  g.appendChild(px(3, 2, R.ink, { w: 2, h: 8, rx: 0.5 }));  // cone
  g.appendChild(px(4, 3, R.panel, { w: 1, h: 6 }));         // cone face
  // Sound-wave arcs that pulse; randomize how many show.
  const waves = 1 + randInt(3);
  for (let k = 0; k < waves; k++) {
    const x = 6 + k * 2;
    const h = 4 - k;
    g.appendChild(px(x, 6 - h / 2, k === 0 ? R.accent : R.accent2, {
      w: 1, h: Math.max(1, h), cls: 'pxi-blink' + (k % 2 ? '2' : '')
    }));
  }
}
```

- [ ] **Step 2: Register it**

In the `BUILDERS` object add `soundboard: drawSoundboard,` and in `AMBIENT` add `soundboard: 'pxi-bob',`.

- [ ] **Step 3: Verify the file still parses**

Run: `node --check js/pixel-icons.js`
Expected: no output (exit 0).

- [ ] **Step 4: Commit**

```bash
git add js/pixel-icons.js
git commit -m "feat(icons): soundboard pixel icon"
```

---

## Task 4: Sound Board app

**Files:**
- Create: `js/apps/soundboard.js`
- Modify: `js/desktop.js` (APPS entry), `index.html` (script tags), `css/base.css`

- [ ] **Step 1: Write the factory**

```js
// soundboard.js — Random Sound Board app factory.
// Presents the sound-manifest as a pad grid styled as a "free-use sound
// library". Each pad plays its WAV via a cloned <audio> element so sounds can
// overlap. A "Surprise" button fires a random pad. Plain script, no modules.
function makeSoundboard() {
  const root = document.createElement('div');
  root.className = 'soundboard';

  const sounds = (typeof window !== 'undefined' && window.SOUNDS) ? window.SOUNDS : [];

  // One reusable <audio> per sound; clone on play so repeats/overlaps work.
  const base = {};
  for (const s of sounds) {
    const a = document.createElement('audio');
    a.src = s.file;
    a.preload = 'auto';
    base[s.id] = a;
  }
  function play(id) {
    const a = base[id];
    if (!a) return;
    const node = a.cloneNode();
    node.currentTime = 0;
    const p = node.play();
    if (p && typeof p.catch === 'function') p.catch(() => {}); // ignore autoplay block
  }

  const head = document.createElement('div');
  head.className = 'sb-head';
  const title = document.createElement('span');
  title.className = 'sb-title';
  title.textContent = 'Free-Use Sound Library';
  const surprise = document.createElement('button');
  surprise.type = 'button';
  surprise.className = 'sb-surprise';
  surprise.textContent = 'Surprise';
  surprise.addEventListener('click', () => {
    const s = window.pickRandomSound ? window.pickRandomSound() : sounds[0];
    if (s) { play(s.id); flash(padById[s.id]); }
  });
  head.append(title, surprise);
  root.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'sb-grid';
  const padById = {};
  function flash(pad) {
    if (!pad) return;
    pad.classList.remove('is-hit'); void pad.offsetWidth; pad.classList.add('is-hit');
  }
  for (const s of sounds) {
    const pad = document.createElement('button');
    pad.type = 'button';
    pad.className = 'sb-pad';
    const lab = document.createElement('span');
    lab.className = 'sb-pad-label';
    lab.textContent = s.label;
    const cat = document.createElement('span');
    cat.className = 'sb-pad-cat';
    cat.textContent = s.category;
    pad.append(lab, cat);
    pad.addEventListener('click', () => { play(s.id); flash(pad); });
    padById[s.id] = pad;
    grid.appendChild(pad);
  }
  root.appendChild(grid);
  return root;
}

if (typeof window !== 'undefined') window.makeSoundboard = makeSoundboard;
```

- [ ] **Step 2: Register the app in `js/desktop.js`**

Add to the `APPS` array:

```js
  { name: 'soundboard', title: 'Sound Board', size: { w: 440, h: 440 }, factory: () => makeSoundboard() },
```

- [ ] **Step 3: Add script tags in `index.html`**

After `<script src="js/apps/randomizer-app.js"></script>`, add (manifest first):

```html
  <script src="js/sound-manifest.js"></script>
  <script src="js/apps/soundboard.js"></script>
```

- [ ] **Step 4: Add CSS to `css/base.css`**

```css
.soundboard { display: flex; flex-direction: column; height: 100%; gap: 10px; }
.sb-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sb-title { font-family: var(--rand-font-head); font-weight: 700; }
.sb-surprise { padding: 6px 12px; border: none; border-radius: var(--rand-radius, 8px);
  background: var(--rand-accent); color: var(--rand-accent-text, #fff); cursor: pointer; }
.sb-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; flex: 1;
  overflow: auto; }
.sb-pad { display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
  gap: 2px; padding: 10px 12px; border: 2px solid var(--rand-accent-2, #28e0c8);
  border-radius: var(--rand-radius, 8px); background: var(--rand-surface);
  color: var(--rand-text); cursor: pointer; transition: transform .08s ease; }
.sb-pad-label { font-weight: 700; }
.sb-pad-cat { font-size: 11px; opacity: .65; }
.sb-pad.is-hit { animation: sb-hit .25s ease; }
@keyframes sb-hit { 0% { transform: scale(.92); background: var(--rand-accent); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .sb-pad.is-hit { animation: none; } }
```

- [ ] **Step 5: Verify it parses and loads**

Run: `node --check js/apps/soundboard.js && node --check js/desktop.js`
Expected: exit 0.

- [ ] **Step 6: Manual check**

Open `index.html` in a browser, double-click the Sound Board icon. Expected: a 2-column pad grid; clicking a pad plays a tone and flashes it; "Surprise" plays a random one.

- [ ] **Step 7: Commit**

```bash
git add js/apps/soundboard.js js/desktop.js index.html css/base.css
git commit -m "feat(app): Random Sound Board"
```

---

## Task 5: Suggestion Box — picker helper

**Files:**
- Create: `js/apps/suggestion-box.js` (helper first; factory added in Task 7)
- Test: `tests/suggestion-box.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/suggestion-box.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the helper + data (factory comes in Task 7)**

```js
// suggestion-box.js — The Suggestion Box app: a pixel box that opens to reveal
// a random activity. Pure data + pickSuggestion are exported for node --test;
// makeSuggestionBox builds the DOM. Plain script + CommonJS guard.
var SUGGESTIONS = [
  'Do 15 jumping jacks', 'Cook a random recipe', 'Text an old friend',
  'Drink a glass of water', 'Take a 5-minute walk', 'Doodle something silly',
  'Tidy one drawer', 'Stretch for 2 minutes', 'Write down 3 good things',
  'Learn a new word', 'Do 10 push-ups', 'Step outside and breathe',
  'Compliment a stranger', 'Read one page of a book', 'Plan a tiny adventure',
  'Organize your desktop icons', 'Try a 60-second meditation', 'Dance to one song'
];

// pickSuggestion(list, rng?, prev?) -> a member of list. When `prev` is given
// and the roll lands on it, nudge to the next index so it rarely repeats.
function pickSuggestion(list, rng, prev) {
  var r = (typeof rng === 'function' ? rng : Math.random)();
  var i = Math.floor(r * list.length);
  if (i >= list.length) i = list.length - 1;
  if (i < 0) i = 0;
  if (list.length > 1 && list[i] === prev) i = (i + 1) % list.length;
  return list[i];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUGGESTIONS: SUGGESTIONS, pickSuggestion: pickSuggestion };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/suggestion-box.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add js/apps/suggestion-box.js tests/suggestion-box.test.js
git commit -m "feat(app): Suggestion Box data + picker with tests"
```

---

## Task 6: Suggestion Box pixel icon

**Files:**
- Modify: `js/pixel-icons.js`

- [ ] **Step 1: Add the builder**

```js
function drawSuggestionbox(g, R) {
  // A small box with a lid lifted at an angle and a slip peeking out.
  g.appendChild(px(2, 6, R.ink, { w: 8, h: 5, rx: 0.5 }));   // box body
  g.appendChild(px(3, 7, R.panel, { w: 6, h: 3 }));          // box inner
  g.appendChild(px(4, 3, R.accent2, { w: 4, h: 3, cls: 'pxi-bob' })); // slip
  g.appendChild(px(2, 5, R.accent, { w: 9, h: 1, rx: 0.5 })); // lid (tilted feel)
  if (chance(0.6)) g.appendChild(px(9, 2, R.accent2, { cls: 'pxi-twinkle' }));
}
```

- [ ] **Step 2: Register** — `BUILDERS`: `suggestionbox: drawSuggestionbox,`; `AMBIENT`: `suggestionbox: '',` (the slip animates itself).

- [ ] **Step 3: Verify** — Run: `node --check js/pixel-icons.js` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add js/pixel-icons.js
git commit -m "feat(icons): suggestion box pixel icon"
```

---

## Task 7: Suggestion Box app factory

**Files:**
- Modify: `js/apps/suggestion-box.js` (add factory), `js/desktop.js`, `index.html`, `css/base.css`

- [ ] **Step 1: Add the factory** (insert above the CommonJS guard in `js/apps/suggestion-box.js`)

```js
// makeSuggestionBox() -> root element. Clicking the box toggles the lid open
// (revealing a fresh random suggestion) and closed.
function makeSuggestionBox() {
  const root = document.createElement('div');
  root.className = 'sgbox';

  const stage = document.createElement('button'); // the whole box is the button
  stage.type = 'button';
  stage.className = 'sgbox-stage';
  stage.setAttribute('aria-label', 'Open the suggestion box');

  const slip = document.createElement('div');
  slip.className = 'sgbox-slip';
  const slipText = document.createElement('span');
  slip.appendChild(slipText);

  const lid = document.createElement('div');
  lid.className = 'sgbox-lid';
  const body = document.createElement('div');
  body.className = 'sgbox-body';

  stage.append(slip, body, lid);

  const hint = document.createElement('div');
  hint.className = 'sgbox-hint';
  hint.textContent = 'Click the box for a suggestion';

  root.append(stage, hint);

  let open = false;
  let prev = null;
  stage.addEventListener('click', () => {
    open = !open;
    root.classList.toggle('is-open', open);
    if (open) {
      prev = pickSuggestion(SUGGESTIONS, Math.random, prev);
      slipText.textContent = prev;
      hint.textContent = 'Click again to close';
      if (window.FX) {
        const r = stage.getBoundingClientRect();
        window.FX.burst(r.left + r.width / 2, r.top + r.height / 3, { count: 12 });
      }
    } else {
      hint.textContent = 'Click the box for a suggestion';
    }
  });

  return root;
}

if (typeof window !== 'undefined') window.makeSuggestionBox = makeSuggestionBox;
```

- [ ] **Step 2: Register in `js/desktop.js` APPS**

```js
  { name: 'suggestionbox', title: 'Suggestion Box', size: { w: 360, h: 420 }, factory: () => makeSuggestionBox() },
```

- [ ] **Step 3: Script tag in `index.html`** (after the soundboard tag)

```html
  <script src="js/apps/suggestion-box.js"></script>
```

- [ ] **Step 4: Add CSS to `css/base.css`**

```css
.sgbox { display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 16px; }
.sgbox-stage { position: relative; width: 160px; height: 140px; border: none;
  background: transparent; cursor: pointer; }
.sgbox-body { position: absolute; left: 20px; bottom: 0; width: 120px; height: 80px;
  background: var(--rand-accent); border-radius: 6px; box-shadow: inset 0 -8px 0 rgba(0,0,0,.18); }
.sgbox-lid { position: absolute; left: 14px; bottom: 76px; width: 132px; height: 18px;
  background: var(--rand-accent-2, #28e0c8); border-radius: 5px; transform-origin: left bottom;
  transition: transform .35s cubic-bezier(.34,1.56,.64,1); }
.sgbox-slip { position: absolute; left: 40px; bottom: 70px; width: 80px; min-height: 50px;
  padding: 8px; background: var(--rand-surface); color: var(--rand-text);
  border: 2px solid var(--rand-accent-2, #28e0c8); border-radius: 4px; font-size: 13px;
  text-align: center; opacity: 0; transform: translateY(20px) scale(.6);
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .25s ease; }
.sgbox.is-open .sgbox-lid { transform: rotate(-105deg); }
.sgbox.is-open .sgbox-slip { opacity: 1; transform: translateY(-30px) scale(1); }
.sgbox-hint { font-size: 13px; opacity: .7; }
@media (prefers-reduced-motion: reduce) {
  .sgbox-lid, .sgbox-slip { transition: none; }
}
```

- [ ] **Step 5: Verify** — Run: `node --check js/apps/suggestion-box.js && node --test tests/suggestion-box.test.js` → parses + 3 tests pass.

- [ ] **Step 6: Manual check** — open the app; clicking the box lifts the lid and pops a suggestion slip; clicking again closes it.

- [ ] **Step 7: Commit**

```bash
git add js/apps/suggestion-box.js js/desktop.js index.html css/base.css
git commit -m "feat(app): Suggestion Box window with animated lid"
```

---

## Task 8: Quote of the Session — picker helper

**Files:**
- Create: `js/apps/quote.js` (helper first)
- Test: `tests/quote.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/quote.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the helper + data**

```js
// quote.js — Quote of the Session. Shows a random quote on every open. Pure
// data + pickQuote exported for node --test; makeQuote builds the DOM.
var QUOTES = [
  { text: 'The only way to do great work is to love what you do.', by: 'Steve Jobs', kind: 'famous' },
  { text: 'In the middle of difficulty lies opportunity.', by: 'Albert Einstein', kind: 'famous' },
  { text: 'Whether you think you can or you cannot, you are right.', by: 'Henry Ford', kind: 'famous' },
  { text: 'Be the change you wish to see in the world.', by: 'Gandhi', kind: 'famous' },
  { text: 'Simplicity is the ultimate sophistication.', by: 'Leonardo da Vinci', kind: 'famous' },
  { text: "May the Force be with you.", by: 'Star Wars', kind: 'movie' },
  { text: "Why so serious?", by: 'The Dark Knight', kind: 'movie' },
  { text: "I'll be back.", by: 'The Terminator', kind: 'movie' },
  { text: 'Life is like a box of chocolates.', by: 'Forrest Gump', kind: 'movie' },
  { text: "There's no place like home.", by: 'The Wizard of Oz', kind: 'movie' },
  { text: 'I told my computer I needed a break, and it said no problem — it would go to sleep.', by: 'Anon', kind: 'joke' },
  { text: 'Why do programmers prefer dark mode? Because light attracts bugs.', by: 'Anon', kind: 'joke' },
  { text: 'I would tell you a UDP joke, but you might not get it.', by: 'Anon', kind: 'joke' },
  { text: 'There are 10 kinds of people: those who understand binary and those who do not.', by: 'Anon', kind: 'joke' },
  { text: 'My code works and I have no idea why.', by: 'Every dev ever', kind: 'joke' }
];

function pickQuote(list, rng) {
  var r = (typeof rng === 'function' ? rng : Math.random)();
  var i = Math.floor(r * list.length);
  if (i >= list.length) i = list.length - 1;
  if (i < 0) i = 0;
  return list[i];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QUOTES: QUOTES, pickQuote: pickQuote };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/quote.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add js/apps/quote.js tests/quote.test.js
git commit -m "feat(app): Quote of the Session data + picker with tests"
```

---

## Task 9: Quote pixel icon

**Files:**
- Modify: `js/pixel-icons.js`

- [ ] **Step 1: Add the builder**

```js
function drawQuote(g, R) {
  // A speech bubble with two big quotation marks.
  g.appendChild(px(1, 2, R.ink, { w: 10, h: 7, rx: 1.5 }));  // bubble
  g.appendChild(px(3, 9, R.ink, { w: 2, h: 2 }));            // tail
  g.appendChild(px(2, 3, R.panel, { w: 8, h: 5, rx: 1 }));   // inner
  g.appendChild(px(3, 4, R.accent, { w: 1, h: 2 }));         // left quote
  g.appendChild(px(4, 4, R.accent, { w: 1, h: 2 }));
  g.appendChild(px(7, 4, R.accent2, { w: 1, h: 2, cls: 'pxi-blink' })); // right quote
  g.appendChild(px(8, 4, R.accent2, { w: 1, h: 2 }));
}
```

- [ ] **Step 2: Register** — `BUILDERS`: `quote: drawQuote,`; `AMBIENT`: `quote: 'pxi-sway',`.

- [ ] **Step 3: Verify** — `node --check js/pixel-icons.js` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add js/pixel-icons.js
git commit -m "feat(icons): quote pixel icon"
```

---

## Task 10: Quote app factory

**Files:**
- Modify: `js/apps/quote.js` (add factory), `js/desktop.js`, `index.html`, `css/base.css`

- [ ] **Step 1: Add the factory** (above the CommonJS guard)

```js
// makeQuote() -> root element. Picks a fresh quote on open; "Another" rerolls.
function makeQuote() {
  const root = document.createElement('div');
  root.className = 'quote-app';

  const mark = document.createElement('div');
  mark.className = 'quote-mark';
  mark.textContent = '“'; // left double quote (not an emoji)

  const text = document.createElement('blockquote');
  text.className = 'quote-text';
  const by = document.createElement('cite');
  by.className = 'quote-by';
  const tag = document.createElement('span');
  tag.className = 'quote-kind';

  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'quote-again';
  again.textContent = 'Another';

  function show() {
    const q = pickQuote(QUOTES, Math.random);
    text.textContent = q.text;
    by.textContent = '— ' + q.by; // em dash + attribution
    tag.textContent = q.kind;
    tag.dataset.kind = q.kind;
  }
  again.addEventListener('click', show);
  show(); // fresh quote on every open

  root.append(mark, text, by, tag, again);
  return root;
}

if (typeof window !== 'undefined') window.makeQuote = makeQuote;
```

- [ ] **Step 2: Register in `js/desktop.js` APPS**

```js
  { name: 'quote', title: 'Quote of the Session', size: { w: 440, h: 300 }, factory: () => makeQuote() },
```

- [ ] **Step 3: Script tag in `index.html`** (after suggestion-box tag)

```html
  <script src="js/apps/quote.js"></script>
```

- [ ] **Step 4: Add CSS to `css/base.css`**

```css
.quote-app { display: flex; flex-direction: column; height: 100%; gap: 10px; justify-content: center; }
.quote-mark { font-family: Georgia, serif; font-size: 48px; line-height: .6; color: var(--rand-accent); }
.quote-text { margin: 0; font-family: var(--rand-font-head); font-size: 18px; }
.quote-by { font-style: normal; opacity: .75; align-self: flex-end; }
.quote-kind { align-self: flex-start; font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
  padding: 2px 8px; border-radius: 999px; background: var(--rand-accent-2, #28e0c8);
  color: var(--rand-accent-2-text, #000); }
.quote-again { align-self: flex-end; margin-top: 6px; padding: 6px 14px; border: none;
  border-radius: var(--rand-radius, 8px); background: var(--rand-accent);
  color: var(--rand-accent-text, #fff); cursor: pointer; }
```

- [ ] **Step 5: Verify** — `node --check js/apps/quote.js && node --test tests/quote.test.js` → parses + tests pass.

- [ ] **Step 6: Manual check** — open the app twice; each open shows a (usually) different quote; "Another" rerolls in place.

- [ ] **Step 7: Commit**

```bash
git add js/apps/quote.js js/desktop.js index.html css/base.css
git commit -m "feat(app): Quote of the Session window"
```

---

## Task 11: Spinner — winner geometry helper

**Files:**
- Create: `js/apps/spinner.js` (helper first)
- Test: `tests/spinner.test.js`

**Geometry contract:** slots are drawn clockwise starting at the top (12 o'clock). Slot `k` spans angles `[k*seg, (k+1)*seg)` measured clockwise from the top, where `seg = 360/count`. A fixed pointer sits at the top (angle 0). After the wheel rotates clockwise by `finalAngleDeg`, the slot under the pointer is the one whose pre-rotation angle is `(360 - (finalAngleDeg mod 360)) mod 360`.

- [ ] **Step 1: Write the failing test**

```js
// tests/spinner.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { winnerForAngle } = require('../js/apps/spinner.js');

test('no rotation -> slot 0 is under the top pointer', () => {
  assert.strictEqual(winnerForAngle(4, 0), 0);
  assert.strictEqual(winnerForAngle(6, 0), 0);
});

test('rotating clockwise moves later slots under the pointer', () => {
  // 4 slots, seg=90. Rotate 90deg cw -> slot that was at 270 (index 3) is on top.
  assert.strictEqual(winnerForAngle(4, 90), 3);
  // Rotate 180 -> index 2.
  assert.strictEqual(winnerForAngle(4, 180), 2);
});

test('normalizes multi-turn and negative angles', () => {
  assert.strictEqual(winnerForAngle(4, 360 + 90), 3);
  assert.strictEqual(winnerForAngle(4, -90), 1);
});

test('handles a single slot', () => {
  assert.strictEqual(winnerForAngle(1, 123), 0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/spinner.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the helper**

```js
// spinner.js — The Customizable Spinner. winnerForAngle is pure geometry,
// exported for node --test; makeSpinner builds the canvas wheel + controls.
var DEFAULT_SLOTS = ['Pizza', 'Tacos', 'Sushi', 'Burgers', 'Salad', 'Pasta'];

// winnerForAngle(count, finalAngleDeg) -> winning slot index.
// Slots are laid out clockwise from the top; a fixed pointer sits at the top.
function winnerForAngle(count, finalAngleDeg) {
  if (count <= 1) return 0;
  var seg = 360 / count;
  var rot = ((finalAngleDeg % 360) + 360) % 360;     // normalize 0..360
  var atTop = ((360 - rot) % 360);                   // pre-rotation angle now on top
  var idx = Math.floor(atTop / seg) % count;
  return idx;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { winnerForAngle: winnerForAngle, DEFAULT_SLOTS: DEFAULT_SLOTS };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/spinner.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add js/apps/spinner.js tests/spinner.test.js
git commit -m "feat(app): Spinner winner geometry with tests"
```

---

## Task 12: Spinner pixel icon

**Files:**
- Modify: `js/pixel-icons.js`

- [ ] **Step 1: Add the builder**

```js
function drawSpinner(g, R) {
  // A wheel quartered into colored wedges with a pointer at the top.
  g.appendChild(px(2, 2, R.ink, { w: 8, h: 8, rx: 4, opacity: 0.4 })); // rim
  g.appendChild(px(3, 3, R.accent, { w: 3, h: 3 }));
  g.appendChild(px(6, 3, R.accent2, { w: 3, h: 3 }));
  g.appendChild(px(3, 6, R.accent2, { w: 3, h: 3 }));
  g.appendChild(px(6, 6, R.accent, { w: 3, h: 3 }));
  g.appendChild(px(5, 5, R.ink, { w: 2, h: 2, rx: 1 }));   // hub
  g.appendChild(px(5, 0, R.ink, { w: 2, h: 2 }));          // pointer
  g.setAttribute('class', 'pxi-spin'); // slow rotate ambient
}
```

- [ ] **Step 2: Register** — `BUILDERS`: `spinner: drawSpinner,`; `AMBIENT`: `spinner: '',` (rotates via inner `<g>` class).

- [ ] **Step 3: Add the `pxi-spin` keyframe to `css/base.css`** (near the other `pxi-*` animations):

```css
.pxi-spin { transform-origin: 50% 50%; animation: pxi-spin 6s linear infinite; }
@keyframes pxi-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .pxi-spin { animation: none; } }
```

- [ ] **Step 4: Verify** — `node --check js/pixel-icons.js` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/pixel-icons.js css/base.css
git commit -m "feat(icons): spinner pixel icon"
```

---

## Task 13: Spinner app factory

**Files:**
- Modify: `js/apps/spinner.js` (add factory), `js/desktop.js`, `index.html`, `css/base.css`

- [ ] **Step 1: Add the factory** (above the CommonJS guard)

```js
// makeSpinner() -> root element. Editable slots + a canvas wheel that spins to
// a random winner. Uses winnerForAngle() so the announced winner always matches
// where the wheel visually stops.
function makeSpinner() {
  const root = document.createElement('div');
  root.className = 'spinner-app';

  let slots = DEFAULT_SLOTS.slice();
  let angle = 0;        // current rotation in degrees
  let spinning = false;

  const wheelWrap = document.createElement('div');
  wheelWrap.className = 'spin-wheel-wrap';
  const pointer = document.createElement('div');
  pointer.className = 'spin-pointer';
  const canvas = document.createElement('canvas');
  canvas.width = 240; canvas.height = 240;
  canvas.className = 'spin-canvas';
  wheelWrap.append(pointer, canvas);

  const result = document.createElement('div');
  result.className = 'spin-result';
  result.textContent = 'Spin the wheel!';

  const spinBtn = document.createElement('button');
  spinBtn.type = 'button';
  spinBtn.className = 'spin-go';
  spinBtn.textContent = 'SPIN';

  const editor = document.createElement('textarea');
  editor.className = 'spin-editor';
  editor.rows = 5;
  editor.spellcheck = false;
  editor.value = slots.join('\n');
  editor.setAttribute('aria-label', 'One option per line');

  function readSlots() {
    const lines = editor.value.split('\n').map(s => s.trim()).filter(Boolean);
    slots = lines.length ? lines : ['(empty)'];
    draw();
  }
  editor.addEventListener('input', readSlots);

  function skinColors() {
    const cs = getComputedStyle(root);
    const a = cs.getPropertyValue('--rand-accent').trim() || '#ff4d9d';
    const b = cs.getPropertyValue('--rand-accent-2').trim() || '#28e0c8';
    const s = cs.getPropertyValue('--rand-surface').trim() || '#1d1933';
    return [a, b, s];
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    const n = slots.length;
    const cx = 120, cy = 120, r = 116;
    const cols = skinColors();
    ctx.clearRect(0, 0, 240, 240);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    const seg = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      // Draw clockwise from the top (-90deg) to match winnerForAngle.
      const start = -Math.PI / 2 + i * seg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, start + seg);
      ctx.closePath();
      ctx.fillStyle = cols[i % cols.length];
      ctx.fill();
      // Label.
      ctx.save();
      ctx.rotate(start + seg / 2);
      ctx.translate(r * 0.58, 0);
      ctx.fillStyle = '#fff';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slots[i].slice(0, 12), 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    result.textContent = '...';
    const reduced = window.FX && window.FX.reducedMotion && window.FX.reducedMotion();
    const turns = reduced ? 0 : 4 + Math.floor(Math.random() * 4);
    const extra = Math.random() * 360;
    const target = angle + turns * 360 + extra;
    const dur = reduced ? 150 : 3600;
    const start = performance.now();
    const from = angle;
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      angle = from + (target - from) * eased;
      draw();
      if (t < 1) { requestAnimationFrame(frame); }
      else {
        spinning = false;
        const idx = winnerForAngle(slots.length, angle);
        result.textContent = 'Winner: ' + slots[idx];
        if (window.FX) {
          const rc = wheelWrap.getBoundingClientRect();
          window.FX.burst(rc.left + rc.width / 2, rc.top + rc.height / 2, { count: 26 });
        }
      }
    }
    requestAnimationFrame(frame);
  }
  spinBtn.addEventListener('click', spin);

  root.append(wheelWrap, result, spinBtn, editor);
  // Initial draw deferred so the element is in the DOM (skin vars resolve).
  setTimeout(draw, 0);
  return root;
}

if (typeof window !== 'undefined') window.makeSpinner = makeSpinner;
```

- [ ] **Step 2: Register in `js/desktop.js` APPS**

```js
  { name: 'spinner', title: 'Spinner', size: { w: 460, h: 520 }, factory: () => makeSpinner() },
```

- [ ] **Step 3: Script tag in `index.html`** (after quote tag)

```html
  <script src="js/apps/spinner.js"></script>
```

- [ ] **Step 4: Add CSS to `css/base.css`**

```css
.spinner-app { display: flex; flex-direction: column; align-items: center; height: 100%; gap: 10px; }
.spin-wheel-wrap { position: relative; width: 240px; height: 240px; }
.spin-canvas { display: block; border-radius: 50%; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
.spin-pointer { position: absolute; top: -6px; left: 50%; transform: translateX(-50%);
  width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent;
  border-top: 18px solid var(--rand-text); z-index: 2; }
.spin-result { font-family: var(--rand-font-head); font-weight: 700; min-height: 22px; }
.spin-go { padding: 8px 24px; border: none; border-radius: var(--rand-radius, 8px);
  background: var(--rand-accent); color: var(--rand-accent-text, #fff); cursor: pointer; font-weight: 700; }
.spin-editor { width: 100%; resize: none; border: 2px solid var(--rand-accent-2, #28e0c8);
  border-radius: var(--rand-radius, 8px); background: var(--rand-surface); color: var(--rand-text);
  padding: 8px; font-family: monospace; }
```

- [ ] **Step 5: Verify** — `node --check js/apps/spinner.js && node --test tests/spinner.test.js` → parses + tests pass.

- [ ] **Step 6: Manual check** — open the Spinner; edit options in the textarea (wheel redraws live); press SPIN; the wheel eases to a stop and the announced winner matches the slice under the top pointer.

- [ ] **Step 7: Commit**

```bash
git add js/apps/spinner.js js/desktop.js index.html css/base.css
git commit -m "feat(app): Customizable Spinner"
```

---

## Task 14: Full-suite verification

- [ ] **Step 1: Run the whole test suite**

Run: `node --test`
Expected: all test files pass (existing calc/randomizer + the four new ones).

- [ ] **Step 2: Syntax-check every touched JS file**

Run: `node --check js/pixel-icons.js && node --check js/desktop.js && node --check js/sound-manifest.js`
Expected: exit 0.

- [ ] **Step 3: Manual smoke test** — open `index.html`; confirm all four new icons appear on the desktop, each app opens, and the existing apps + shuffle still work.

- [ ] **Step 4: Final commit if anything was adjusted**

```bash
git add -A
git commit -m "test: wave 1 full-suite verification"
```

---

## Self-review notes (spec coverage)

- Random Sound Board → Tasks 1–4 ✓ (generated CC0 WAVs, manifest, drop-in ready, `<audio>` overlap, Surprise button).
- Suggestion Box → Tasks 5–7 ✓ (animated lid, reduced-motion fallback, `pickSuggestion`).
- Quote of the Session → Tasks 8–10 ✓ (random on open, three kinds, Another button).
- Customizable Spinner → Tasks 11–13 ✓ (editable slots, canvas wheel, `winnerForAngle` keeps announcement honest).
- Pixel icons for all four → Tasks 3, 6, 9, 12 ✓.
- Tests for every pure helper → Tasks 2, 5, 8, 11 ✓.

**Next:** after this wave is executed and verified, create a handoff doc, then proceed to Wave 2 (`2026-06-13-wave2-chaotic-apps.md`).
