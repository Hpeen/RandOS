// clock.js — the Clock app factory.
//
// makeClock() builds and returns the clock's root DOM element. The window
// manager wraps it in a freshly-skinned .window and assigns data-layout
// (digital | analog | worded) AFTER this factory returns — so the layout is
// resolved lazily inside render(), never cached at construction. The face is
// (re)built only when the layout actually changes; per-second ticks just
// update text and hand transforms in place. The interval self-destructs when
// the window is closed (root leaves the document).
//
// Plain script — no ES modules, no external libraries.

function makeClock() {
  const root = document.createElement('div');
  root.className = 'clock';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const HOUR_WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five',
                      'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  const MIN_WORDS = { 5: 'five', 10: 'ten', 15: 'quarter',
                      20: 'twenty', 25: 'twenty-five', 30: 'half' };

  function pad2(n) { return String(n).padStart(2, '0'); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  }

  // ── Digital face: big segment-style HH:MM:SS on an inset panel ──────────
  function buildDigital() {
    const face = el('div', 'clock-face clock-digital');
    const time = el('div', 'clock-digital-time');
    const hh = el('span', 'clock-digit');
    const c1 = el('span', 'clock-colon', ':');
    const mm = el('span', 'clock-digit');
    const c2 = el('span', 'clock-colon', ':');
    const ss = el('span', 'clock-digit clock-digit-sec');
    time.append(hh, c1, mm, c2, ss);
    const meta = el('div', 'clock-digital-meta');
    face.append(time, meta);

    return {
      el: face,
      update(now) {
        hh.textContent = pad2(now.getHours());
        mm.textContent = pad2(now.getMinutes());
        ss.textContent = pad2(now.getSeconds());
        const dim = now.getSeconds() % 2 === 1;
        c1.classList.toggle('is-dim', dim);
        c2.classList.toggle('is-dim', dim);
        meta.textContent =
          DAYS[now.getDay()] + ' · ' +
          MONTHS[now.getMonth()] + ' ' + now.getDate();
      }
    };
  }

  // ── Analog face: SVG dial built once; only hand transforms change ───────
  function buildAnalog() {
    const face = el('div', 'clock-face clock-analog');
    const svg = svgEl('svg', {
      viewBox: '0 0 200 200',
      class: 'clock-analog-svg',
      role: 'img',
      'aria-label': 'Analog clock'
    });

    // Dial plate + rim.
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 95, class: 'clock-dial' }));

    // 60 ticks: every 5th is a long accent tick.
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      svg.appendChild(svgEl('line', {
        x1: 100, y1: 11,
        x2: 100, y2: major ? 22 : 16.5,
        class: major ? 'clock-tick clock-tick-major' : 'clock-tick',
        transform: `rotate(${i * 6} 100 100)`
      }));
    }

    // Cardinal numerals in the heading face.
    const numerals = [['12', 100, 34], ['3', 166, 100], ['6', 100, 166], ['9', 34, 100]];
    for (const [label, x, y] of numerals) {
      const t = svgEl('text', {
        x, y, class: 'clock-numeral',
        'text-anchor': 'middle', 'dominant-baseline': 'central'
      });
      t.textContent = label;
      svg.appendChild(t);
    }

    // Hands (rounded lines; tails extend past the hub as counterweights).
    const hourHand = svgEl('line', { x1: 100, y1: 110, x2: 100, y2: 58, class: 'clock-hand clock-hand-hour' });
    const minHand  = svgEl('line', { x1: 100, y1: 112, x2: 100, y2: 33, class: 'clock-hand clock-hand-min' });
    const secHand  = svgEl('line', { x1: 100, y1: 120, x2: 100, y2: 26, class: 'clock-hand clock-hand-sec' });
    svg.append(hourHand, minHand, secHand);

    // Hub.
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 5.5, class: 'clock-hub' }));
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 2.2, class: 'clock-hub-pin' }));

    face.appendChild(svg);

    return {
      el: face,
      update(now) {
        const h = now.getHours() % 12;
        const m = now.getMinutes();
        const s = now.getSeconds();
        hourHand.setAttribute('transform', `rotate(${h * 30 + m * 0.5 + s / 120} 100 100)`);
        minHand.setAttribute('transform', `rotate(${m * 6 + s * 0.1} 100 100)`);
        secHand.setAttribute('transform', `rotate(${s * 6} 100 100)`);
      }
    };
  }

  // ── Worded face: "it's nearly twenty past three" + precise footnote ─────
  function dayPart(h) {
    if (h < 5) return 'at night';
    if (h < 12) return 'in the morning';
    if (h < 17) return 'in the afternoon';
    if (h < 21) return 'in the evening';
    return 'at night';
  }

  function buildWorded() {
    const face = el('div', 'clock-face clock-worded');
    const pre = el('div', 'clock-worded-pre');
    const main = el('div', 'clock-worded-main');
    const sub = el('div', 'clock-worded-sub');
    face.append(pre, main, sub);

    return {
      el: face,
      update(now) {
        let h = now.getHours();
        const m = now.getMinutes();

        // Snap to the nearest five minutes, with a friendly qualifier.
        const rem = m % 5;
        let base;
        if (rem === 0)      { pre.textContent = "it's";           base = m; }
        else if (rem <= 2)  { pre.textContent = "it's just gone"; base = m - rem; }
        else                { pre.textContent = "it's nearly";    base = m - rem + 5; }
        if (base === 60) { base = 0; h += 1; }

        const hourFor = base > 30 ? h + 1 : h;
        const hourWord = HOUR_WORDS[((hourFor % 12) + 12) % 12];
        const hourSpan = el('span', 'clock-worded-hour', hourWord);

        main.replaceChildren();
        if (base === 0) {
          main.append(hourSpan, document.createTextNode(' o’clock'));
        } else if (base <= 30) {
          main.append(document.createTextNode(MIN_WORDS[base] + ' past '), hourSpan);
        } else {
          main.append(document.createTextNode(MIN_WORDS[60 - base] + ' to '), hourSpan);
        }

        const realH = now.getHours();
        const h12 = realH % 12 === 0 ? 12 : realH % 12;
        sub.textContent =
          dayPart(realH) + ' · ' +
          h12 + ':' + pad2(m) + ' ' + (realH < 12 ? 'AM' : 'PM');
      }
    };
  }

  // ── Render loop: lazy layout resolution + rebuild-on-change ─────────────
  const BUILDERS = { digital: buildDigital, analog: buildAnalog, worded: buildWorded };
  let currentLayout = null;
  let currentFace = null;

  function render(now) {
    const layout = root.closest('.window')?.dataset.layout || 'digital';
    if (layout !== currentLayout) {
      currentLayout = layout;
      currentFace = (BUILDERS[layout] || BUILDERS.digital)();
      root.replaceChildren(currentFace.el);
    }
    currentFace.update(now);
  }

  const timer = setInterval(() => {
    // Self-cleanup: stop ticking once the window has been closed.
    if (!document.body.contains(root)) { clearInterval(timer); return; }
    render(new Date());
  }, 1000);

  // First paint: render immediately (defaults to digital while detached),
  // then again once the window manager has attached us, so the face matches
  // the rolled data-layout without waiting a full second.
  render(new Date());
  setTimeout(() => {
    if (document.body.contains(root)) render(new Date());
  }, 0);

  return root;
}
