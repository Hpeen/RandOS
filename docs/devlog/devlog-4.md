# randos devlog #4: the backrooms got real

quick one this time, all about feel. the big stuff from last round (the quick-time events and the backrooms easter egg) is all in and working, so this pass was just me poking at it until it felt right.

the backrooms was the main thing. it used to be a flat fluorescent-yellow css gradient i hacked together, which read more "someone forgot to set a background" than "liminal nightmare." so i dropped in an actual backrooms photo and stretched it over the whole screen. way creepier instantly. the flicker needed fixing too. it was dimming the whole layer's opacity, which meant every flicker briefly showed your normal desktop peeking through behind it, totally killing the vibe. now it flickers *brightness* instead, so the room stays solid and just stutters like a fluorescent tube that's about to die. the "you shouldn't be here" text was also way too small to notice, so i bumped it up. the low hum stays exactly as is, quiet and gross.

oh, and you can't just bail anymore. before, you could click out of the backrooms basically the instant you landed in it, which kind of defeated the point. now the escape click doesn't even work for the first five seconds. you just have to sit in it for a bit. enjoy.

last thing: the quick-time events were too rare. every 90 to 150 seconds meant you could go a whole session and barely see one. cut it down to every 30 to 60 instead, so they actually ambush you now. same rules as before, they only fire when you've got a window open and the chaos event isn't already going, so it never piles on.

still vanilla js, no build step, still respects reduced-motion (the flicker just holds still if you've got that on). next up is probably finding more dumb ways to mess with you.
