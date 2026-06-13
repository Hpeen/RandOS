// windows.js — opens app content into draggable, focusable windows.
let zCounter = 100;

// Layout constants for placement math. Taskbar is ~46px tall at the bottom
// (see css/base.css #taskbar); EDGE keeps a small gutter from every screen
// edge so the window never hugs the very border. MIN_* are usability floors:
// a window narrower/shorter than these is awkward to use, so we never roll
// below them (and clamp up if a tiny viewport would otherwise force it).
const TASKBAR_H = 46;
const EDGE = 8;
const MIN_W = 240;
const MIN_H = 180;

// Live registry of open windows. Each entry has at least { el, appName }.
// Exposed via window.getOpenWindows() for the chaos module (later task).
const openWindows = [];

// Roll a random, varied, on-screen-and-usable box { left, top, width, height }
// for a window. Size is rolled first within tasteful bounds, clamped to what
// the current viewport can actually fit (so it never spawns larger than the
// usable area), then a random position is chosen inside the remaining slack so
// the WHOLE window — title bar included — stays fully on-screen and grabbable.
function rollWindowBox() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Usable area (inside the edge gutters, above the taskbar).
  const availW = Math.max(MIN_W, vw - EDGE * 2);
  const availH = Math.max(MIN_H, vh - TASKBAR_H - EDGE * 2);

  // Tasteful size caps: never wider/taller than 70% of the usable area, and
  // never beyond the absolute caps. Floors keep the window usable.
  const maxW = Math.max(MIN_W, Math.min(520, Math.round(availW * 0.7), availW));
  const maxH = Math.max(MIN_H, Math.min(440, Math.round(availH * 0.7), availH));
  const loW = Math.min(260, maxW);
  const loH = Math.min(200, maxH);

  let width = Math.round(loW + Math.random() * (maxW - loW));
  let height = Math.round(loH + Math.random() * (maxH - loH));

  // Final clamp so the rolled size can never exceed the available area
  // (covers tiny viewports where even the floor would overflow).
  width = Math.max(MIN_W, Math.min(width, availW));
  height = Math.max(MIN_H, Math.min(height, availH));

  // Random position within the slack left after placing the box. Clamp the
  // ranges so left/top never go negative (window fully on-screen even when
  // size == available area).
  const maxLeft = Math.max(EDGE, vw - width - EDGE);
  const maxTop = Math.max(EDGE, vh - TASKBAR_H - height - EDGE);
  const left = Math.round(EDGE + Math.random() * (maxLeft - EDGE));
  const top = Math.round(EDGE + Math.random() * (maxTop - EDGE));

  return { left, top, width, height };
}

// Apply a rolled box to a window element via inline left/top/width/height.
// These stay independent of the transform-based motion system and the
// left/top drag math.
function applyWindowBox(win, box) {
  win.style.left = box.left + 'px';
  win.style.top = box.top + 'px';
  win.style.width = box.width + 'px';
  win.style.height = box.height + 'px';
}

// openWindow({ title, appName, contentEl }) -> windowEl
function openWindow({ title, appName, contentEl }) {
  const desktop = document.getElementById('desktop');
  if (desktop === null) return null;
  const win = document.createElement('div');
  win.className = 'window';

  // Random on-screen position + varied random size (no grid/cascade).
  const box = rollWindowBox();
  applyWindowBox(win, box);

  // Per-window random skin.
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

  // Particle pop at the new window's center so opening feels alive. FX
  // self-guards reduced-motion; we still guard the global in case the
  // effects engine failed to load.
  if (window.FX && typeof window.FX.burst === 'function') {
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    window.FX.burst(cx, cy, { spread: 1 });
  }

  // Springy open animation; remove the class once it has played so the
  // transform is freed for dragging. Reduced-motion users skip it entirely.
  if (!prefersReducedMotion()) {
    win.classList.add('is-opening');
    win.addEventListener('animationend', function onOpen(e) {
      if (e.target !== win) return;
      win.classList.remove('is-opening');
      win.removeEventListener('animationend', onOpen);
    });
  }

  focusWindow(win);

  // Taskbar entry.
  const taskbar = document.getElementById('taskbar');
  const entry = document.createElement('button');
  entry.className = 'task-entry';
  entry.textContent = title;
  entry.addEventListener('click', () => focusWindow(win));
  taskbar.insertBefore(entry, taskbar.querySelector('.spacer'));

  // Focus on click anywhere in window.
  win.addEventListener('mousedown', () => focusWindow(win));

  // Close animates the window out, THEN tears down. removeDrag() must always
  // run so the window-level mousemove/mouseup listeners are cleaned up.
  const removeDrag = makeDraggable(win, bar);

  // Register in the open-window list so the chaos module can enumerate and
  // manipulate live windows. Removed in teardown so the list never leaks or
  // holds stale entries.
  const record = { el: win, appName, entry };
  openWindows.push(record);

  let closing = false;
  function teardown() {
    removeDrag();
    win.remove();
    entry.remove();
    const idx = openWindows.indexOf(record);
    if (idx !== -1) openWindows.splice(idx, 1);
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
    // drag math is untouched. Drop any leftover open animation class first so
    // the two transforms don't fight on the same element. Also drop is-rebox so
    // grabbing a window mid-teleport (chaos event) drags instantly, not sluggishly.
    win.classList.remove('is-opening');
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

// ── Open-window registry globals (consumed by the chaos module, later task) ──

// Returns a snapshot array of the live window records (each { el, appName, ... }).
// A copy so callers can't corrupt the internal list while iterating.
if (typeof window !== 'undefined') {
  window.getOpenWindows = function getOpenWindows() {
    return openWindows.slice();
  };

  // Re-roll a NEW random position + size for an already-open window and apply
  // it, keeping it fully on-screen + usable via the same clamping as on open.
  // Glides via the .is-rebox transition (jumps instantly under reduced motion,
  // where the CSS disables that transition). Safe to call with any element.
  window.randomizeWindowBox = function randomizeWindowBox(el) {
    if (!el || !el.style) return;
    const box = rollWindowBox();
    if (el._reboxTimer) { clearTimeout(el._reboxTimer); el._reboxTimer = null; }
    el.classList.add('is-rebox');
    applyWindowBox(el, box);
    // Drop the transition class after it plays so dragging stays instant. The
    // duration here matches the longest .is-rebox transition in css/base.css.
    // Store the handle so a rapid second call doesn't strip the class mid-glide.
    el._reboxTimer = window.setTimeout(function () {
      el.classList.remove('is-rebox');
      el._reboxTimer = null;
    }, 420);
    return box;
  };
}
