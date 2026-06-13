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

  // ── Full animation. The wind-up / lid / pop are CSS @keyframes (see
  // base.css); JS just kicks it off, listens for the pop to finish, and keeps
  // a safety net so the user is never trapped. ──
  overlay.classList.add('boot-playing');
  attachSkip();

  // The orchestrated sequence total (crank wind-up -> lid flip -> jack pop ->
  // settle) is ~2.9s; reveal a touch after it lands. The animationend on the
  // jack's pop is the primary trigger; the timer is the guaranteed backstop.
  var jack = overlay.querySelector('.jib-jack');
  if (jack) {
    jack.addEventListener('animationend', function (ev) {
      if (ev.animationName === 'jibPop') {
        // Small hold so the landed jack is readable before the reveal.
        setTimeout(reveal, 520);
      }
    });
  }

  // Hard safety net: overlay is ALWAYS gone by this point no matter what.
  safetyTimer = setTimeout(reveal, 4200);
})();
