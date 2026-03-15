export default {
  label: 'Reverb',
  inputs: ['in'],
  outputs: ['out'],
  params: {
    decay: { min: 0.1, max: 10, default: 2.5, unit: 's' },
    mix: { min: 0, max: 1, default: 0.5, unit: '' },
  },
  options: {},
  create(ctx) {
    const input = ctx.createGain();
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const output = ctx.createGain();
    let convolver = ctx.createConvolver();

    dry.gain.value = 0.5;
    wet.gain.value = 0.5;

    function buildIR(duration) {
      const rate = ctx.sampleRate;
      const len = rate * duration;
      const ir = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        }
      }
      return ir;
    }

    convolver.buffer = buildIR(2.5);
    input.connect(dry);
    input.connect(convolver);
    convolver.connect(wet);
    dry.connect(output);
    wet.connect(output);

    return {
      getInput(name) { return name === 'in' ? input : null; },
      getOutput() { return output; },
      setParam(name, val) {
        if (name === 'decay') {
          const newConv = ctx.createConvolver();
          newConv.buffer = buildIR(val);
          input.disconnect(convolver);
          convolver.disconnect(wet);
          convolver = newConv;
          input.connect(convolver);
          convolver.connect(wet);
        }
        if (name === 'mix') { wet.gain.value = val; dry.gain.value = 1 - val; }
      },
      setOption() {},
      destroy() { input.disconnect(); convolver.disconnect(); dry.disconnect(); wet.disconnect(); output.disconnect(); },
    };
  },
};
