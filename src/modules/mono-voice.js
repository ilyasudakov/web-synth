/**
 * Mono Voice — classic East Coast subtractive voice in a single module.
 *
 * Internal chain: Oscillator → Filter → VCA → out
 * Envelope controls VCA amplitude and optionally filter cutoff.
 *
 * External ports:
 *   Inputs:  pitch_cv, gate, filter_cv
 *   Outputs: out
 */
export default {
  label: 'Mono Voice',
  inputs: ['pitch_cv', 'gate', 'filter_cv'],
  outputs: ['out'],
  params: {
    frequency: { min: 20, max: 8000, default: 440, unit: 'Hz', log: true },
    cutoff: { min: 20, max: 20000, default: 2000, unit: 'Hz', log: true },
    resonance: { min: 0.1, max: 30, default: 2, unit: '' },
    env_amount: { min: 0, max: 8000, default: 2000, unit: 'Hz' },
    attack: { min: 0.001, max: 2, default: 0.01, unit: 's' },
    decay: { min: 0.001, max: 2, default: 0.2, unit: 's' },
    sustain: { min: 0, max: 1, default: 0.6, unit: '' },
    release: { min: 0.001, max: 5, default: 0.3, unit: 's' },
    volume: { min: 0, max: 1, default: 0.7, unit: '' },
  },
  options: { waveform: ['sawtooth', 'square', 'sine', 'triangle'] },
  create(ctx) {
    // ── Oscillator ──
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 440;
    osc.start();

    // ── Filter ──
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    // ── VCA (amplitude envelope) ──
    const vca = ctx.createGain();
    vca.gain.value = 0;

    // ── Output gain (volume) ──
    const output = ctx.createGain();
    output.gain.value = 0.7;

    // ── Internal routing ──
    osc.connect(filter);
    filter.connect(vca);
    vca.connect(output);

    // ── Envelope state ──
    const env = { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 };
    let envAmount = 2000;
    let baseCutoff = 2000;

    function triggerAttack() {
      const now = ctx.currentTime;
      // Amplitude envelope
      vca.gain.cancelScheduledValues(now);
      vca.gain.setValueAtTime(0, now);
      vca.gain.linearRampToValueAtTime(1, now + env.attack);
      vca.gain.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay);
      // Filter envelope
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(baseCutoff, now);
      filter.frequency.linearRampToValueAtTime(
        Math.min(baseCutoff + envAmount, 20000), now + env.attack
      );
      filter.frequency.linearRampToValueAtTime(
        baseCutoff + envAmount * env.sustain * 0.5, now + env.attack + env.decay
      );
    }

    function triggerRelease() {
      const now = ctx.currentTime;
      vca.gain.cancelScheduledValues(now);
      vca.gain.setValueAtTime(vca.gain.value, now);
      vca.gain.linearRampToValueAtTime(0, now + env.release);
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(baseCutoff, now + env.release);
    }

    return {
      getInput(name) {
        if (name === 'pitch_cv') return osc.frequency;
        if (name === 'filter_cv') return filter.frequency;
        if (name === 'gate') return null; // gate handled manually
        return null;
      },
      getOutput(name) { return name === 'out' ? output : output; },
      setParam(name, val) {
        if (name === 'frequency') osc.frequency.value = val;
        if (name === 'cutoff') { baseCutoff = val; filter.frequency.value = val; }
        if (name === 'resonance') filter.Q.value = val;
        if (name === 'env_amount') envAmount = val;
        if (name === 'attack') env.attack = val;
        if (name === 'decay') env.decay = val;
        if (name === 'sustain') env.sustain = val;
        if (name === 'release') env.release = val;
        if (name === 'volume') output.gain.value = val;
      },
      setOption(name, val) { if (name === 'waveform') osc.type = val; },
      triggerAttack,
      triggerRelease,
      destroy() { osc.stop(); osc.disconnect(); filter.disconnect(); vca.disconnect(); output.disconnect(); },
    };
  },
};
