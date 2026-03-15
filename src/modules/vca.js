export default {
  label: 'VCA',
  inputs: ['in', 'cv'],
  outputs: ['out'],
  params: {
    gain: { min: 0, max: 1, default: 0.5, unit: '' },
  },
  options: {},
  create(ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    return {
      getInput(name) {
        if (name === 'in') return gain;
        if (name === 'cv') return gain.gain;
        return null;
      },
      getOutput() { return gain; },
      setParam(name, val) { if (name === 'gain') gain.gain.value = val; },
      setOption() {},
      destroy() { gain.disconnect(); },
    };
  },
};
