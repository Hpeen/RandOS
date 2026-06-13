// paint.js — chaotic Paint. PALETTE + randomBrush exported for node --test;
// makePaint builds the canvas. The brush color/size randomizes on you and stray
// pixels appear. Plain script + CommonJS guard.
var PALETTE = ['#ff4d9d', '#28e0c8', '#ffd166', '#9aff3c', '#7cc4ff', '#ffffff', '#ff5234'];

// randomBrush(rng?) -> { color, size }. size is an integer 1..4.
function randomBrush(rng) {
  var r = (typeof rng === 'function' ? rng : Math.random);
  var ci = Math.floor(r() * PALETTE.length);
  if (ci >= PALETTE.length) ci = PALETTE.length - 1;
  var size = 1 + Math.floor(r() * 4); // 1..4
  if (size > 4) size = 4;
  return { color: PALETTE[ci], size: size };
}

// makePaint() -> root element. A pixel grid you draw on; the brush color/size
// randomizes periodically and stray pixels appear. Clear button resets. Timers
// self-clear when the window is removed.
function makePaint() {
  const root = document.createElement('div');
  root.className = 'paint-app';

  const CELL = 12, COLS = 28, ROWS = 22;
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL; canvas.height = ROWS * CELL;
  canvas.className = 'paint-canvas';
  const ctx = canvas.getContext('2d');

  const bar = document.createElement('div');
  bar.className = 'paint-bar';
  const swatch = document.createElement('span');
  swatch.className = 'paint-swatch';
  const info = document.createElement('span');
  info.className = 'paint-info';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'paint-clear';
  clearBtn.textContent = 'Clear';
  bar.append(swatch, info, clearBtn);
  root.append(bar, canvas);

  let brush = randomBrush(Math.random);
  function showBrush() {
    swatch.style.background = brush.color;
    info.textContent = 'size ' + brush.size;
  }
  showBrush();

  function paintCell(px_, py, b) {
    ctx.fillStyle = b.color;
    const half = b.size - 1;   // size 1->1x1, 2->3x3, 3->5x5, 4->7x7
    for (let dx = -half; dx <= half; dx++) {
      for (let dy = -half; dy <= half; dy++) {
        ctx.fillRect((px_ + dx) * CELL, (py + dy) * CELL, CELL, CELL);
      }
    }
  }
  function cellFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / CELL),
      y: Math.floor((e.clientY - r.top) / CELL)
    };
  }

  let drawing = false;
  canvas.addEventListener('mousedown', (e) => { drawing = true; const c = cellFromEvent(e); paintCell(c.x, c.y, brush); });
  canvas.addEventListener('mousemove', (e) => { if (!drawing) return; const c = cellFromEvent(e); paintCell(c.x, c.y, brush); });
  function onWindowMouseUp() {
    drawing = false;
    // The window manager just calls win.remove() on close (no teardown hook),
    // so self-remove this window-level listener once our canvas is detached.
    if (!canvas.isConnected) window.removeEventListener('mouseup', onWindowMouseUp);
  }
  window.addEventListener('mouseup', onWindowMouseUp);
  clearBtn.addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

  function alive() { return document.body && document.body.contains(root); }
  function reduced() { return window.FX && window.FX.reducedMotion && window.FX.reducedMotion(); }

  // Chaos: rebrush on you periodically.
  const brushTimer = setInterval(() => {
    if (!alive()) { clearInterval(brushTimer); return; }
    brush = randomBrush(Math.random);
    showBrush();
  }, 3500);

  // Chaos: a stray pixel appears somewhere (rarer under reduced motion).
  const strayTimer = setInterval(() => {
    if (!alive()) { clearInterval(strayTimer); return; }
    if (reduced() && Math.random() < 0.7) return;
    const sx = Math.floor(Math.random() * COLS);
    const sy = Math.floor(Math.random() * ROWS);
    paintCell(sx, sy, randomBrush(Math.random));
  }, 2600);

  return root;
}

if (typeof window !== 'undefined') window.makePaint = makePaint;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PALETTE: PALETTE, randomBrush: randomBrush };
}
