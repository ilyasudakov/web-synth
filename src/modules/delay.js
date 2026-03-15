export default {
  label: 'Delay',
  inputs: ['in'],
  outputs: ['out'],
  params: {
    time: { min: 0.01, max: 2, default: 0.3, unit: 's' },
    feedback: { min: 0, max: 0.95, default: 0.4, unit: '' },
    mix: { min: 0, max: 1, default: 0.5, unit: '' },
  },
  options: {},
  create(ctx) {
    const input = ctx.createGain();
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const output = ctx.createGain();
    const delayNode = ctx.createDelay(5);
    const fb = ctx.createGain();
    delayNode.delayTime.value = 0.3;
    fb.gain.value = 0.4;
    dry.gain.value = 0.5;
    wet.gain.value = 0.5;
    input.connect(dry);
    input.connect(delayNode);
    delayNode.connect(fb);
    fb.connect(delayNode);
    delayNode.connect(wet);
    dry.connect(output);
    wet.connect(output);
    return {
      getInput(name) { return name === 'in' ? input : null; },
      getOutput() { return output; },
      setParam(name, val) {
        if (name === 'time') delayNode.delayTime.value = val;
        if (name === 'feedback') fb.gain.value = val;
        if (name === 'mix') { wet.gain.value = val; dry.gain.value = 1 - val; }
      },
      setOption() {},
      destroy() { [input, dry, wet, output, delayNode, fb].forEach(n => n.disconnect()); },
    };
  },
};
