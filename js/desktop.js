// desktop.js — boots shell: wallpaper, launcher icons, global theme shuffle.
const APPS = [
  { name: 'calculator', title: 'Calculator', glyph: '🧮', factory: () => makeCalculator() },
  { name: 'clock',      title: 'Clock',      glyph: '🕐', factory: () => makeClock() },
  { name: 'calendar',   title: 'Calendar',   glyph: '📅', factory: () => makeCalendar() },
  { name: 'randomizer', title: 'Randomizer', glyph: '🎲', factory: () => makeRandomizer() }
];

function rollWallpaper() {
  const skin = rollSkin('default');
  const p = skin.palette;
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
    el.innerHTML = `<span class="glyph">${app.glyph}</span>${app.title}`;
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
  openWindow({ title: app.title, glyph: app.glyph, appName: app.name, contentEl });
}

function buildShuffle() {
  const taskbar = document.getElementById('taskbar');
  const btn = document.createElement('button');
  btn.className = 'shuffle-btn';
  btn.textContent = '🎲 Shuffle theme';
  btn.addEventListener('click', rollWallpaper);
  taskbar.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', () => {
  rollWallpaper();
  buildIcons();
  buildShuffle();
});
