import { modules } from '../state.js';

export function toggleBypass(e, id) {
  if (e.stopPropagation) e.stopPropagation();
  const mod = modules[id];
  if (!mod) return;
  mod.bypassed = !mod.bypassed;
  const btn = document.getElementById(`bypass-btn-${id}`);

  if (mod._bypassWet && mod._bypassDry) {
    mod._bypassWet.gain.value = mod.bypassed ? 0 : 1;
    mod._bypassDry.gain.value = mod.bypassed ? 1 : 0;
  } else if (mod._muteGains) {
    Object.values(mod._muteGains).forEach(g => (g.gain.value = mod.bypassed ? 0 : 1));
  }

  mod.el.classList.toggle('bypassed', mod.bypassed);
  btn.classList.toggle('off', mod.bypassed);
  btn.title = mod.bypassed ? 'Bypassed — click to enable' : 'Bypass';
}

/** Wrap a module's audio with bypass routing. Call right after creating audio. */
export function wrapBypass(mod, audioCtx) {
  const { def, audio } = mod;
  const isThroughModule = def.inputs.includes('in') && def.outputs.includes('out');

  if (isThroughModule) {
    const origIn = audio.getInput('in');
    const origOut = audio.getOutput('out');
    // Skip bypass wiring if module doesn't actually have audio nodes for in/out
    if (!origIn || !origOut) return;
    const splitter = audioCtx.createGain();
    const wetGain = audioCtx.createGain();
    const dryGain = audioCtx.createGain();
    const merger = audioCtx.createGain();
    dryGain.gain.value = 0;
    wetGain.gain.value = 1;
    splitter.connect(origIn);
    origOut.connect(wetGain);
    wetGain.connect(merger);
    splitter.connect(dryGain);
    dryGain.connect(merger);
    const origGetInput = audio.getInput.bind(audio);
    const origGetOutput = audio.getOutput.bind(audio);
    audio.getInput = (name) => (name === 'in' ? splitter : origGetInput(name));
    audio.getOutput = (name) => (name === 'out' ? merger : origGetOutput(name));
    mod._bypassWet = wetGain;
    mod._bypassDry = dryGain;
    mod._bypassNodes = [splitter, wetGain, dryGain, merger];
  } else if (def.outputs.length > 0) {
    const muteGains = {};
    const origGetOutput = audio.getOutput.bind(audio);
    for (const outName of def.outputs) {
      const g = audioCtx.createGain();
      g.gain.value = 1;
      const orig = origGetOutput(outName);
      if (orig) {
        orig.connect(g);
        muteGains[outName] = g;
      }
    }
    audio.getOutput = (name) => {
      const key = name || def.outputs[0];
      return muteGains[key] || origGetOutput(name);
    };
    mod._muteGains = muteGains;
  }
}
