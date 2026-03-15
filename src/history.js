/**
 * Undo/Redo via state snapshots.
 * Each snapshot is a serialized session JSON string.
 */

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;

let serializeFn = null;
let restoreFn = null;
let lastSnapshot = null;
let paused = false;

export function initHistory(serialize, restore) {
  serializeFn = serialize;
  restoreFn = restore;
  // Take initial snapshot
  lastSnapshot = JSON.stringify(serialize());
  undoStack.length = 0;
  redoStack.length = 0;
}

/** Call after any change to push a new snapshot */
export function pushSnapshot() {
  if (paused || !serializeFn) return;
  const snap = JSON.stringify(serializeFn());
  if (snap === lastSnapshot) return; // no actual change
  undoStack.push(lastSnapshot);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  lastSnapshot = snap;
}

export function undo() {
  if (undoStack.length === 0 || !restoreFn) return;
  redoStack.push(lastSnapshot);
  lastSnapshot = undoStack.pop();
  paused = true;
  restoreFn(JSON.parse(lastSnapshot), { silent: true, skipHistory: true });
  paused = false;
}

export function redo() {
  if (redoStack.length === 0 || !restoreFn) return;
  undoStack.push(lastSnapshot);
  lastSnapshot = redoStack.pop();
  paused = true;
  restoreFn(JSON.parse(lastSnapshot), { silent: true, skipHistory: true });
  paused = false;
}

export function isPaused() { return paused; }

export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  if (serializeFn) lastSnapshot = JSON.stringify(serializeFn());
}
