export default {
  label: 'Noise',
  inputs: [],
  outputs: ['out'],
  params: {},
  options: { type: ['white', 'pink'] },
  create(ctx) {
    const bufferSize = ctx.sampleRate * 2;
    const whiteBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const node = ctx.createBufferSource();
    node.buffer = whiteBuffer;
    node.loop = true;
    node.start();

    return {
      getInput() { return null; },
      getOutput() { return node; },
      setParam() {},
      setOption() {},
      destroy() { node.stop(); node.disconnect(); },
    };
  },
};
