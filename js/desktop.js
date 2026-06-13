// desktop.js — boots shell: wallpaper, launcher icons, global theme shuffle.
const APPS = [
  { name: 'calculator', title: 'Calculator', factory: () => makeCalculator() },
  { name: 'clock',      title: 'Clock',      factory: () => makeClock() },
  { name: 'calendar',   title: 'Calendar',   factory: () => makeCalendar() },
  { name: 'randomizer', title: 'Randomizer', factory: () => makeRandomizer() }
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
  openWindow({ title: app.title, appName: app.name, contentEl });
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
  btn.addEventListener('click', rollWallpaper);
  taskbar.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', () => {
  rollWallpaper();
  buildIcons();
  buildShuffle();
});
