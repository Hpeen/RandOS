// notepad.js — chaotic Notepad. Pure SWAPS + chaoticAutocorrect exported for
// node --test; makeNotepad builds the DOM. The chaos is occasional, cosmetic,
// and recoverable (a calm toggle stops it). Plain script + CommonJS guard.
var SWAPS = {
  the: 'teh', and: 'adn', you: 'yuo', file: 'fle', send: 'snd',
  now: 'noaw', meeting: 'meating', please: 'pls', tomorrow: 'tomorow',
  important: 'improtant', because: 'becuase', their: 'thier', would: 'wuold'
};

// chaoticAutocorrect(text, rng?) -> text with ONE eligible word swapped (the
// k-th eligible occurrence chosen by rng). Returns text unchanged when no word
// matches SWAPS. Never throws.
function chaoticAutocorrect(text, rng) {
  if (typeof text !== 'string' || text.length === 0) return text;
  var words = text.split(/(\s+)/); // keep whitespace tokens at odd indices
  var eligible = [];
  for (var i = 0; i < words.length; i++) {
    var bare = words[i].toLowerCase().replace(/[^a-z]/g, '');
    if (SWAPS[bare]) eligible.push(i);
  }
  if (!eligible.length) return text;
  var r = (typeof rng === 'function' ? rng : Math.random)();
  var pickIdx = Math.floor(r * eligible.length);
  if (pickIdx >= eligible.length) pickIdx = eligible.length - 1;
  var wi = eligible[pickIdx];
  var bareWord = words[wi].toLowerCase().replace(/[^a-z]/g, '');
  words[wi] = words[wi].replace(new RegExp(bareWord, 'i'), SWAPS[bareWord]);
  return words.join('');
}

// makeNotepad() -> root element. A contenteditable note with two chaos streaks:
//   - autocorrect: on a timer, swaps one word for a wrong one (chaoticAutocorrect)
//   - restyle: on a timer, wraps one random word in an inline span with a
//     random font/size/color (suppressed under reduced motion)
// A "Calm" toggle stops all chaos. Timers self-clear when the window is removed.
function makeNotepad() {
  const root = document.createElement('div');
  root.className = 'notepad';

  const bar = document.createElement('div');
  bar.className = 'np-bar';
  const calm = document.createElement('button');
  calm.type = 'button';
  calm.className = 'np-calm';
  calm.textContent = 'Calm: OFF';
  const note = document.createElement('div');
  note.className = 'np-note';
  note.contentEditable = 'true';
  note.spellcheck = false;
  note.textContent = 'Type here. This notepad gets a little chaotic... the and you file please.';
  bar.appendChild(calm);
  root.append(bar, note);

  let calmOn = false;
  calm.addEventListener('click', () => {
    calmOn = !calmOn;
    calm.textContent = 'Calm: ' + (calmOn ? 'ON' : 'OFF');
  });

  function reduced() { return window.FX && window.FX.reducedMotion && window.FX.reducedMotion(); }
  function alive() { return document.body && document.body.contains(root); }

  const FONTS = ['Georgia, serif', "'Comic Sans MS', cursive", 'Impact, sans-serif', 'monospace'];
  const COLORS = ['var(--rand-accent)', 'var(--rand-accent-2)', '#ff4d4d', '#ffd166'];

  // Autocorrect tick: swap one word in the live text. Preserves caret-less edit
  // by only acting when the note is NOT focused (so we never fight the typist).
  const acTimer = setInterval(() => {
    if (!alive()) { clearInterval(acTimer); return; }
    if (calmOn || document.activeElement === note) return;
    const before = note.textContent;
    const after = chaoticAutocorrect(before, Math.random);
      // note: assigning textContent also collapses any <br>/block newlines; line breaks are not preserved (acceptable for this chaotic app).
    if (after !== before) note.textContent = after;
  }, 4200);

  // Restyle tick: wrap one random word in a styled span (cosmetic only).
  const rsTimer = setInterval(() => {
    if (!alive()) { clearInterval(rsTimer); return; }
    if (calmOn || reduced() || document.activeElement === note) return;
    const words = note.textContent.split(' ');
    // Only style a real (non-empty) word; empties come from double spaces.
    const nonEmpty = words.map((w, idx) => idx).filter((idx) => words[idx].length > 0);
    if (nonEmpty.length < 2) return;
    const i = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
    const span = document.createElement('span');
    span.className = 'np-wild';
    span.style.fontFamily = FONTS[Math.floor(Math.random() * FONTS.length)];
    span.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    span.style.fontSize = (0.8 + Math.random() * 1.2).toFixed(2) + 'em';
    span.textContent = words[i];
    // Rebuild: the chosen index becomes the styled span; single spaces rejoin
    // tokens (reconstructing original spacing, including double spaces) with no
    // trailing space added. No innerHTML.
    note.textContent = '';
    words.forEach((w, idx) => {
      if (idx === i) note.appendChild(span);
      else note.appendChild(document.createTextNode(w));
      if (idx < words.length - 1) note.appendChild(document.createTextNode(' '));
    });
  }, 5300);

  return root;
}

if (typeof window !== 'undefined') window.makeNotepad = makeNotepad;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SWAPS: SWAPS, chaoticAutocorrect: chaoticAutocorrect };
}
