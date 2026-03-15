import { view } from './state.js';
import { initViewport, handlePanMove, handlePanEnd, getIsPanning, isPanActive, isHandMode, toggleHandMode } from './ui/viewport.js';
import { handleKnobDrag, clearKnobDrag, isKnobDragging } from './ui/knobs.js';
import {
  getCableDrag, setCableDrag, drawDragCable, clearDragCable,
  screenToWorld, connectModules, updateCables,
} from './ui/cables.js';
import { getDragState, clearDragState, duplicateModule } from './ui/renderer.js';
import { initKeyboardInput } from './ui/keyboard-input.js';
import { buildToolbarHTML } from './ui/toolbar.js';
import { initTheme } from './theme.js';
import { initSession, saveSession } from './session.js';
import { markDirty, onHistoryPush } from './dirty.js';
import { initHistory, pushSnapshot, undo, redo, isPaused } from './history.js';
import { serializeSession, restoreSession } from './session.js';
import {
  startMarquee, updateMarquee, endMarquee, isMarqueeActive,
  startMultiDrag, updateMultiDrag, endMultiDrag, isMultiDragging,
  clearSelection, selectAll, deleteSelected, toggleSelect, getSelected, selectModule,
  didMarqueeJustEnd,
} from './ui/selection.js';

// Build toolbar
document.getElementById('toolbar').innerHTML = buildToolbarHTML();

// Init systems
initTheme();
initViewport();
initKeyboardInput();

// ── Keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
  // Don't intercept when typing in inputs
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  // Ctrl+S — save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSession();
    return;
  }

  // Ctrl+Z — undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    return;
  }

  // Ctrl+Y or Ctrl+Shift+Z — redo
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z'))) {
    e.preventDefault();
    redo();
    return;
  }

  // Ctrl+D — duplicate selected
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    const sel = getSelected();
    if (sel.size > 0) {
      const ids = [...sel];
      clearSelection();
      ids.forEach(id => {
        const newMod = duplicateModule(id);
        if (newMod) selectModule(newMod.id, true);
      });
      markDirty();
    }
    return;
  }

  // Ctrl+A — select all
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault();
    selectAll();
    return;
  }

  // Delete / Backspace — delete selected
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (getSelected().size > 0) {
      e.preventDefault();
      deleteSelected();
    }
    return;
  }

  // Escape — exit hand mode first, then clear selection
  if (e.key === 'Escape') {
    if (isHandMode()) { toggleHandMode(); return; }
    clearSelection();
  }
});

// ── Mark dirty on input/change ──
document.addEventListener('input', () => markDirty());
document.addEventListener('change', () => markDirty());

const _origAddModule = window.addModule;
window.addModule = (...args) => { const r = _origAddModule(...args); markDirty(); return r; };

// ── Canvas mousedown — marquee selection ──
document.getElementById('canvas-container').addEventListener('mousedown', (e) => {
  // Only start marquee on left click directly on canvas/world (not on a module or port)
  if (e.button !== 0) return;
  if (isPanActive()) return; // panning (space or hand mode)
  const target = e.target;
  if (target.closest('.module') || target.closest('#toolbar') || target.closest('.patch-cable')) return;

  // Start marquee
  if (!e.shiftKey) clearSelection();
  startMarquee(e);
});

// ── Module click — select ──
document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const moduleEl = e.target.closest('.module');
  if (!moduleEl) return;
  const modId = Number(moduleEl.dataset.id);

  // If clicking on header (for drag), set up multi-drag if selected
  const header = e.target.closest('.module-header');
  if (header && !e.target.closest('.module-menu-wrapper') && !e.target.classList.contains('module-bypass-btn')) {
    startMultiDrag(e, modId);
    e.preventDefault();
    return;
  }

  // Clicking on module body — just select
  if (!e.target.closest('.port') && !e.target.closest('.knob') &&
      !e.target.closest('.knob-value') && !e.target.closest('.knob-input') &&
      !e.target.closest('.module-select') && !e.target.closest('.module-textarea') &&
      !e.target.closest('.piano-key')) {
    toggleSelect(modId, e.shiftKey);
  }
});

// ── Global mouse move ──
document.addEventListener('mousemove', (e) => {
  if (handlePanMove(e)) return;

  // Multi-drag selected modules
  if (isMultiDragging()) {
    updateMultiDrag(e);
    return;
  }

  // Marquee selection
  if (isMarqueeActive()) {
    updateMarquee(e);
    return;
  }

  // Single module drag (legacy — now handled by multi-drag)
  const dragState = getDragState();
  if (dragState) {
    const container = document.getElementById('canvas-container').getBoundingClientRect();
    const x = (e.clientX - container.left - view.panX) / view.zoom - dragState.offsetX;
    const y = (e.clientY - container.top - view.panY) / view.zoom - dragState.offsetY;
    dragState.mod.x = x;
    dragState.mod.y = y;
    dragState.mod.el.style.left = x + 'px';
    dragState.mod.el.style.top = y + 'px';
    updateCables();
    return;
  }

  if (isKnobDragging()) {
    handleKnobDrag(e);
    return;
  }

  const cableDrag = getCableDrag();
  if (cableDrag) {
    const world = screenToWorld(e.clientX, e.clientY);
    drawDragCable(cableDrag.startX, cableDrag.startY, world.x, world.y);
    document.querySelectorAll('.port.drag-hover').forEach(p => p.classList.remove('drag-hover'));
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target.classList.contains('port') && target.dataset.type !== cableDrag.portType) {
      target.classList.add('drag-hover');
    }
  }
});

// ── Global mouse up ──
document.addEventListener('mouseup', (e) => {
  if (getIsPanning()) { handlePanEnd(); return; }

  // End multi-drag
  if (endMultiDrag()) return;

  // End marquee
  if (isMarqueeActive()) {
    endMarquee(e, e.shiftKey);
    return;
  }

  if (getDragState()) markDirty();
  if (isKnobDragging()) markDirty();

  clearDragState();
  clearKnobDrag();

  const cableDrag = getCableDrag();
  if (cableDrag) {
    document.querySelectorAll('.port.drag-hover').forEach(p => p.classList.remove('drag-hover'));
    clearDragCable();

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target.classList.contains('port') && target.dataset.type !== cableDrag.portType) {
      const targetModuleId = parseInt(target.dataset.module);
      const targetPortName = target.dataset.port;

      const src = cableDrag.portType === 'output'
        ? { moduleId: cableDrag.moduleId, portName: cableDrag.portName }
        : { moduleId: targetModuleId, portName: targetPortName };
      const dst = cableDrag.portType === 'input'
        ? { moduleId: cableDrag.moduleId, portName: cableDrag.portName }
        : { moduleId: targetModuleId, portName: targetPortName };

      connectModules(src, dst);
      markDirty();
    }
    setCableDrag(null);
  }
});

// Click on empty canvas — deselect all
document.getElementById('canvas-container').addEventListener('click', (e) => {
  if (didMarqueeJustEnd()) return; // don't clear after marquee
  if (e.target.closest('.module') || e.target.closest('.patch-cable')) return;
  if (!e.shiftKey) clearSelection();
});

window.addEventListener('resize', updateCables);

// Init session — must be last
initSession();

// Init undo/redo history after session loads
initHistory(serializeSession, restoreSession);

// Push snapshots on dirty (debounced to batch rapid changes)
let historyTimer = null;
onHistoryPush(() => {
  if (isPaused()) return;
  clearTimeout(historyTimer);
  historyTimer = setTimeout(() => pushSnapshot(), 300);
});
