# RandOS Feature Batch (v2.x) — Design

**Date:** 2026-06-13
**Branch:** `ui-overhaul`
**Status:** Approved for planning

## Goal

Add four new on-theme apps, two chaotic "standard" apps, and two OS-wide
systems (Quick-Time Events + a Backrooms easter egg) to RandOS, all following
the existing vanilla-JS patterns.

## Hard constraints (unchanged)

- Vanilla HTML/CSS/JS. **No build step, no framework, plain `<script>` tags.**
  Must run by double-clicking `index.html` (i.e. from `file://`).
- **No emoji** anywhere — draw pixel art instead.
- Tests are Node's built-in runner only (`node --test`, no npm install).
- Everything stays readable/usable; all motion respects
  `prefers-reduced-motion`.

## Existing patterns this batch reuses

- **App** = a factory file in `js/apps/` returning a root DOM element, a
  `makePixelIcon` builder in `js/pixel-icons.js`, and one entry in the `APPS`
  array in `js/desktop.js` with a **fixed per-app window size**. Per-window
  theming via `rollSkin`/`applySkin` (already applied by `windows.js`).
- **OS feature** = a self-contained IIFE (like `js/chaos.js`) loaded last in
  `index.html`, with a CommonJS guard at the bottom so `node --test` /
  `node --check` can load it headless.
- **Particles** via the global `window.FX` (`FX.burst`, `FX.confettiRain`,
  `FX.reducedMotion`, ...).

---

## New apps

### 1. Random Sound Board — `js/apps/soundboard.js` (icon `soundboard`)

A pad grid presented as a "free-use sound library", with category labels
(zaps, chimes, drums, coins, whoosh, error, blip, laser). A **Surprise** button
fires a random pad. Each pad's color comes from the window skin.

- **Audio source:** original, genuinely-CC0 `.wav` files committed to
  `assets/sounds/`, generated once by `tools/gen-sounds.js` (a Node script, NOT
  part of the runtime — it writes real WAV files via raw PCM encoding). They are
  synthesized, not recorded; this is the deliberate, approved tradeoff given the
  `file://` + no-network constraint.
- **Manifest:** `js/sound-manifest.js` lists `{ id, label, category, file }`
  entries. Real recorded CC0 clips can be dropped into `assets/sounds/` and added
  to the manifest later with no code change.
- **Playback:** an `<audio>` element per play, `cloneNode`d so sounds overlap.
  Works from `file://` (relative `src`, no `fetch`).
- Fixed window size ≈ 440×440.

### 2. The Suggestion Box — `js/apps/suggestion-box.js` (icon `suggestionbox`)

A pixel-art physical box that opens/closes on click to reveal a random activity.

- Click → lid springs open on a hinge (CSS transform), a paper slip rises with a
  random suggestion from an array (`do 15 jumping jacks`, `cook a random recipe`,
  `text an old friend`, ...). Click again → lid closes and slip retracts.
- `prefers-reduced-motion`: lid + slip appear/disappear instantly, no spring.
- Pure helper `pickSuggestion(list, rng)` for testability.
- Fixed window size ≈ 360×420.

### 3. Quote of the Session — `js/apps/quote.js` (icon `quote`)

Shows a random quote on every open; an **Another** button rerolls in place.

- Pool array tagged by kind: `famous`, `movie`, `joke`. Each launch re-runs the
  factory and picks fresh (satisfies "new quote every time the app is opened").
- Pure helper `pickQuote(list, rng)` for testability.
- Fixed window size ≈ 440×300.

### 4. The Customizable Spinner — `js/apps/spinner.js` (icon `spinner`)

A wheel-of-names style spinner with editable slots.

- Editable slot list (default-filled; add / remove / edit text). Slots redraw the
  wheel live.
- Wheel drawn on `<canvas>` with skin colors, one colored segment per slot, a
  fixed pointer at the top.
- **Spin:** eased rotation = (several full turns) + random final offset. The
  segment under the pointer when motion stops is the winner, announced with an
  `FX.burst`.
- Pure helper `winnerForAngle(slotCount, finalAngleDeg)` → winning index, fully
  unit-testable independent of the DOM/animation.
- `prefers-reduced-motion`: short/no spin, jump to a random winner.
- Fixed window size ≈ 460×520.

---

## Chaotic standard apps

### 5. Notepad (chaotic) — `js/apps/notepad.js` (icon `notepad`)

A normal editable note area with a chaotic streak.

- Editable `contenteditable`/`textarea` region.
- **Chaos (occasional, cosmetic, recoverable):** on a timer, randomly restyle a
  single word (font / size / color via inline span) **and** a chaotic
  "autocorrect" that swaps a random word for a wrong one from a small lookup.
- **Calm toggle** in the app to stop the chaos; `prefers-reduced-motion`
  suppresses the visual restyle (autocorrect text-swap still allowed but rarer).
- Pure helper `chaoticAutocorrect(text, rng)` for testability.
- Fixed window size ≈ 420×460.

