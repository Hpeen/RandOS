// windows.js — opens app content into draggable, focusable windows.
//
// Sizing & layout philosophy (round 3): a window's SIZE is FIXED per app (passed
// in from desktop.js) — it is never randomized. What changes is WHERE the open
// windows sit: every open/close repacks them into a centered, no-overlap clump
// in the middle of the screen, so the desktop's focal point is always the middle.
// The chaos event re-shuffles the clump's order (so positions change) while
// keeping every window's fixed size intact.
let zCounter = 100;

// Layout constants. Taskbar is ~46px tall at the bottom (see css/base.css
// #taskbar); EDGE keeps a small gutter from every screen edge. GUTTER is the
// floor of space kept BETWEEN packed windows so they never touch or overlap.
// MIN_* are usability floors a window is never shrunk below.
const TASKBAR_H = 46;
const EDGE = 12;
const GUTTER = 16;
const MIN_W = 240;
const MIN_H = 180;

// Live registry of open windows. Each entry has at least { el, appName, size }.
// Exposed via window.getOpenWindows() for the chaos module.
const openWindows = [];

// ── Open-animation effects (round 3) ───────────────────────────────────────────
// Three selectable materialize effects for opening an app. By default one is
// picked at random per open (true to RandOS); a specific effect can be LOCKED via
// window.setOpenEffect('confetti'|'glitch'|'origami'|'random') so the option is
// genuinely selectable, not merely random.
const OPEN_EFFECTS = ['confetti', 'glitch', 'origami'];
let lockedEffect = null;             // null => random each open

function chooseEffect() {
  if (lockedEffect) return lockedEffect;
  return OPEN_EFFECTS[(Math.random() * OPEN_EFFECTS.length) | 0];
}

// ── Sizing ──────────────────────────────────────────────────────────────────
// Clamp an app's fixed { w, h } to what the current viewport can actually fit
// (inside the edge gutters, above the taskbar) so a window can never spawn
// larger than the usable area. Returns { width, height }.
function fixedSize(size) {
  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  const availW = Math.max(MIN_W, vw - EDGE * 2);
  const availH = Math.max(MIN_H, vh - TASKBAR_H - EDGE * 2);
  const w = size && size.w ? size.w : MIN_W;
  const h = size && size.h ? size.h : MIN_H;
  return {
    width: Math.max(MIN_W, Math.min(w, availW)),
    height: Math.max(MIN_H, Math.min(h, availH))
  };
}

// Apply a box to a window element via inline left/top/width/height. These stay
// independent of the transform-based motion system and the left/top drag math.
function applyWindowBox(win, box) {
  win.style.left = box.left + 'px';
  win.style.top = box.top + 'px';
  win.style.width = box.width + 'px';
  win.style.height = box.height + 'px';
}

// Move a window to a target box. When `glide` is true (and motion is allowed) it
// transitions there via .is-rebox; otherwise it snaps instantly. Windows being
// dragged are left alone so a repack never yanks the cursor's grip.
function placeWindow(el, box, glide) {
  if (!el || !el.style) return;
  if (el.classList && el.classList.contains('is-dragging')) return;
  if (el._reboxTimer) { clearTimeout(el._reboxTimer); el._reboxTimer = null; }
  if (glide && !prefersReducedMotion()) {
    el.classList.add('is-rebox');
    applyWindowBox(el, box);
    // Drop the transition class once it has played so dragging stays instant.
    // Matches the longest .is-rebox transition in css/base.css.
    el._reboxTimer = window.setTimeout(function () {
      el.classList.remove('is-rebox');
      el._reboxTimer = null;
    }, 420);
  } else {
    el.classList.remove('is-rebox');
    applyWindowBox(el, box);
  }
}

