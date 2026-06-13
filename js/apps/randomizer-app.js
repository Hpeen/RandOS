// randomizer-app.js — the Randomizer app factory: RandOS's on-theme signature.
//
// makeRandomizer() builds and returns the randomizer's root DOM element. Three
// actions — Coin flip (Heads/Tails), Dice roll (1–6), Random 1–100 — each feed
// a shared result area that plays a brief, satisfying reveal animation on every
// outcome (even a repeat value: we yank the animation class, force a reflow,
// then re-add it). The window manager wraps us in a freshly-skinned .window and
// assigns data-layout (cards | stack) AFTER this factory returns, so the layout
// is resolved lazily inside render() and the arrangement is rebuilt only when
// the layout actually changes. No interval; the only timer is a guarded
// setTimeout(0) re-render after attach, harmless if the window is gone.
//
// Plain script — no ES modules, no external libraries. DOM built with
// createElement/textContent only (never innerHTML with dynamic values).

function makeRandomizer() {
  const root = document.createElement('div');
  root.className = 'rng';

  const DICE_FACES = '⚀⚁⚂⚃⚄⚅'; // index 0–5 maps to a roll of 1–6

  // The three actions. roll() returns { value, glyph } — value is the headline
  // text, glyph an optional oversized symbol (the die pip face).
  const ACTIONS = [
    {
      label: 'Coin', glyph: '🪙', name: 'Flip',
      roll() {
        const heads = Math.random() < 0.5;
        return { value: heads ? 'Heads' : 'Tails', glyph: heads ? '👑' : '🪙' };
      }
    },
    {
      label: 'Dice', glyph: '🎲', name: 'Roll',
      roll() {
        const n = Math.floor(Math.random() * 6); // 0–5, never out of pip range
        return { value: String(n + 1), glyph: DICE_FACES[n] };
      }
    },
    {
      label: '1–100', glyph: '🔢', name: 'Pick',
      roll() {
        const n = 1 + Math.floor(Math.random() * 100); // 1–100 inclusive
        return { value: String(n), glyph: null };
      }
    }
  ];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ── Shared result area: a contextual tag plus the big headline outcome ────
  function buildResult() {
    const wrap = el('div', 'rng-result');
    const tag = el('div', 'rng-result-tag', 'Tap an action');
    const display = el('div', 'rng-result-display');
    const glyph = el('div', 'rng-result-glyph');
    const value = el('div', 'rng-result-value', '?');
    display.append(glyph, value);
    wrap.append(tag, display);

    function show(action, outcome) {
      tag.textContent = action.label;
      if (outcome.glyph) {
        glyph.textContent = outcome.glyph;
        glyph.classList.remove('is-hidden');
      } else {
        glyph.textContent = '';
        glyph.classList.add('is-hidden');
      }
      value.textContent = outcome.value;

      // Re-trigger the reveal even for a repeated value: drop the class, force
      // a synchronous reflow, then re-add so the @keyframes restarts.
      display.classList.remove('is-revealing');
      void display.offsetWidth; // eslint-disable-line no-unused-expressions
      display.classList.add('is-revealing');
    }

    return { el: wrap, show };
  }

  // ── Action buttons: shared between layouts; only their container differs ──
  function buildButtons(result) {
    return ACTIONS.map((action) => {
      const btn = el('button', 'rng-action');
      btn.type = 'button';
      const glyph = el('span', 'rng-action-glyph', action.glyph);
      const label = el('span', 'rng-action-label', action.label);
      const name = el('span', 'rng-action-name', action.name);
      const text = el('span', 'rng-action-text');
      text.append(label, name);
      btn.append(glyph, text);
      btn.addEventListener('click', () => result.show(action, action.roll()));
      return btn;
    });
  }

  // ── Shared layout builder: result up top, actions below; className sets the
  //    wrapper class (rng-cards for horizontal row, rng-stack for vertical) ───
  function buildLayout(className) {
    const face = el('div', className);
    const result = buildResult();
    const actions = el('div', 'rng-actions');
    for (const btn of buildButtons(result)) actions.appendChild(btn);
    face.append(result.el, actions);
    return face;
  }

  // ── Render: lazy layout resolution + rebuild-on-change ────────────────────
  let currentLayout = null;

  function render() {
    const layout = root.closest('.window')?.dataset.layout || 'cards';
    if (layout === currentLayout) return;
    currentLayout = layout;
    root.replaceChildren(buildLayout(layout === 'stack' ? 'rng-stack' : 'rng-cards'));
  }

  // First paint immediately (defaults to cards while detached), then again once
  // the window manager has attached us and rolled the real layout.
  render();
  setTimeout(() => {
    if (document.body.contains(root)) render();
  }, 0);

  return root;
}
