/**
 * Standalone Visualizer module — large waveform/spectrum display.
 * Audio passes through (in → out) so it can be inserted anywhere in the chain.
 */
export default {
  label: 'Visualizer',
  inputs: ['in'],
  outputs: ['out'],
  params: {},
  options: { mode: ['wave', 'fft', 'both'] },
  isUtility: true,
  create(ctx) {
    const input = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    input.connect(analyser);

    // Pass-through: audio goes in and out unchanged
    const output = ctx.createGain();
    input.connect(output);

    let mode = 'wave';

    return {
      getInput(name) { return name === 'in' ? input : null; },
      getOutput(name) { return name === 'out' ? output : output; },
      analyser,
      getMode() { return mode; },
      setParam() {},
      setOption(name, val) { if (name === 'mode') mode = val; },
      destroy() { input.disconnect(); analyser.disconnect(); output.disconnect(); },
    };
  },
};
