// busy-lock.js — a tiny shared lock so only one "big" OS event (chaos OR a QTE)
// runs at a time. Plain script global + CommonJS guard. No DOM needed.
(function () {
  'use strict';
  var owner = null; // null = free; otherwise a string tag of the holder
  var API = {
    isBusy: function () { return owner !== null; },
    // acquire(tag) -> true if the lock was taken (now held by tag), false if busy.
    acquire: function (tag) {
      if (owner !== null) return false;
      owner = tag || 'anon';
      return true;
    },
    // release(tag) frees the lock only if tag holds it (or if no tag given).
    release: function (tag) {
      if (tag === undefined || owner === tag) owner = null;
    },
    owner: function () { return owner; }
  };
  if (typeof window !== 'undefined') window.RandOSBusy = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
