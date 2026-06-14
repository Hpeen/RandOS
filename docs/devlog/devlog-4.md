# Devlog #4 — Tuning the Backrooms & turning up the heat

A smaller round, all about feel. The big systems from last time are in; this
pass dials them in.

**The Backrooms, now with a real room:** the fluorescent-yellow CSS gradient has
been swapped for an actual backrooms photo (`assets/backrooms.png`) stretched to
cover the whole screen. The flicker was reworked too — instead of dipping the
layer's opacity (which briefly showed the desktop behind it), it now flickers
brightness, so the room stays solid and just stutters like a failing fluorescent
tube. The "you shouldn't be here" prompt got bigger and harder to miss, and the
low Web Audio hum stays as the quiet, unsettling drone underneath.

**No quick escape:** you used to be able to click out of the Backrooms almost
immediately. Now the escape click is armed only after five seconds — long enough
to actually feel trapped before the way out appears.

**Quick-Time Events, more often:** the mini-games now ambush you every 30–60
seconds instead of every 90–150. Same rules — they only fire when a window is
open, the tab is visible, and the chaos event isn't already running — just more
of them.

Still vanilla JS, no build step, and everything respects `prefers-reduced-motion`
(the Backrooms flicker holds steady when motion is reduced).
