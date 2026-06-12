// windows.js — opens app content into draggable, focusable windows.
let zCounter = 100;
let offsetSeed = 0;

// openWindow({ title, glyph, appName, contentEl }) -> windowEl
function openWindow({ title, glyph, appName, contentEl }) {
  const desktop = document.getElementById('desktop');
  const win = document.createElement('div');
  win.className = 'window';

  // Cascade new windows so they don't stack exactly.
  const base = 80 + (offsetSeed % 6) * 28;
  offsetSeed++;
  win.style.left = base + 'px';
  win.style.top = (70 + (offsetSeed % 6) * 24) + 'px';

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
  close.addEventListener('click', (e) => {
    e.stopPropagation();
    win.remove();
    entry.remove();
  });

  makeDraggable(win, bar);
  return win;
}

function focusWindow(win) {
  win.style.zIndex = String(++zCounter);
}

function makeDraggable(win, handle) {
  let dragging = false, startX = 0, startY = 0, originX = 0, originY = 0;
  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    originX = win.offsetLeft; originY = win.offsetTop;
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    win.style.left = (originX + e.clientX - startX) + 'px';
    win.style.top  = (originY + e.clientY - startY) + 'px';
  });
  window.addEventListener('mouseup', () => { dragging = false; });
}
