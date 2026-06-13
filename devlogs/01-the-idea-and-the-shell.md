# Devlog #1: The Idea and the Shell

**Date:** 2026-06-13

So I'm entering the Hack Club Stardust Challenge — Task 1 is "build a webOS." Pretty open-ended prompt. My first instinct was to do the obvious: a clean desktop, a few app windows, maybe a nice wallpaper. Then I thought: what if *nothing* looked the same twice?

That's where RandOS came from. Every app window re-rolls its own design — colors, fonts, corner radius, shadows, even the layout of the UI inside — every single time you open it. Open the calculator three times and you'll get three different-looking calculators. Same underlying app, completely different aesthetic. The OS itself has a shuffle button to re-roll the whole desktop wallpaper and accent color on demand.

<!-- screenshot placeholder -->

The constraint I set for myself: vanilla HTML/CSS/JS, no build step, no package.json, no npm install. You should be able to double-click `index.html` and it just runs. No login, no password, no server required. Static files all the way down.

Getting the shell working was the first milestone. I started with a `desktop` div that holds an icon grid and a taskbar at the bottom. Each app icon is registered with a name and an emoji — double-click to open. The window manager creates a div, positions it, and wires up drag-by-title-bar using pointer events so it works on both mouse and touch. Click any window to bring it to front (z-index stacking). The taskbar auto-populates with a button per open window. Close a window and its taskbar entry disappears.

It's basic, but it felt like a real desktop the moment dragging snapped into place.

**What's next:** the randomization engine — figuring out how to make "random" always look *good*.