### 6. Paint (chaotic) — `js/apps/paint.js` (icon `paint`)

A tiny pixel canvas you draw on, that fights back a little.

- Click/drag paints cells on a small grid `<canvas>`. Clear button.
- **Chaos:** the brush color/size randomizes on you periodically, and a stray
  pixel occasionally appears elsewhere on the canvas.
- `prefers-reduced-motion`: stray-pixel cadence reduced; drawing unaffected.
- Fixed window size ≈ 460×420.

---

## OS-wide features

### 7. Quick-Time Events — `js/qte.js`

A scheduler modeled on `chaos.js`.

- **Scheduling:** exactly one pending timer, fresh random interval **90–150s**
  re-rolled after each event (re-armed `setTimeout`, never `setInterval`). Fires
  only when: tab visible **and** ≥1 window open **and** no QTE/chaos already
  running.
- **Challenge:** a modal overlay with instructions + a draining timer bar. The
  mini-game is randomly one of:
  - Click the moving dot 5× in 3s
  - Mash a button 10× in 4s
  - Click the pixel-icon that matches the prompt
  - Click the green dots, avoid the red
- **Success** → reward `FX.burst` + brief "Nice!" banner.
- **Fail or ignore (timeout)** → **all open windows force-close.** Add
  `window.forceCloseAllWindows()` to `js/windows.js` that animates each window
  shut and tears it down (reusing existing teardown).
- **Coordination:** QTE and chaos share a light busy-lock (a small
  `window.RandOSBusy`-style flag both respect) so they never overlap.
- `prefers-reduced-motion`: no screen shake; challenge + penalty still function.
- Pure helper `qteOutcome(hits, required, timedOut)` → `'success' | 'fail'` for
  testability.

### 8. Backrooms easter egg — `js/backrooms.js` (+ Backrooms styles)

A 10% chance on any shuffle to drop the OS into a creepy yellow Backrooms theme.

- **Trigger:** `window.Backrooms.rollOnShuffle()` returns `true` ~10% of the time
  and, when true, enters the Backrooms. Called from **both**:
  - `desktop.js` `shuffleTheme()` (the "Shuffle theme" button), and
  - `chaos.js` `runChaos()` (the periodic chaos event).
  Both call-sites guard with `if (window.Backrooms)`.
- **Look:** a `body.backrooms` state overrides the skin to mono-yellow, covers /
  pauses the generative wallpaper canvas with a flat fluorescent-yellow "rooms"
  backdrop, adds a subtle fluorescent flicker, and shows a faint
  "you shouldn't be here — click to escape" prompt.
- **Sound:** a low buzzing hum via **Web Audio** (a continuous filtered
  oscillator drone — no file needed, loops perfectly; separate from the
  soundboard's bundled clips). Stops on escape.
- **Escape:** clicking anywhere reverts to a freshly rolled normal theme
  (`rollWallpaper()`), removes `body.backrooms`, stops the hum.
- Pure helper `rollBackrooms(rng, chance)` for testability (default chance 0.10).

---

## Cross-cutting changes

- **`js/pixel-icons.js`:** add `BUILDERS` + `AMBIENT` entries for `soundboard`,
  `suggestionbox`, `quote`, `spinner`, `notepad`, `paint` — each a recognizable
  silhouette with a few randomized detail pixels and gentle ambient motion.
- **`js/desktop.js`:** add the six new apps to `APPS` (each with its fixed size);
  add the Backrooms roll into `shuffleTheme()`.
- **`js/windows.js`:** add `window.forceCloseAllWindows()`.
- **`js/chaos.js`:** add the Backrooms roll into `runChaos()`; participate in the
  shared busy-lock with QTE.
- **`index.html`:** new `<script>` tags for the apps; load `js/qte.js` and
  `js/backrooms.js` last alongside `js/chaos.js`. Add `css` for the new apps,
  Backrooms, and QTE (extend `css/base.css` or a focused new file).
- **`assets/sounds/`:** generated CC0 `.wav` files (+ `tools/gen-sounds.js`).

## Testing (`node --test`)

Mirror the existing `tests/` style. Add tests for the pure helpers, each exported
behind a CommonJS guard:

- `pickSuggestion`, `pickQuote` — return an in-range member; deterministic with
  an injected RNG.
- `winnerForAngle` — known angle → known slot index across slot counts.
- `chaoticAutocorrect` — output differs only by known swaps; never throws.
- `qteOutcome` — truth table over (hits, required, timedOut).
- `rollBackrooms` — fires ~10% with an injected RNG; boundary at the threshold.
- Sound manifest — every entry has `{ id, label, category, file }`; ids unique.

## Devlog

Add `docs/devlog/devlog-3.md` summarizing the batch (keeps the ≥3-devlogs
challenge requirement healthy).

## Out of scope / YAGNI

- No remote sound fetching, no audio recording, no persistence beyond what each
  app needs in-memory for a session.
- QTE mini-game set is fixed at four; no difficulty scaling.
- Backrooms is cosmetic + audio only; it does not alter app behavior.
