// boot.js — the RandOS signature boot animation (jack-in-the-box).
//
// A box with a crank winds up (building tension), the lid flips open, and the
// "jack" — the RandOS wordmark on a coil spring — pops out. Then the whole
// overlay fades away to reveal the desktop underneath.
//
// Guarantees:
//  - Plays ONCE per browser session (sessionStorage 'randos-booted'). Reloads
//    within the same session skip it entirely; a fresh tab/session replays it.
//  - Skippable: a click anywhere or any keypress dismisses it immediately.
//  - Never traps the user: a `done` guard plus a safety timeout always remove
//    the overlay even if no animationend fires.
//  - The desktop (desktop.js) boots independently underneath; this overlay
//    just covers it, then goes away. We never block desktop init.
//  - prefers-reduced-motion: skips the springing motion — a brief static title,
//    then reveal. Still sets the session flag.
//
// Plain browser script: no ES import/export, no libraries, no emoji.
(function () {
  'use strict';

  var STORAGE_KEY = 'randos-booted';
  var overlay = document.getElementById('boot');
  if (!overlay) { return; }

  // sessionStorage can throw in locked-down/private contexts; treat any failure
  // as "not booted" so the animation still plays rather than crashing.
  function alreadyBooted() {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; }
    catch (e) { return false; }
  }
  function markBooted() {
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
  }

  // ── Already booted this session: remove the overlay instantly, no animation,
  // no flash. Done before any paint cost from the animation classes. ──
  if (alreadyBooted()) {
    overlay.parentNode && overlay.parentNode.removeChild(overlay);
    return;
  }

  var prefersReduced = false;
  try {
    prefersReduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { prefersReduced = false; }

  var done = false;       // guards against skip + natural-completion double-run
  var safetyTimer = null;
  var skipHandler = null;

  function reveal() {
    if (done) { return; }
    done = true;
    if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    detachSkip();
    markBooted();

    // Fade the overlay out, then remove it so the desktop is fully interactive.
    overlay.classList.add('boot-revealing');

    var removed = false;
    function teardown() {
      if (removed) { return; }
      removed = true;
      overlay.removeEventListener('transitionend', onEnd);
      if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    }
    function onEnd(ev) {
      // Only react to the overlay's own opacity transition.
      if (ev.target === overlay && ev.propertyName === 'opacity') { teardown(); }
    }
    overlay.addEventListener('transitionend', onEnd);
    // Belt-and-braces: never leave the overlay lingering if transitionend
    // doesn't fire (e.g. zero-duration transitions under reduced motion).
    setTimeout(teardown, 700);
  }

  function detachSkip() {
    if (!skipHandler) { return; }
    window.removeEventListener('pointerdown', skipHandler, true);
    window.removeEventListener('keydown', skipHandler, true);
    skipHandler = null;
  }

  function attachSkip() {
    skipHandler = function () { reveal(); };
    // Capture phase so the very first click/key dismisses, regardless of where
    // it lands; the overlay sits above everything anyway.
    window.addEventListener('pointerdown', skipHandler, true);
    window.addEventListener('keydown', skipHandler, true);
  }

  // ── Reduced motion: no springing/spinning. Show the static title briefly,
  // then reveal. Still skippable, still sets the flag, still safety-timed. ──
  if (prefersReduced) {
    overlay.classList.add('boot-reduced');
    attachSkip();
    safetyTimer = setTimeout(reveal, 900);   // ~600ms title + fade headroom
    setTimeout(reveal, 600);
    return;
  }

  // ── Full animation. The wind-up / shiver / lid / pop are CSS @keyframes (see
  // base.css); JS just kicks it off, fires particle bursts at the key beats,
  // listens for the pop to finish, and keeps a safety net so the user is never
  // trapped. ──
  overlay.classList.add('boot-playing');
  attachSkip();

  // Particle helpers. FX is window.FX (js/particles.js, loaded earlier); it may
  // be absent in odd loads, so every call is guarded. FX itself honors
  // reduced-motion, but we also gate here so reduced-motion boots stay calm.
  function fx() { return (typeof window !== 'undefined') ? window.FX : null; }

  // Where the box opening sits on screen — used to aim the pop burst. The FX
  // canvas is BEHIND #boot (z 9000 < 9999), so a pop burst there is hidden by
  // the overlay; we fire it anyway so a faint glow shows around the edges, and
  // rely on the celebratory rain at REVEAL (over the live desktop) as the
  // headline effect. We also add boot-local confetti DOM for the in-overlay pop.
  function boxOpeningPoint() {
    var svg = overlay.querySelector('.boot-jib');
    if (!svg || !svg.getBoundingClientRect) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    var r = svg.getBoundingClientRect();
    // Box opening sits ~2/3 down the 440x560 viewBox (box top ~y 372/560).
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.66 };
  }

  // Boot-local confetti: spawn short-lived absolutely-positioned shards INSIDE
  // #boot so the burst is visible ON TOP of the boot scene (the FX canvas is
  // behind the overlay). Pure DOM + CSS, no emoji. Cleaned up on reveal/teardown
  // when #boot is removed, and skipped under reduced motion.
  function localPop() {
    if (prefersReduced) { return; }
    var stage = overlay.querySelector('.boot-stage');
    if (!stage) { return; }
    var layer = document.createElement('div');
    layer.className = 'boot-confetti';
    var n = 18 + ((Math.random() * 10) | 0);
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'boot-shard';
      var dx = (Math.random() * 260 - 130).toFixed(0);
      var dy = (-90 - Math.random() * 150).toFixed(0);
      var rot = (Math.random() * 720 - 360).toFixed(0);
      var dur = (0.7 + Math.random() * 0.6).toFixed(2);
      var delay = (Math.random() * 0.12).toFixed(2);
      s.style.setProperty('--dx', dx + 'px');
      s.style.setProperty('--dy', dy + 'px');
      s.style.setProperty('--rot', rot + 'deg');
      s.style.setProperty('--dur', dur + 's');
      s.style.setProperty('--delay', delay + 's');
      s.style.setProperty('--hue', (Math.random() * 360).toFixed(0) + 'deg');
      layer.appendChild(s);
    }
    stage.appendChild(layer);
  }

  // Burst at the POP moment: boot-local confetti (visible over the scene) plus
  // an FX burst at the opening (varied, random) for extra sparkle at the edges.
  function popEffect() {
    localPop();
    if (prefersReduced) { return; }
    var f = fx();
    if (f && typeof f.burst === 'function') {
      var p = boxOpeningPoint();
      f.burst(p.x, p.y, { count: 22 + ((Math.random() * 14) | 0), spread: Math.PI * 1.5, speed: 320 });
    }
  }

  // Celebratory effect at REVEAL: confetti rains over the now-visible desktop,
  // with a couple of random bursts for variety. All guarded by reduced-motion.
  function revealEffect() {
    if (prefersReduced) { return; }
    var f = fx();
    if (!f) { return; }
    if (typeof f.confettiRain === 'function') { f.confettiRain({ duration: 2400 }); }
    if (typeof f.burstRandom === 'function') {
      var w = window.innerWidth, h = window.innerHeight;
      f.burstRandom(w * (0.25 + Math.random() * 0.1), h * 0.4);
      f.burstRandom(w * (0.65 + Math.random() * 0.1), h * 0.4);
    }
  }

  // Pop burst is time-driven to fire at the jack's APEX (~3.12s), AFTER the fast
  // launch frames, so the confetti spawn never competes with the spring for the
  // main thread (keeps the launch smooth) and lands as a celebratory top-of-pop
  // flourish. Independent of the reveal path.
  var popTimer = setTimeout(popEffect, 3120);

  // Wrap reveal ONCE: clear the pending pop burst (if we're skipping early) and
  // fire the celebratory reveal effect, then run the original reveal/teardown.
  // The `done` guard inside baseReveal keeps this idempotent across skip +
  // natural completion. skipHandler calls reveal() at invocation time, so this
  // reassignment is picked up even though attachSkip() ran earlier.
  var baseReveal = reveal;
  reveal = function () {
    if (done) { return; }                 // idempotent: matches baseReveal guard
    if (popTimer) { clearTimeout(popTimer); popTimer = null; }
    revealEffect();
    baseReveal();
  };

  // The orchestrated sequence: crank wind-up -> box shiver -> lid flip ->
  // jack pop (ends ~3.85s) -> side-to-side swing (jibWobble, ends ~5.30s). The
  // reveal waits for the SWING to finish (animationend bubbles from .jib-head up
  // to .jib-jack) so the full sway is seen before the overlay fades; the timer is
  // the guaranteed backstop.
  var jack = overlay.querySelector('.jib-jack');
  if (jack) {
    jack.addEventListener('animationend', function (ev) {
      if (ev.animationName === 'jibWobble') {
        // Small hold so the settled, upright jack is readable before the reveal.
        setTimeout(reveal, 300);
      }
    });
  }

  // Hard safety net: overlay is ALWAYS gone by this point no matter what. The
  // longest natural path is swing-end (~5.30s) + 0.30s hold = ~5.60s reveal; this
  // 6.4s backstop comfortably exceeds it so the user is never trapped.
  safetyTimer = setTimeout(reveal, 6400);
})();
