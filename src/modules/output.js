export default {
  label: 'Output',
  inputs: ['in'],
  outputs: [],
  params: {
    volume: { min: 0, max: 1, default: 0.3, unit: '' },
  },
  options: {},
  create(ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    gain.connect(ctx.destination);
    return {
      getInput(name) { return name === 'in' ? gain : null; },
      getOutput() { return null; },
      setParam(name, val) { if (name === 'volume') gain.gain.value = val; },
      setOption() {},
      destroy() { gain.disconnect(); },
    };
  },
};
