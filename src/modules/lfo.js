export default {
  label: 'LFO',
  inputs: [],
  outputs: ['out'],
  params: {
    rate: { min: 0.1, max: 30, default: 2, unit: 'Hz' },
    depth: { min: 0, max: 1000, default: 100, unit: '' },
  },
  options: { waveform: ['sine', 'square', 'sawtooth', 'triangle'] },
  create(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 2;
    gain.gain.value = 100;
    osc.connect(gain);
    osc.start();
    return {
      getInput() { return null; },
      getOutput() { return gain; },
      setParam(name, val) {
        if (name === 'rate') osc.frequency.value = val;
        if (name === 'depth') gain.gain.value = val;
      },
      setOption(name, val) { if (name === 'waveform') osc.type = val; },
      destroy() { osc.stop(); osc.disconnect(); gain.disconnect(); },
    };
  },
};
