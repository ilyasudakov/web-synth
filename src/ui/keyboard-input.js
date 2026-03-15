import { modules } from '../state.js';

const KEY_MAP = {
  'a': 261.63, 'w': 277.18, 's': 293.66, 'e': 311.13, 'd': 329.63,
  'f': 349.23, 't': 369.99, 'g': 392.00, 'y': 415.30, 'h': 440.00,
  'u': 466.16, 'j': 493.88, 'k': 523.25,
};

const activeKeys = new Set();

export function initKeyboardInput() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (activeKeys.has(e.key)) return;
    const freq = KEY_MAP[e.key];
    if (!freq) return;
    activeKeys.add(e.key);
    for (const mod of Object.values(modules)) {
      if (mod.type === 'keyboard') {
        mod.audio.setFreq(freq);
        mod.audio.setGate(1);
        if (mod._linkedEnvelopes) mod._linkedEnvelopes.forEach(env => env.audio.triggerAttack());
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (!KEY_MAP[e.key]) return;
    activeKeys.delete(e.key);
    if (activeKeys.size === 0) {
      for (const mod of Object.values(modules)) {
        if (mod.type === 'keyboard') {
          mod.audio.setGate(0);
          if (mod._linkedEnvelopes) mod._linkedEnvelopes.forEach(env => env.audio.triggerRelease());
        }
      }
    }
  });
}
