// pixel-icons.js — RandOS's animated pixel-art icon system.
//
// makePixelIcon(name, opts) returns a DOM element rendering a small, crisp,
// animated pixel-art sprite. Every render keeps a recognizable silhouette per
// app, but RANDOMIZES a few detail pixels and accent choices so two icons are
// never quite identical, and a short CSS loop keeps each one subtly alive.
//
// Approach: an inline <svg> built from <rect> "pixels" on an integer grid.
// SVG rects stay razor-sharp at any size (no blur, no image-rendering hacks),
// theme via the inherited scoped --rand-* custom properties, and animate with
// plain CSS @keyframes that calm down under prefers-reduced-motion.
//
// Plain browser script — no ES modules, no imports, no external libraries.
// DOM built with createElementNS only (never innerHTML with dynamic values).

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Palette role keywords resolved against the inherited scoped vars. Using a
  // currentColor-free, var-based scheme means icons recolor with their skin.
  // When `onAccent` is set the icon sits on the accent fill (title bars), so
  // its "ink" flips to the contrast-safe accent-text color.
  function roles(opts) {
    const onAccent = !!opts.onAccent;
    return {
      ink:    onAccent ? 'var(--rand-accent-text, #fff)' : 'var(--rand-text, #f2effc)',
      // A softened ink for secondary structure.
      ink2:   onAccent
        ? 'color-mix(in srgb, var(--rand-accent-text, #fff) 65%, transparent)'
        : 'color-mix(in srgb, var(--rand-text, #f2effc) 60%, transparent)',
      accent: onAccent ? 'var(--rand-accent-text, #fff)' : 'var(--rand-accent, #ff4d9d)',
      accent2: onAccent
        ? 'color-mix(in srgb, var(--rand-accent-text, #fff) 80%, transparent)'
        : 'var(--rand-accent-2, #28e0c8)',
      // The "panel"/screen fill behind detail pixels.
      panel:  onAccent
        ? 'color-mix(in srgb, var(--rand-accent-text, #fff) 22%, transparent)'
        : 'color-mix(in srgb, var(--rand-accent, #ff4d9d) 22%, transparent)'
    };
  }

  function randInt(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[randInt(arr.length)]; }
  function chance(p) { return Math.random() < p; }

  // Build one pixel <rect>. x,y in grid units; cls for animation hooks.
  function px(x, y, fill, opts) {
    opts = opts || {};
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', String(x));
    r.setAttribute('y', String(y));
    r.setAttribute('width', String(opts.w || 1));
    r.setAttribute('height', String(opts.h || 1));
    r.setAttribute('fill', fill);
    if (opts.cls) r.setAttribute('class', opts.cls);
    if (opts.opacity !== undefined) r.setAttribute('opacity', String(opts.opacity));
    if (opts.rx) r.setAttribute('rx', String(opts.rx));
    return r;
  }

  // ── Sprite builders. Each appends rects to `g` on a GRID x GRID lattice and
  //    returns nothing; randomness + animation classes live inside. ──────────

  function drawCalculator(g, R) {
    // Body outline (frame) ~ uses ink2 as a thin border feel via inset panel.
    g.appendChild(px(1, 0, R.ink2, { w: 10, h: 12, opacity: 0.28, rx: 1 }));
    g.appendChild(px(2, 1, R.ink, { w: 8, h: 11, rx: 1, opacity: 0.9 }));
    // Screen.
    g.appendChild(px(3, 2, R.panel, { w: 6, h: 2 }));
    // A couple of "readout" pixels that blink — randomized position.
    const lit = 3 + randInt(5);
    g.appendChild(px(lit, 2, R.accent2, { cls: 'pxi-blink' }));
    g.appendChild(px(3 + randInt(5), 3, R.accent2, { opacity: 0.85, cls: 'pxi-blink2' }));
    // Keypad: 3 cols x 4 rows of keys at y=5..11.
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const x = 3 + col * 2;
        const y = 5 + row * 1.6;
        // Randomly tint one key as the "active" accent key.
        const isAccent = chance(0.16);
        g.appendChild(px(x, Math.round(y), isAccent ? R.accent : R.ink2, { rx: 0.4 }));
      }
    }
  }

  function drawClock(g, R) {
    // Round face: an octagon-ish disc on the grid.
    const disc = [
      [4, 1, 4, 1], [3, 2, 6, 1], [2, 3, 8, 6], [3, 9, 6, 1], [4, 11, 4, 1]
    ];
    for (const [x, y, w, h] of disc) g.appendChild(px(x, y, R.ink2, { w, h, opacity: 0.35 }));
    g.appendChild(px(3, 3, R.panel, { w: 6, h: 6, rx: 1 }));
    // Tick marks at 12/3/6/9 — accent.
    g.appendChild(px(6, 2, R.accent2));
    g.appendChild(px(6, 9, R.accent2));
    g.appendChild(px(2, 5, R.accent2, { h: 2 }));
    g.appendChild(px(9, 5, R.accent2, { h: 2 }));
    // Hands rotate around the hub. Randomize the starting angle so each clock
    // reads a different time, then a slow CSS spin keeps the second hand moving.
    const hub = document.createElementNS(SVG_NS, 'g');
    hub.setAttribute('class', 'pxi-clockhands');
    hub.setAttribute('style', '--pxi-hour:' + (randInt(12) * 30) + 'deg;--pxi-min:' + (randInt(12) * 30) + 'deg;');
    // hour hand (short, thick)
    const hour = px(6, 4, R.ink, { w: 1, h: 2, cls: 'pxi-hand-hour' });
    // minute hand (long)
    const min = px(6, 3, R.ink, { w: 1, h: 3, cls: 'pxi-hand-min' });
    // second hand (accent, spins)
    const sec = px(6, 3, R.accent, { w: 1, h: 3, cls: 'pxi-hand-sec' });
    hub.appendChild(min); hub.appendChild(hour); hub.appendChild(sec);
    g.appendChild(hub);
    // Center hub pin.
    g.appendChild(px(6, 6, R.accent2));
  }

  function drawCalendar(g, R) {
    // Body.
    g.appendChild(px(1, 1, R.ink, { w: 10, h: 10, rx: 1, opacity: 0.92 }));
    // Header bar (accent).
    g.appendChild(px(1, 1, R.accent, { w: 10, h: 2, rx: 1 }));
    // Binding rings.
    g.appendChild(px(3, 0, R.ink2));
    g.appendChild(px(8, 0, R.ink2));
    // Date grid: 4x3 cells, with one randomly highlighted "today".
    const todayCol = randInt(4);
    const todayRow = randInt(3);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 2 + col * 2;
        const y = 4 + row * 2;
        const isToday = col === todayCol && row === todayRow;
        g.appendChild(px(x, y, isToday ? R.accent2 : R.panel, {
          cls: isToday ? 'pxi-blink' : undefined
        }));
      }
    }
  }

  function drawRandomizer(g, R) {
    // A die tilted with a sparkle — the app's signature. Die body.
    g.appendChild(px(2, 3, R.ink, { w: 7, h: 7, rx: 1.2, opacity: 0.95 }));
    g.appendChild(px(3, 4, R.panel, { w: 5, h: 5, rx: 1 }));
    // Random pip pattern (1..4 pips) within the face.
    const spots = [[4, 5], [6, 5], [4, 7], [6, 7], [5, 6]];
    const count = 1 + randInt(4);
    const shuffled = spots.slice().sort(() => Math.random() - 0.5).slice(0, count);
    for (const [x, y] of shuffled) g.appendChild(px(x, y, R.accent));
    // Sparkles that twinkle — randomized.
    const sparkPositions = [[9, 1], [10, 4], [1, 8], [9, 9]];
    for (const [sx, sy] of sparkPositions) {
      if (chance(0.7)) {
        g.appendChild(px(sx, sy, R.accent2, { cls: chance(0.5) ? 'pxi-twinkle' : 'pxi-twinkle2' }));
      }
    }
  }

  function drawShuffle(g, R) {
    // Two crossing arrows (one descending, one ascending), pixel staircases.
    // Arrow A (accent) descending.
    const aCol = R.accent;
    g.appendChild(px(1, 2, aCol, { w: 4, h: 1 }));
    g.appendChild(px(4, 2, aCol, { w: 1, h: 3 }));
    g.appendChild(px(5, 4, aCol, { w: 3, h: 1 }));
    g.appendChild(px(7, 4, aCol, { w: 1, h: 3 }));
    g.appendChild(px(8, 6, aCol, { w: 3, h: 1 }));
    // Arrowhead A.
    g.appendChild(px(9, 5, aCol));
    g.appendChild(px(9, 7, aCol));
    // Arrow B (accent2) ascending, crossing A.
    const bCol = R.accent2;
    g.appendChild(px(1, 9, bCol, { w: 4, h: 1 }));
    g.appendChild(px(4, 7, bCol, { w: 1, h: 3 }));
    g.appendChild(px(5, 7, bCol, { w: 3, h: 1 }));
    g.appendChild(px(7, 5, bCol, { w: 1, h: 3 }));
    g.appendChild(px(8, 5, bCol, { w: 3, h: 1 }));
    // Arrowhead B.
    g.appendChild(px(9, 4, bCol));
    g.appendChild(px(9, 6, bCol));
    // The whole pair gives a gentle "swap" nudge animation via class on <g>.
    g.setAttribute('class', 'pxi-shuffle');
    // Randomly flicker one arm to feel lively.
    if (chance(0.5)) {
      g.appendChild(px(pick([2, 3, 4]), 2, R.ink2, { cls: 'pxi-blink2', opacity: 0.6 }));
    }
  }

  // Pip layouts for a die face value 1..6 on a 3x3 logical grid.
  const PIP_LAYOUTS = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]
  };

  function drawDice(g, R, value) {
    const v = (value >= 1 && value <= 6) ? value : 1 + randInt(6);
    // Die body fills most of the grid.
    g.appendChild(px(1, 1, R.ink, { w: 10, h: 10, rx: 2, opacity: 0.95 }));
    g.appendChild(px(2, 2, R.panel, { w: 8, h: 8, rx: 1.5 }));
    // Pips: map the 3x3 logical grid into face cells.
    const pips = PIP_LAYOUTS[v];
    for (const [cx, cy] of pips) {
      const x = 3 + cx * 2.5;
      const y = 3 + cy * 2.5;
      g.appendChild(px(Math.round(x), Math.round(y), R.accent, { w: 1.4, h: 1.4, rx: 0.7 }));
    }
    // A faint shimmer sweep across the face.
    g.appendChild(px(2, 2, R.accent2, { w: 8, h: 8, opacity: 0.0, cls: 'pxi-shimmer', rx: 1.5 }));
  }

  function drawCoin(g, R, face) {
    const isHeads = face !== 'tails';
    // Round disc.
    const disc = [
      [4, 1, 4, 1], [3, 2, 6, 1], [2, 3, 8, 6], [3, 9, 6, 1], [4, 11, 4, 1]
    ];
    for (const [x, y, w, h] of disc) g.appendChild(px(x, y, R.accent, { w, h }));
    // Inner field.
    g.appendChild(px(3, 3, R.panel, { w: 6, h: 6, rx: 1 }));
    // Mark: H (heads) or T (tails) in ink.
    if (isHeads) {
      // H
      g.appendChild(px(4, 4, R.ink, { w: 1, h: 4 }));
      g.appendChild(px(7, 4, R.ink, { w: 1, h: 4 }));
      g.appendChild(px(5, 5, R.ink, { w: 2, h: 1 }));
    } else {
      // T
      g.appendChild(px(4, 4, R.ink, { w: 4, h: 1 }));
      g.appendChild(px(5, 4, R.ink, { w: 2, h: 4 }));
    }
    // A glint pixel that travels (shine), randomized starting corner.
    const glint = pick([[4, 2], [8, 4], [5, 9], [3, 5]]);
    g.appendChild(px(glint[0], glint[1], R.accent2, { cls: 'pxi-twinkle' }));
    // Whole coin gets a slow flip-bob.
    g.setAttribute('class', 'pxi-coin');
  }

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

  const BUILDERS = {
    calculator: drawCalculator,
    clock: drawClock,
    calendar: drawCalendar,
    randomizer: drawRandomizer,
    shuffle: drawShuffle,
    dice: drawDice,
    coin: drawCoin,
    soundboard: drawSoundboard
  };

  // Per-icon ambient motion class on the wrapper (gentle bob / sway).
  const AMBIENT = {
    calculator: 'pxi-bob',
    clock: '',          // hands already move
    calendar: 'pxi-bob',
    randomizer: 'pxi-sway',
    shuffle: '',        // arrows nudge via inner <g>
    dice: 'pxi-bob',
    coin: '',           // coin flips via inner <g>
    soundboard: 'pxi-bob'
  };

  // makePixelIcon(name, opts) -> SVG element (an animated pixel-art icon).
  function makePixelIcon(name, opts) {
    opts = opts || {};
    const size = opts.size || 40;
    const GRID = 12;
    const R = roles(opts);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + GRID + ' ' + GRID);
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('class', 'pxi pxi-' + name + (AMBIENT[name] ? ' ' + AMBIENT[name] : ''));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', name + ' icon');
    svg.setAttribute('focusable', 'false');

    const g = document.createElementNS(SVG_NS, 'g');
    const builder = BUILDERS[name] || drawRandomizer;
    if (name === 'dice') builder(g, R, opts.value);
    else if (name === 'coin') builder(g, R, opts.face);
    else builder(g, R);
    svg.appendChild(g);
    return svg;
  }

  // Expose as a browser global.
  window.makePixelIcon = makePixelIcon;
})();
