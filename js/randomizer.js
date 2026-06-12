// randomizer.js — THE ENGINE of RandOS.
//
// Every time an app window opens, rollSkin() deals it a fresh hand of design
// tokens drawn from the curated pools below: a color palette, a font pairing,
// a corner radius, a shadow style, a title-bar chrome, and a per-app layout
// variant. The pools are hand-picked so that ANY combination reads well —
// "random" never means "broken". applySkin() writes the result onto a window
// element as scoped CSS custom properties + data-attributes, so every open
// window is independently skinned.
//
// Plain script (no ES modules) — top-level declarations become browser
// globals; a CommonJS guard at the bottom lets Node tests require() it.

const POOLS = {
  // ── Palettes ──────────────────────────────────────────────────────────
  // Each: { name, bg, surface, text, accent, accent2, mono }
  // Rule of the pool: `text` must hold strong contrast on BOTH `bg` and
  // `surface`. Accents are decorative — never the only thing carrying text.
  palette: [
    // — vivid darks —
    { name: 'Midnight Arcade',  bg: '#12101f', surface: '#1d1933', text: '#f2effc', accent: '#ff4d9d', accent2: '#28e0c8', mono: false },
    { name: 'Sunset Boulevard', bg: '#2b1430', surface: '#3d1d45', text: '#ffe9e0', accent: '#ff7a45', accent2: '#ffc53d', mono: false },
    { name: 'Deep Sea',         bg: '#04222e', surface: '#0a3445', text: '#dff6ff', accent: '#2fd4ff', accent2: '#ffd166', mono: false },
    { name: 'Cyber Lime',       bg: '#0f140f', surface: '#1a241a', text: '#eaffe8', accent: '#9aff3c', accent2: '#ff5ce1', mono: false },
    { name: 'Royal Plum',       bg: '#221033', surface: '#331b4b', text: '#f4eaff', accent: '#c084fc', accent2: '#fbbf24', mono: false },
    { name: 'Magma',            bg: '#1c0b0b', surface: '#2c1212', text: '#ffeae2', accent: '#ff5234', accent2: '#ffb02e', mono: false },

    // — vivid lights —
    { name: 'Peach Soda',       bg: '#fff1e6', surface: '#ffffff', text: '#4a2c2a', accent: '#ff6b6b', accent2: '#12b5a5', mono: false },
    { name: 'Mint Cream',       bg: '#e8f7ef', surface: '#ffffff', text: '#14443b', accent: '#0fa97e', accent2: '#ff8552', mono: false },
    { name: 'Powder Day',       bg: '#eaf2fb', surface: '#ffffff', text: '#1f3a5f', accent: '#3b82f6', accent2: '#ec6aa9', mono: false },
    { name: 'Lemon Press',      bg: '#fdf3cf', surface: '#fffdf2', text: '#4d3f0e', accent: '#d99a06', accent2: '#6d28d9', mono: false },
    { name: 'Bubblegum Pop',    bg: '#ffe4f1', surface: '#fff7fb', text: '#5d1f43', accent: '#e0408a', accent2: '#7c5cd6', mono: false },
    { name: 'Terracotta',       bg: '#f3e9dc', surface: '#fbf5ec', text: '#43302b', accent: '#c1542e', accent2: '#5f7c61', mono: false },

    // — monochrome / single-hue —
    { name: 'Noir',             bg: '#0d0d0d', surface: '#1b1b1b', text: '#f5f5f5', accent: '#ffffff', accent2: '#8c8c8c', mono: true  },
    { name: 'Paper',            bg: '#f4f1ea', surface: '#fffefa', text: '#2b2926', accent: '#1a1a1a', accent2: '#8a857c', mono: true  },
    { name: 'Terminal Green',   bg: '#031108', surface: '#07210f', text: '#c8ffd4', accent: '#33ff77', accent2: '#11a04d', mono: true  },
    { name: 'Graphite',         bg: '#23272c', surface: '#2e343b', text: '#e8ebee', accent: '#aeb7c0', accent2: '#6b7681', mono: true  },
    { name: 'Amber CRT',        bg: '#160d02', surface: '#241604', text: '#ffd9a0', accent: '#ffb347', accent2: '#b3741f', mono: true  },
    { name: 'Blueprint',        bg: '#0a2540', surface: '#103258', text: '#dbeafe', accent: '#7cc4ff', accent2: '#4a86b8', mono: true  }
  ],

  // ── Font pairings ─────────────────────────────────────────────────────
  // Each: { head, body } — web-safe stacks only, no external fonts.
  // A display-ish heading voice over a body that stays readable at 13-15px.
  font: [
    { // quiet, modern OS default
      head: "'Segoe UI', system-ui, sans-serif",
      body: "system-ui, 'Segoe UI', sans-serif" },
    { // editorial: serif headline, clean sans body
      head: "Georgia, 'Times New Roman', serif",
      body: "'Segoe UI', system-ui, sans-serif" },
    { // brutalist poster: heavy slab head, plain workhorse body
      head: "'Arial Black', Impact, sans-serif",
      body: "Verdana, Geneva, sans-serif" },
    { // typewriter / zine
      head: "'Courier New', Courier, monospace",
      body: "'Courier New', Courier, monospace" },
    { // old print: classic double-serif
      head: "'Times New Roman', Times, serif",
      body: "Georgia, serif" },
    { // playful nineties shareware
      head: "'Comic Sans MS', 'Trebuchet MS', cursive",
      body: "'Trebuchet MS', Verdana, sans-serif" },
    { // hacker terminal
      head: "Consolas, 'Courier New', monospace",
      body: "Consolas, 'Courier New', monospace" },
    { // humanist, friendly rounded feel
      head: "'Trebuchet MS', 'Segoe UI', sans-serif",
      body: "Verdana, Geneva, sans-serif" },
    { // literary lab notes: serif voice, mono data
      head: "Georgia, serif",
      body: "'Courier New', Courier, monospace" },
    { // loud display sans over neutral system body
      head: "Impact, 'Arial Black', sans-serif",
      body: "'Segoe UI', system-ui, sans-serif" }
  ],

  // ── Corner radius: razor-sharp → near-pill ────────────────────────────
  radius: ['0px', '3px', '8px', '14px', '22px', '32px'],

  // ── Shadow styles ─────────────────────────────────────────────────────
  shadow: [
    'none',                                                        // flat
    '0 2px 8px rgba(0,0,0,0.18)',                                  // soft hover
    '0 12px 32px rgba(0,0,0,0.30)',                                // floaty
    '0 1px 2px rgba(0,0,0,0.20), 0 18px 44px rgba(0,0,0,0.45)',    // deep layered
    '8px 8px 0 rgba(0,0,0,0.85)',                                  // hard brutalist
    '6px 6px 0 var(--rand-accent)',                                // accent offset print
    '0 0 16px var(--rand-accent), 0 8px 28px rgba(0,0,0,0.40)'     // neon glow
  ],

  // ── Title-bar chrome variants (styled in CSS via [data-chrome=…]) ─────
  chrome: ['mac-dots', 'win-buttons', 'minimal', 'terminal-bar'],

  // ── Per-app structural layout variants ────────────────────────────────
  layout: {
    calculator: ['grid', 'stacked', 'compact'],
    clock:      ['digital', 'analog', 'worded'],
    calendar:   ['grid', 'list'],
    randomizer: ['cards', 'stack'],
    default:    ['default']
  }
};

