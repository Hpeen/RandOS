# Devlog #3: The Apps and the Shuffle

**Date:** 2026-06-13

With the engine solid, it was time to build actual apps — and make each one call `rollSkin()` on every open.

<!-- screenshot placeholder -->

**Calculator** — real math, no `eval()`. I wrote a tokenizer and a shunting-yard algorithm in `js/calc-math.js` that converts infix expressions to postfix, then evaluates them safely. Invalid input returns an `"Error"` string instead of throwing. Three random keypad layouts: standard grid, stacked rows, and a compact mode. Every open, different layout, different skin.

**Clock** — live time, updates every second. Three random face styles: a plain digital readout, an SVG analog clock with sweeping hands, and a worded clock ("It's half past three"). The SVG face recalculates hand angles on each tick. Two skins I got from the engine were so good I almost didn't want them to be random.

**Calendar** — current month, today highlighted. Two layout variants: a classic 7-column grid matrix and an agenda list that just shows the days in sequence. Looks completely different between the two, but both are fully functional.

**Randomizer** — this one wasn't in the original challenge spec. I added it because it felt *right* for a project literally called RandOS. Coin flip, dice roll (1-6), and a 1-100 number picker. Each result plays a pop reveal animation. Two layouts: cards side by side or a stacked column. The signature app of the whole OS.

The **global shuffle button** (🎲 on the taskbar) re-rolls the desktop's gradient wallpaper and accent color without touching any open windows. Open windows keep their skins; the world around them changes. That independence felt important — your workspace stays stable, the desktop breathes.

Deferred idea I want to come back to: random quick-time-event mini-games as a fifth app. Imagine the window telling you to smash a key in 3 seconds, but the key is randomized too. Feels very RandOS. Saving it for a future devlog.

**Challenge requirements met:**
1. Runs in a browser, no install
2. Multiple apps in resizable/draggable windows
3. Taskbar with window management
4. Desktop with icons and launcher
5. Distinct visual identity (the randomization engine *is* the identity)

**What's next:** devlogs, README, and shipping it.
