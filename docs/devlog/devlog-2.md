# randos devlog #2: the everything-moves update

ok so v1 of randos was already a desktop that reshuffles its whole look every time you open something. cool. but it went kinda static once the windows were up. this round was about making the thing feel alive even when you're just sitting there doing nothing.

windows got the biggest rethink. before, every window opened at a random size in a random spot, which *sounds* on-brand but in practice just felt like a mess, with stuff overlapping and floating off in corners. so i flipped it. each app now has one fixed size that never changes, and the open windows pack themselves into a tidy clump dead center of the screen. open a third app and the other two glide over to make room. close one and they re-center. no overlap, ever. reads way more intentional now, and the chaos event just reshuffles where everything sits instead of resizing it.

opening an app also got three entrances it picks from at random: a confetti pop, a glitchy slice-in, and an origami fold where the window unfolds down from its top edge like paper. you can lock one if you've got a favorite.

the cursor was secretly broken this whole time. i'd built little pixel-art cursors but the normal css pointer/grab cursors were quietly overriding them on every button and title bar, so you basically never saw the custom ones. fixed it. now there's a pixel hand on hover and a closed fist while you drag a window, and they re-tint when you shuffle the theme.

and then the boot. oh, the boot. the jack-in-the-box used to be a smooth-ish vector clown and the spring was janky as hell, popping out like it skipped a few frames. so i redid the pop as a proper damped spring that bounces and settles, made the box slowly scale up while the crank winds for suspense, and then just... rebuilt the entire clown as pixel art. real rect-per-cell pixels to match everything else in randos. two-horned jester hat with pompoms, star eyes, a big dumb grin, a striped coil spring, a little box with a star on it. even threw a pixel font on the wordmark so the text fits.

still nudging the clown around pixel by pixel, but it's getting there. next up is probably shoving this whole branch live so it stops just sitting on my laptop looking cool.
