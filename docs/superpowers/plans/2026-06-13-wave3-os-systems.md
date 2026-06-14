# Wave 3 — OS Systems (QTE + Backrooms) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two OS-wide systems — Quick-Time Events (random mini-games that force-close all windows on failure) and a Backrooms easter egg (10% on any shuffle, click to escape).

**Architecture:** Both are self-contained IIFEs (like `js/chaos.js`) loaded last in `index.html`, each with a CommonJS guard so `node --test` can load it headless. A tiny shared busy-lock (`window.RandOSBusy`) stops QTE and chaos from overlapping. QTE force-closes windows via a new `window.forceCloseAllWindows()` added to `windows.js`. Backrooms hooks into both shuffle paths (`desktop.js` button + `chaos.js` event) and generates its hum via Web Audio (no asset).

**Tech Stack:** Vanilla HTML/CSS/JS, Web Audio (hum only), `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-13-feature-batch-design.md`
**Prereq:** Waves 1 & 2 merged.

---

## File map

- Create `js/busy-lock.js` — `window.RandOSBusy` shared lock.
- Create `js/qte.js` — QTE scheduler + challenges + `qteOutcome` helper.
- Create `js/backrooms.js` — Backrooms controller + `rollBackrooms` helper.
- Create `tests/qte.test.js`, `tests/backrooms.test.js`.
- Modify `js/windows.js` — add `window.forceCloseAllWindows()`.
- Modify `js/desktop.js` — call Backrooms roll inside `shuffleTheme()`.
- Modify `js/chaos.js` — call Backrooms roll inside `runChaos()`; respect busy-lock.
- Modify `index.html` — load `busy-lock.js`, `qte.js`, `backrooms.js` last.
- Modify `css/base.css` — QTE overlay + Backrooms theme styles.

---

## Task 1: Shared busy-lock

**Files:**
- Create: `js/busy-lock.js`
- Modify: `index.html`

- [ ] **Step 1: Write the lock**

```js
// busy-lock.js — a tiny shared lock so only one "big" OS event (chaos OR a QTE)
// runs at a time. Plain script global + CommonJS guard. No DOM needed.
(function () {
  'use strict';
  var owner = null; // null = free; otherwise a string tag of the holder
  var API = {
    isBusy: function () { return owner !== null; },
    // acquire(tag) -> true if the lock was taken (now held by tag), false if busy.
    acquire: function (tag) {
      if (owner !== null) return false;
      owner = tag || 'anon';
      return true;
    },
    // release(tag) frees the lock only if tag holds it (or if no tag given).
    release: function (tag) {
      if (tag === undefined || owner === tag) owner = null;
    },
    owner: function () { return owner; }
  };
  if (typeof window !== 'undefined') window.RandOSBusy = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
```

- [ ] **Step 2: Load it in `index.html`** — add BEFORE `js/chaos.js` (so chaos can use it):

```html
  <script src="js/busy-lock.js"></script>
```

(Place it just before the existing `<script src="js/chaos.js"></script>` line.)

- [ ] **Step 3: Verify** — Run: `node --check js/busy-lock.js` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add js/busy-lock.js index.html
git commit -m "feat(os): shared busy-lock for chaos/QTE coordination"
```

---

## Task 2: Make chaos respect the busy-lock

**Files:**
- Modify: `js/chaos.js`

The chaos `runSequence` already guards with its own `running` flag; add the shared lock so a QTE can't start mid-chaos and vice-versa.

- [ ] **Step 1: Acquire/release the lock around the chaos sequence**

In `js/chaos.js`, in `runSequence(onDone)`, change the body so it tries the shared lock first:

```js
  function runSequence(onDone) {
    if (running) { if (onDone) onDone(); return; }
    // Respect the shared lock: if a QTE (or anything) holds it, skip this cycle.
    if (typeof window !== 'undefined' && window.RandOSBusy &&
        !window.RandOSBusy.acquire('chaos')) {
      if (onDone) onDone();
      return;
    }
    running = true;
    showHeadsup(function () {
      removeBanner();
      try { runChaos(); }
      finally {
        running = false;
        if (typeof window !== 'undefined' && window.RandOSBusy) {
          window.RandOSBusy.release('chaos');
        }
        if (onDone) onDone();
      }
    });
  }
