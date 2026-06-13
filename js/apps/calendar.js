// calendar.js — the Calendar app factory.
//
// makeCalendar() builds and returns the calendar's root DOM element. The
// window manager wraps it in a freshly-skinned .window and assigns
// data-layout (grid | list) AFTER this factory returns — so the layout is
// resolved lazily inside render(), never cached at construction. The
// calendar shows the current month statically, so there is no interval:
// it renders once immediately (defaulting to grid while detached) and once
// more on a setTimeout(0) after the window manager has attached it.
//
// Plain script — no ES modules, no external libraries.

function makeCalendar() {
  const root = document.createElement('div');
  root.className = 'cal';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November',
                  'December'];
  const DOW_MIN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Snapshot "now" once — the whole render describes a single month.
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDow = new Date(year, month, 1).getDay();       // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ── Grid layout: classic 7-column month matrix ──────────────────────────
  function buildGrid() {
    const face = el('div', 'cal-grid');

    const head = el('div', 'cal-grid-head');
    head.append(
      el('span', 'cal-grid-month', MONTHS[month]),
      el('span', 'cal-grid-year', String(year))
    );

    const dowRow = el('div', 'cal-dow-row');
    for (const d of DOW_MIN) dowRow.appendChild(el('span', 'cal-dow', d));

    const cells = el('div', 'cal-cells');
    for (let i = 0; i < firstDow; i++) {
      cells.appendChild(el('span', 'cal-cell cal-cell-blank'));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = (firstDow + day - 1) % 7;
      let cls = 'cal-cell';
      if (dow === 0 || dow === 6) cls += ' cal-cell-weekend';
      if (day === today) cls += ' cal-cell-today';
      cells.appendChild(el('span', cls, String(day)));
    }

    face.append(head, dowRow, cells);
    return face;
  }

  // ── List layout: scrollable agenda column, one row per day ──────────────
  function buildList() {
    const face = el('div', 'cal-list');

    const head = el('div', 'cal-list-head');
    head.append(
      el('span', 'cal-list-month', MONTHS[month]),
      el('span', 'cal-list-year', String(year))
    );

    const days = el('div', 'cal-list-days');
    let todayRow = null;
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = (firstDow + day - 1) % 7;
      let cls = 'cal-row';
      if (dow === 0 || dow === 6) cls += ' cal-row-weekend';
      if (dow === 6) cls += ' cal-row-week-end'; // breathing room after Sat
      if (day === today) cls += ' cal-row-today';

      const row = el('div', cls);
      row.append(
        el('span', 'cal-row-dow', DOW_SHORT[dow]),
        el('span', 'cal-row-num', String(day))
      );
      if (day === today) {
        row.appendChild(el('span', 'cal-today-tag', 'today'));
        todayRow = row;
      }
      days.appendChild(row);
    }

    face.append(head, days);

    // Once laid out, center today's row in the scrollable column.
    requestAnimationFrame(() => {
      if (todayRow && days.scrollHeight > days.clientHeight) {
        const daysRect = days.getBoundingClientRect();
        const rowRect  = todayRow.getBoundingClientRect();
        days.scrollTop += rowRect.top - daysRect.top - (daysRect.height - rowRect.height) / 2;
      }
    });
    return face;
  }

  // ── Render: lazy layout resolution + rebuild-on-change ──────────────────
  let currentLayout = null;

  function render() {
    const layout = root.closest('.window')?.dataset.layout || 'grid';
    if (layout === currentLayout) return;
    currentLayout = layout;
    root.replaceChildren(layout === 'list' ? buildList() : buildGrid());
  }

  // First paint immediately (defaults to grid while detached), then again
  // once the window manager has attached us and rolled the real layout.
  render();
  setTimeout(() => {
    if (document.body.contains(root)) render();
  }, 0);

  return root;
}
