// cursor.js — RandOS's random pixel-art cursor + themed particle trail.
//
// On every OS load this picks ONE pixel-art cursor design at random, tints it
// with the live theme accent, and applies it document-wide as a CSS
// `cursor: url("data:image/svg+xml,...") hotspotX hotspotY, auto`. A throttled
// pointermove listener feeds tiny particles to FX.trail so the cursor leaves a
// short, on-theme sparkle trail behind it.
//
// Design set (~7 designs): classic arrow, pointing hand, crosshair, sparkle,
// diamond, retro pointer, and a heart. Each is hand-authored as a small grid of
// "pixels" rendered to a crisp <rect>-per-cell SVG (shape-rendering:crispEdges),
// so they read as true pixel art at any DPR. Every design declares its own
// HOTSPOT (the active click point) so clicks land exactly where the user aims:
// the arrow tip at its top-left, the crosshair at its center, etc.
//
// Design rules honored:
//   - One cursor for the whole document — text inputs / buttons stay usable
//     (the OS embraces a single playful cursor everywhere). No per-element rules.
//   - Performance: the trail is throttled by BOTH distance (min px moved) and
//     time (min ms between emits), and guarded by `if (window.FX)`. Under
//     prefers-reduced-motion the trail listener is never even attached.
//   - Theme: tint color is read from --rand-accent (live), falling back to
//     rollSkin('default').palette.accent, then a literal.
//   - No innerHTML on the document, no libraries, no emojis, no ES modules.
//
// Plain browser script: top-level IIFE assigns window.rollCursor. A CommonJS
// guard at the bottom lets `node --check` / node tests load it without a DOM.

