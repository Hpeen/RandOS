# RandOS

A web desktop where nothing looks the same twice. Every app re-rolls its design
from curated pools each time you open it. Palettes, fonts, layouts, and
hand-built animated pixel-art icons that vary on every render. It may be
colorful, occasionally monochrome, but it's always readable (contrast is
guaranteed, not hoped for).

It's also a little mischievous. Leave it running and it'll start messing with
you.

**Live:** https://hpeen.github.io/RandOS

## Run locally

Double-click `index.html`, or serve the folder (`npx serve`, or VS Code Live
Server). No build step, no install, no backend.

## Apps

- **Calculator**, **Clock**, and **Calendar** — the everyday basics.
- **Randomizer** — on-theme coin flip, dice, and 1–100 picker.
- **Notepad** — types fine until it quietly "autocorrects" a word into a typo
  and restyles random words. There's a Calm toggle if you'd rather it behave.
- **Paint** — a canvas where the brush color and size drift on you mid-stroke
  and stray pixels creep in.
- **Sound Board** — a small pack of sounds you can trigger or shuffle through.
- **Quote of the Session** — a fresh famous quote, movie line, or joke on every
  open.
- **Spinner** — an editable wheel-of-names drawn on canvas; the announced winner
  always matches the slice under the pointer.
- **Suggestion Box** — a spring-loaded lid that pops open with a random activity.

## Surprises

- **The shuffle** — re-roll the entire desktop's look (palette, wallpaper,
  cursor) any time, or let the periodic chaos event do it for you.
- **Quick-Time Events** — every 30–60 seconds, but only while a window is open,
  a mini-game ambushes you with a strict timer (click the moving dot, mash a
  button, hit the green dots). Win and you get confetti; fail or ignore it and
  every open window slams shut.
- **The Backrooms** — roughly 1 in 10 shuffles drops the whole OS into a
  liminal backrooms, complete with a flickering fluorescent look, a low hum, and
  a "you shouldn't be here" prompt. You'll have to sit in it for a few seconds
  before you can click your way out.
- **Jack-in-the-box boot** — a pixel-art clown springs out on startup.

Everything respects `prefers-reduced-motion` — the motion calms down if your
system asks it to.

## Tech

Plain HTML, CSS, and vanilla JavaScript. No frameworks, no bundler, no
dependencies. A shared "busy-lock" keeps the chaos event and Quick-Time Events
from ever colliding, and the pure logic helpers are unit-tested.

## Test

```
node --test
```

Runs `tests/*.test.js` with Node's built-in runner. Nothing to install.

## Deploy

Static files only. Push to GitHub Pages or drop the folder on any static host.
No backend, no password.

## Credits

- **Backrooms easter egg artwork** by **Kake Pixels** — thank you for the
  perfectly unsettling room.
- **Sound Board** clips are CC0 / public domain (generated via
  `tools/gen-sounds.js`).
- Everything else — engine, apps, pixel icons, and the rest of the chaos — built
  for this project.

## Built for

The Hack Club Stardust Challenge (Task 1: webOS).
