const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

export default {
  label: 'Sequencer',
  inputs: ['clock'],
  outputs: ['freq', 'gate'],
  params: {
    steps: { min: 2, max: 16, default: 8, unit: '' },
  },
  options: {},
  create(ctx) {
    const freqSrc = ctx.createConstantSource();
    freqSrc.offset.value = 440;
    freqSrc.start();
    const gateSrc = ctx.createConstantSource();
    gateSrc.offset.value = 0;
    gateSrc.start();

    let sequence = [];
    let numSteps = 8;
    let step = 0;
    const linkedEnvelopes = [];

    function regenerate() {
      sequence = [];
      for (let i = 0; i < 16; i++) {
        sequence.push(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]);
      }
    }
    regenerate();

    function advance() {
      const freq = sequence[step % numSteps];
      freqSrc.offset.value = freq;
      const now = ctx.currentTime;
      gateSrc.offset.setValueAtTime(1, now);
      gateSrc.offset.setValueAtTime(0, now + 0.05);
      linkedEnvelopes.forEach(env => {
        env.audio.triggerAttack();
        setTimeout(() => env.audio.triggerRelease(), 100);
      });
      step = (step + 1) % numSteps;
    }

    return {
      getInput() { return null; },
      getOutput(name) { return name === 'gate' ? gateSrc : freqSrc; },
      setParam(name, val) {
        if (name === 'steps') numSteps = Math.round(val);
      },
      setOption() {},
      advance,
      regenerate,
      linkedEnvelopes,
      destroy() { freqSrc.stop(); freqSrc.disconnect(); gateSrc.stop(); gateSrc.disconnect(); },
    };
  },
};
