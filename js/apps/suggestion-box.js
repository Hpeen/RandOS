// suggestion-box.js — The Suggestion Box app: a pixel box that opens to reveal
// a random activity. Pure data + pickSuggestion are exported for node --test;
// makeSuggestionBox builds the DOM. Plain script + CommonJS guard.
var SUGGESTIONS = [
  'Do 15 jumping jacks', 'Cook a random recipe', 'Text an old friend',
  'Drink a glass of water', 'Take a 5-minute walk', 'Doodle something silly',
  'Tidy one drawer', 'Stretch for 2 minutes', 'Write down 3 good things',
  'Learn a new word', 'Do 10 push-ups', 'Step outside and breathe',
  'Compliment a stranger', 'Read one page of a book', 'Plan a tiny adventure',
  'Organize your desktop icons', 'Try a 60-second meditation', 'Dance to one song'
];

// pickSuggestion(list, rng?, prev?) -> a member of list. When `prev` is given
// and the roll lands on it, nudge to the next index so it rarely repeats.
function pickSuggestion(list, rng, prev) {
  var r = (typeof rng === 'function' ? rng : Math.random)();
  var i = Math.floor(r * list.length);
  if (i >= list.length) i = list.length - 1;
  if (i < 0) i = 0;
  if (list.length > 1 && list[i] === prev) i = (i + 1) % list.length;
  return list[i];
}

// makeSuggestionBox() -> root element. Clicking the box toggles the lid open
// (revealing a fresh random suggestion) and closed.
function makeSuggestionBox() {
  const root = document.createElement('div');
  root.className = 'sgbox';

  const stage = document.createElement('button'); // the whole box is the button
  stage.type = 'button';
  stage.className = 'sgbox-stage';
  stage.setAttribute('aria-label', 'Open the suggestion box');

  const slip = document.createElement('div');
  slip.className = 'sgbox-slip';
  const slipText = document.createElement('span');
  slip.appendChild(slipText);

  const lid = document.createElement('div');
  lid.className = 'sgbox-lid';
  const body = document.createElement('div');
  body.className = 'sgbox-body';

  stage.append(slip, body, lid);

  const hint = document.createElement('div');
  hint.className = 'sgbox-hint';
  hint.textContent = 'Click the box for a suggestion';

  root.append(stage, hint);

  let open = false;
  let prev = null;
  stage.addEventListener('click', () => {
    open = !open;
    root.classList.toggle('is-open', open);
    if (open) {
      prev = pickSuggestion(SUGGESTIONS, Math.random, prev);
      slipText.textContent = prev;
      hint.textContent = 'Click again to close';
      if (window.FX) {
        const r = stage.getBoundingClientRect();
        window.FX.burst(r.left + r.width / 2, r.top + r.height / 3, { count: 12 });
      }
    } else {
      hint.textContent = 'Click the box for a suggestion';
    }
  });

  return root;
}

if (typeof window !== 'undefined') window.makeSuggestionBox = makeSuggestionBox;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUGGESTIONS: SUGGESTIONS, pickSuggestion: pickSuggestion };
}
