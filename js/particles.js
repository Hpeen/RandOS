// particles.js — RandOS's shared particle / effects engine.
//
// One full-screen <canvas id="fx-layer"> (position: fixed; inset: 0;
// pointer-events: none) sits above windows (z-index 9000) but BELOW the boot
// overlay (#boot is 9999), so bursts and confetti render over the desktop and
// any open windows without ever blocking clicks or drags.
//
// A single requestAnimationFrame loop drives every live particle. The loop
// starts on demand (first emit) and STOPS the instant the particle array goes
// empty, so the engine costs zero CPU at rest. The canvas is created lazily on
// first use (or on DOMContentLoaded), DPR-aware (capped at 2), and resizes with
// the window.
//
// The boot animation, the window-open effect, the cursor trail, and the
// periodic chaos event all share this one engine via the global window.FX.
//
// Design rules honored here:
//   - Performance: total live particles are capped (MAX_PARTICLES); over-budget
//     emits drop the oldest particles first. The rAF loop never spins idle.
//   - prefers-reduced-motion: a single reducedMotion() check gates everything —
//     bursts emit a tiny token amount, continuous trails are skipped, and
//     confettiRain becomes a brief minimal sprinkle.
//   - visibilitychange: the loop pauses when the tab is hidden and resumes (if
//     particles remain) when it returns.
//   - No innerHTML, no libraries, no emojis, no ES module syntax. Theme colors
//     are read from the live --rand-accent vars / rollSkin('default').
//
// Plain browser script: top-level IIFE assigns window.FX. A CommonJS guard at
// the bottom lets `node --check` / node tests load it without a DOM.

