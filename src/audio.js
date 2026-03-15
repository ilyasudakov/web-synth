/** @type {AudioContext|null} */
let ctx = null;

export function getAudioContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master safety limiter — last resort before speakers
    const master = ctx.createDynamicsCompressor();
    master.threshold.value = -1;
    master.knee.value = 0;
    master.ratio.value = 20;
    master.attack.value = 0.001;
    master.release.value = 0.01;
    master.connect(ctx.destination);

    // Patch destination so all connect(ctx.destination) goes through limiter
    ctx._realDestination = ctx.destination;
    Object.defineProperty(ctx, 'destination', { get: () => master });
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function ensureAudio() {
  return getAudioContext();
}

// Browsers block AudioContext until a user gesture.
function resumeOnGesture() {
  if (!ctx || ctx.state !== 'suspended') return;
  ctx.resume();
}

['click', 'keydown', 'touchstart', 'mousedown'].forEach(evt => {
  document.addEventListener(evt, resumeOnGesture, { capture: true, passive: true });
});
