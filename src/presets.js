import { addModule, clearAll } from './ui/renderer.js';
import { connectModules, updateCables } from './ui/cables.js';
import { ensureAudio } from './audio.js';

export function loadPreset(name) {
  ensureAudio();
  clearAll();
  const fn = PRESETS[name];
  if (fn) fn();
  requestAnimationFrame(() => updateCables());
}

const PRESETS = {
  simple() {
    const osc = addModule('oscillator', 100, 100);
    const vca = addModule('vca', 350, 100);
    const out = addModule('output', 600, 100);
    connectModules({ moduleId: osc.id, portName: 'out' }, { moduleId: vca.id, portName: 'in' });
    connectModules({ moduleId: vca.id, portName: 'out' }, { moduleId: out.id, portName: 'in' });
  },

  keys() {
    const kb = addModule('keyboard', 50, 250);
    const osc = addModule('oscillator', 300, 50);
    const env = addModule('envelope', 300, 250);
    const vca = addModule('vca', 550, 100);
    const out = addModule('output', 750, 100);
    connectModules({ moduleId: kb.id, portName: 'freq' }, { moduleId: osc.id, portName: 'freq_cv' });
    osc.audio.setParam('frequency', 0); osc.params.frequency = 0;
    connectModules({ moduleId: kb.id, portName: 'gate' }, { moduleId: env.id, portName: 'gate' });
    connectModules({ moduleId: osc.id, portName: 'out' }, { moduleId: vca.id, portName: 'in' });
    connectModules({ moduleId: env.id, portName: 'out' }, { moduleId: vca.id, portName: 'cv' });
    vca.audio.setParam('gain', 0); vca.params.gain = 0;
    connectModules({ moduleId: vca.id, portName: 'out' }, { moduleId: out.id, portName: 'in' });
  },

  generative() {
    const clk = addModule('clock', 50, 50);
    const seq = addModule('sequencer', 50, 250);
    const osc = addModule('oscillator', 300, 50);
    const env = addModule('envelope', 300, 250);
    const filt = addModule('filter', 550, 50);
    const vca = addModule('vca', 550, 250);
    const del = addModule('delay', 800, 100);
    const out = addModule('output', 1050, 100);

    connectModules({ moduleId: clk.id, portName: 'trigger' }, { moduleId: seq.id, portName: 'clock' });
    connectModules({ moduleId: seq.id, portName: 'freq' }, { moduleId: osc.id, portName: 'freq_cv' });
    osc.audio.setParam('frequency', 0); osc.params.frequency = 0;
    connectModules({ moduleId: seq.id, portName: 'gate' }, { moduleId: env.id, portName: 'gate' });
    connectModules({ moduleId: osc.id, portName: 'out' }, { moduleId: filt.id, portName: 'in' });
    connectModules({ moduleId: env.id, portName: 'out' }, { moduleId: vca.id, portName: 'cv' });
    vca.audio.setParam('gain', 0); vca.params.gain = 0;
    connectModules({ moduleId: filt.id, portName: 'out' }, { moduleId: vca.id, portName: 'in' });
    connectModules({ moduleId: vca.id, portName: 'out' }, { moduleId: del.id, portName: 'in' });
    connectModules({ moduleId: del.id, portName: 'out' }, { moduleId: out.id, portName: 'in' });
  },

  ambient() {
    const clk = addModule('clock', 50, 50);
    clk.audio.setParam('bpm', 40); clk.params.bpm = 40;
    const snh = addModule('snh', 50, 250);
    const osc = addModule('oscillator', 300, 50);
    const lfo = addModule('lfo', 300, 300);
    const filt = addModule('filter', 550, 50);
    const env = addModule('envelope', 300, 500);
    const vca = addModule('vca', 550, 300);
    const del = addModule('delay', 800, 100);
    const out = addModule('output', 1050, 100);

    connectModules({ moduleId: clk.id, portName: 'trigger' }, { moduleId: snh.id, portName: 'clock' });
    connectModules({ moduleId: snh.id, portName: 'out' }, { moduleId: osc.id, portName: 'freq_cv' });
    osc.audio.setParam('frequency', 0); osc.params.frequency = 0;

    // Clock → Envelope: manual trigger link
    connectModules({ moduleId: clk.id, portName: 'trigger' }, { moduleId: env.id, portName: 'gate' });
    if (!clk._clockLinks) clk._clockLinks = [];
    const envTriggerFn = () => { env.audio.triggerAttack(); setTimeout(() => env.audio.triggerRelease(), 400); };
    clk.audio.onTick(envTriggerFn);
    clk._clockLinks.push({ target: env, fn: envTriggerFn });

    connectModules({ moduleId: lfo.id, portName: 'out' }, { moduleId: filt.id, portName: 'freq_cv' });
    connectModules({ moduleId: osc.id, portName: 'out' }, { moduleId: filt.id, portName: 'in' });
    connectModules({ moduleId: env.id, portName: 'out' }, { moduleId: vca.id, portName: 'cv' });
    vca.audio.setParam('gain', 0); vca.params.gain = 0;
    connectModules({ moduleId: filt.id, portName: 'out' }, { moduleId: vca.id, portName: 'in' });
    connectModules({ moduleId: vca.id, portName: 'out' }, { moduleId: del.id, portName: 'in' });
    del.audio.setParam('feedback', 0.7); del.params.feedback = 0.7;
    del.audio.setParam('time', 0.6); del.params.time = 0.6;
    del.audio.setParam('mix', 0.6); del.params.mix = 0.6;
    connectModules({ moduleId: del.id, portName: 'out' }, { moduleId: out.id, portName: 'in' });
    lfo.audio.setParam('rate', 0.3); lfo.params.rate = 0.3;
    lfo.audio.setParam('depth', 500); lfo.params.depth = 500;
  },

  'mono-rack'() {
    const kb = addModule('keyboard', 50, 150);
    const voice = addModule('mono-voice', 350, 50);
    const del = addModule('delay', 650, 50);
    const rev = addModule('reverb', 650, 280);
    const out = addModule('output', 950, 150);

    // Keyboard → Voice
    connectModules({ moduleId: kb.id, portName: 'freq' }, { moduleId: voice.id, portName: 'pitch_cv' });
    voice.audio.setParam('frequency', 0); voice.params.frequency = 0;
    connectModules({ moduleId: kb.id, portName: 'gate' }, { moduleId: voice.id, portName: 'gate' });

    // Voice → Delay → Reverb → Output
    connectModules({ moduleId: voice.id, portName: 'out' }, { moduleId: del.id, portName: 'in' });
    del.audio.setParam('mix', 0.3); del.params.mix = 0.3;
    del.audio.setParam('time', 0.4); del.params.time = 0.4;
    connectModules({ moduleId: del.id, portName: 'out' }, { moduleId: rev.id, portName: 'in' });
    rev.audio.setParam('mix', 0.25); rev.params.mix = 0.25;
    connectModules({ moduleId: rev.id, portName: 'out' }, { moduleId: out.id, portName: 'in' });
  },

  drums() {
    const dm = addModule('drum-machine', 100, 50);
    const del = addModule('delay', 400, 50);
    const out = addModule('output', 650, 50);
    connectModules({ moduleId: dm.id, portName: 'out' }, { moduleId: del.id, portName: 'in' });
    del.audio.setParam('mix', 0.15); del.params.mix = 0.15;
    del.audio.setParam('feedback', 0.3); del.params.feedback = 0.3;
    connectModules({ moduleId: del.id, portName: 'out' }, { moduleId: out.id, portName: 'in' });
  },
};