```

- [ ] **Step 2: Verify** — Run: `node --check js/chaos.js` → exit 0. Run: `node --test tests/` → existing chaos-related tests (if any) still pass; all green.

- [ ] **Step 3: Commit**

```bash
git add js/chaos.js
git commit -m "feat(os): chaos event respects the shared busy-lock"
```

---

## Task 3: `forceCloseAllWindows` in the window manager

**Files:**
- Modify: `js/windows.js`

- [ ] **Step 1: Add the global** (inside the `if (typeof window !== 'undefined')` block at the bottom of `windows.js`, alongside the other `window.*` exports)

```js
  // Force-close every open window (used by the QTE failure penalty). Animates
  // each out when motion is allowed, else tears down instantly. Iterates over a
  // COPY because teardown mutates openWindows.
  window.forceCloseAllWindows = function forceCloseAllWindows() {
    var snapshot = openWindows.slice();
    for (var i = 0; i < snapshot.length; i++) {
      var rec = snapshot[i];
      if (!rec || !rec.el) continue;
      var closeBtn = rec.el.querySelector('.window-close');
      if (closeBtn) {
        closeBtn.click(); // reuse the existing close path (animation + teardown)
      }
    }
  };
```

- [ ] **Step 2: Verify** — Run: `node --check js/windows.js` → exit 0.

- [ ] **Step 3: Manual check** — open 2-3 apps, then in the browser console run `forceCloseAllWindows()`. Expected: all windows animate shut and the taskbar clears.

- [ ] **Step 4: Commit**

```bash
git add js/windows.js
git commit -m "feat(os): forceCloseAllWindows() for the QTE penalty"
```

---

## Task 4: QTE outcome helper

**Files:**
- Create: `js/qte.js` (helper first; the IIFE wraps it)
- Test: `tests/qte.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/qte.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { qteOutcome } = require('../js/qte.js');

test('meeting the requirement before timeout is a success', () => {
  assert.strictEqual(qteOutcome(5, 5, false), 'success');
  assert.strictEqual(qteOutcome(6, 5, false), 'success');
});

test('falling short is a fail', () => {
  assert.strictEqual(qteOutcome(4, 5, false), 'fail');
});

test('timing out is a fail even if the count was met at the buzzer', () => {
  assert.strictEqual(qteOutcome(5, 5, true), 'fail');
});

