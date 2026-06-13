// wallpaper.js — generative, animated, theme-colored desktop background.
//
// A single full-screen <canvas id="wallpaper"> sits behind #icons / #taskbar /
// windows (pointer-events: none, so clicks pass straight through to the
// desktop). Each "roll" deals a fresh palette via rollSkin('default') and picks
// ONE pattern generator at random from the pool below, so the backdrop is
// unpredictable and re-rolls on every theme shuffle.
//
// Design goals:
//   - BOLD & PLAYFUL motion, but the pattern reads as a textured BACKDROP, not
//     a glaring foreground: everything is drawn over a darkened base wash and
//     accents are kept low-alpha so windows/icons on top stay readable.
//   - Exactly one rAF loop alive at a time. rollWallpaperCanvas() always tears
//     the previous loop down (cancelAnimationFrame) before starting a new one,
//     so rerolls never stack or leak.
//   - prefers-reduced-motion: render a single static frame, no loop.
//   - Pause when the tab is hidden (visibilitychange), resume when visible.
//
// Plain browser script — no ES modules, no libraries. Top-level functions
// become globals; desktop.js calls rollWallpaperCanvas().

(function () {
  'use strict';

  // ── Module-private animation state ──────────────────────────────────────
  var canvas = null;
  var ctx = null;
  var rafId = 0;          // current requestAnimationFrame handle (0 = none)
  var running = false;
  var startTime = 0;      // ms timestamp of the current roll
  var dpr = 1;
  var current = null;     // the active scene { draw, palette, ... }
  var listenersBound = false;
  var elapsed = 0;        // seconds of motion shown so far (survives pauses)

  function reducedMotion() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ── Color helpers ───────────────────────────────────────────────────────
  // Parse "#rrggbb" (or "#rgb") into [r,g,b].
  function hexToRgb(hex) {
    var h = String(hex).replace('#', '').trim();
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var n = parseInt(h, 16);
    if (isNaN(n)) return [20, 20, 28];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  // Mix two rgb arrays; t=0 -> a, t=1 -> b.
  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  // Perceived luminance (0..255-ish) — used to decide if a palette is "light".
  function luminance(rgb) {
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  // Build a coherent color kit from a palette. We deliberately bias the base
  // DARK (even for light palettes we only lighten a little) so that whatever we
  // draw on top stays a quiet, readable backdrop.
  function colorKit(palette) {
    var bg = hexToRgb(palette.bg);
    var surface = hexToRgb(palette.surface);
    var accent = hexToRgb(palette.accent);
    var accent2 = hexToRgb(palette.accent2 || palette.accent);
    var light = luminance(bg) > 140;

    // Base wash: keep it close to bg but nudge toward surface for depth.
    var base = mix(bg, surface, 0.35);
    if (light) {
      // For light palettes, pull the base a touch darker so accents read and
      // white icon text/labels are not the only dark thing on screen.
      base = mix(base, [40, 40, 48], 0.18);
    }

    if (palette.mono) {
      // Monochrome palettes: derive accent tints from the single hue so the
      // pattern stays tasteful and on-theme rather than introducing new colors.
      accent2 = mix(accent, base, 0.4);
    }

    return { bg: bg, surface: surface, accent: accent, accent2: accent2, base: base, light: light, mono: !!palette.mono };
  }

  // ── Sizing ──────────────────────────────────────────────────────────────
  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for perf
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    if (current && reducedMotion()) {
      // Static mode: a resize needs a fresh single frame.
      drawFrame(0);
    }
  }

  function W() { return canvas.width; }
  function H() { return canvas.height; }

  // ════════════════════════════════════════════════════════════════════════
  // Pattern generators
  // Each generator is a factory: given (kit, seed) it returns a function
  // draw(ctx, t) that paints one frame at time t (seconds). The factory does
  // any one-time randomized layout so motion is deterministic per roll.
  // ════════════════════════════════════════════════════════════════════════

  function rnd(seed) {
    // Small deterministic PRNG so a roll's layout is stable across frames.
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // Fill the base wash behind every pattern.
  function paintBase(kit) {
    var w = W(), h = H();
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, rgba(kit.base, 1));
    g.addColorStop(1, rgba(mix(kit.base, kit.bg, 0.6), 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // ── 1. Drifting dot field — a soft grid of accent dots that breathes and
  // slides, with a gentle per-dot pulse. ──
  function genDotField(kit, seed) {
    var rng = rnd(seed);
    var spacing = (60 + rng() * 50) * dpr;
    var dir = rng() * Math.PI * 2;
    var vx = Math.cos(dir), vy = Math.sin(dir);
    var maxR = (2.2 + rng() * 2.2) * dpr;
    return function (t) {
      paintBase(kit);
      var w = W(), h = H();
      var ox = (Math.cos(t * 0.12) * 0.5 + vx * t * 8) * dpr;
      var oy = (Math.sin(t * 0.1) * 0.5 + vy * t * 8) * dpr;
      var cols = Math.ceil(w / spacing) + 2;
      var rows = Math.ceil(h / spacing) + 2;
      for (var i = -1; i < cols; i++) {
        for (var j = -1; j < rows; j++) {
          var x = ((i * spacing + ox) % (w + spacing) + w + spacing) % (w + spacing);
          var y = ((j * spacing + oy) % (h + spacing) + h + spacing) % (h + spacing);
          var pulse = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 0.6 + j * 0.4);
          var r = maxR * (0.45 + 0.55 * pulse);
          var col = (i + j) % 2 === 0 ? kit.accent : kit.accent2;
          ctx.fillStyle = rgba(col, 0.10 + 0.10 * pulse);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
  }

  // ── 2. Floating geometric shapes — big translucent polygons drifting and
  // slowly rotating, like lava-lamp confetti. ──
  function genShapes(kit, seed) {
    var rng = rnd(seed);
    var count = 10 + Math.floor(rng() * 6);
    var shapes = [];
    for (var k = 0; k < count; k++) {
      shapes.push({
        x: rng(), y: rng(),
        size: (40 + rng() * 120),
        sides: 3 + Math.floor(rng() * 4),
        spin: (rng() - 0.5) * 0.5,
        rot: rng() * Math.PI * 2,
        sx: (rng() - 0.5) * 0.04,
        sy: (rng() - 0.5) * 0.04,
        col: rng() < 0.5 ? kit.accent : kit.accent2,
        a: 0.05 + rng() * 0.07
      });
    }
    return function (t) {
      paintBase(kit);
      var w = W(), h = H();
      for (var k = 0; k < shapes.length; k++) {
        var s = shapes[k];
        var x = (((s.x + s.sx * t) % 1) + 1) % 1 * w;
        var y = (((s.y + s.sy * t) % 1) + 1) % 1 * h;
        var rot = s.rot + s.spin * t;
        var size = s.size * dpr * (0.85 + 0.15 * Math.sin(t * 0.6 + k));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.beginPath();
        for (var p = 0; p < s.sides; p++) {
          var ang = (p / s.sides) * Math.PI * 2;
          var px = Math.cos(ang) * size;
          var py = Math.sin(ang) * size;
          if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = rgba(s.col, s.a);
        ctx.fill();
        ctx.lineWidth = 1.5 * dpr;
        ctx.strokeStyle = rgba(s.col, s.a * 2.2);
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  // ── 3. Animated waves — stacked sine bands flowing across the screen like a
  // topographic ribbon field. ──
  function genWaves(kit, seed) {
    var rng = rnd(seed);
    var bands = 5 + Math.floor(rng() * 4);
    var baseAmp = (18 + rng() * 30);
    var freq = 0.004 + rng() * 0.004;
    var speed = 0.6 + rng() * 0.8;
    var diag = (rng() - 0.5) * 0.4;
    return function (t) {
      paintBase(kit);
      var w = W(), h = H();
      for (var b = 0; b < bands; b++) {
        var yBase = (b + 0.5) / bands * h;
        var amp = baseAmp * dpr * (0.7 + 0.3 * Math.sin(t * 0.5 + b));
        var phase = t * speed + b * 0.9;
        var col = b % 2 === 0 ? kit.accent : kit.accent2;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var x = 0; x <= w; x += 6 * dpr) {
          var y = yBase + Math.sin(x * freq + phase) * amp + x * diag;
          if (x === 0) ctx.lineTo(0, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = rgba(col, 0.06);
        ctx.fill();
        // crisp ribbon line on top of each band
        ctx.beginPath();
        for (var x2 = 0; x2 <= w; x2 += 6 * dpr) {
          var y2 = yBase + Math.sin(x2 * freq + phase) * amp + x2 * diag;
          if (x2 === 0) ctx.moveTo(0, y2); else ctx.lineTo(x2, y2);
        }
        ctx.lineWidth = 1.5 * dpr;
        ctx.strokeStyle = rgba(col, 0.18);
        ctx.stroke();
      }
    };
  }

  // ── 4. Concentric ripples — expanding rings from a few moving emitters, like
  // rain on a pond. ──
  function genRipples(kit, seed) {
    var rng = rnd(seed);
    var emitters = [];
    var n = 3 + Math.floor(rng() * 3);
    for (var i = 0; i < n; i++) {
      emitters.push({
        x: 0.15 + rng() * 0.7,
        y: 0.15 + rng() * 0.7,
        dx: (rng() - 0.5) * 0.02,
        dy: (rng() - 0.5) * 0.02,
        phase: rng() * 6,
        speed: 0.6 + rng() * 0.6,
        col: rng() < 0.5 ? kit.accent : kit.accent2
      });
    }
    var ringGap = (34 + rng() * 26);
    return function (t) {
      paintBase(kit);
      var w = W(), h = H();
      var maxR = Math.hypot(w, h);
      ctx.lineWidth = 1.4 * dpr;
      for (var e = 0; e < emitters.length; e++) {
        var em = emitters[e];
        var cx = (((em.x + em.dx * t) % 1) + 1) % 1 * w;
        var cy = (((em.y + em.dy * t) % 1) + 1) % 1 * h;
        var grow = (t * em.speed + em.phase) * ringGap * dpr;
        for (var r = (grow % (ringGap * dpr)); r < maxR; r += ringGap * dpr) {
          var fade = 1 - r / maxR;
          if (fade <= 0) continue;
          ctx.strokeStyle = rgba(em.col, 0.16 * fade);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };
  }

  // ── 5. Pixel-noise constellations — scattered glowing pixels that twinkle
  // and drift, with faint lines linking near neighbors. Nods to RandOS's
  // pixel-art identity. ──
  function genConstellation(kit, seed) {
    var rng = rnd(seed);
    var count = 70 + Math.floor(rng() * 50);
    var stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: rng(), y: rng(),
        size: (1 + rng() * 2.5),
        tw: rng() * 6,
        twSpeed: 0.6 + rng() * 1.6,
        dx: (rng() - 0.5) * 0.012,
        dy: (rng() - 0.5) * 0.012,
        col: rng() < 0.7 ? kit.accent : kit.accent2
      });
    }
    var linkDist = (90 * dpr);
    return function (t) {
      paintBase(kit);
      var w = W(), h = H();
      var pts = [];
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var x = (((s.x + s.dx * t) % 1) + 1) % 1 * w;
        var y = (((s.y + s.dy * t) % 1) + 1) % 1 * h;
        pts.push([x, y, s]);
      }
      // links (cheap: only check forward neighbors within a window)
      ctx.lineWidth = 1 * dpr;
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < Math.min(pts.length, a + 8); b++) {
          var dxp = pts[a][0] - pts[b][0];
          var dyp = pts[a][1] - pts[b][1];
          var d = Math.hypot(dxp, dyp);
          if (d < linkDist) {
            ctx.strokeStyle = rgba(kit.accent, 0.06 * (1 - d / linkDist));
            ctx.beginPath();
            ctx.moveTo(pts[a][0], pts[a][1]);
            ctx.lineTo(pts[b][0], pts[b][1]);
            ctx.stroke();
          }
        }
      }
      // pixels (drawn as crisp squares for the pixel-art feel)
      for (var k = 0; k < pts.length; k++) {
        var st = pts[k][2];
        var twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * st.twSpeed + st.tw));
        var sz = st.size * dpr;
        ctx.fillStyle = rgba(st.col, 0.18 + 0.4 * twinkle);
        ctx.fillRect(pts[k][0] - sz / 2, pts[k][1] - sz / 2, sz, sz);
      }
    };
  }

  // ── 6. Moving isometric tiles — a scrolling diamond grid with a soft
  // accent shimmer rolling across it. ──
  function genIso(kit, seed) {
    var rng = rnd(seed);
    var tile = (46 + rng() * 30) * dpr;
    var dir = rng() < 0.5 ? 1 : -1;
    var shimmerSpeed = 0.4 + rng() * 0.5;
    return function (t) {
      paintBase(kit);
      var w = W(), h = H();
      var halfW = tile, halfH = tile * 0.55;
      var ox = (t * 14 * dpr * dir) % (halfW * 2);
      var oy = (t * 9 * dpr) % (halfH * 2);
      var cols = Math.ceil(w / halfW) + 3;
      var rows = Math.ceil(h / halfH) + 3;
      ctx.lineWidth = 1 * dpr;
      for (var j = -2; j < rows; j++) {
        for (var i = -2; i < cols; i++) {
          var cx = i * halfW + (j % 2 ? halfW : 0) - ox;
          var cy = j * halfH - oy;
          // shimmer wave based on diagonal position
          var sh = 0.5 + 0.5 * Math.sin((cx + cy) * 0.01 - t * shimmerSpeed);
          var col = (i + j) % 2 === 0 ? kit.accent : kit.accent2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - halfH);
          ctx.lineTo(cx + halfW, cy);
          ctx.lineTo(cx, cy + halfH);
          ctx.lineTo(cx - halfW, cy);
          ctx.closePath();
          ctx.fillStyle = rgba(col, 0.04 + 0.09 * sh);
          ctx.fill();
          ctx.strokeStyle = rgba(col, 0.08);
          ctx.stroke();
        }
      }
    };
  }

  var GENERATORS = [
    genDotField,
    genShapes,
    genWaves,
    genRipples,
    genConstellation,
    genIso
  ];

  // ════════════════════════════════════════════════════════════════════════
  // Loop / lifecycle
  // ════════════════════════════════════════════════════════════════════════

  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
  }

  function drawFrame(t) {
    if (!current || !ctx) return;
    elapsed = t;            // remember where we are so pauses can resume
    current.draw(t);
  }

  function tick(now) {
    if (!running) return;
    var t = (now - startTime) / 1000;
    drawFrame(t);
    rafId = window.requestAnimationFrame(tick);
  }

  function stopLoop() {
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  // Begin animating from `fromElapsed` seconds of accumulated motion.
  function runFrom(fromElapsed) {
    stopLoop(); // guarantee only one loop ever runs
    if (reducedMotion()) {
      // Static: paint a single representative frame and do NOT animate.
      drawFrame(fromElapsed);
      return;
    }
    running = true;
    // Anchor startTime so (now - startTime)/1000 === fromElapsed right now.
    startTime = nowMs() - fromElapsed * 1000;
    rafId = window.requestAnimationFrame(tick);
  }

  // Fresh roll: start motion from zero.
  function startLoop() {
    elapsed = 0;
    runFrom(0);
  }

  function onVisibility() {
    if (document.hidden) {
      stopLoop();           // pause to save CPU; `elapsed` is preserved
    } else if (current && !running) {
      runFrom(elapsed);     // resume smoothly from where we paused
    }
  }

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.getElementById('wallpaper');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'wallpaper';
      var desktop = document.getElementById('desktop');
      if (desktop) {
        desktop.insertBefore(canvas, desktop.firstChild);
      } else {
        document.body.appendChild(canvas);
      }
    }
    ctx = canvas.getContext('2d');
    if (!listenersBound) {
      window.addEventListener('resize', resize);
      document.addEventListener('visibilitychange', onVisibility);
      // React if the user toggles reduced-motion at runtime.
      if (typeof window.matchMedia === 'function') {
        var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        var onMq = function () { if (current) runFrom(elapsed); };
        if (mq.addEventListener) mq.addEventListener('change', onMq);
        else if (mq.addListener) mq.addListener(onMq);
      }
      listenersBound = true;
    }
    resize();
  }

  // ── Public entry: roll a new palette + random pattern and (re)start. ──
  function rollWallpaperCanvas() {
    ensureCanvas();
    if (!ctx) return null;

    var skin = (typeof rollSkin === 'function') ? rollSkin('default') : null;
    var palette = skin ? skin.palette : { bg: '#12101f', surface: '#1d1933', accent: '#ff4d9d', accent2: '#28e0c8', mono: false };
    var kit = colorKit(palette);

    var idx = Math.floor(Math.random() * GENERATORS.length);
    var seed = (Math.random() * 0xffffffff) >>> 0;
    var draw = GENERATORS[idx](kit, seed);

    current = { draw: draw, palette: palette, kit: kit, index: idx };
    startLoop();

    return palette;
  }

  // Expose globally for desktop.js + the shuffle button.
  window.rollWallpaperCanvas = rollWallpaperCanvas;

  // Dual export so Node `node --check`/tests can require() without a DOM.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rollWallpaperCanvas: rollWallpaperCanvas };
  }
})();
