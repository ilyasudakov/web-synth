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

  'experimental-beat'() {
    // ── Drums: breakbeat pattern, swung, into delay+reverb ──
    const dm = addModule('drum-machine', 50, 50);
    dm.audio.setOption('pattern', 'breakbeat');
    dm.audio.setParam('bpm', 85); dm.params.bpm = 85;
    dm.audio.setParam('swing', 0.15); dm.params.swing = 0.15;
    dm.audio.setParam('hat_vol', 0.25); dm.params.hat_vol = 0.25;
    dm.audio.setParam('snare_vol', 0.6); dm.params.snare_vol = 0.6;

    // ── Bass: S&H → low osc, clock-triggered envelope ──
    const clk = addModule('clock', 50, 350);
    clk.audio.setParam('bpm', 85); clk.params.bpm = 85;

    const snh = addModule('snh', 250, 350);
    snh.audio.setParam('min_freq', 40); snh.params.min_freq = 40;
    snh.audio.setParam('max_freq', 120); snh.params.max_freq = 120;
    connectModules({ moduleId: clk.id, portName: 'trigger' }, { moduleId: snh.id, portName: 'clock' });

    const bass = addModule('mono-voice', 450, 300);
    bass.audio.setParam('frequency', 0); bass.params.frequency = 0;
    bass.audio.setOption('waveform', 'square');
    bass.audio.setParam('cutoff', 400); bass.params.cutoff = 400;
    bass.audio.setParam('resonance', 8); bass.params.resonance = 8;
    bass.audio.setParam('env_amount', 600); bass.params.env_amount = 600;
    bass.audio.setParam('decay', 0.15); bass.params.decay = 0.15;
    bass.audio.setParam('sustain', 0.1); bass.params.sustain = 0.1;
    bass.audio.setParam('release', 0.1); bass.params.release = 0.1;
    bass.audio.setParam('volume', 0.5); bass.params.volume = 0.5;

    connectModules({ moduleId: snh.id, portName: 'out' }, { moduleId: bass.id, portName: 'pitch_cv' });
    connectModules({ moduleId: clk.id, portName: 'trigger' }, { moduleId: bass.id, portName: 'gate' });

    // ── Texture: slow S&H → filtered osc + LFO wobble ──
    const clk2 = addModule('clock', 50, 600);
    clk2.audio.setParam('bpm', 21); clk2.params.bpm = 21;

    const snh2 = addModule('snh', 250, 600);
    snh2.audio.setParam('min_freq', 200); snh2.params.min_freq = 200;
    snh2.audio.setParam('max_freq', 900); snh2.params.max_freq = 900;
    connectModules({ moduleId: clk2.id, portName: 'trigger' }, { moduleId: snh2.id, portName: 'clock' });

    const pad = addModule('oscillator', 450, 550);
    pad.audio.setOption('waveform', 'sawtooth');
    pad.audio.setParam('frequency', 0); pad.params.frequency = 0;
    connectModules({ moduleId: snh2.id, portName: 'out' }, { moduleId: pad.id, portName: 'freq_cv' });

    const lfo = addModule('lfo', 450, 750);
    lfo.audio.setParam('rate', 0.4); lfo.params.rate = 0.4;
    lfo.audio.setParam('depth', 800); lfo.params.depth = 800;

    const filt = addModule('filter', 700, 550);
    filt.audio.setParam('frequency', 600); filt.params.frequency = 600;
    filt.audio.setParam('Q', 6); filt.params.Q = 6;
    connectModules({ moduleId: pad.id, portName: 'out' }, { moduleId: filt.id, portName: 'in' });
    connectModules({ moduleId: lfo.id, portName: 'out' }, { moduleId: filt.id, portName: 'freq_cv' });

    const padEnv = addModule('envelope', 700, 750);
    padEnv.audio.setParam('attack', 0.2); padEnv.params = { attack: 0.2, decay: 0.8, sustain: 0.3, release: 0.5 };
    padEnv.audio.setParam('decay', 0.8);
    padEnv.audio.setParam('sustain', 0.3);
    padEnv.audio.setParam('release', 0.5);
    connectModules({ moduleId: clk2.id, portName: 'trigger' }, { moduleId: padEnv.id, portName: 'gate' });
    if (!clk2._clockLinks) clk2._clockLinks = [];
    const padTrig = () => { padEnv.audio.triggerAttack(); setTimeout(() => padEnv.audio.triggerRelease(), 1500); };
    clk2.audio.onTick(padTrig);
    clk2._clockLinks.push({ target: padEnv, fn: padTrig });

    const padVca = addModule('vca', 950, 600);
    padVca.audio.setParam('gain', 0); padVca.params.gain = 0;
    connectModules({ moduleId: filt.id, portName: 'out' }, { moduleId: padVca.id, portName: 'in' });
    connectModules({ moduleId: padEnv.id, portName: 'out' }, { moduleId: padVca.id, portName: 'cv' });

    // ── Mix bus: everything → delay → reverb → output ──
    const mixVca = addModule('vca', 950, 50);
    mixVca.audio.setParam('gain', 0.7); mixVca.params.gain = 0.7;
    connectModules({ moduleId: dm.id, portName: 'out' }, { moduleId: mixVca.id, portName: 'in' });

    const del = addModule('delay', 1200, 50);
    del.audio.setParam('time', 0.35); del.params.time = 0.35;
    del.audio.setParam('feedback', 0.45); del.params.feedback = 0.45;
    del.audio.setParam('mix', 0.25); del.params.mix = 0.25;

    const rev = addModule('reverb', 1200, 300);
    rev.audio.setParam('decay', 3); rev.params.decay = 3;
    rev.audio.setParam('mix', 0.35); rev.params.mix = 0.35;

    const out = addModule('output', 1450, 200);

    // Drums → VCA → delay
    connectModules({ moduleId: mixVca.id, portName: 'out' }, { moduleId: del.id, portName: 'in' });
    // Bass → delay
    connectModules({ moduleId: bass.id, portName: 'out' }, { moduleId: del.id, portName: 'in' });
    // Delay → reverb
    connectModules({ moduleId: del.id, portName: 'out' }, { moduleId: rev.id, portName: 'in' });
    // Pad → reverb
    connectModules({ moduleId: padVca.id, portName: 'out' }, { moduleId: rev.id, portName: 'in' });
    // Reverb → output
    connectModules({ moduleId: rev.id, portName: 'out' }, { moduleId: out.id, portName: 'in' });
  },
};
