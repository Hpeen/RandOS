# Devlog #3 — Apps, Quick-Time Events & the Backrooms

This round expanded RandOS from a handful of demo apps into a small suite, and
added two OS-wide surprises.

**New apps:** a Random Sound Board (a CC0 sound pack generated as WAVs, played
through an overlap-friendly `<audio>` layer and framed as a free-use library), a
Suggestion Box with a spring-loaded lid that pops a random activity, Quote of the
Session (a fresh famous quote / movie line / joke on every open), and a
Customizable Spinner (an editable wheel-of-names drawn on canvas, where the
announced winner is computed from the final rotation so it always matches the
slice under the pointer).

**Chaotic standard apps:** a Notepad that occasionally "autocorrects" a word to a
typo and restyles random words (with a Calm toggle), and a Paint app whose brush
color and size change on you while stray pixels creep in.

**Quick-Time Events:** every 90–150 seconds — but only when a window is open — a
mini-game ambushes you with a strict timer (click the moving dot, mash a button,
hit the green dots). Win and you get confetti; fail or ignore it and every open
window is slammed shut. A shared busy-lock keeps QTEs and the chaos event from
ever colliding.

**The Backrooms:** ~10% of shuffles (button or chaos) drop the whole OS into a
buzzing fluorescent-yellow Backrooms — flickering rooms, a low Web Audio hum,
and a faint "you shouldn't be here" prompt. Click anywhere to escape.

Everything stays vanilla JS, no build step, and respects `prefers-reduced-motion`.
