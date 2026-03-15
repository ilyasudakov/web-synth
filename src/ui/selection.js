import { modules, view } from '../state.js';
import { removeModule } from './renderer.js';
import { updateCables } from './cables.js';
import { markDirty } from '../dirty.js';

const selected = new Set();
let selectionRect = null; // { startX, startY } in screen coords
let rectEl = null;
let marqueeJustEnded = false;

export function didMarqueeJustEnd() {
  if (marqueeJustEnded) { marqueeJustEnded = false; return true; }
  return false;
}

export function getSelected() { return selected; }

export function isSelected(id) { return selected.has(id); }

export function selectModule(id, additive = false) {
  if (!additive) clearSelection();
  selected.add(id);
  updateSelectionVisuals();
}

export function deselectModule(id) {
  selected.delete(id);
  updateSelectionVisuals();
}

export function toggleSelect(id, additive = false) {
  if (selected.has(id)) {
    if (additive) { selected.delete(id); }
    else { clearSelection(); selected.add(id); }
  } else {
    if (!additive) clearSelection();
    selected.add(id);
  }
  updateSelectionVisuals();
}

export function clearSelection() {
  selected.clear();
  updateSelectionVisuals();
}

export function selectAll() {
  for (const id of Object.keys(modules)) selected.add(Number(id));
  updateSelectionVisuals();
}

export function deleteSelected() {
  const ids = [...selected];
  selected.clear();
  ids.forEach(id => removeModule(id));
  markDirty();
}

function updateSelectionVisuals() {
  document.querySelectorAll('.module').forEach(el => {
    const id = Number(el.dataset.id);
    el.classList.toggle('selected', selected.has(id));
  });
}

// ── Selection rectangle (marquee) ──

export function startMarquee(e) {
  selectionRect = { startX: e.clientX, startY: e.clientY };
  if (!rectEl) {
    rectEl = document.createElement('div');
    rectEl.id = 'selection-rect';
    document.getElementById('canvas-container').appendChild(rectEl);
  }
  rectEl.style.display = 'block';
  rectEl.style.left = e.clientX + 'px';
  rectEl.style.top = e.clientY + 'px';
  rectEl.style.width = '0px';
  rectEl.style.height = '0px';
}

export function updateMarquee(e) {
  if (!selectionRect) return false;
  const x = Math.min(selectionRect.startX, e.clientX);
  const y = Math.min(selectionRect.startY, e.clientY);
  const w = Math.abs(e.clientX - selectionRect.startX);
  const h = Math.abs(e.clientY - selectionRect.startY);

  const container = document.getElementById('canvas-container').getBoundingClientRect();
  rectEl.style.left = (x - container.left) + 'px';
  rectEl.style.top = (y - container.top) + 'px';
  rectEl.style.width = w + 'px';
  rectEl.style.height = h + 'px';
  return true;
}

export function endMarquee(e, additive = false) {
  if (!selectionRect) return;
  if (!additive) clearSelection();

  // Selection rect in screen coords
  const sx = Math.min(selectionRect.startX, e.clientX);
  const sy = Math.min(selectionRect.startY, e.clientY);
  const sw = Math.abs(e.clientX - selectionRect.startX);
  const sh = Math.abs(e.clientY - selectionRect.startY);

  // Only select if rect is at least a few pixels (not just a click)
  if (sw > 5 || sh > 5) {
    for (const mod of Object.values(modules)) {
      const rect = mod.el.getBoundingClientRect();
      // Check overlap
      if (rect.left < sx + sw && rect.right > sx &&
          rect.top < sy + sh && rect.bottom > sy) {
        selected.add(mod.id);
      }
    }
    updateSelectionVisuals();
  }

  selectionRect = null;
  marqueeJustEnded = true;
  if (rectEl) rectEl.style.display = 'none';
}

export function isMarqueeActive() { return selectionRect !== null; }

// ── Multi-drag ──

let multiDragState = null;

export function startMultiDrag(e, triggeredModId) {
  // If the dragged module is not selected, select only it
  if (!selected.has(triggeredModId)) {
    if (!e.shiftKey) clearSelection();
    selected.add(triggeredModId);
    updateSelectionVisuals();
  }

  const container = document.getElementById('canvas-container').getBoundingClientRect();
  const worldX = (e.clientX - container.left - view.panX) / view.zoom;
  const worldY = (e.clientY - container.top - view.panY) / view.zoom;

  // Store offsets for each selected module
  const offsets = {};
  for (const id of selected) {
    const mod = modules[id];
    if (mod) {
      offsets[id] = { dx: mod.x - worldX, dy: mod.y - worldY };
    }
  }
  multiDragState = { offsets };
}

export function updateMultiDrag(e) {
  if (!multiDragState) return false;
  const container = document.getElementById('canvas-container').getBoundingClientRect();
  const worldX = (e.clientX - container.left - view.panX) / view.zoom;
  const worldY = (e.clientY - container.top - view.panY) / view.zoom;

  for (const [id, offset] of Object.entries(multiDragState.offsets)) {
    const mod = modules[id];
    if (!mod) continue;
    mod.x = worldX + offset.dx;
    mod.y = worldY + offset.dy;
    mod.el.style.left = mod.x + 'px';
    mod.el.style.top = mod.y + 'px';
  }
  updateCables();
  return true;
}

export function endMultiDrag() {
  if (!multiDragState) return false;
  multiDragState = null;
  markDirty();
  return true;
}

export function isMultiDragging() { return multiDragState !== null; }
