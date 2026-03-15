/**
 * Drum Machine rack — 4 voices (kick, snare, hat, clap) with
 * built-in 16-step pattern sequencer and internal clock.
 *
 * External ports:
 *   Inputs:  clock (external clock overrides internal)
 *   Outputs: out, kick_out, snare_out
 */

const DEFAULT_PATTERNS = {
  kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  clap:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
};

export default {
  label: 'Drum Machine',
  inputs: ['clock'],
  outputs: ['out'],
  params: {
    bpm: { min: 40, max: 300, default: 120, unit: 'bpm' },
    kick_vol: { min: 0, max: 1, default: 0.8, unit: '' },
    snare_vol: { min: 0, max: 1, default: 0.7, unit: '' },
    hat_vol: { min: 0, max: 1, default: 0.4, unit: '' },
    clap_vol: { min: 0, max: 1, default: 0.5, unit: '' },
    swing: { min: 0, max: 0.5, default: 0, unit: '' },
  },
  options: {
    pattern: ['basic', 'four-on-floor', 'breakbeat', 'minimal'],
  },
  create(ctx) {
    const output = ctx.createGain();
    output.gain.value = 1;

    // Create 4 drum voices inline
    const voices = {};
    const gains = {};
    for (const type of ['kick', 'snare', 'hat', 'clap']) {
      gains[type] = ctx.createGain();
      gains[type].connect(output);
    }
    gains.kick.gain.value = 0.8;
    gains.snare.gain.value = 0.7;
    gains.hat.gain.value = 0.4;
    gains.clap.gain.value = 0.5;

    // Patterns
    let patterns = JSON.parse(JSON.stringify(DEFAULT_PATTERNS));
    let step = 0;
    let bpm = 120;
    let swing = 0;
    let running = true;
    let nextTickTime = ctx.currentTime + 0.1;
    let timerId = null;
    let useExternalClock = false;

    const PATTERNS_LIB = {
      basic: {
        kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
        clap:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
      },
      'four-on-floor': {
        kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hat:   [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1],
        clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      },
      breakbeat: {
        kick:  [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,1,0],
        snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
        hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
        clap:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,1,0,0],
      },
      minimal: {
        kick:  [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0],
        snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
        hat:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
        clap:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      },
    };

    function triggerVoice(type, time) {
      const g = gains[type];
      if (type === 'kick') {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, time);
        osc.frequency.exponentialRampToValueAtTime(55, time + 0.04);
        env.gain.setValueAtTime(1, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        osc.connect(env);
        env.connect(g);
        osc.start(time);
        osc.stop(time + 0.4);
      }
      if (type === 'snare') {
        const osc = ctx.createOscillator();
        const oscE = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.03);
        oscE.gain.setValueAtTime(0.6, time);
        oscE.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(oscE);
        oscE.connect(g);
        osc.start(time);
        osc.stop(time + 0.15);
        const n = makeNoise(ctx, 0.2);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 3000;
        const nE = ctx.createGain();
        nE.gain.setValueAtTime(0.8, time);
        nE.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        n.connect(hp); hp.connect(nE); nE.connect(g);
        n.start(time); n.stop(time + 0.2);
      }
      if (type === 'hat') {
        const n = makeNoise(ctx, 0.1);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 1;
        const e = ctx.createGain();
        e.gain.setValueAtTime(0.5, time);
        e.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
        n.connect(bp); bp.connect(e); e.connect(g);
        n.start(time); n.stop(time + 0.1);
      }
      if (type === 'clap') {
        const n = makeNoise(ctx, 0.15);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.7;
        const e = ctx.createGain();
        e.gain.setValueAtTime(0.6, time);
        e.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        n.connect(bp); bp.connect(e); e.connect(g);
        n.start(time); n.stop(time + 0.15);
      }
    }

    function advanceStep() {
      const time = ctx.currentTime;
      for (const type of ['kick', 'snare', 'hat', 'clap']) {
        if (patterns[type][step % 16]) {
          triggerVoice(type, time);
        }
      }
      step = (step + 1) % 16;
    }

    // Lookahead scheduler
    function scheduler() {
      if (useExternalClock) { timerId = setTimeout(scheduler, 50); return; }
      while (nextTickTime < ctx.currentTime + 0.05) {
        const time = nextTickTime;
        for (const type of ['kick', 'snare', 'hat', 'clap']) {
          if (patterns[type][step % 16]) {
            triggerVoice(type, time);
          }
        }
        step = (step + 1) % 16;
        // Swing: delay even steps
        const stepDur = (60 / bpm) / 4;
        const swingOffset = (step % 2 === 0) ? stepDur * swing : 0;
        nextTickTime += stepDur + swingOffset;
      }
      if (running) timerId = setTimeout(scheduler, 25);
    }

    nextTickTime = ctx.currentTime + 0.1;
    scheduler();

    return {
      getInput(name) { return name === 'clock' ? null : null; },
      getOutput() { return output; },
      setParam(name, val) {
        if (name === 'bpm') bpm = val;
        if (name === 'kick_vol') gains.kick.gain.value = val;
        if (name === 'snare_vol') gains.snare.gain.value = val;
        if (name === 'hat_vol') gains.hat.gain.value = val;
        if (name === 'clap_vol') gains.clap.gain.value = val;
        if (name === 'swing') swing = val;
      },
      setOption(name, val) {
        if (name === 'pattern' && PATTERNS_LIB[val]) {
          patterns = JSON.parse(JSON.stringify(PATTERNS_LIB[val]));
          step = 0;
        }
      },
      advanceStep,
      destroy() {
        running = false;
        clearTimeout(timerId);
        output.disconnect();
        Object.values(gains).forEach(g => g.disconnect());
      },
    };
  },
};

function makeNoise(ctx, dur) {
  const len = Math.max(ctx.sampleRate * dur, 1024);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  return s;
}
