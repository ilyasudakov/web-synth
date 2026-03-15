export const modules = {};
export const cables = [];

export let moduleIdCounter = 0;
export function nextModuleId() { return moduleIdCounter++; }
export function setModuleIdCounter(val) { moduleIdCounter = val; }

// Zoom & pan
export const view = { zoom: 1, panX: 0, panY: 0 };
