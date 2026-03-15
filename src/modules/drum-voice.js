/**
 * Drum Voice — single percussion voice with selectable type.
 *
 * Kick:  sine with fast pitch envelope (high → low) + amplitude decay
 * Snare: sine + filtered noise with medium decay
 * Hat:   bandpass-filtered noise with very short decay
 * Clap:  filtered noise with double-hit envelope
 */
export default {
  label: 'Drum Voice',
  inputs: ['gate'],
  outputs: ['out'],
  params: {
    pitch: { min: 20, max: 1000, default: 60, unit: 'Hz', log: true },
    decay: { min: 0.01, max: 2, default: 0.3, unit: 's' },
    tone: { min: 0, max: 1, default: 0.5, unit: '' },
    volume: { min: 0, max: 1, default: 0.8, unit: '' },
  },
  options: { type: ['kick', 'snare', 'hat', 'clap'] },
  create(ctx) {
    const output = ctx.createGain();
    output.gain.value = 0.8;
    let drumType = 'kick';
    let pitch = 60, decay = 0.3, tone = 0.5;

    function trigger() {
      const now = ctx.currentTime;

      if (drumType === 'kick') {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch * 4, now);
        osc.frequency.exponentialRampToValueAtTime(pitch, now + 0.04);
        env.gain.setValueAtTime(1, now);
        env.gain.exponentialRampToValueAtTime(0.001, now + decay);
        osc.connect(env);
        env.connect(output);
        osc.start(now);
        osc.stop(now + decay + 0.01);
      }

      if (drumType === 'snare') {
        // Tonal component
        const osc = ctx.createOscillator();
        const oscEnv = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch * 3, now);
        osc.frequency.exponentialRampToValueAtTime(pitch, now + 0.03);
        oscEnv.gain.setValueAtTime(tone, now);
        oscEnv.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.4);
        osc.connect(oscEnv);
        oscEnv.connect(output);
        osc.start(now);
        osc.stop(now + decay + 0.01);

        // Noise component
        const noise = createNoiseBuffer(ctx, decay);
        const noiseEnv = ctx.createGain();
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2000 + tone * 6000;
        noiseEnv.gain.setValueAtTime(1 - tone * 0.5, now);
        noiseEnv.gain.exponentialRampToValueAtTime(0.001, now + decay);
        noise.connect(hp);
        hp.connect(noiseEnv);
        noiseEnv.connect(output);
        noise.start(now);
        noise.stop(now + decay + 0.01);
      }

      if (drumType === 'hat') {
        const noise = createNoiseBuffer(ctx, decay);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 8000 + tone * 4000;
        bp.Q.value = 1.5;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.6, now);
        env.gain.exponentialRampToValueAtTime(0.001, now + decay);
        noise.connect(bp);
        bp.connect(env);
        env.connect(output);
        noise.start(now);
        noise.stop(now + decay + 0.01);
      }

      if (drumType === 'clap') {
        // Multiple short bursts of noise
        for (let i = 0; i < 3; i++) {
          const t = now + i * 0.015;
          const noise = createNoiseBuffer(ctx, 0.04);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1500 + tone * 2000;
          bp.Q.value = 1;
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.7, t);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
          noise.connect(bp);
          bp.connect(env);
          env.connect(output);
          noise.start(t);
          noise.stop(t + 0.04);
        }
        // Tail
        const tail = createNoiseBuffer(ctx, decay);
        const bp2 = ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.value = 1500 + tone * 2000;
        bp2.Q.value = 0.7;
        const tailEnv = ctx.createGain();
        tailEnv.gain.setValueAtTime(0.5, now + 0.05);
        tailEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.05 + decay);
        tail.connect(bp2);
        bp2.connect(tailEnv);
        tailEnv.connect(output);
        tail.start(now + 0.05);
        tail.stop(now + 0.05 + decay + 0.01);
      }
    }

    return {
      getInput() { return null; },
      getOutput() { return output; },
      setParam(name, val) {
        if (name === 'pitch') pitch = val;
        if (name === 'decay') decay = val;
        if (name === 'tone') tone = val;
        if (name === 'volume') output.gain.value = val;
      },
      setOption(name, val) { if (name === 'type') drumType = val; },
      triggerAttack: trigger,
      triggerRelease() {},
      destroy() { output.disconnect(); },
    };
  },
};

function createNoiseBuffer(ctx, duration) {
  const len = Math.max(ctx.sampleRate * duration, 1024);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}
