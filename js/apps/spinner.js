// spinner.js — The Customizable Spinner. winnerForAngle is pure geometry,
// exported for node --test; makeSpinner builds the canvas wheel + controls.
var DEFAULT_SLOTS = ['Pizza', 'Tacos', 'Sushi', 'Burgers', 'Salad', 'Pasta'];

// winnerForAngle(count, finalAngleDeg) -> winning slot index.
// Slots are laid out clockwise from the top; a fixed pointer sits at the top.
function winnerForAngle(count, finalAngleDeg) {
  if (count <= 1) return 0;
  var seg = 360 / count;
  var rot = ((finalAngleDeg % 360) + 360) % 360;     // normalize 0..360
  var atTop = ((360 - rot) % 360);                   // pre-rotation angle now on top
  var idx = Math.floor(atTop / seg) % count;
  return idx;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { winnerForAngle: winnerForAngle, DEFAULT_SLOTS: DEFAULT_SLOTS };
}
