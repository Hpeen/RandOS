// qte.js — RandOS Quick-Time Events. Every ~30-60s (only when a window is open
// and the tab is visible and nothing else holds the busy-lock) a mini-game pops
// up with a strict timer. Success -> reward burst. Fail/ignore -> ALL open
// windows force-close. Modeled on chaos.js: one re-armed setTimeout, never
// setInterval; CommonJS guard for node --test.
(function () {
  'use strict';

  var MIN_MS = 30000, MAX_MS = 60000;

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
        // Guarantee at least `required` (4) green dots so the challenge is
        // always solvable. Start with a random 55%-green distribution, then
        // flip enough randomly-chosen red slots to green if we fall short.
        var REQUIRED = 4; // mirrors challenge.required
        var greens = [];
        var i;
        for (i = 0; i < 9; i++) {
          greens.push(Math.random() < 0.55);
        }
        var greenCount = 0;
        for (i = 0; i < 9; i++) { if (greens[i]) greenCount++; }
        if (greenCount < REQUIRED) {
          // Collect red indices and shuffle them so flips are random.
          var reds = [];
          for (i = 0; i < 9; i++) { if (!greens[i]) reds.push(i); }
          for (i = reds.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = reds[i]; reds[i] = reds[j]; reds[j] = tmp;
          }
          var needed = REQUIRED - greenCount;
          for (i = 0; i < needed; i++) { greens[reds[i]] = true; }
        }
        for (i = 0; i < 9; i++) {
          (function (green) {
            var d = document.createElement('button');
            d.className = 'qte-grid-dot ' + (green ? 'is-green' : 'is-red');
            d.addEventListener('click', function () {
              if (d.disabled) return;
              if (green) { onHit(); d.disabled = true; d.classList.add('is-got'); }
              else { d.classList.add('is-bad'); }
            });
            host.appendChild(d);
          })(greens[i]);
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
