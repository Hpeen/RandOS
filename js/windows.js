// windows.js — opens app content into draggable, focusable windows.
let zCounter = 100;
let offsetSeed = 0;

// openWindow({ title, appName, contentEl }) -> windowEl
function openWindow({ title, appName, contentEl }) {
  const desktop = document.getElementById('desktop');
  if (desktop === null) return null;
  const win = document.createElement('div');
  win.className = 'window';

  // Cascade new windows so they don't stack exactly.
  const slot = offsetSeed % 6;
  offsetSeed++;
  win.style.left = (80 + slot * 28) + 'px';
  win.style.top  = (70 + slot * 24) + 'px';

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
  let closing = false;
  function teardown() {
    removeDrag();
    win.remove();
    entry.remove();
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
    // the two transforms don't fight on the same element.
    win.classList.remove('is-opening');
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
