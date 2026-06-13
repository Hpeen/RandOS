# Devlog #2: The Randomization Engine

**Date:** 2026-06-13

This is the part I was most nervous about: making randomness that doesn't look like a mess.

My first prototype was full chaos — pick any hex color, any font, any border-radius. It looked terrible. Like a ransom note. Every combo had a 50/50 shot of being unreadable or just plain ugly. Full chaos is not the vibe.

So I switched to **curated random**: instead of picking from infinite possibilities, I defined *pools* of tokens that I personally vetted, then let the engine pick randomly *within* those pools. Every combination that can come out of the engine is a combination I checked beforehand.

<!-- screenshot placeholder -->

Here's what lives in `js/randomizer.js`:

- **18 color palettes** — each one is a complete set of background, surface, accent, and text colors. About half are vivid (electric blue, warm amber, deep violet) and the rest are monochrome vibes: Noir (black/white), Paper (off-white/ink), Terminal Green (phosphor-on-dark). Every palette was contrast-checked against its own text colors.
- **10 font pairings** — heading + body combinations I picked because they actually complement each other. No random fonts from an infinite list.
- **6 corner radii** — from sharp/0px all the way to pill-shaped 24px.
- **7 shadow styles** — flat, subtle, dramatic, neon glow, etc.
- **4 window chrome styles** — how the title bar looks (minimal bar, bold header, outlined, flush).
- **Per-app layout variants** — each app has 2-3 layout options that get picked independently.

The key function is `rollSkin(appName)` — it picks one token from each pool, returns a skin object, and `applySkin(el, skin)` writes them as scoped CSS custom properties directly onto the window element. Each window is completely self-contained; skins don't leak between windows.

The readability guarantee is non-negotiable: every palette's accent-text and secondary-accent-text combination must clear **WCAG AA** at 4.5:1 contrast ratio minimum. There's an automated test in `tests/randomizer.test.js` that checks every single palette. If anyone adds a palette that fails contrast, the test suite fails. No workarounds.

**What's next:** four apps, each wearing a different skin every time they open.
