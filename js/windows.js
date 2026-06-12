// windows.js — opens app content into draggable, focusable windows.
let zCounter = 100;
let offsetSeed = 0;

// openWindow({ title, glyph, appName, contentEl }) -> windowEl
function openWindow({ title, glyph, appName, contentEl }) {
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
  bar.innerHTML = `<span class="title-text">${glyph ? glyph + ' ' : ''}${title}</span>`;
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

  // Close removes window + taskbar entry.
  const removeDrag = makeDraggable(win, bar);
  close.addEventListener('click', (e) => {
    e.stopPropagation();
    removeDrag();
    win.remove();
    entry.remove();
  });
  return win;
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
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    win.style.left = (originX + e.clientX - startX) + 'px';
    win.style.top  = (originY + e.clientY - startY) + 'px';
  }
  function onUp() { dragging = false; }
  handle.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  return function cleanup() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
}
