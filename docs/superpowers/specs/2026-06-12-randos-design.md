# RandOS — Design Spec

**Date:** 2026-06-12
**Project:** RandOS — a web desktop OS where nothing looks the same twice
**Context:** Hack Club "Stardust Challenge", Task 1 (webOS)

## Concept

A browser-based desktop OS whose defining twist is **randomization**: the desktop
shell, the wallpaper, and every app re-roll their appearance from curated design
pools on each open. The result reads as a mish-mash of designs that nonetheless
flow together — because every random combination is drawn from ingredients that
are individually guaranteed to look good.

## Goals & Non-Goals

### Goals (build 1)
- A working web desktop with multiple **draggable windows**.
- A **randomization engine** that re-skins each app every time it opens.
- Four apps: **Calculator, Clock, Calendar, Randomizer**.
- A **global theme shuffle** that re-rolls the whole desktop at once (incl. monochrome).
- A **devlog trail** accumulated as we hit milestones.
- A distinctive look that is clearly its own, not the guide's.
- **No password** — desktop loads straight in.

### Non-Goals (deferred to later devlogs)
- Quick-time-event mini-games (surprise click-the-targets games). Reserved as
  follow-up devlog material.
- Persistence of window positions or skins across reloads.
- User accounts, multiplayer, or a backend of any kind.

## Constraints
- **Vanilla HTML/CSS/JS.** No framework, no build step, no npm. Opens by
  double-clicking `index.html`; deploys as static files to GitHub Pages / Vercel.
- Must run with no login/password so anyone can test it.

## Architecture

```
RandOS/
├── index.html          # the desktop shell
├── css/
│   ├── base.css        # shell layout: desktop, taskbar, window chrome
│   └── tokens.css      # CSS custom properties the randomizer drives
├── js/
│   ├── randomizer.js   # THE ENGINE: rolls design tokens, returns a "skin"
│   ├── windows.js      # window manager: open/close/drag/focus/z-index
│   ├── desktop.js      # boots shell, wallpaper, taskbar, theme shuffle
│   └── apps/
│       ├── calculator.js
│       ├── clock.js
│       ├── calendar.js
│       └── randomizer-app.js   # coin / dice / 1-100 (the on-theme RNG)
└── devlogs/
    └── 01-*.md ...     # progress log (challenge requirement #3)
```

## Components

### Randomization engine — `randomizer.js` (the heart)
Exposes `rollSkin(appName)` returning an object of **design tokens** drawn from
curated pools:

| Token     | Pool examples                                            |
|-----------|----------------------------------------------------------|
| `palette` | harmonized color sets, including several monochrome sets |
| `font`    | curated heading + body font pairings                     |
| `radius`  | sharp / soft / pill                                      |
| `shadow`  | flat / subtle / heavy / neon-glow                        |
| `layout`  | per-app structural variant (e.g. calc: grid/stacked/compact) |
| `chrome`  | title-bar style: mac-dots / win-buttons / minimal / terminal-bar |

Tokens are applied via **CSS custom properties scoped to that window's element**,
so each open window is independently skinned. The engine re-rolls on **every
open** — no persistence — delivering "a random design every time you open them."
Because the pools are curated, every combination is readable and never broken.

**Interface:** `rollSkin(appName) -> { palette, font, radius, shadow, layout, chrome }`
plus a helper `applySkin(windowEl, skin)` that writes the CSS variables.

### Window manager — `windows.js`
- Opens an app into a draggable window (drag by title bar).
- Focus-to-front via z-index on click.
- Close button; taskbar entry per open window.
- Each window gets its own scoped skin. Independent of app internals — apps
  provide content, the manager provides the frame and drag/focus behavior.

**Interface:** `openWindow({ title, contentEl, appName }) -> windowHandle`.

### Desktop shell — `desktop.js`
- Boots the shell, renders a randomized wallpaper and the taskbar.
- Wires app-launcher icons to the window manager.
- Owns the **global theme shuffle** button (🎲): re-rolls wallpaper + global
  accent theme at once, including monochrome modes.

### Apps (`js/apps/*.js`)
Each app exposes a factory that returns a content element and calls the engine
on open. Apps are independent units — each can be understood and tested alone.

- **Calculator** — real arithmetic; random layout/skin each open.
- **Clock** — live time; random face each open (digital / analog / worded).
- **Calendar** — current-month grid; random skin each open.
- **Randomizer app** — coin flip, dice roll, random 1–100, with an animated
  reveal. This is the on-theme **"new feature the guide didn't list."**

## Data Flow

1. User clicks an app icon (desktop shell).
2. Shell asks the app factory for a content element.
3. App calls `rollSkin(appName)`; window manager wraps content in a window and
   `applySkin` writes scoped CSS variables.
4. Window is draggable/focusable; closing removes it and its taskbar entry.
5. The global 🎲 button re-rolls shell-level theme variables independently.

No backend, no storage. All state is in-memory for the session.

## Error Handling
- App factories are wrapped so a thrown error opens a small "app crashed" window
  rather than breaking the desktop.
- `rollSkin` always returns a valid skin (pools are non-empty); a defensive
  fallback skin exists if a pool is somehow empty.

## Testing
- Manual: open each app multiple times, confirm skin changes and stays readable;
  drag/focus/close multiple windows; trigger global shuffle.
- Lightweight checks: `rollSkin` returns all required token keys; calculator
  arithmetic correctness on a few cases.

## Challenge Requirements — Coverage
1. Draggable windows — window manager ✅
2. Own look — unique randomization concept ✅
3. 3+ devlogs — `devlogs/` filled across milestones ✅
4. New feature — Randomizer app + the randomization engine itself ✅
5. No password — desktop loads straight in ✅

## Implementation Notes
- Design-heavy generation (curated token pools, app skins, visual polish) will be
  delegated to **Fable 5** agents; architecture/plumbing stays on Opus.