// Fisher–Yates shuffle (in place). Used to re-arrange the clump on chaos.
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// ── Centered, no-overlap packing ──────────────────────────────────────────────
// Pack every open window into rows that are centered horizontally, with the whole
// block centered vertically in the usable area (above the taskbar). Row-based
// packing guarantees windows never overlap: each row's items sit side by side
// with a GUTTER, and rows stack with a GUTTER. opts:
//   { shuffle } — re-order windows first (chaos re-arrangement)
//   { snapEl }  — this element snaps to its slot (no glide); others glide
//   { instant } — everyone snaps (used on viewport resize)
function layoutWindows(opts) {
  opts = opts || {};
  const recs = openWindows.slice();
  if (!recs.length) return;
  if (opts.shuffle) shuffleInPlace(recs);

  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  const availW = Math.max(MIN_W, vw - EDGE * 2);
  const availTop = EDGE;
  const availH = Math.max(MIN_H, vh - TASKBAR_H - EDGE * 2);

  // Resolve each window's clamped fixed size up front.
  const sizes = recs.map(function (r) { return fixedSize(r.size); });

  // Greedily pack into rows that fit within availW.
  const rows = [];
  let row = [];
  let rowW = 0;
  for (let i = 0; i < recs.length; i++) {
    const w = sizes[i].width;
    if (row.length === 0) {
      row.push(i); rowW = w;
    } else if (rowW + GUTTER + w <= availW) {
      row.push(i); rowW += GUTTER + w;
    } else {
      rows.push({ items: row, w: rowW });
      row = [i]; rowW = w;
    }
  }
  if (row.length) rows.push({ items: row, w: rowW });

  // Row heights = tallest window in each row; total block height incl. gutters.
  const rowHeights = rows.map(function (r) {
    let h = 0;
    for (let k = 0; k < r.items.length; k++) h = Math.max(h, sizes[r.items[k]].height);
    return h;
  });
  let totalH = 0;
  for (let r = 0; r < rowHeights.length; r++) totalH += rowHeights[r];
  totalH += GUTTER * Math.max(0, rows.length - 1);

  // Center the whole block vertically; clamp so the top row never leaves the area.
  let y = availTop + Math.max(0, (availH - totalH) / 2);

  for (let r = 0; r < rows.length; r++) {
    const rowH = rowHeights[r];
    let x = EDGE + Math.max(0, (availW - rows[r].w) / 2);
    for (let k = 0; k < rows[r].items.length; k++) {
      const idx = rows[r].items[k];
      const size = sizes[idx];
      const box = {
        left: Math.round(x),
        // Center each window vertically within its row band.
        top: Math.round(y + (rowH - size.height) / 2),
        width: size.width,
        height: size.height
      };
      const el = recs[idx].el;
      const glide = !opts.instant && el !== opts.snapEl;
      placeWindow(el, box, glide);
      x += size.width + GUTTER;
    }
    y += rowH + GUTTER;
  }
}

// openWindow({ title, appName, contentEl, size }) -> windowEl
function openWindow({ title, appName, contentEl, size }) {
  const desktop = document.getElementById('desktop');
  if (desktop === null) return null;
  const win = document.createElement('div');
  win.className = 'window';

  // Per-window random skin (colors/fonts/chrome only — never geometry).
  const skin = rollSkin(appName);
  applySkin(win, skin);

  const bar = document.createElement('div');
  bar.className = 'window-title';
  // Pixel-art app icon (sits on the accent fill, so onAccent for contrast),
  // followed by the title text. Built as element nodes, no innerHTML.
  if (appName && typeof makePixelIcon === 'function') {
    const icon = makePixelIcon(appName, { size: 16, onAccent: true });
    icon.classList.add('window-title-icon');
    bar.appendChild(icon);
  }
  const titleText = document.createElement('span');
  titleText.className = 'title-text';
  titleText.textContent = title;
  bar.appendChild(titleText);
  const close = document.createElement('button');
  close.className = 'window-close';
  close.textContent = '×';
  bar.appendChild(close);

  const body = document.createElement('div');
  body.className = 'window-body';
  body.appendChild(contentEl);

  win.appendChild(bar);
  win.appendChild(body);
  desktop.appendChild(win);

  // Register before laying out so the new window participates in the packing.
  const record = { el: win, appName, entry: null, size: size || null };
  openWindows.push(record);

  // Repack the whole clump centered + no-overlap. The NEW window snaps straight
  // to its slot (so its open effect plays in place); the others glide to make room.
  layoutWindows({ snapEl: win });

  // Particle + materialize effect at the new window's resting center. One of three
  // selectable effects (confetti / glitch / origami), random by default.
  const cx = win.offsetLeft + win.offsetWidth / 2;
  const cy = win.offsetTop + win.offsetHeight / 2;
  applyOpenEffect(win, cx, cy);

  focusWindow(win);

  // Taskbar entry.
  const taskbar = document.getElementById('taskbar');
  const entry = document.createElement('button');
  entry.className = 'task-entry';
  entry.textContent = title;
  entry.addEventListener('click', () => focusWindow(win));
  taskbar.insertBefore(entry, taskbar.querySelector('.spacer'));
  record.entry = entry;

  // Focus on click anywhere in window.
  win.addEventListener('mousedown', () => focusWindow(win));

  // Close animates the window out, THEN tears down. removeDrag() must always
  // run so the window-level mousemove/mouseup listeners are cleaned up.
  const removeDrag = makeDraggable(win, bar);

  let closing = false;
  function teardown() {
    removeDrag();
    if (win._reboxTimer) { clearTimeout(win._reboxTimer); win._reboxTimer = null; }
    win.remove();
    entry.remove();
    const idx = openWindows.indexOf(record);
    if (idx !== -1) openWindows.splice(idx, 1);
    // Re-center the remaining clump now that this window is gone.
    layoutWindows();
  }
  close.addEventListener('click', (e) => {
    e.stopPropagation();
    if (closing) return; // guard against double-click
    closing = true;

    // Reduced-motion: skip the animation and tear down immediately.
    if (prefersReducedMotion()) {
      teardown();
      return;
    }

    win.classList.add('is-closing');
    let torn = false;
    function done() {
      if (torn) return;
      torn = true;
      teardown();
    }
    win.addEventListener('animationend', function onClose(e2) {
      if (e2.target !== win) return;
      win.removeEventListener('animationend', onClose);
      done();
    });
    // Safety fallback so a window can never get stuck if animationend
    // never fires (animation suppressed, element hidden, etc.).
    setTimeout(done, 400);
  });
  return win;
}

