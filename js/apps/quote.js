// quote.js — Quote of the Session. Shows a random quote on every open. Pure
// data + pickQuote exported for node --test; makeQuote builds the DOM.
var QUOTES = [
  { text: 'The only way to do great work is to love what you do.', by: 'Steve Jobs', kind: 'famous' },
  { text: 'In the middle of difficulty lies opportunity.', by: 'Albert Einstein', kind: 'famous' },
  { text: 'Whether you think you can or you cannot, you are right.', by: 'Henry Ford', kind: 'famous' },
  { text: 'Be the change you wish to see in the world.', by: 'Gandhi', kind: 'famous' },
  { text: 'Simplicity is the ultimate sophistication.', by: 'Leonardo da Vinci', kind: 'famous' },
  { text: "May the Force be with you.", by: 'Star Wars', kind: 'movie' },
  { text: "Why so serious?", by: 'The Dark Knight', kind: 'movie' },
  { text: "I'll be back.", by: 'The Terminator', kind: 'movie' },
  { text: 'Life is like a box of chocolates.', by: 'Forrest Gump', kind: 'movie' },
  { text: "There's no place like home.", by: 'The Wizard of Oz', kind: 'movie' },
  { text: 'I told my computer I needed a break, and it said no problem — it would go to sleep.', by: 'Anon', kind: 'joke' },
  { text: 'Why do programmers prefer dark mode? Because light attracts bugs.', by: 'Anon', kind: 'joke' },
  { text: 'I would tell you a UDP joke, but you might not get it.', by: 'Anon', kind: 'joke' },
  { text: 'There are 10 kinds of people: those who understand binary and those who do not.', by: 'Anon', kind: 'joke' },
  { text: 'My code works and I have no idea why.', by: 'Every dev ever', kind: 'joke' }
];

// Assumes list.length >= 1 (QUOTES is a non-empty constant).
function pickQuote(list, rng) {
  var r = (typeof rng === 'function' ? rng : Math.random)();
  var i = Math.floor(r * list.length);
  if (i >= list.length) i = list.length - 1;
  if (i < 0) i = 0;
  return list[i];
}

// makeQuote() -> root element. Picks a fresh quote on open; "Another" rerolls.
function makeQuote() {
  const root = document.createElement('div');
  root.className = 'quote-app';

  const mark = document.createElement('div');
  mark.className = 'quote-mark';
  mark.textContent = '“'; // left double quote (not an emoji)

  const text = document.createElement('blockquote');
  text.className = 'quote-text';
  const quoteText = document.createElement('span');
  quoteText.className = 'quote-text-inner';
  const by = document.createElement('cite');
  by.className = 'quote-by';
  text.append(quoteText, by);   // cite now lives inside the blockquote
  const tag = document.createElement('span');
  tag.className = 'quote-kind';

  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'quote-again';
  again.textContent = 'Another';

  function show() {
    const q = pickQuote(QUOTES, Math.random);
    quoteText.textContent = q.text;
    by.textContent = '— ' + q.by; // em dash + attribution
    tag.textContent = q.kind;
    tag.dataset.kind = q.kind;
  }
  again.addEventListener('click', show);
  show(); // fresh quote on every open

  root.append(mark, text, tag, again);
  return root;
}

if (typeof window !== 'undefined') window.makeQuote = makeQuote;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QUOTES: QUOTES, pickQuote: pickQuote };
}
