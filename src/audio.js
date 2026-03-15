/** @type {AudioContext|null} */
let ctx = null;

export function getAudioContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function ensureAudio() {
  return getAudioContext();
}

// Browsers block AudioContext until a user gesture.
// Resume on first click/key/touch anywhere on the page.
function resumeOnGesture() {
  if (!ctx || ctx.state !== 'suspended') return;
  ctx.resume();
}

['click', 'keydown', 'touchstart', 'mousedown'].forEach(evt => {
  document.addEventListener(evt, resumeOnGesture, { capture: true, passive: true });
});
