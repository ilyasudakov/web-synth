export default {
  label: 'Note',
  inputs: [],
  outputs: [],
  params: {},
  options: {},
  isUtility: true,
  create() {
    return {
      getInput() { return null; },
      getOutput() { return null; },
      setParam() {},
      setOption() {},
      destroy() {},
    };
  },
};