(function () {
  'use strict';

  // ── Tunables ──────────────────────────────────────────────────────────────
  var MAX_PARTICLES = 600;   // hard cap on live particles (perf guard)
  var MAX_DPR = 2;           // cap device-pixel-ratio so big retina screens
                             // don't blow up the backing-store size
  var FX_Z = 9000;           // above windows (101+), below #boot (9999)

  var KINDS = ['confetti', 'sparkle', 'pixel', 'ring', 'star'];

  // ── Module-private state ────────────────────────────────────────────────────
  var canvas = null;
  var ctx = null;
  var dpr = 1;
  var vw = 0;          // CSS pixels (logical), not backing-store pixels
  var vh = 0;
  var rafId = 0;       // current rAF handle (0 = no loop running)
  var lastTs = 0;      // ms timestamp of the previous frame
  var listenersBound = false;
  var rainTimers = []; // active confettiRain interval handles

  var particles = [];  // the live pool

  // ── Reduced-motion: the single source of truth used throughout ─────────────
  function reducedMotion() {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ── Color helpers ───────────────────────────────────────────────────────────
  // Read the current theme accents from the document's scoped CSS vars; fall
  // back to a fresh rollSkin('default') palette, then to sane literals. Always
  // returns a non-empty array of CSS color strings.
  function themeColors() {
    var out = [];
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        var cs = getComputedStyle(document.documentElement);
        ['--rand-accent', '--rand-accent-2', '--rand-text'].forEach(function (v) {
          var c = cs.getPropertyValue(v);
          if (c && c.trim()) out.push(c.trim());
        });
      }
    } catch (e) { /* getComputedStyle can throw in odd states; ignore */ }

    if (!out.length && typeof rollSkin === 'function') {
      try {
        var p = rollSkin('default').palette;
        out = [p.accent, p.accent2, p.text];
      } catch (e2) { /* ignore */ }
    }
    if (!out.length) out = ['#ff4d9d', '#28e0c8', '#f2effc'];
    return out;
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // ── Canvas lifecycle ────────────────────────────────────────────────────────
  function ensureCanvas() {
    if (canvas) return canvas;
    if (typeof document === 'undefined') return null;

    canvas = document.getElementById('fx-layer');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'fx-layer';
      // Styles set inline as a self-contained fallback even if the CSS hook in
      // base.css is missing. pointer-events:none is the load-bearing rule.
      canvas.style.position = 'fixed';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = String(FX_Z);
      canvas.setAttribute('aria-hidden', 'true');
      if (document.body) {
        document.body.appendChild(canvas);
      } else {
        canvas = null;
        return null;
      }
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
      // getContext returned null (e.g. context-creation limit hit). Reset so a
      // later call can retry rather than silently deadlocking with a truthy
      // canvas that has no drawable context.
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = null;
      return null;
    }
    resize();
    bindListeners();
    return canvas;
  }

  function resize() {
    if (!canvas || !ctx) return;
    dpr = Math.min(MAX_DPR, (window.devicePixelRatio || 1));
    vw = window.innerWidth || document.documentElement.clientWidth || 0;
    vh = window.innerHeight || document.documentElement.clientHeight || 0;
    canvas.width = Math.max(1, Math.round(vw * dpr));
    canvas.height = Math.max(1, Math.round(vh * dpr));
    // Draw in CSS pixels; the transform scales to the backing store.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function bindListeners() {
    if (listenersBound || typeof window === 'undefined') return;
    listenersBound = true;
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        // Pause: kill the rAF handle but keep the particle pool intact.
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else if (particles.length) {
        // Resume only if there's still work to do.
        startLoop();
      }
    });
  }

  // ── Particle factory ────────────────────────────────────────────────────────
  // A particle: { x, y, vx, vy, gravity, life, maxLife, size, rot, vrot,
  //               color, kind }. Positions/velocities are in CSS px and px/sec.
  function makeParticle(x, y, kind, color, opts) {
    var speed = opts.speed != null ? opts.speed : 220;
    var spread = opts.spread != null ? opts.spread : Math.PI * 2; // full circle
    var gravity = opts.gravity != null ? opts.gravity : 520;
    var baseAngle = opts.angle != null ? opts.angle : -Math.PI / 2; // up
    var ang = baseAngle + rand(-spread / 2, spread / 2);
    var sp = speed * rand(0.45, 1.0);
    var size;
    switch (kind) {
      case 'confetti': size = rand(5, 10); break;
      case 'ring':     size = rand(4, 9);  break;
      case 'star':     size = rand(5, 11); break;
      case 'sparkle':  size = rand(2, 5);  break;
      default:         size = rand(3, 6);  break; // pixel
    }
    return {
      x: x, y: y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      gravity: kind === 'ring' ? 0 : gravity, // rings expand in place
      life: 0,
      maxLife: rand(0.7, 1.5),
      size: size,
      rot: rand(0, Math.PI * 2),
      vrot: rand(-6, 6),
      color: color,
      kind: kind,
      ringR: 0 // expanding-ring radius (rings only)
    };
  }

  // Add particles to the pool, enforcing the global cap by dropping oldest.
  function addParticles(list) {
    for (var i = 0; i < list.length; i++) particles.push(list[i]);
    if (particles.length > MAX_PARTICLES) {
      particles.splice(0, particles.length - MAX_PARTICLES);
    }
    startLoop();
  }

  // ── The rAF loop ────────────────────────────────────────────────────────────
  function startLoop() {
    if (rafId) return;                 // already running
    if (typeof document !== 'undefined' && document.hidden) return; // stay paused
    if (!particles.length) return;     // nothing to draw
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
  }

  function frame(ts) {
    rafId = 0;
    if (!ctx) { return; }

    var dt = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (tab refocus) so nothing leaps

    ctx.clearRect(0, 0, vw, vh);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      // Integrate motion.
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      if (p.kind === 'ring') p.ringR += (p.size * 14) * dt;

      drawParticle(p);
    }

    // STOP when empty — never spin idle.
    if (particles.length) {
      rafId = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, vw, vh);
    }
  }

  function drawParticle(p) {
    var t = p.life / p.maxLife;        // 0 -> 1
    var alpha = t < 0.85 ? 1 : (1 - (t - 0.85) / 0.15); // fade out at the end
    if (alpha <= 0) return;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    switch (p.kind) {
      case 'confetti':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        ctx.restore();
        break;

      case 'ring':
        ctx.save();
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * (1 - t * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.ringR), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;

      case 'star':
        drawStar(p.x, p.y, p.size, p.rot);
        break;

      case 'sparkle':
        // A tiny 4-point glint (plus sign) — cheap and bright.
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        var s = p.size;
        ctx.fillRect(-s, -s * 0.28, s * 2, s * 0.56);
        ctx.fillRect(-s * 0.28, -s, s * 0.56, s * 2);
        ctx.restore();
        break;

      default: // 'pixel' — a small square, on theme with the pixel-art look
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        break;
    }
    ctx.globalAlpha = 1;
  }

  function drawStar(cx, cy, r, rot) {
    var spikes = 5;
    var inner = r * 0.45;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var rad = (i % 2 === 0) ? r : inner;
      var a = (Math.PI / spikes) * i - Math.PI / 2;
      var px = Math.cos(a) * rad;
      var py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  // Emit a burst of N particles from screen point (x, y).
  // opts: { count, colors, spread, speed, gravity, kind, angle }
  // Unspecified shape/kind/colors are RANDOMIZED so bursts feel varied.
  function burst(x, y, opts) {
    opts = opts || {};
    if (!ensureCanvas()) return;

    var reduced = reducedMotion();
    var count = opts.count != null ? opts.count : (18 + ((Math.random() * 18) | 0));
    if (reduced) count = Math.min(count, 6); // drastic reduction, not zero

    var colors = (opts.colors && opts.colors.length) ? opts.colors : themeColors();
    // A fixed kind, or a random one per-burst when unspecified.
    var fixedKind = opts.kind && KINDS.indexOf(opts.kind) !== -1 ? opts.kind : null;
    var randomizeEach = !fixedKind && !opts.kind; // vary shapes within the burst

    var list = [];
    for (var i = 0; i < count; i++) {
      var kind = fixedKind || pick(KINDS);
      var color = pick(colors);
      list.push(makeParticle(x, y, kind, color, opts));
    }
    addParticles(list);
  }

  // Convenience: a random-kind, random-color burst.
  function burstRandom(x, y) {
    burst(x, y, { kind: pick(KINDS), colors: themeColors() });
  }

  // Full-screen celebratory fall from the top. Self-terminating after a
  // duration. opts: { duration, rate, colors, kind }
  function confettiRain(opts) {
    opts = opts || {};
    if (!ensureCanvas()) return;

    var reduced = reducedMotion();
    var colors = (opts.colors && opts.colors.length) ? opts.colors : themeColors();
    var duration = opts.duration != null ? opts.duration : (reduced ? 700 : 2600);
    var rate = opts.rate != null ? opts.rate : (reduced ? 4 : 14); // particles/tick
    var tickMs = 90;

    var endAt = Date.now() + duration;
    var timer = setInterval(function () {
      if (Date.now() >= endAt) {
        clearInterval(timer);
        var idx = rainTimers.indexOf(timer);
        if (idx !== -1) rainTimers.splice(idx, 1);
        return;
      }
      var n = reduced ? Math.min(rate, 4) : rate;
      var list = [];
      for (var i = 0; i < n; i++) {
        var kind = opts.kind || (Math.random() < 0.7 ? 'confetti' : pick(KINDS));
        var p = makeParticle(rand(0, vw), rand(-20, 0), kind, pick(colors), {
          angle: Math.PI / 2,          // straight down-ish
          spread: 0.6,
          speed: rand(90, 170),
          gravity: 240
        });
        p.maxLife = rand(1.6, 3.0);    // long enough to cross the screen
        list.push(p);
      }
      addParticles(list);
    }, tickMs);
    rainTimers.push(timer);
  }

  // Emit 1-few tiny particles at a point — built for the cursor trail. Cheap by
  // design: frequent calls are safe. Skipped entirely under reduced motion.
  function trail(x, y, opts) {
    if (reducedMotion()) return;       // no continuous trails when reduced
    if (!ensureCanvas()) return;
    opts = opts || {};
    var count = opts.count != null ? opts.count : 1;
    var colors = (opts.colors && opts.colors.length) ? opts.colors : themeColors();
    var list = [];
    for (var i = 0; i < count; i++) {
      var kind = opts.kind || (Math.random() < 0.5 ? 'pixel' : 'sparkle');
      var p = makeParticle(x, y, kind, pick(colors), {
        speed: opts.speed != null ? opts.speed : 50,
        spread: Math.PI * 2,
        gravity: opts.gravity != null ? opts.gravity : 60
      });
      p.maxLife = rand(0.35, 0.7);     // short-lived: keeps the pool tiny
      p.size *= 0.7;
      list.push(p);
    }
    addParticles(list);
  }

  // Remove all active particles immediately and stop the loop / any rain.
  function clear() {
    particles.length = 0;
    for (var i = 0; i < rainTimers.length; i++) clearInterval(rainTimers[i]);
    rainTimers.length = 0;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (ctx) ctx.clearRect(0, 0, vw, vh);
  }

  var FX = {
    burst: burst,
    burstRandom: burstRandom,
    confettiRain: confettiRain,
    trail: trail,
    clear: clear,
    reducedMotion: reducedMotion,
    // Introspection (handy for tests / debugging; not load-bearing).
    count: function () { return particles.length; },
    MAX_PARTICLES: MAX_PARTICLES
  };

  if (typeof window !== 'undefined') {
    window.FX = FX;
    // Create the canvas eagerly once the DOM is ready so later modules can call
    // FX.* immediately. Lazy ensureCanvas() still covers any earlier call.
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { ensureCanvas(); });
      } else {
        ensureCanvas();
      }
    }
  }

  // CommonJS guard: lets `node --check` and node tests load the file headlessly.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FX;
  }
})();
