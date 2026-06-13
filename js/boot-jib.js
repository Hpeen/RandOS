// boot-jib.js — builds the pixel-art jack-in-the-box for the boot animation.
//
// RandOS draws everything as pixel art (icons, cursor), so the boot jack is too:
// a rect-per-cell sprite rendered into the #boot-jib <svg> at runtime. It is
// authored as character grids (one char = one pixel cell). Most parts are SYMMETRIC,
// so they're authored as a LEFT HALF and mirrored in code — that guarantees clean
// symmetry without hand-typing both sides.
//
// The sprite is split into the exact animatable groups boot.js + base.css drive:
//   .jib-lid   — the lid flap (flips open)
//   .jib-jack  — pops up on the coil; contains:
//       .jib-coil — the striped spring (stays put while the head swings)
//       .jib-head — the clown head + jester hat (swings side to side)
//   .jib-box   — the box front (shivers; painted AFTER the jack so it hides the
//                coil's base, making the coil look like it rises out of the box)
//   .jib-crank — the wind-up crank (spins)
//
// Reference: a two-horned red jester hat with pompoms, white face with star (+)
// eyes, pink cheeks, a big grin, a white/teal striped coil, and an orange box
// with a gold-trimmed star + a ball-knob crank. Hues are routed through the live
// theme (--rand-accent / --rand-accent-2) via CSS classes so each boot is on-theme;
// the face/cheeks/mouth keep classic fixed colors. No emoji, no libraries.
(function () {
  'use strict';

  var svg = document.getElementById('boot-jib');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var CELL = 12;

  // char -> CSS class (fills defined in css/base.css)
  var MAP = {
    O: 'j-out',
    H: 'j-hat', h: 'j-hat-s', G: 'j-band', Q: 'j-pom', q: 'j-pom-s',
    F: 'j-face', R: 'j-cheek', X: 'j-eye', M: 'j-mouth', T: 'j-teeth',
    C: 'j-collar', c: 'j-collar-s',
    W: 'j-coil-w', K: 'j-coil', k: 'j-coil-s',
    B: 'j-box', b: 'j-box-s', l: 'j-box-l', S: 'j-star',
    D: 'j-lid', d: 'j-lid-l',
    m: 'j-metal', n: 'j-metal-d', r: 'j-knob'
  };

  function group(cls) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', cls);
    svg.appendChild(g);
    return g;
  }

  function cell(parent, x, y, ch) {
    var cls = MAP[ch];
    if (!cls) return;
    var rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', CELL);
    rect.setAttribute('height', CELL);
    rect.setAttribute('class', cls);
    parent.appendChild(rect);
  }

  // Render a grid of rows into `parent` at svg offset (ox, oy). When `mirror` is
  // true each row is treated as a LEFT HALF (padded to `half` cols) and reflected
  // to form the full symmetric row. ' ' and '.' are transparent.
  function render(parent, rows, ox, oy, mirror, half) {
    for (var r = 0; r < rows.length; r++) {
      var s = rows[r];
      var full;
      if (mirror) {
        while (s.length < half) s += '.';
        if (s.length > half) s = s.slice(0, half);
        var rev = s.split('').reverse().join('');
        full = s + rev;
      } else {
        full = s;
      }
      for (var c = 0; c < full.length; c++) {
        var ch = full.charAt(c);
        if (ch === ' ' || ch === '.') continue;
        cell(parent, ox + c * CELL, oy + r * CELL, ch);
      }
    }
  }

  // ── Sprite layout (svg is 440 x 560; horizontal centre = 220) ────────────────
  var CENTER = 220;

  // Clown head + two-horned jester hat (HALF = 14 -> full 28 cells = 336px).
  var HEAD_HALF = 14;
  var HEAD = [
    '..............', // 0
    '...QQ.........', // 1  pompom (mirrors to the other horn tip)
    '..QHHq........', // 2
    '..OHHhO.......', // 3  left horn (slopes inward toward the centre notch)
    '..OHHHhO......', // 4
    '...OHHHhO.....', // 5
    '....OHHHhO....', // 6
    '.....OHHHhO...', // 7
    '......OHHHhO..', // 8
    '.......OHHHho.', // 9
    '..OGGGGGGGGGGG', // 10 hat band
    '.OGGGGGGGGGGGG', // 11
    '.OFFFFFFFFFFFF', // 12 face
    '.OFFFFFFFFFFFF', // 13
    '.OFFRRRRRFFFFF', // 14 cheek blush around the eye
    '.OFRRRXRRRFFFF', // 15 star (+) eye, top
    '.OFRRXXXRRFFFF', // 16 star (+) eye, middle
    '.OFRRRXRRRFFFF', // 17 star (+) eye, bottom
    '.OFFRRRRRFFFFF', // 18
    '.OFFFFFFFFFFFF', // 19
    '.OFFFMMMMMMMMM', // 20 big grin, top
    '.OFFMMTTTTTTTT', // 21 teeth
    '.OFFFMMMMMMMMM', // 22 grin, bottom
    '..OFFFFFFFFFFF', // 23 chin
    '..OCCCCCCCCCCC', // 24 ruffle collar
    '...OCcCcCcCcCc'  // 25 collar scallop
  ];
  var HEAD_OX = CENTER - HEAD_HALF * CELL; // 220 - 168 = 52
  var HEAD_OY = 0;

  // Striped coil spring (HALF = 7 -> full 14 = 168px). Repeating ring of white
  // front + accent body + shadow.
  var COIL_HALF = 7;
  var COIL = [
    '.OWWWWW', '.OKKKKK', '.OKkkkk',
    '.OWWWWW', '.OKKKKK', '.OKkkkk',
    '.OWWWWW', '.OKKKKK', '.OKkkkk',
    '.OWWWWW'
  ];
  var COIL_OX = CENTER - COIL_HALF * CELL; // 220 - 84 = 136
  var COIL_OY = 312;

  // Box front (HALF = 14 -> full 28 = 336px): outline + gold trim frame, a
  // centred star emblem, and a shaded lower band.
  var BOX_HALF = 14;
  var BOX = [
    'OOOOOOOOOOOOOO', // 0  top edge
    'Olllllllllllll', // 1  gold trim
    'OlBBBBBBBBBBBB', // 2
    'OlBBBBBBBBBBBB', // 3
    'OlBBBBBBBBBBBS', // 4  star (centred via mirror)
    'OlBBBBBBBBBBSS', // 5
    'OlBBBBBBBBBSSS', // 6
    'OlBBBBBBBBSSSS', // 7
    'OlBBBBBBBBBSSS', // 8
    'OlBBBBBBBBBBSS', // 9
    'OlBBBBBBBBBBBS', // 10
    'OlBBBBBBBBBBBB', // 11
    'Olbbbbbbbbbbbb', // 12 shaded band
    'Olbbbbbbbbbbbb', // 13
    'Olllllllllllll', // 14 bottom trim
    'OOOOOOOOOOOOOO'  // 15 bottom edge
  ];
  var BOX_OX = CENTER - BOX_HALF * CELL; // 52
  var BOX_OY = 372;

  // Lid flap (HALF = 14), a closed slab over the box opening; flips open.
  var LID_HALF = 14;
  var LID = [
    'Oddddddddddddd',
    'ODDDDDDDDDDDDD',
    'ODDDDDDDDDDDDD',
    'Olllllllllllll'
  ];
  var LID_OX = CENTER - LID_HALF * CELL; // 52
  var LID_OY = 336;

  // Crank: hub (left, the pivot) + arm + ball knob (right). Authored whole.
  // Kept compact so the knob stays inside the 440-wide viewBox.
  var CRANK = [
    'nmn..',
    'mmmrr',
    'mmmrr',
    'nmn..'
  ];
  var CRANK_OX = BOX_OX + BOX_HALF * 2 * CELL - CELL; // tucked against the box's right edge
  var CRANK_OY = 456;

  // ── Build in paint order: lid (behind) -> jack (coil + head) -> box front -> crank
  var gLid = group('jib-lid');
  render(gLid, LID, LID_OX, LID_OY, true, LID_HALF);

  var gJack = group('jib-jack');
  var gCoil = document.createElementNS(NS, 'g');
  gCoil.setAttribute('class', 'jib-coil');
  gJack.appendChild(gCoil);
  render(gCoil, COIL, COIL_OX, COIL_OY, true, COIL_HALF);
  var gHead = document.createElementNS(NS, 'g');
  gHead.setAttribute('class', 'jib-head');
  gJack.appendChild(gHead);
  render(gHead, HEAD, HEAD_OX, HEAD_OY, true, HEAD_HALF);

  var gBox = group('jib-box');
  render(gBox, BOX, BOX_OX, BOX_OY, true, BOX_HALF);

  var gCrank = group('jib-crank');
  render(gCrank, CRANK, CRANK_OX, CRANK_OY, false, 0);
})();
