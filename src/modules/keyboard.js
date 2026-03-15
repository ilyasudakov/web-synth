export default {
  label: 'Keyboard',
  inputs: [],
  outputs: ['freq', 'gate'],
  params: {},
  options: {},
  create(ctx) {
    const freqSrc = ctx.createConstantSource();
    freqSrc.offset.value = 440;
    freqSrc.start();
    const gateSrc = ctx.createConstantSource();
    gateSrc.offset.value = 0;
    gateSrc.start();
    return {
      getInput() { return null; },
      getOutput(name) { return name === 'gate' ? gateSrc : freqSrc; },
      setParam() {},
      setOption() {},
      setFreq(f) { freqSrc.offset.value = f; },
      setGate(v) { gateSrc.offset.value = v; },
      destroy() { freqSrc.stop(); freqSrc.disconnect(); gateSrc.stop(); gateSrc.disconnect(); },
    };
  },
};
