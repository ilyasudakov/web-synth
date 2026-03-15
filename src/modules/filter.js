export default {
  label: 'Filter',
  inputs: ['in', 'freq_cv'],
  outputs: ['out'],
  params: {
    frequency: { min: 20, max: 20000, default: 1000, unit: 'Hz', log: true },
    Q: { min: 0.1, max: 30, default: 1, unit: '' },
  },
  options: { type: ['lowpass', 'highpass', 'bandpass', 'notch'] },
  create(ctx) {
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 1000;
    filt.Q.value = 1;
    return {
      getInput(name) {
        if (name === 'in') return filt;
        if (name === 'freq_cv') return filt.frequency;
        return null;
      },
      getOutput() { return filt; },
      setParam(name, val) {
        if (name === 'frequency') filt.frequency.value = val;
        if (name === 'Q') filt.Q.value = val;
      },
      setOption(name, val) { if (name === 'type') filt.type = val; },
      destroy() { filt.disconnect(); },
    };
  },
};
