// backrooms.js — the Backrooms easter egg. window.Backrooms.rollOnShuffle() is
// called from BOTH shuffle paths (the Shuffle button in desktop.js and the
// chaos event in chaos.js); ~10% of the time it drops the OS into a creepy
// fluorescent-yellow theme with a low Web Audio hum. Click anywhere to escape.
// Plain script + CommonJS guard (rollBackrooms is pure + tested).
(function () {
  'use strict';

  // Pure roll (tested): rollBackrooms(rng?, chance?) -> boolean.
  function rollBackrooms(rng, chance) {
    var c = (typeof chance === 'number') ? chance : 0.10;
    var r = (typeof rng === 'function' ? rng : Math.random)();
    return r < c;
  }

  var active = false;
  var audioCtx = null, humNodes = null;
  var escHandler = null, promptEl = null;

  function reduced() {
    return typeof window !== 'undefined' && window.FX &&
      typeof window.FX.reducedMotion === 'function' && window.FX.reducedMotion();
  }

  function startHum() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      var osc = audioCtx.createOscillator();
      var osc2 = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var filter = audioCtx.createBiquadFilter();
      osc.type = 'sawtooth'; osc.frequency.value = 60;   // mains-hum-ish
      osc2.type = 'sine'; osc2.frequency.value = 120;
      filter.type = 'lowpass'; filter.frequency.value = 320;
      gain.gain.value = 0.06;                             // quiet, unsettling
      osc.connect(filter); osc2.connect(filter); filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(); osc2.start();
      humNodes = { osc: osc, osc2: osc2, gain: gain };
    } catch (e) { /* audio optional */ }
  }
  function stopHum() {
    try {
      if (humNodes) { humNodes.osc.stop(); humNodes.osc2.stop(); }
      if (audioCtx && audioCtx.close) audioCtx.close();
    } catch (e) { /* ignore */ }
    humNodes = null; audioCtx = null;
  }

  function enter() {
    if (active || typeof document === 'undefined' || !document.body) return;
    active = true;
    document.body.classList.add('backrooms');
    if (reduced()) document.body.classList.add('backrooms-calm');

    promptEl = document.createElement('div');
    promptEl.className = 'backrooms-prompt';
    promptEl.textContent = "you shouldn't be here — click to escape";
    document.body.appendChild(promptEl);

    startHum();

    // Defer binding the escape click so the triggering shuffle-click doesn't
    // instantly dismiss it.
    setTimeout(function () {
      escHandler = function () { exit(); };
      document.addEventListener('click', escHandler, { once: true });
    }, 350);
  }

  function exit() {
    if (!active) return;
    active = false;
    document.body.classList.remove('backrooms', 'backrooms-calm');
    if (promptEl && promptEl.parentNode) promptEl.parentNode.removeChild(promptEl);
    promptEl = null;
    if (escHandler) { document.removeEventListener('click', escHandler); escHandler = null; }
    stopHum();
    // Restore a normal rolled theme.
    try { if (typeof window.rollWallpaper === 'function') window.rollWallpaper(); } catch (e) {}
  }

  // rollOnShuffle() -> true if it entered the Backrooms this call. No-op (returns
  // false) if already active.
  function rollOnShuffle() {
    if (active) return false;
    if (rollBackrooms(Math.random, 0.10)) { enter(); return true; }
    return false;
  }

  if (typeof window !== 'undefined') {
    window.Backrooms = {
      rollOnShuffle: rollOnShuffle,
      enter: enter,           // manual trigger for testing
      exit: exit,
      isActive: function () { return active; }
    };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rollBackrooms: rollBackrooms };
  }
})();
