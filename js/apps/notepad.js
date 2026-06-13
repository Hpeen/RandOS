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
  words[wi] = words[wi].replace(bareWord, SWAPS[bareWord]);
  return words.join('');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SWAPS: SWAPS, chaoticAutocorrect: chaoticAutocorrect };
}
