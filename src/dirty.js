/** Dirty-flag + history channel to avoid circular imports */

let dirtyListener = null;
let historyListener = null;

export function onDirty(fn) { dirtyListener = fn; }
export function onHistoryPush(fn) { historyListener = fn; }

export function markDirty() {
  if (dirtyListener) dirtyListener();
  if (historyListener) historyListener();
}