test('zero hits is a fail', () => {
  assert.strictEqual(qteOutcome(0, 3, false), 'fail');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/qte.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `js/qte.js` with the helper exported**

Create the file with the full IIFE below. `qteOutcome` lives inside and is exported via the CommonJS guard. (The DOM/scheduler parts are inert under Node because there's no `document`/`window` with the needed APIs — guarded by the `start()` checks.)

```js
// qte.js — RandOS Quick-Time Events. Every ~90-150s (only when a window is open
// and the tab is visible and nothing else holds the busy-lock) a mini-game pops
// up with a strict timer. Success -> reward burst. Fail/ignore -> ALL open
// windows force-close. Modeled on chaos.js: one re-armed setTimeout, never
// setInterval; CommonJS guard for node --test.
(function () {
  'use strict';

  var MIN_MS = 90000, MAX_MS = 150000;

  // ── Pure outcome rule (tested) ──────────────────────────────────────────────
  // qteOutcome(hits, required, timedOut) -> 'success' | 'fail'.
  function qteOutcome(hits, required, timedOut) {
    if (timedOut) return 'fail';
    return hits >= required ? 'success' : 'fail';
  }

  // Everything below is browser-only.
  var scheduleTimer = null;
  var running = false;

  function reduced() {
    return typeof window !== 'undefined' && window.FX &&
      typeof window.FX.reducedMotion === 'function' && window.FX.reducedMotion();
  }
  function randInterval() { return MIN_MS + Math.floor(Math.random() * (MAX_MS - MIN_MS + 1)); }
  function openCount() {
    try { return (window.getOpenWindows ? window.getOpenWindows().length : 0); }
    catch (e) { return 0; }
  }

  // ── Challenge definitions ──────────────────────────────────────────────────
  // Each returns { instruction, build(host, onHit) } where build wires the
  // mini-game into `host` and calls onHit() each time the user scores a point.
  var CHALLENGES = [
    {
      required: 5, ms: 3000, instruction: 'Click the moving dot 5 times!',
      build: function (host, onHit) {
        var dot = document.createElement('button');
        dot.className = 'qte-dot';
        host.appendChild(dot);
        function move() {
          var r = host.getBoundingClientRect();
          dot.style.left = Math.random() * (r.width - 44) + 'px';
          dot.style.top = Math.random() * (r.height - 44) + 'px';
        }
        dot.addEventListener('click', function () { onHit(); move(); });
        move();
      }
    },
    {
      required: 10, ms: 4000, instruction: 'MASH the button 10 times!',
      build: function (host, onHit) {
        var b = document.createElement('button');
        b.className = 'qte-mash';
        b.textContent = 'MASH';
        b.addEventListener('click', onHit);
        host.appendChild(b);
      }
    },
    {
      required: 4, ms: 5000, instruction: 'Click the GREEN dots, avoid red!',
      build: function (host, onHit) {
        for (var i = 0; i < 9; i++) {
          (function () {
            var d = document.createElement('button');
            var green = Math.random() < 0.55;
            d.className = 'qte-grid-dot ' + (green ? 'is-green' : 'is-red');
            d.addEventListener('click', function () {
              if (d.disabled) return;
              if (green) { onHit(); d.disabled = true; d.classList.add('is-got'); }
              else { d.classList.add('is-bad'); }
            });
            host.appendChild(d);
          })();
        }
      }
    }
  ];

  function pickChallenge() { return CHALLENGES[(Math.random() * CHALLENGES.length) | 0]; }

  // ── Run one QTE ──────────────────────────────────────────────────────────────
  function runQTE(onDone) {
    var ch = pickChallenge();
    var hits = 0, finished = false;

    var overlay = document.createElement('div');
    overlay.className = 'qte-overlay';
    if (reduced()) overlay.classList.add('is-calm');

    var panel = document.createElement('div');
    panel.className = 'qte-panel';
    var title = document.createElement('div');
    title.className = 'qte-title';
    title.textContent = ch.instruction;
    var score = document.createElement('div');
    score.className = 'qte-score';
    score.textContent = '0 / ' + ch.required;
    var barWrap = document.createElement('div');
    barWrap.className = 'qte-bar-wrap';
    var bar = document.createElement('div');
    bar.className = 'qte-bar';
    barWrap.appendChild(bar);
    var arena = document.createElement('div');
    arena.className = 'qte-arena';

    panel.append(title, score, barWrap, arena);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function onHit() {
      if (finished) return;
      hits++;
      score.textContent = hits + ' / ' + ch.required;
      if (hits >= ch.required) finish(false);
    }
    ch.build(arena, onHit);

    // Timer bar animates from full to empty across ch.ms.
    var startAt = Date.now();
    var raf = 0;
    function tick() {
      var elapsed = Date.now() - startAt;
      var frac = Math.max(0, 1 - elapsed / ch.ms);
      bar.style.transform = 'scaleX(' + frac + ')';
      if (elapsed >= ch.ms) { finish(true); return; }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function finish(timedOut) {
      if (finished) return;
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      var outcome = qteOutcome(hits, ch.required, timedOut);
      title.textContent = outcome === 'success' ? 'Nice!' : 'Too slow!';
      panel.classList.add(outcome === 'success' ? 'is-win' : 'is-lose');

      if (outcome === 'success' && window.FX) {
        window.FX.confettiRain({ duration: reduced() ? 600 : 1600 });
      }

      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (outcome === 'fail') {
          try { if (window.forceCloseAllWindows) window.forceCloseAllWindows(); }
          catch (e) { /* never let the penalty throw */ }
        }
        onDone();
      }, outcome === 'success' ? 700 : 900);
    }
  }

  // ── Sequence with the shared lock ─────────────────────────────────────────────
  function runSequence(onDone) {
    if (running) { if (onDone) onDone(); return; }
    if (window.RandOSBusy && !window.RandOSBusy.acquire('qte')) { if (onDone) onDone(); return; }
    running = true;
    runQTE(function () {
      running = false;
      if (window.RandOSBusy) window.RandOSBusy.release('qte');
      if (onDone) onDone();
    });
  }

  // ── Scheduler ────────────────────────────────────────────────────────────────
  function clearSchedule() { if (scheduleTimer !== null) { clearTimeout(scheduleTimer); scheduleTimer = null; } }
  function scheduleNext() { clearSchedule(); scheduleTimer = setTimeout(onTimerFire, randInterval()); }
  function onTimerFire() {
    scheduleTimer = null;
    // Only fire when visible, a window is open, and nothing else is mid-event.
    if ((document && document.hidden) || openCount() === 0 ||
        (window.RandOSBusy && window.RandOSBusy.isBusy())) {
      scheduleNext();
      return;
    }
    runSequence(scheduleNext);
  }

  function triggerQTE() { runSequence(null); } // manual testing hook
  function start() { if (typeof window !== 'undefined') scheduleNext(); }

  if (typeof window !== 'undefined') {
    window.triggerQTE = triggerQTE;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
    }
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { qteOutcome: qteOutcome, MIN_MS: MIN_MS, MAX_MS: MAX_MS };
  }
})();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/qte.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Load it in `index.html`** — add after `js/chaos.js`:

```html
  <script src="js/qte.js"></script>
```

- [ ] **Step 6: Add QTE CSS to `css/base.css`**

```css
.qte-overlay { position: fixed; inset: 0; z-index: 9500; display: flex; align-items: center;
  justify-content: center; background: rgba(0,0,0,.45); animation: qte-in .2s ease; }
.qte-panel { width: min(440px, 90vw); background: var(--wall-bg, #1d1933); color: #fff;
  border: 3px solid var(--rand-accent, #ff4d9d); border-radius: 14px; padding: 18px;
  box-shadow: 0 16px 48px rgba(0,0,0,.5); text-align: center; }
.qte-title { font-family: var(--rand-font-head, system-ui); font-size: 20px; font-weight: 800; }
.qte-score { margin: 6px 0; font-size: 16px; opacity: .9; }
.qte-bar-wrap { height: 10px; background: rgba(255,255,255,.18); border-radius: 6px; overflow: hidden; }
.qte-bar { height: 100%; background: var(--rand-accent, #ff4d9d); transform-origin: left center; transform: scaleX(1); }
.qte-arena { position: relative; height: 220px; margin-top: 12px; }
.qte-dot { position: absolute; width: 40px; height: 40px; border-radius: 50%; border: none;
  background: var(--rand-accent-2, #28e0c8); cursor: pointer; }
.qte-mash { width: 140px; height: 140px; border-radius: 50%; border: none; margin: 30px auto 0;
  display: block; background: var(--rand-accent, #ff4d9d); color: #fff; font-size: 22px; font-weight: 900; cursor: pointer; }
.qte-arena { display: grid; }
.qte-grid-dot { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; margin: 6px; }
.qte-grid-dot.is-green { background: #2ecc71; } .qte-grid-dot.is-red { background: #e74c3c; }
.qte-grid-dot.is-got { opacity: .35; } .qte-grid-dot.is-bad { outline: 3px solid #fff; }
.qte-panel.is-win { border-color: #2ecc71; } .qte-panel.is-lose { border-color: #e74c3c; }
@keyframes qte-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .qte-overlay { animation: none; } }
```

Note: the grid challenge needs the arena as a grid; the `.qte-arena { display: grid }` rule plus `grid-template-columns: repeat(3, 1fr)` — add `grid-template-columns: repeat(3, 1fr); place-content: center;` to `.qte-arena`. For the dot/mash challenges the absolutely-positioned children ignore the grid, so this is safe.

- [ ] **Step 7: Manual check** — in the browser console run `triggerQTE()`. Expected: an overlay challenge appears with a draining bar. Complete it → "Nice!" + confetti. Run it again and let it time out (open a window first) → "Too slow!" and all windows force-close.

- [ ] **Step 8: Commit**

```bash
git add js/qte.js tests/qte.test.js index.html css/base.css
git commit -m "feat(os): Quick-Time Events with window-close penalty"
```

---

## Task 5: Backrooms roll helper + controller

**Files:**
- Create: `js/backrooms.js`
- Test: `tests/backrooms.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/backrooms.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { rollBackrooms } = require('../js/backrooms.js');

test('fires when the roll is below the chance threshold', () => {
  assert.strictEqual(rollBackrooms(() => 0.05, 0.10), true);
  assert.strictEqual(rollBackrooms(() => 0.0, 0.10), true);
});

test('does not fire at or above the threshold', () => {
  assert.strictEqual(rollBackrooms(() => 0.10, 0.10), false);
  assert.strictEqual(rollBackrooms(() => 0.5, 0.10), false);
});

test('defaults to a 0.10 chance', () => {
  assert.strictEqual(rollBackrooms(() => 0.099), true);
  assert.strictEqual(rollBackrooms(() => 0.11), false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/backrooms.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `js/backrooms.js`**

```js
// backrooms.js — the Backrooms easter egg. window.Backrooms.rollOnShuffle() is
// called from BOTH shuffle paths (the Shuffle button in desktop.js and the
// chaos event in chaos.js); ~10% of the time it drops the OS into a creepy
// fluorescent-yellow theme with a low Web Audio hum. Click anywhere to escape.
// Plain script + CommonJS guard (rollBackrooms is pure + tested).
(function () {
  'use strict';

  // Pure roll (tested): rollBackrooms(rng?, chance?) -> boolean.
  function rollBackrooms(rng, chance) {
    var c = (typeof chance === 'number') ? chance : 0.10;
    var r = (typeof rng === 'function' ? rng : Math.random)();
    return r < c;
  }

  var active = false;
  var audioCtx = null, humNodes = null;
  var escHandler = null, promptEl = null;

  function reduced() {
    return typeof window !== 'undefined' && window.FX &&
      typeof window.FX.reducedMotion === 'function' && window.FX.reducedMotion();
  }

  function startHum() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      var osc = audioCtx.createOscillator();
      var osc2 = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var filter = audioCtx.createBiquadFilter();
      osc.type = 'sawtooth'; osc.frequency.value = 60;   // mains-hum-ish
      osc2.type = 'sine'; osc2.frequency.value = 120;
      filter.type = 'lowpass'; filter.frequency.value = 320;
      gain.gain.value = 0.06;                             // quiet, unsettling
      osc.connect(filter); osc2.connect(filter); filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(); osc2.start();
      humNodes = { osc: osc, osc2: osc2, gain: gain };
    } catch (e) { /* audio optional */ }
  }
  function stopHum() {
    try {
      if (humNodes) { humNodes.osc.stop(); humNodes.osc2.stop(); }
      if (audioCtx && audioCtx.close) audioCtx.close();
    } catch (e) { /* ignore */ }
    humNodes = null; audioCtx = null;
  }

  function enter() {
    if (active || typeof document === 'undefined' || !document.body) return;
    active = true;
    document.body.classList.add('backrooms');
    if (reduced()) document.body.classList.add('backrooms-calm');

    promptEl = document.createElement('div');
    promptEl.className = 'backrooms-prompt';
    promptEl.textContent = "you shouldn't be here — click to escape";
    document.body.appendChild(promptEl);

    startHum();

    // Defer binding the escape click so the triggering shuffle-click doesn't
    // instantly dismiss it.
    setTimeout(function () {
      escHandler = function () { exit(); };
      document.addEventListener('click', escHandler, { once: true });
    }, 350);
  }

  function exit() {
    if (!active) return;
    active = false;
    document.body.classList.remove('backrooms', 'backrooms-calm');
    if (promptEl && promptEl.parentNode) promptEl.parentNode.removeChild(promptEl);
    promptEl = null;
    if (escHandler) { document.removeEventListener('click', escHandler); escHandler = null; }
    stopHum();
    // Restore a normal rolled theme.
    try { if (typeof window.rollWallpaper === 'function') window.rollWallpaper(); } catch (e) {}
  }

  // rollOnShuffle() -> true if it entered the Backrooms this call. No-op (returns
  // false) if already active.
  function rollOnShuffle() {
    if (active) return false;
    if (rollBackrooms(Math.random, 0.10)) { enter(); return true; }
    return false;
  }

  if (typeof window !== 'undefined') {
    window.Backrooms = {
      rollOnShuffle: rollOnShuffle,
      enter: enter,           // manual trigger for testing
      exit: exit,
      isActive: function () { return active; }
    };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rollBackrooms: rollBackrooms };
  }
})();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/backrooms.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Load it in `index.html`** — add after `js/qte.js`:

```html
  <script src="js/backrooms.js"></script>
```

- [ ] **Step 6: Add Backrooms CSS to `css/base.css`**

```css
body.backrooms { --wall-bg: #b9a82a; }
body.backrooms #fx-layer { display: none; }
body.backrooms::before {
  content: ''; position: fixed; inset: 0; z-index: 1;
  background:
    repeating-linear-gradient(0deg, #c9b733 0 38px, #b3a228 38px 40px),
    repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0 78px, rgba(0,0,0,.12) 78px 80px),
    #c2b02e;
  box-shadow: inset 0 0 200px rgba(80,70,0,.7);
  animation: backrooms-flicker 6s steps(20) infinite;
  pointer-events: none;
}
body.backrooms .window { filter: sepia(.5) saturate(1.6) hue-rotate(-10deg); }
.backrooms-prompt { position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
  z-index: 9600; color: #fff7c2; font-family: monospace; letter-spacing: .1em; opacity: .8;
  text-shadow: 0 0 8px rgba(0,0,0,.6); animation: backrooms-pulse 2s ease-in-out infinite; }
@keyframes backrooms-flicker { 0%,100% { opacity: 1; } 47% { opacity: .96; } 48% { opacity: .8; } 49% { opacity: 1; } 92% { opacity: .9; } }
@keyframes backrooms-pulse { 0%,100% { opacity: .55; } 50% { opacity: .9; } }
body.backrooms-calm::before { animation: none; }
@media (prefers-reduced-motion: reduce) {
  body.backrooms::before { animation: none; }
  .backrooms-prompt { animation: none; }
}
```

- [ ] **Step 7: Verify** — `node --check js/backrooms.js && node --test tests/backrooms.test.js` → parses + tests pass.

- [ ] **Step 8: Manual check** — in the console run `Backrooms.enter()`. Expected: the screen turns fluorescent-yellow with flicker + a faint hum and an escape prompt; clicking anywhere reverts to a normal theme and stops the hum.

- [ ] **Step 9: Commit**

```bash
git add js/backrooms.js tests/backrooms.test.js index.html css/base.css
git commit -m "feat(os): Backrooms easter egg (controller + 10% roll)"
```

---

## Task 6: Wire the Backrooms roll into both shuffle paths

**Files:**
- Modify: `js/desktop.js` (the Shuffle button), `js/chaos.js` (the chaos event)

- [ ] **Step 1: Hook `shuffleTheme()` in `js/desktop.js`**

Change `shuffleTheme` so a successful Backrooms roll takes over instead of a normal reroll:

```js
function shuffleTheme() {
  // 10% of shuffles drop into the Backrooms instead of a normal reroll.
  if (window.Backrooms && window.Backrooms.rollOnShuffle()) return;
  rollWallpaper();
  if (typeof window.rollCursor === 'function') window.rollCursor();
}
```

- [ ] **Step 2: Hook the chaos event in `js/chaos.js`**

At the very top of `runChaos()` (before the theme reroll), add the roll. If it enters the Backrooms, still let the rest of chaos run (windows re-skin/re-arrange under the yellow theme — extra unsettling), so only ADD the call; do not early-return:

```js
  function runChaos() {
    // 10% chance the chaos drops the OS into the Backrooms (entered first so the
    // reroll below paints under the yellow theme).
    try { if (window.Backrooms) window.Backrooms.rollOnShuffle(); } catch (e) {}

    // 1) Reroll the desktop theme + animated wallpaper ...
    try {
      if (typeof rollWallpaper === 'function') rollWallpaper();
    } catch (e) { /* never let a reroll crash the event */ }
    // ... (rest of runChaos unchanged)
```

- [ ] **Step 3: Verify** — Run: `node --check js/desktop.js && node --check js/chaos.js` → exit 0. Run: `node --test` → all green.

- [ ] **Step 4: Manual check** — click "Shuffle theme" repeatedly (~10–20 times); roughly 1 in 10 should drop into the Backrooms; clicking escapes. (To force it for a quick check, temporarily call `Backrooms.rollOnShuffle` with a higher chance via `Backrooms.enter()`.)

- [ ] **Step 5: Commit**

```bash
git add js/desktop.js js/chaos.js
git commit -m "feat(os): trigger Backrooms from shuffle button + chaos event"
```

---

## Task 7: Devlog + full verification

**Files:**
- Create: `docs/devlog/devlog-3.md`

- [ ] **Step 1: Write the devlog**

```markdown
# Devlog #3 — Apps, Quick-Time Events & the Backrooms

This round expanded RandOS from a handful of demo apps into a small suite, and
added two OS-wide surprises.

**New apps:** a Random Sound Board (a CC0 sound pack generated as WAVs, played
through an overlap-friendly `<audio>` layer and framed as a free-use library), a
Suggestion Box with a spring-loaded lid that pops a random activity, Quote of the
Session (a fresh famous quote / movie line / joke on every open), and a
Customizable Spinner (an editable wheel-of-names drawn on canvas, where the
announced winner is computed from the final rotation so it always matches the
slice under the pointer).

**Chaotic standard apps:** a Notepad that occasionally "autocorrects" a word to a
typo and restyles random words (with a Calm toggle), and a Paint app whose brush
color and size change on you while stray pixels creep in.

**Quick-Time Events:** every 90–150 seconds — but only when a window is open — a
mini-game ambushes you with a strict timer (click the moving dot, mash a button,
hit the green dots). Win and you get confetti; fail or ignore it and every open
window is slammed shut. A shared busy-lock keeps QTEs and the chaos event from
ever colliding.

**The Backrooms:** ~10% of shuffles (button or chaos) drop the whole OS into a
buzzing fluorescent-yellow Backrooms — flickering rooms, a low Web Audio hum,
and a faint "you shouldn't be here" prompt. Click anywhere to escape.

Everything stays vanilla JS, no build step, and respects `prefers-reduced-motion`.
```

- [ ] **Step 2: Run the full suite** — Run: `node --test` → all tests pass across all three waves.

- [ ] **Step 3: Syntax-check the OS files** — Run: `node --check js/busy-lock.js && node --check js/qte.js && node --check js/backrooms.js && node --check js/windows.js && node --check js/chaos.js && node --check js/desktop.js` → exit 0.

- [ ] **Step 4: Manual smoke test** — open `index.html`: open a couple of apps; run `triggerQTE()` and both win and lose paths; run `Backrooms.enter()` and escape; confirm no console errors and the existing shuffle/chaos/boot still work.

- [ ] **Step 5: Commit**

```bash
git add docs/devlog/devlog-3.md
git commit -m "docs: devlog #3 (apps, QTE, Backrooms)"
```

---

## Self-review notes (spec coverage)

- QTE system → Tasks 1–4 ✓ (90–150s cadence, only-when-window-open + visible + lock-free gating, four-ish mini-games, timer bar, success reward, fail force-closes all windows via new `forceCloseAllWindows`, `qteOutcome` tested, reduced-motion aware).
- Backrooms easter egg → Tasks 5–6 ✓ (10% on BOTH shuffle paths, yellow theme + flicker + Web Audio hum, click-to-escape, `rollBackrooms` tested).
- Coordination → Tasks 1–2 ✓ (shared busy-lock; chaos respects it).
- Devlog → Task 7 ✓.

**Type-consistency check:** `window.RandOSBusy.acquire/release/isBusy/owner`, `window.forceCloseAllWindows()`, `window.Backrooms.rollOnShuffle/enter/exit/isActive`, `window.triggerQTE`, and helpers `qteOutcome(hits, required, timedOut)` / `rollBackrooms(rng, chance)` are referenced consistently across this plan and the files they live in.

**This is the final wave.** After execution + verification, use the finishing-a-development-branch skill to decide how to integrate `ui-overhaul`.
