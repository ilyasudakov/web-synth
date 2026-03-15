import { view } from '../state.js';
import { updateCables } from './cables.js';

let isPanning = false;
let panStart = { x: 0, y: 0 };
let spaceHeld = false;

export function isSpaceHeld() { return spaceHeld; }
export function getIsPanning() { return isPanning; }
export function setIsPanning(val) { isPanning = val; }

export function applyTransform() {
  const world = document.getElementById('world');
  world.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
  document.getElementById('zoom-display').textContent = Math.round(view.zoom * 100) + '%';
  updateGrid();
}

function updateGrid() {
  const container = document.getElementById('canvas-container');
  const small = 20 * view.zoom;
  const large = 100 * view.zoom;
  container.style.setProperty('--grid-small', small + 'px');
  container.style.setProperty('--grid-large', large + 'px');
  container.style.setProperty('--grid-ox', view.panX + 'px');
  container.style.setProperty('--grid-oy', view.panY + 'px');
}

export function initViewport() {
  const container = document.getElementById('canvas-container');

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZoom = view.zoom;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    view.zoom = Math.max(0.15, Math.min(4, view.zoom * delta));
    view.panX = mx - (mx - view.panX) * (view.zoom / oldZoom);
    view.panY = my - (my - view.panY) * (view.zoom / oldZoom);
    applyTransform();
    updateCables();
  }, { passive: false });

  container.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      isPanning = true;
      panStart = { x: e.clientX - view.panX, y: e.clientY - view.panY };
      container.style.cursor = 'grabbing';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat && document.activeElement === document.body) {
      spaceHeld = true;
      container.style.cursor = 'grab';
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceHeld = false;
      if (!isPanning) container.style.cursor = '';
    }
  });

  applyTransform();
}

export function handlePanMove(e) {
  if (!isPanning) return false;
  view.panX = e.clientX - panStart.x;
  view.panY = e.clientY - panStart.y;
  applyTransform();
  updateCables();
  return true;
}

export function handlePanEnd() {
  if (!isPanning) return;
  isPanning = false;
  const container = document.getElementById('canvas-container');
  container.style.cursor = spaceHeld ? 'grab' : '';
}
