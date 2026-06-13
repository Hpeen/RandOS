// chaos.js — RandOS's periodic CHAOS EVENT.
//
// Every ~2-3 minutes the OS reaches up its sleeve and RANDOMIZES EVERYTHING at
// once: it rerolls the desktop theme + wallpaper, repicks the pixel cursor,
// re-skins every open window with fresh colors/fonts/chrome, RE-ARRANGES the
// centered window clump (positions shuffle, fixed per-app sizes preserved), and
// fires a particle celebration.
//
// The user is never blindsided: a few seconds BEFORE the reroll a calm, on-theme
// HEADS-UP banner counts down ("Randomizing in 3 / 2 / 1") so they can brace.
// The banner is pointer-events:none (never blocks clicks) and is removed the
// instant the chaos fires.
//
// Scheduling guarantees:
//   - First event is scheduled a random [120s, 180s] after boot; a fresh random
//     interval is rolled after EVERY event (re-armed setTimeout, never a fixed
//     setInterval, so events can't stack or drift).
//   - Only ONE timer is ever pending — every (re)schedule clears the previous
//     handle first, and the heads-up/run sequence is guarded by a busy flag.
//   - When the tab is hidden (document.hidden) the event does NOT fire: the
//     timer simply reschedules for a fresh interval, since the heads-up would be
//     missed and the spectacle wasted.
//
// Reduced motion: the randomization STILL happens (theme/cursor/window changes
// are content the user asked for), but it stays calm — the banner holds steady
// instead of pulsing, the confetti celebration is minimal, and the window clump
// re-arranges instantly (the layout placement jumps under reduced motion).
//
// Plain browser script: an IIFE, no ES import/export, no libraries, no emoji. A
// CommonJS guard at the bottom lets `node --check` / node tests load it headless.
// Loaded LAST in index.html so rollWallpaper / rollCursor / getOpenWindows /
// relayoutWindows / rollSkin / applySkin / FX all already exist.
(function () {
  'use strict';

  // ── Tunables ────────────────────────────────────────────────────────────────
  var MIN_INTERVAL_MS = 120000;  // 2 minutes
  var MAX_INTERVAL_MS = 180000;  // 3 minutes
  var HEADSUP_MS = 3500;         // heads-up lead time before the reroll
  var COUNT_FROM = 3;            // counts down 3 -> 2 -> 1 across HEADSUP_MS

  // ── State ────────────────────────────────────────────────────────────────────
  var scheduleTimer = null;      // the single pending "fire next event" handle
  var headsupTimers = [];        // countdown step timers (cleared on teardown)
  var bannerEl = null;           // the live heads-up banner element (or null)
  var running = false;           // true from heads-up start until chaos fires

  // ── Reduced motion ────────────────────────────────────────────────────────────
  // Defer to FX's single source of truth when present, else matchMedia.
  function reducedMotion() {
    if (typeof window !== 'undefined' && window.FX &&
        typeof window.FX.reducedMotion === 'function') {
      return window.FX.reducedMotion();
    }
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function randInterval() {
    return MIN_INTERVAL_MS +
      Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS + 1));
  }

  // ── Heads-up banner ────────────────────────────────────────────────────────────
  // Build (or reuse) a single on-theme banner pinned near the top of the screen.
  // pointer-events:none and a z-index BELOW the FX particle layer (9000) so the
  // celebration renders over it and it never eats a click.
  function ensureBanner() {
    if (bannerEl && bannerEl.parentNode) return bannerEl;
    if (typeof document === 'undefined' || !document.body) return null;
    var el = document.createElement('div');
    el.className = 'chaos-headsup';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    if (reducedMotion()) el.classList.add('is-calm');
    var title = document.createElement('div');
    title.className = 'chaos-headsup-title';
    title.textContent = 'CHAOS INCOMING';
    var count = document.createElement('div');
    count.className = 'chaos-headsup-count';
    el.appendChild(title);
    el.appendChild(count);
    document.body.appendChild(el);
    bannerEl = el;
    return el;
  }

  function setBannerCount(el, n) {
    var count = el.querySelector('.chaos-headsup-count');
    if (count) count.textContent = 'Randomizing in ' + n;
    // Re-trigger the per-step pulse (skipped under reduced motion via CSS).
    el.classList.remove('is-tick');
    // Force reflow so re-adding the class restarts the animation.
    void el.offsetWidth;
    el.classList.add('is-tick');
  }

  function clearHeadsupTimers() {
    for (var i = 0; i < headsupTimers.length; i++) clearTimeout(headsupTimers[i]);
    headsupTimers.length = 0;
  }

  function removeBanner() {
    clearHeadsupTimers();
    if (bannerEl && bannerEl.parentNode) {
      bannerEl.parentNode.removeChild(bannerEl);
    }
    bannerEl = null;
  }

  // Show the heads-up countdown, then invoke done() when it elapses. Spreads the
  // countdown numbers evenly across HEADSUP_MS so the last "1" lands right before
  // the reroll.
  function showHeadsup(done) {
    var el = ensureBanner();
    if (!el) { done(); return; }       // no DOM: just run the chaos
    var step = HEADSUP_MS / COUNT_FROM;
    setBannerCount(el, COUNT_FROM);    // first number immediately
    for (var k = 1; k < COUNT_FROM; k++) {
      (function (n, delay) {
        headsupTimers.push(setTimeout(function () {
          if (bannerEl) setBannerCount(bannerEl, n);
        }, delay));
      })(COUNT_FROM - k, step * k);
    }
    headsupTimers.push(setTimeout(done, HEADSUP_MS));
  }

  // ── The chaos itself ────────────────────────────────────────────────────────────
  // Every external call is guarded so a missing/failed global can never throw and
  // break the OS. Order: theme+wallpaper, cursor, then per-window re-skin + move,
  // then the particle celebration.
  function runChaos() {
    // 1) Reroll the desktop theme + animated wallpaper (also resets --rand-accent
    //    and --wall-bg). Same function the "Shuffle theme" button calls.
    try {
      if (typeof rollWallpaper === 'function') rollWallpaper();
    } catch (e) { /* never let a reroll crash the event */ }

    // 2) Repick + re-tint the random pixel cursor against the new accent.
    try {
      if (window.rollCursor) window.rollCursor();
    } catch (e) { /* ignore */ }

    // 3) Re-skin every open window (colors/fonts/chrome only — sizes are FIXED
    //    per app and never change), then RE-ARRANGE the centered clump: a single
    //    shuffle reorders the windows' positions while every window keeps its
    //    fixed size. No per-window random resize.
    var wins = [];
    try {
      if (typeof window.getOpenWindows === 'function') wins = window.getOpenWindows();
    } catch (e) { wins = []; }

    for (var i = 0; i < wins.length; i++) {
      var rec = wins[i];
      if (!rec || !rec.el) continue;
      try {
        // Re-skin with fresh colors/fonts/chrome. applySkin overwrites
        // dataset.layout, but the app's internal DOM was already rendered for its
        // CURRENT layout — so capture and restore data-layout to keep the open
        // app structurally consistent (only its skin changes, not its layout).
        if (typeof rollSkin === 'function' && typeof applySkin === 'function') {
          var prevLayout = rec.el.dataset ? rec.el.dataset.layout : undefined;
          var sk = rollSkin(rec.appName);
          applySkin(rec.el, sk);
          if (prevLayout !== undefined && rec.el.dataset) {
            rec.el.dataset.layout = prevLayout;
          }
        }
      } catch (e) { /* skip a window that fails to re-skin */ }
    }

    try {
      // Shuffle the clump's positions (fixed sizes preserved). Glides, or jumps
      // instantly under reduced motion (handled inside the layout placement).
      if (typeof window.relayoutWindows === 'function') {
        window.relayoutWindows({ shuffle: true });
      }
    } catch (e) { /* ignore */ }

    // 4) Particle celebration. FX self-skips/calms under reduced motion, but we
    //    also keep the rain gentler when reduced for good measure.
    try {
      if (window.FX) {
        var reduced = reducedMotion();
        if (typeof window.FX.confettiRain === 'function') {
          window.FX.confettiRain(reduced
            ? { duration: 700, rate: 4 }
            : { duration: 2600 });
        }
        if (!reduced && typeof window.FX.burstRandom === 'function') {
          var w = window.innerWidth || 0, h = window.innerHeight || 0;
          // A couple of bursts at random points for extra spectacle.
          window.FX.burstRandom(w * (0.15 + Math.random() * 0.25), h * (0.2 + Math.random() * 0.3));
          window.FX.burstRandom(w * (0.6 + Math.random() * 0.25), h * (0.2 + Math.random() * 0.3));
        }
      }
    } catch (e) { /* ignore */ }
  }

  // ── Heads-up + chaos sequence (reused by scheduler AND triggerChaos) ────────────
  // Runs at most one sequence at a time (the `running` flag). onDone fires after
  // the chaos has run so the scheduler can re-arm.
  function runSequence(onDone) {
    if (running) { if (onDone) onDone(); return; }
    running = true;
    showHeadsup(function () {
      removeBanner();          // banner goes away exactly as the chaos lands
      try { runChaos(); }
      finally {
        running = false;
        if (onDone) onDone();
      }
    });
  }

  // ── Scheduler ──────────────────────────────────────────────────────────────────
  // Exactly one pending timer at all times. Each fire reschedules a fresh random
  // interval. If the tab is hidden when the timer fires, skip the event and just
  // reschedule (heads-up would be missed otherwise).
  function clearSchedule() {
    if (scheduleTimer !== null) {
      clearTimeout(scheduleTimer);
      scheduleTimer = null;
    }
  }

  function scheduleNext() {
    clearSchedule();           // guarantee no stacking
    scheduleTimer = setTimeout(onTimerFire, randInterval());
  }

  function onTimerFire() {
    scheduleTimer = null;
    if (typeof document !== 'undefined' && document.hidden) {
      // Tab in background: don't fire — reschedule for a fresh interval. (A
      // visibilitychange listener also re-arms promptly when the tab returns.)
      scheduleNext();
      return;
    }
    if (running) {             // a manual triggerChaos is mid-flight; try later
      scheduleNext();
      return;
    }
    runSequence(scheduleNext); // run, then arm the next cycle
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  // Run the heads-up + chaos immediately (manual testing / future key binding).
  // Does NOT disturb the running schedule beyond the shared `running` guard.
  function triggerChaos() {
    runSequence(null);
  }

  function start() {
    if (typeof window === 'undefined') return;
    // First event a random [120,180]s out — by then boot is long gone, so the
    // chaos never collides with the boot overlay.
    scheduleNext();
  }

  if (typeof window !== 'undefined') {
    window.triggerChaos = triggerChaos;

    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    }
  }

  // CommonJS guard: lets `node --check` and node tests load the file headlessly.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      runChaos: runChaos,
      triggerChaos: triggerChaos,
      MIN_INTERVAL_MS: MIN_INTERVAL_MS,
      MAX_INTERVAL_MS: MAX_INTERVAL_MS,
      HEADSUP_MS: HEADSUP_MS
    };
  }
})();
