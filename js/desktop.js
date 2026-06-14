// desktop.js — boots shell: wallpaper, launcher icons, global theme shuffle.
// Each app declares its OWN fixed window size (w x h, in px). Sizes differ per
// app and are NOT random — every launch of an app yields the same size, so the
// thing that "randomizes" is WHERE the windows pack (a centered, no-overlap
// clump), never how big they are. Sizes are deliberately generous so the clump
// pulls focus toward the middle of the screen. The window layer clamps these
// down only if they exceed the viewport (minus taskbar).
const APPS = [
  { name: 'calculator', title: 'Calculator', size: { w: 340, h: 480 }, factory: () => makeCalculator() },
  { name: 'clock',      title: 'Clock',      size: { w: 380, h: 380 }, factory: () => makeClock() },
  { name: 'calendar',   title: 'Calendar',   size: { w: 360, h: 420 }, factory: () => makeCalendar() },
  { name: 'randomizer', title: 'Randomizer', size: { w: 380, h: 440 }, factory: () => makeRandomizer() },
  { name: 'soundboard', title: 'Sound Board', size: { w: 440, h: 440 }, factory: () => makeSoundboard() },
  { name: 'suggestionbox', title: 'Suggestion Box', size: { w: 360, h: 420 }, factory: () => makeSuggestionBox() },
  { name: 'quote', title: 'Quote of the Session', size: { w: 440, h: 300 }, factory: () => makeQuote() },
  { name: 'spinner', title: 'Spinner', size: { w: 460, h: 520 }, factory: () => makeSpinner() },
  { name: 'notepad', title: 'Notepad', size: { w: 420, h: 460 }, factory: () => makeNotepad() },
  { name: 'paint', title: 'Paint', size: { w: 460, h: 420 }, factory: () => makePaint() },
];

function rollWallpaper() {
  // The animated generative canvas (js/wallpaper.js) is the star. It rolls its
  // own palette + a random pattern type on every call and (re)starts a single
  // animation loop, cleanly tearing down any previous one.
  let p = null;
  if (typeof rollWallpaperCanvas === 'function') {
    p = rollWallpaperCanvas();
  }
  // Fallback / base wash under the canvas (also covers the first paint before
  // the canvas has drawn, and any environment without the wallpaper module).
  if (!p) {
    p = rollSkin('default').palette;
  }
  document.documentElement.style.setProperty(
    '--wall-bg',
    `linear-gradient(135deg, ${p.bg}, ${p.surface})`
  );
  document.documentElement.style.setProperty('--rand-accent', p.accent);
}

function buildIcons() {
  const icons = document.getElementById('icons');
  icons.innerHTML = '';
  for (const app of APPS) {
    const el = document.createElement('div');
    el.className = 'app-icon';
    const icon = makePixelIcon(app.name, { size: 40 });
    icon.classList.add('glyph');
    const label = document.createElement('span');
    label.className = 'app-label';
    label.textContent = app.title;
    el.append(icon, label);
    el.addEventListener('dblclick', () => launch(app));
    icons.appendChild(el);
  }
}

function launch(app) {
  let contentEl;
  try {
    contentEl = app.factory();
  } catch (err) {
    contentEl = document.createElement('div');
    contentEl.textContent = `${app.title} crashed: ${err.message}`;
  }
  openWindow({ title: app.title, appName: app.name, contentEl, size: app.size });
}

// Shuffle the desktop theme: reroll the wallpaper/accent FIRST (sets
// --rand-accent), then repick the pixel cursor so its sprite + the hover/grab
// state sprites change AND re-tint to the fresh accent. Without the cursor
// reroll the mouse sprite would keep its old shape/colour on every shuffle.
function shuffleTheme() {
  // 10% of shuffles drop into the Backrooms instead of a normal reroll.
  if (window.Backrooms && window.Backrooms.rollOnShuffle()) return;
  rollWallpaper();
  if (typeof window.rollCursor === 'function') window.rollCursor();
}

function buildShuffle() {
  const taskbar = document.getElementById('taskbar');
  const btn = document.createElement('button');
  btn.className = 'shuffle-btn';
  const icon = makePixelIcon('shuffle', { size: 18 });
  icon.classList.add('shuffle-btn-icon');
  const label = document.createElement('span');
  label.textContent = 'Shuffle theme';
  btn.append(icon, label);
  btn.addEventListener('click', shuffleTheme);
  taskbar.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', () => {
  rollWallpaper();
  buildIcons();
  buildShuffle();
});
