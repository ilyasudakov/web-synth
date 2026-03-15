export default {
  label: 'Envelope',
  inputs: ['gate'],
  outputs: ['out'],
  params: {
    attack: { min: 0.001, max: 2, default: 0.01, unit: 's' },
    decay: { min: 0.001, max: 2, default: 0.2, unit: 's' },
    sustain: { min: 0, max: 1, default: 0.5, unit: '' },
    release: { min: 0.001, max: 5, default: 0.3, unit: 's' },
  },
  options: {},
  create(ctx) {
    const src = ctx.createConstantSource();
    src.offset.value = 1;
    src.start();
    const envGain = ctx.createGain();
    envGain.gain.value = 0;
    src.connect(envGain);

    const params = { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 };
    return {
      getInput(name) { return name === 'gate' ? null : null; },
      getOutput() { return envGain; },
      setParam(name, val) { params[name] = val; },
      setOption() {},
      triggerAttack() {
        const now = ctx.currentTime;
        envGain.gain.cancelScheduledValues(now);
        envGain.gain.setValueAtTime(0, now);
        envGain.gain.linearRampToValueAtTime(1, now + params.attack);
        envGain.gain.linearRampToValueAtTime(params.sustain, now + params.attack + params.decay);
      },
      triggerRelease() {
        const now = ctx.currentTime;
        envGain.gain.cancelScheduledValues(now);
        envGain.gain.setValueAtTime(envGain.gain.value, now);
        envGain.gain.linearRampToValueAtTime(0, now + params.release);
      },
      destroy() { src.stop(); src.disconnect(); envGain.disconnect(); },
    };
  },
};
