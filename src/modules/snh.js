export default {
  label: 'Sample & Hold',
  inputs: ['clock', 'in'],
  outputs: ['out'],
  params: {
    min_freq: { min: 50, max: 2000, default: 200, unit: 'Hz', log: true },
    max_freq: { min: 100, max: 4000, default: 800, unit: 'Hz', log: true },
  },
  options: {},
  create(ctx) {
    const src = ctx.createConstantSource();
    src.offset.value = 440;
    src.start();
    let minF = 200, maxF = 800;

    function sample() {
      const freq = minF * Math.pow(maxF / minF, Math.random());
      src.offset.value = freq;
    }

    return {
      getInput() { return null; },
      getOutput() { return src; },
      setParam(name, val) {
        if (name === 'min_freq') minF = val;
        if (name === 'max_freq') maxF = val;
      },
      setOption() {},
      sample,
      destroy() { src.stop(); src.disconnect(); },
    };
  },
};
