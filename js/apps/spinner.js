// spinner.js — The Customizable Spinner. winnerForAngle is pure geometry,
// exported for node --test; makeSpinner builds the canvas wheel + controls.
var DEFAULT_SLOTS = ['Pizza', 'Tacos', 'Sushi', 'Burgers', 'Salad', 'Pasta'];

// winnerForAngle(count, finalAngleDeg) -> winning slot index.
// Slots are laid out clockwise from the top; a fixed pointer sits at the top.
function winnerForAngle(count, finalAngleDeg) {
  if (count <= 1) return 0;
  var seg = 360 / count;
  var rot = ((finalAngleDeg % 360) + 360) % 360;     // normalize 0..360
  var atTop = ((360 - rot) % 360);                   // pre-rotation angle now on top
  var idx = Math.floor(atTop / seg) % count;
  return idx;
}

// makeSpinner() -> root element. Editable slots + a canvas wheel that spins to
// a random winner. Uses winnerForAngle() so the announced winner always matches
// where the wheel visually stops.
function makeSpinner() {
  const root = document.createElement('div');
  root.className = 'spinner-app';

  let slots = DEFAULT_SLOTS.slice();
  let angle = 0;        // current rotation in degrees
  let spinning = false;

  const wheelWrap = document.createElement('div');
  wheelWrap.className = 'spin-wheel-wrap';
  const pointer = document.createElement('div');
  pointer.className = 'spin-pointer';
  const canvas = document.createElement('canvas');
  canvas.width = 240; canvas.height = 240;
  canvas.className = 'spin-canvas';
  wheelWrap.append(pointer, canvas);

  const result = document.createElement('div');
  result.className = 'spin-result';
  result.textContent = 'Spin the wheel!';

  const spinBtn = document.createElement('button');
  spinBtn.type = 'button';
  spinBtn.className = 'spin-go';
  spinBtn.textContent = 'SPIN';

  const editor = document.createElement('textarea');
  editor.className = 'spin-editor';
  editor.rows = 5;
  editor.spellcheck = false;
  editor.value = slots.join('\n');
  editor.setAttribute('aria-label', 'One option per line');

  function readSlots() {
    const lines = editor.value.split('\n').map(s => s.trim()).filter(Boolean);
    slots = lines.length ? lines : ['(empty)'];
    draw();
  }
  editor.addEventListener('input', readSlots);

  function skinColors() {
    const cs = getComputedStyle(root);
    const a = cs.getPropertyValue('--rand-accent').trim() || '#ff4d9d';
    const b = cs.getPropertyValue('--rand-accent-2').trim() || '#28e0c8';
    const s = cs.getPropertyValue('--rand-surface').trim() || '#1d1933';
    return [a, b, s];
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    const n = slots.length;
    const cx = 120, cy = 120, r = 116;
    const cols = skinColors();
    ctx.clearRect(0, 0, 240, 240);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    const seg = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      // Draw clockwise from the top (-90deg) to match winnerForAngle.
      const start = -Math.PI / 2 + i * seg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, start + seg);
      ctx.closePath();
      ctx.fillStyle = cols[i % cols.length];
      ctx.fill();
      // Label.
      ctx.save();
      ctx.rotate(start + seg / 2);
      ctx.translate(r * 0.58, 0);
      ctx.fillStyle = '#fff';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slots[i].slice(0, 12), 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    result.textContent = '...';
    const reduced = window.FX && window.FX.reducedMotion && window.FX.reducedMotion();
    const turns = reduced ? 0 : 4 + Math.floor(Math.random() * 4);
    const extra = Math.random() * 360;
    const target = angle + turns * 360 + extra;
    const dur = reduced ? 150 : 3600;
    const start = performance.now();
    const from = angle;
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      angle = from + (target - from) * eased;
      draw();
      if (t < 1) { requestAnimationFrame(frame); }
      else {
        spinning = false;
        const idx = winnerForAngle(slots.length, angle);
        result.textContent = 'Winner: ' + slots[idx];
        if (window.FX) {
          const rc = wheelWrap.getBoundingClientRect();
          window.FX.burst(rc.left + rc.width / 2, rc.top + rc.height / 2, { count: 26 });
        }
      }
    }
    requestAnimationFrame(frame);
  }
  spinBtn.addEventListener('click', spin);

  root.append(wheelWrap, result, spinBtn, editor);
  // Initial draw deferred so the element is in the DOM (skin vars resolve).
  setTimeout(draw, 0);
  return root;
}

if (typeof window !== 'undefined') window.makeSpinner = makeSpinner;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { winnerForAngle: winnerForAngle, DEFAULT_SLOTS: DEFAULT_SLOTS };
}
