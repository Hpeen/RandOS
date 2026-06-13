// soundboard.js — Random Sound Board app factory.
// Presents the sound-manifest as a pad grid styled as a "free-use sound
// library". Each pad plays its WAV via a cloned <audio> element so sounds can
// overlap. A "Surprise" button fires a random pad. Plain script, no modules.
function makeSoundboard() {
  const root = document.createElement('div');
  root.className = 'soundboard';

  const sounds = (typeof window !== 'undefined' && window.SOUNDS) ? window.SOUNDS : [];

  // One reusable <audio> per sound; clone on play so repeats/overlaps work.
  const base = {};
  for (const s of sounds) {
    const a = document.createElement('audio');
    a.src = s.file;
    a.preload = 'auto';
    base[s.id] = a;
  }
  function play(id) {
    const a = base[id];
    if (!a) return;
    const node = a.cloneNode();
    node.currentTime = 0;
    const p = node.play();
    if (p && typeof p.catch === 'function') p.catch(() => {}); // ignore autoplay block
  }

  const head = document.createElement('div');
  head.className = 'sb-head';
  const title = document.createElement('span');
  title.className = 'sb-title';
  title.textContent = 'Free-Use Sound Library';
  const surprise = document.createElement('button');
  surprise.type = 'button';
  surprise.className = 'sb-surprise';
  surprise.textContent = 'Surprise';
  surprise.addEventListener('click', () => {
    const s = window.pickRandomSound ? window.pickRandomSound() : sounds[0];
    if (s) { play(s.id); flash(padById[s.id]); }
  });
  head.append(title, surprise);
  root.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'sb-grid';
  const padById = {};
  function flash(pad) {
    if (!pad) return;
    pad.classList.remove('is-hit'); void pad.offsetWidth; pad.classList.add('is-hit');
  }
  for (const s of sounds) {
    const pad = document.createElement('button');
    pad.type = 'button';
    pad.className = 'sb-pad';
    const lab = document.createElement('span');
    lab.className = 'sb-pad-label';
    lab.textContent = s.label;
    const cat = document.createElement('span');
    cat.className = 'sb-pad-cat';
    cat.textContent = s.category;
    pad.append(lab, cat);
    pad.addEventListener('click', () => { play(s.id); flash(pad); });
    padById[s.id] = pad;
    grid.appendChild(pad);
  }
  root.appendChild(grid);
  return root;
}

if (typeof window !== 'undefined') window.makeSoundboard = makeSoundboard;
