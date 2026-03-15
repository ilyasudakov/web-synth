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

    // Soft limiter — prevents clipping / digital distortion
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;   // start compressing at -3dB
    limiter.knee.value = 6;         // soft knee
    limiter.ratio.value = 20;       // heavy ratio = limiter
    limiter.attack.value = 0.002;   // fast attack
    limiter.release.value = 0.05;   // quick release

    gain.connect(limiter);
    limiter.connect(ctx.destination);

    return {
      getInput(name) { return name === 'in' ? gain : null; },
      getOutput() { return null; },
      setParam(name, val) { if (name === 'volume') gain.gain.value = val; },
      setOption() {},
      destroy() { gain.disconnect(); limiter.disconnect(); },
    };
  },
};
