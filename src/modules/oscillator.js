export default {
  label: 'Oscillator',
  inputs: ['freq_cv'],
  outputs: ['out'],
  params: {
    frequency: { min: 20, max: 8000, default: 440, unit: 'Hz', log: true },
    detune: { min: -100, max: 100, default: 0, unit: 'ct' },
  },
  options: { waveform: ['sine', 'square', 'sawtooth', 'triangle'] },
  create(ctx) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440;
    osc.start();
    return {
      getInput(name) { return name === 'freq_cv' ? osc.frequency : null; },
      getOutput() { return osc; },
      setParam(name, val) {
        if (name === 'frequency') osc.frequency.value = val;
        if (name === 'detune') osc.detune.value = val;
      },
      setOption(name, val) { if (name === 'waveform') osc.type = val; },
      destroy() { osc.stop(); osc.disconnect(); },
    };
  },
};
