import { modules, cables, view } from '../state.js';

let cableDrag = null;

export function getCableDrag() { return cableDrag; }
export function setCableDrag(val) { cableDrag = val; }

export function getPortCenter(portEl) {
  const rect = portEl.getBoundingClientRect();
  const container = document.getElementById('canvas-container').getBoundingClientRect();
  return {
    x: (rect.left + rect.width / 2 - container.left - view.panX) / view.zoom,
    y: (rect.top + rect.height / 2 - container.top - view.panY) / view.zoom,
  };
}

export function screenToWorld(clientX, clientY) {
  const container = document.getElementById('canvas-container').getBoundingClientRect();
  return {
    x: (clientX - container.left - view.panX) / view.zoom,
    y: (clientY - container.top - view.panY) / view.zoom,
  };
}

export function drawDragCable(x1, y1, x2, y2) {
  let line = document.getElementById('drag-cable');
  if (!line) {
    line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.id = 'drag-cable';
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#fff');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6 4');
    line.setAttribute('opacity', '0.7');
    document.getElementById('patch-canvas').appendChild(line);
  }
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const sag = Math.min(dist * 0.3, 80);
  const d = `M ${x1} ${y1} C ${x1 + dx * 0.25} ${y1 + sag}, ${x2 - dx * 0.25} ${y2 + sag}, ${x2} ${y2}`;
  line.setAttribute('d', d);
}

export function clearDragCable() {
  const line = document.getElementById('drag-cable');
  if (line) line.remove();
}

export function connectModules(src, dst) {
  const srcMod = modules[src.moduleId];
  const dstMod = modules[dst.moduleId];
  if (!srcMod || !dstMod) return;

  const exists = cables.some(c =>
    c.src.moduleId === src.moduleId && c.src.portName === src.portName &&
    c.dst.moduleId === dst.moduleId && c.dst.portName === dst.portName
  );
  if (exists) return;

  const outNode = srcMod.audio.getOutput(src.portName);
  const inNode = dstMod.audio.getInput(dst.portName);
  if (outNode && inNode) outNode.connect(inNode);

  // Keyboard → Envelope gate
  if (srcMod.type === 'keyboard' && dstMod.type === 'envelope' && dst.portName === 'gate') {
    if (!srcMod._linkedEnvelopes) srcMod._linkedEnvelopes = [];
    srcMod._linkedEnvelopes.push(dstMod);
  }

  // Sequencer → Envelope gate
  if (srcMod.type === 'sequencer' && dstMod.type === 'envelope' && dst.portName === 'gate') {
    srcMod.audio.linkedEnvelopes.push(dstMod);
  }

  // Clock → Sequencer
  if (srcMod.type === 'clock' && dstMod.type === 'sequencer' && dst.portName === 'clock') {
    const fn = () => dstMod.audio.advance();
    srcMod.audio.onTick(fn);
    if (!srcMod._clockLinks) srcMod._clockLinks = [];
    srcMod._clockLinks.push({ target: dstMod, fn });
  }

  // Clock → S&H
  if (srcMod.type === 'clock' && dstMod.type === 'snh' && dst.portName === 'clock') {
    const fn = () => dstMod.audio.sample();
    srcMod.audio.onTick(fn);
    if (!srcMod._clockLinks) srcMod._clockLinks = [];
    srcMod._clockLinks.push({ target: dstMod, fn });
  }

  const color = `hsl(${Math.random() * 360}, 70%, 60%)`;
  cables.push({ src, dst, color });
  updatePortVisuals();
  updateCables();
}

export function removeCable(index) {
  const cable = cables[index];
  const srcMod = modules[cable.src.moduleId];
  const dstMod = modules[cable.dst.moduleId];

  if (srcMod && dstMod) {
    const outNode = srcMod.audio.getOutput(cable.src.portName);
    const inNode = dstMod.audio.getInput(cable.dst.portName);
    if (outNode && inNode) { try { outNode.disconnect(inNode); } catch (e) { /* noop */ } }

    if (srcMod.type === 'keyboard' && dstMod.type === 'envelope' && srcMod._linkedEnvelopes) {
      srcMod._linkedEnvelopes = srcMod._linkedEnvelopes.filter(e => e !== dstMod);
    }
    if (srcMod.type === 'sequencer' && dstMod.type === 'envelope') {
      const idx = srcMod.audio.linkedEnvelopes.indexOf(dstMod);
      if (idx >= 0) srcMod.audio.linkedEnvelopes.splice(idx, 1);
    }
    if (srcMod.type === 'clock' && srcMod._clockLinks) {
      srcMod._clockLinks = srcMod._clockLinks.filter(link => {
        if (link.target === dstMod) { srcMod.audio.offTick(link.fn); return false; }
        return true;
      });
    }
  }

  cables.splice(index, 1);
  updatePortVisuals();
  updateCables();
}

export function updatePortVisuals() {
  document.querySelectorAll('.port').forEach(p => p.classList.remove('connected'));
  for (const cable of cables) {
    const srcPort = document.querySelector(`.port[data-module="${cable.src.moduleId}"][data-port="${cable.src.portName}"]`);
    const dstPort = document.querySelector(`.port[data-module="${cable.dst.moduleId}"][data-port="${cable.dst.portName}"]`);
    if (srcPort) srcPort.classList.add('connected');
    if (dstPort) dstPort.classList.add('connected');
  }
}

export function updateCables() {
  const svg = document.getElementById('patch-canvas');
  const dragCable = document.getElementById('drag-cable');
  svg.innerHTML = '';
  if (dragCable) svg.appendChild(dragCable);

  for (let i = 0; i < cables.length; i++) {
    const cable = cables[i];
    const p1 = getPortPosition(cable.src.moduleId, cable.src.portName);
    const p2 = getPortPosition(cable.dst.moduleId, cable.dst.portName);

    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sag = Math.min(dist * 0.3, 80);
    const d = `M ${p1.x} ${p1.y} C ${p1.x + dx * 0.25} ${p1.y + sag + dy * 0.1}, ${p2.x - dx * 0.25} ${p2.y + sag - dy * 0.1}, ${p2.x} ${p2.y}`;

    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glow.setAttribute('d', d);
    glow.setAttribute('class', 'cable-glow');
    glow.setAttribute('stroke', cable.color);
    svg.appendChild(glow);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'patch-cable');
    path.setAttribute('stroke', cable.color);
    path.addEventListener('contextmenu', ((idx) => (e) => {
      e.preventDefault();
      removeCable(idx);
    })(i));
    svg.appendChild(path);
  }
}

function getPortPosition(moduleId, portName) {
  const portEl = document.querySelector(`.port[data-module="${moduleId}"][data-port="${portName}"]`);
  if (!portEl) return { x: 0, y: 0 };
  return getPortCenter(portEl);
}

export function setupPorts(el, mod) {
  el.querySelectorAll('.port').forEach(port => {
    port.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const portName = port.dataset.port;
      const portType = port.dataset.type;
      const moduleId = parseInt(port.dataset.module);
      const pos = getPortCenter(port);
      cableDrag = { moduleId, portName, portType, startX: pos.x, startY: pos.y, el: port };
    });
  });
}
