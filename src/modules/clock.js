/**
 * Clock module — uses Web Audio scheduling for precise timing
 * instead of setInterval which drifts and causes audio glitches.
 */
export default {
  label: 'Clock',
  inputs: [],
  outputs: ['trigger'],
  params: {
    bpm: { min: 20, max: 300, default: 120, unit: 'bpm' },
  },
  options: {},
  create(ctx) {
    const src = ctx.createConstantSource();
    src.offset.value = 0;
    src.start();

    let bpm = 120;
    const listeners = [];
    let running = true;
    let nextTickTime = ctx.currentTime;
    let timerId = null;

    // Lookahead scheduler — schedules ticks ahead in small batches
    const LOOKAHEAD = 0.05;   // schedule 50ms ahead
    const INTERVAL = 25;      // check every 25ms

    function scheduler() {
      while (nextTickTime < ctx.currentTime + LOOKAHEAD) {
        // Schedule the tick in Web Audio time
        src.offset.setValueAtTime(1, nextTickTime);
        src.offset.setValueAtTime(0, nextTickTime + 0.02);

        // Fire JS callbacks (for sequencer/S&H)
        listeners.forEach(fn => fn());

        // Advance to next beat
        nextTickTime += 60 / bpm;
      }
      if (running) {
        timerId = setTimeout(scheduler, INTERVAL);
      }
    }

    nextTickTime = ctx.currentTime + 0.1;
    scheduler();

    return {
      getInput() { return null; },
      getOutput() { return src; },
      setParam(name, val) {
        if (name === 'bpm') bpm = val;
      },
      setOption() {},
      onTick(fn) { listeners.push(fn); },
      offTick(fn) {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      },
      destroy() {
        running = false;
        clearTimeout(timerId);
        src.stop();
        src.disconnect();
      },
    };
  },
};