const REQUIRED_TOKENS = ['palette', 'font', 'radius', 'shadow', 'chrome', 'layout'];

// Pick one entry from an array, uniformly at random.
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Roll a complete skin for the named app. Layout comes from the app's own
// variant list when one exists, otherwise from the default pool.
function rollSkin(appName) {
  const layoutPool = POOLS.layout[appName] || POOLS.layout.default;
  return {
    palette: pick(POOLS.palette),
    font:    pick(POOLS.font),
    radius:  pick(POOLS.radius),
    shadow:  pick(POOLS.shadow),
    chrome:  pick(POOLS.chrome),
    layout:  pick(layoutPool)
  };
}

// Write a rolled skin onto an element as scoped custom properties and
// data-attributes. Everything inside the element inherits the skin.
function applySkin(el, skin) {
  el.style.setProperty('--rand-bg',        skin.palette.bg);
  el.style.setProperty('--rand-surface',   skin.palette.surface);
  el.style.setProperty('--rand-text',      skin.palette.text);
  el.style.setProperty('--rand-accent',    skin.palette.accent);
  el.style.setProperty('--rand-accent-2',  skin.palette.accent2);
  el.style.setProperty('--rand-font-head', skin.font.head);
  el.style.setProperty('--rand-font-body', skin.font.body);
  el.style.setProperty('--rand-radius',    skin.radius);
  el.style.setProperty('--rand-shadow',    skin.shadow);
  el.dataset.chrome = skin.chrome;
  el.dataset.layout = skin.layout;
}

// Dual export: CommonJS for Node tests; top-level declarations already serve
// as globals when loaded via <script src> in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rollSkin, applySkin, POOLS, REQUIRED_TOKENS };
}
