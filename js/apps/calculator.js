// calculator.js — the Calculator app factory.
//
// makeCalculator() builds and returns the calculator's root DOM element.
// The window manager wraps it in a freshly-skinned .window, so all styling
// lives in CSS and leans on the scoped --rand-* custom properties plus the
// .window's data-layout attribute (grid | stacked | compact) for structural
// variety. Every key carries a data-key attribute that CSS maps to a named
// grid-area, letting each layout rearrange the keypad without touching JS.
//
// Math is delegated to the global evalCalc() from js/calc-math.js.
// Plain script — no ES modules.

function makeCalculator() {
  const root = document.createElement('div');
  root.className = 'calc';

  // ── Display ────────────────────────────────────────────────────────────
  const display = document.createElement('div');
  display.className = 'calc-display';
  display.setAttribute('role', 'status');
  display.setAttribute('aria-live', 'polite');
  display.textContent = '0';
  root.appendChild(display);

  // ── State ──────────────────────────────────────────────────────────────
  let expr = '';

  function show(text) {
    display.textContent = text === '' ? '0' : text;
  }

  function press(key) {
    if (key === 'C') {
      expr = '';
      show('0');
    } else if (key === '=') {
      const result = evalCalc(expr);
      if (result === 'Error') {
        expr = '';
        show('Error');
      } else {
        expr = String(result); // keep calculating from the result
        show(expr);
      }
    } else {
      expr += key;
      show(expr);
    }
  }

  // ── Keypad ─────────────────────────────────────────────────────────────
  const KEYS = ['C', '/', '*', '-', '7', '8', '9', '+',
                '4', '5', '6', '1', '2', '3', '0', '.', '='];
  const OPS = new Set(['+', '-', '*', '/']);

  const pad = document.createElement('div');
  pad.className = 'calc-pad';
  for (const key of KEYS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calc-key';
    btn.textContent = key;
    btn.dataset.key = key;
    if (OPS.has(key)) btn.classList.add('calc-key-op');
    else if (key === '=') btn.classList.add('calc-key-eq');
    else if (key === 'C') btn.classList.add('calc-key-clear');
    btn.addEventListener('click', () => press(key));
    pad.appendChild(btn);
  }
  root.appendChild(pad);

  return root;
}