// Pick + apply one of the three open materialize effects, plus a matching
// particle flourish. Reduced motion: skip the window keyframe (FX self-calms).
function applyOpenEffect(win, cx, cy) {
  const effect = chooseEffect();

  if (window.FX && typeof window.FX.burst === 'function') {
    if (effect === 'confetti') {
      window.FX.burst(cx, cy, { kind: 'confetti', count: 24, spread: Math.PI * 2, speed: 260 });
    } else if (effect === 'glitch') {
      window.FX.burst(cx, cy, { kind: 'pixel', count: 16, spread: Math.PI * 2, speed: 300 });
    } else {
      window.FX.burst(cx, cy, { kind: 'sparkle', count: 16, spread: Math.PI * 2, speed: 220 });
    }
  }

  if (prefersReducedMotion()) return;

  const variant = effect === 'glitch' ? 'is-open-glitch'
    : effect === 'origami' ? 'is-open-origami'
      : 'is-open-confetti';
  win.classList.add('is-opening', variant);
  win.addEventListener('animationend', function onOpen(e) {
    if (e.target !== win) return;
    win.classList.remove('is-opening', variant);
    win.removeEventListener('animationend', onOpen);
  });
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function focusWindow(win) {
  win.style.zIndex = String(++zCounter);
}

function makeDraggable(win, handle) {
  let dragging = false, startX = 0, startY = 0, originX = 0, originY = 0;
  function onDown(e) {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    originX = win.offsetLeft; originY = win.offsetTop;
    // Cosmetic "grabbed" tilt/scale. Position still moves via left/top, so the
    // drag math is untouched. Drop any leftover open-effect classes first so the
    // transforms don't fight on the same element. Also drop is-rebox so grabbing
    // a window mid-glide (repack) drags instantly, not sluggishly.
    win.classList.remove('is-opening', 'is-open-confetti', 'is-open-glitch', 'is-open-origami');
    win.classList.remove('is-rebox');
    if (win._reboxTimer) { clearTimeout(win._reboxTimer); win._reboxTimer = null; }
    win.classList.add('is-dragging');
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    win.style.left = (originX + e.clientX - startX) + 'px';
    win.style.top  = (originY + e.clientY - startY) + 'px';
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    win.classList.remove('is-dragging');
  }
  handle.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  return function cleanup() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
}

// ── Globals (consumed by the chaos module + viewport handling) ────────────────
if (typeof window !== 'undefined') {
  // Snapshot array of the live window records (each { el, appName, size, ... }).
  // A copy so callers can't corrupt the internal list while iterating.
  window.getOpenWindows = function getOpenWindows() {
    return openWindows.slice();
  };

  // Re-pack the open windows into the centered clump. { shuffle: true } re-orders
  // them first (chaos re-arrangement) while keeping each fixed size. Safe to call
  // anytime; a no-op when nothing is open.
  window.relayoutWindows = function relayoutWindows(opts) {
    layoutWindows(opts || {});
  };

  // Keep the clump centered when the viewport changes. Snap (no glide) so rapid
  // resize events don't pile up transition timers.
  window.addEventListener('resize', function () {
    layoutWindows({ instant: true });
  });

  // Open-effect selection (round 3): lock a specific materialize effect, or pass
  // 'random'/null to restore per-open randomness. Returns the active setting.
  window.setOpenEffect = function setOpenEffect(name) {
    if (name && OPEN_EFFECTS.indexOf(name) !== -1) lockedEffect = name;
    else lockedEffect = null; // 'random' or anything unknown => random
    return lockedEffect || 'random';
  };
  window.getOpenEffect = function getOpenEffect() {
    return lockedEffect || 'random';
  };
}