(function () {
  'use strict';

  // ── Tunables ────────────────────────────────────────────────────────────────
  var TRAIL_MIN_DIST = 14;   // px the pointer must move before re-emitting
  var TRAIL_MIN_MS   = 38;   // and/or this long since the last emit
  var CELL = 2;              // px per pixel-art cell in the rendered SVG

  // ── Pixel-art cursor designs ─────────────────────────────────────────────────
  // Each design is a grid of strings; one char per cell:
  //   ' ' = transparent, 'X' = accent-tinted fill, 'O' = dark outline,
  //   'W' = white highlight. The grid is square-ish and small so the resulting
  //   data-URI stays well under the browser cursor size cap (~128px). hotspot is
  //   in GRID cells (multiplied by CELL when written into the cursor rule).
  var DESIGNS = [
    {
      name: 'arrow',
      hotspot: [0, 0],            // tip is the very top-left cell
      grid: [
        'O        ',
        'OO       ',
        'OXO      ',
        'OXXO     ',
        'OXXXO    ',
        'OXXXXO   ',
        'OXXXXXO  ',
        'OXXXXXXO ',
        'OXXXXOOOO',
        'OXXOXXO  ',
        'OXO OXXO ',
        'OO   OXXO',
        'O    OXXO',
        '      OOO'
      ]
    },
    {
      name: 'hand',
      hotspot: [4, 0],           // fingertip
      grid: [
        '   OO    ',
        '   OXO   ',
        '   OXO   ',
        '   OXO OO',
        '   OXOOXO',
        'OO OXOXOX',
        'OXOOXOXOX',
        'OXXOXXXXO',
        ' OXXXXXXO',
        ' OXXXXXXO',
        '  OXXXXO ',
        '  OXXXXO ',
        '   OOOO  '
      ]
    },
    {
      name: 'crosshair',
      hotspot: [6, 6],           // dead center
      grid: [
        '      O      ',
        '      X      ',
        '      X      ',
        '     OXO     ',
        '      X      ',
        '      X      ',
        'OXX OXXXO XXO',
        '      X      ',
        '      X      ',
        '     OXO     ',
        '      X      ',
        '      X      ',
        '      O      '
      ]
    },
    {
      name: 'sparkle',
      hotspot: [5, 5],           // center of the glint
      grid: [
        '     O     ',
        '     X     ',
        '    OXO    ',
        '    WXW    ',
        '  O WXW O  ',
        'OXXXWWWXXXO',
        '  O WXW O  ',
        '    WXW    ',
        '    OXO    ',
        '     X     ',
        '     O     '
      ]
    },
    {
      name: 'diamond',
      hotspot: [4, 4],           // center
      grid: [
        '    O    ',
        '   OXO   ',
        '  OXWXO  ',
        ' OXWWWXO ',
        'OXWWWWWXO',
        ' OXWWWXO ',
        '  OXWXO  ',
        '   OXO   ',
        '    O    '
      ]
    },
    {
      name: 'retro',
      hotspot: [0, 0],           // top-left, a chunky classic pointer
      grid: [
        'OOO      ',
        'OXXO     ',
        'OXXXO    ',
        'OXXXXO   ',
        'OXXXXXO  ',
        'OXXXXXXO ',
        'OXXXXXXXO',
        'OXXXXOOOO',
        'OXXXXO   ',
        'OXOOXXO  ',
        'OO  OXXO ',
        '    OXXO ',
        '     OOO '
      ]
    },
    {
      name: 'heart',
      hotspot: [5, 5],           // center
      grid: [
        ' OO   OO ',
        'OXXO OXXO',
        'OXWXOXWXO',
        'OXXXXXXXO',
        'OXXXXXXXO',
        ' OXXXXXO ',
        '  OXXXO  ',
        '   OXO   ',
        '    O    '
      ]
    }
  ];

  // ── State ─────────────────────────────────────────────────────────────────────
  var currentDesign = null;
  var lastX = 0, lastY = 0;
  var lastEmit = 0;
  var trailBound = false;

  // ── Reduced motion ────────────────────────────────────────────────────────────
  // Prefer FX's own check (single source of truth) when present.
  function reducedMotion() {
    if (typeof window !== 'undefined' && window.FX &&
        typeof window.FX.reducedMotion === 'function') {
      return window.FX.reducedMotion();
    }
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ── Theme color ────────────────────────────────────────────────────────────────
  // Live --rand-accent first, then a fresh rollSkin('default') palette, then a
  // literal. Always returns a usable CSS color string.
  function accentColor() {
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        var c = getComputedStyle(document.documentElement)
          .getPropertyValue('--rand-accent');
        if (c && c.trim()) return c.trim();
      }
    } catch (e) { /* getComputedStyle can throw in odd states; ignore */ }

    if (typeof rollSkin === 'function') {
      try { return rollSkin('default').palette.accent; } catch (e2) { /* ignore */ }
    }
    return '#ff4d9d';
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  // ── SVG / data-URI generation ──────────────────────────────────────────────────
  // Render a design's grid to an SVG string of crisp 1-cell rects, tinting 'X'
  // cells with the theme accent. Outline ('O') is near-black, highlight ('W') is
  // white — both fixed so the design stays legible on any wallpaper.
  function buildSvg(design, accent) {
    var grid = design.grid;
    var rows = grid.length;
    var cols = 0;
    for (var r = 0; r < rows; r++) cols = Math.max(cols, grid[r].length);

    var w = cols * CELL;
    var h = rows * CELL;
    var rects = '';
    for (var y = 0; y < rows; y++) {
      var line = grid[y];
      for (var x = 0; x < line.length; x++) {
        var ch = line.charAt(x);
        if (ch === ' ') continue;
        var fill;
        if (ch === 'X') fill = accent;
        else if (ch === 'O') fill = '#101018';
        else if (ch === 'W') fill = '#ffffff';
        else continue;
        rects += '<rect x="' + (x * CELL) + '" y="' + (y * CELL) +
          '" width="' + CELL + '" height="' + CELL + '" fill="' + fill + '"/>';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' +
      h + '" viewBox="0 0 ' + w + ' ' + h +
      '" shape-rendering="crispEdges">' + rects + '</svg>';
  }

  // Encode an SVG string for a CSS url() data-URI. encodeURIComponent keeps it
  // robust against the '#' in hex colors and other reserved characters.
  function svgToDataUri(svg) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  // Build the full CSS cursor value (data-URI + hotspot + fallback) for a design.
  function cursorValue(design, accent) {
    var uri = svgToDataUri(buildSvg(design, accent));
    var hx = design.hotspot[0] * CELL;
    var hy = design.hotspot[1] * CELL;
    return 'url("' + uri + '") ' + hx + ' ' + hy + ', auto';
  }

  // ── Apply ───────────────────────────────────────────────────────────────────────
  // Set the cursor document-wide. Writing to both documentElement and body keeps
  // it consistent regardless of which element the UA resolves the cursor from.
  function applyCursor(design, accent) {
    if (typeof document === 'undefined') return;
    var value = cursorValue(design, accent);
    if (document.documentElement) document.documentElement.style.cursor = value;
    if (document.body) document.body.style.cursor = value;
  }

  // ── Trail ─────────────────────────────────────────────────────────────────────
  function onPointerMove(e) {
    if (!window.FX || typeof window.FX.trail !== 'function') return;
    var now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
    var x = e.clientX, y = e.clientY;
    var dx = x - lastX, dy = y - lastY;
    // Throttle on BOTH distance and time so neither a slow drag nor a fast flick
    // floods the engine.
    if ((dx * dx + dy * dy) < (TRAIL_MIN_DIST * TRAIL_MIN_DIST)) return;
    if ((now - lastEmit) < TRAIL_MIN_MS) return;
    lastX = x; lastY = y; lastEmit = now;
    window.FX.trail(x, y, { count: 1 });
  }

  function bindTrail() {
    if (trailBound || typeof window === 'undefined') return;
    if (reducedMotion()) return;          // no continuous trail when reduced
    trailBound = true;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  // Re-pick a random design + re-read the current theme accent, then re-apply.
  // Safe to call repeatedly (the chaos event calls this mid-session).
  function rollCursor() {
    currentDesign = pick(DESIGNS);
    applyCursor(currentDesign, accentColor());
    return currentDesign.name;
  }

  // Re-tint the CURRENT design with the live accent without changing the design.
  // Useful when the theme shuffles but the cursor shape should persist.
  function retintCursor() {
    if (!currentDesign) { rollCursor(); return; }
    applyCursor(currentDesign, accentColor());
  }

  function init() {
    rollCursor();   // pick + tint + apply for this load
    bindTrail();    // attach throttled trail (skipped under reduced motion)
  }

  if (typeof window !== 'undefined') {
    window.rollCursor = rollCursor;
    window.retintCursor = retintCursor;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    }
  }

  // CommonJS guard: lets `node --check` and node tests load the file headlessly.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DESIGNS: DESIGNS,
      buildSvg: buildSvg,
      svgToDataUri: svgToDataUri,
      cursorValue: cursorValue,
      rollCursor: rollCursor,
      retintCursor: retintCursor
    };
  }
})();
