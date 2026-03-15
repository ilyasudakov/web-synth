import { modules, cables, view } from '../state.js';
import { MODULE_DEFS } from '../modules/index.js';
import { ensureAudio } from '../audio.js';
import { setupKnobs, valueToAngle, formatValue } from './knobs.js';
import { setupPorts, updateCables, connectModules, removeCable } from './cables.js';
import { wrapBypass, toggleBypass } from './bypass.js';
import { nextModuleId } from '../state.js';
import { markDirty } from '../dirty.js';

// Expose globally for inline onclick handlers
window.toggleModuleMenu = toggleModuleMenu;
window.toggleBypass = (e, id) => toggleBypass(e, id);
window.removeModule = removeModule;
window.duplicateModule = duplicateModule;
window.resetModuleParams = resetModuleParams;
window.disconnectModule = disconnectModule;
window.setModuleOption = setModuleOption;

const PIANO_NOTES = [
  { note: 'C', freq: 261.63, black: false },
  { note: 'C#', freq: 277.18, black: true },
  { note: 'D', freq: 293.66, black: false },
  { note: 'D#', freq: 311.13, black: true },
  { note: 'E', freq: 329.63, black: false },
  { note: 'F', freq: 349.23, black: false },
  { note: 'F#', freq: 369.99, black: true },
  { note: 'G', freq: 392.00, black: false },
  { note: 'G#', freq: 415.30, black: true },
  { note: 'A', freq: 440.00, black: false },
  { note: 'A#', freq: 466.16, black: true },
  { note: 'B', freq: 493.88, black: false },
  { note: 'C2', freq: 523.25, black: false },
];

export function addModule(type, x, y) {
  const audioCtx = ensureAudio();
  const def = MODULE_DEFS[type];
  const id = nextModuleId();
  const audio = def.create(audioCtx);

  if (x == null) {
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    x = (rect.width / 2 - view.panX) / view.zoom - 90 + (id % 5) * 30;
    y = (rect.height / 2 - view.panY) / view.zoom - 80 + Math.floor(id / 5) * 30;
  }

  const mod = { id, type, def, audio, x, y, params: {}, el: null, bypassed: false };
  for (const [k, p] of Object.entries(def.params || {})) mod.params[k] = p.default;

  // Bypass wiring
  wrapBypass(mod, audioCtx);

  modules[id] = mod;
  renderModule(mod);
  return mod;
}

function renderModule(mod) {
  const el = document.createElement('div');
  el.className = 'module';
  el.dataset.id = mod.id;
  el.style.left = mod.x + 'px';
  el.style.top = mod.y + 'px';

  let html = `
    <div class="module-header" data-drag="${mod.id}">
      <span>${mod.def.label}</span>
      <span class="module-type">#${mod.id}</span>
      <button class="module-bypass-btn" id="bypass-btn-${mod.id}" onclick="toggleBypass(event,${mod.id})" title="Bypass">&#9654;</button>
      <div class="module-menu-wrapper">
        <button class="module-menu-btn" onclick="toggleModuleMenu(event,${mod.id})">&#8942;</button>
        <div class="module-menu" id="module-menu-${mod.id}">
          <div class="module-menu-item" onclick="duplicateModule(${mod.id})">Duplicate</div>
          <div class="module-menu-item" onclick="resetModuleParams(${mod.id})">Reset params</div>
          <div class="module-menu-item" onclick="disconnectModule(${mod.id})">Disconnect all</div>
          <div class="module-menu-item module-menu-danger" onclick="removeModule(${mod.id})">Delete</div>
        </div>
      </div>
    </div>
    <div class="module-body">`;

  // Options (selects)
  for (const [name, values] of Object.entries(mod.def.options || {})) {
    html += `<div class="module-row">
      <select class="module-select" onchange="setModuleOption(${mod.id},'${name}',this.value)">
        ${values.map(v => `<option value="${v}">${v}</option>`).join('')}
      </select>
    </div>`;
  }

  // Knobs
  const paramEntries = Object.entries(mod.def.params || {});
  if (paramEntries.length > 0) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0;">';
    for (const [name, p] of paramEntries) {
      const angle = valueToAngle(p.default, p);
      html += `
        <div class="knob-container">
          <div class="knob" data-module="${mod.id}" data-param="${name}">
            <div class="knob-indicator" style="transform:translateX(-50%) rotate(${angle}deg)"></div>
          </div>
          <span class="knob-value" id="knob-val-${mod.id}-${name}">${formatValue(p.default, p)}</span>
          <span class="knob-label">${name}</span>
        </div>`;
    }
    html += '</div>';
  }

  // Ports
  const maxPorts = Math.max(mod.def.inputs.length, mod.def.outputs.length);
  for (let i = 0; i < maxPorts; i++) {
    html += '<div class="module-row">';
    if (i < mod.def.inputs.length) {
      const pName = mod.def.inputs[i];
      html += `<div class="port input" data-module="${mod.id}" data-port="${pName}" data-type="input" title="${pName}"></div>
               <span class="port-label">${pName}</span>`;
    } else {
      html += '<div style="width:14px"></div><span class="port-label"></span>';
    }
    html += '<span style="flex:1"></span>';
    if (i < mod.def.outputs.length) {
      const pName = mod.def.outputs[i];
      html += `<span class="port-label">${pName}</span>
               <div class="port output" data-module="${mod.id}" data-port="${pName}" data-type="output" title="${pName}"></div>`;
    }
    html += '</div>';
  }

  // Keyboard keys
  if (mod.type === 'keyboard') html += renderKeyboardKeys();

  // Text module
  if (mod.type === 'text') {
    const savedText = mod._text || '';
    html += `<textarea class="module-textarea" data-module="${mod.id}"
      placeholder="Type notes here..."
      oninput="modules[${mod.id}]._text=this.value">${savedText}</textarea>`;
  }

  html += '</div>';
  el.innerHTML = html;

  document.getElementById('world').appendChild(el);
  mod.el = el;

  setupDrag(el, mod);
  setupKnobs(el, mod);
  setupPorts(el, mod);
  if (mod.type === 'keyboard') setupKeyboard(el, mod);
}

function renderKeyboardKeys() {
  let html = '<div style="display:flex;position:relative;height:60px;margin-top:8px;">';
  for (const n of PIANO_NOTES) {
    if (n.black) {
      html += `<div data-freq="${n.freq}" style="position:absolute;width:16px;height:36px;background:#333;border:1px solid #555;border-radius:0 0 3px 3px;z-index:2;margin-left:-8px;cursor:pointer;" class="piano-key black-key"></div>`;
    } else {
      html += `<div data-freq="${n.freq}" style="width:22px;height:56px;background:#ddd;border:1px solid #999;border-radius:0 0 3px 3px;cursor:pointer;" class="piano-key white-key"></div>`;
    }
  }
  html += '</div>';
  return html;
}

// ── Drag ──
let dragState = null;
export function getDragState() { return dragState; }
export function clearDragState() { dragState = null; }

function setupDrag(el, mod) {
  // Drag is now handled by selection.js multi-drag via main.js mousedown listener.
  // This is kept as a no-op so renderModule() doesn't break.
}

// ── Keyboard ──
function setupKeyboard(el, mod) {
  el.querySelectorAll('.piano-key').forEach(key => {
    const freq = parseFloat(key.dataset.freq);
    const isBlack = key.classList.contains('black-key');
    key.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      mod.audio.setFreq(freq);
      mod.audio.setGate(1);
      key.style.background = isBlack ? '#e94560' : '#ffcccc';
      if (mod._linkedEnvelopes) mod._linkedEnvelopes.forEach(env => env.audio.triggerAttack());
    });
    const release = () => {
      mod.audio.setGate(0);
      key.style.background = isBlack ? '#333' : '#ddd';
      if (mod._linkedEnvelopes) mod._linkedEnvelopes.forEach(env => env.audio.triggerRelease());
    };
    key.addEventListener('mouseup', release);
    key.addEventListener('mouseleave', release);
  });
}

// ── Module actions ──
function setModuleOption(modId, name, val) {
  const mod = modules[modId];
  if (mod) mod.audio.setOption(name, val);
}

export function removeModule(id) {
  closeModuleMenus();
  const mod = modules[id];
  if (!mod) return;
  for (let i = cables.length - 1; i >= 0; i--) {
    if (cables[i].src.moduleId === id || cables[i].dst.moduleId === id) removeCable(i);
  }
  mod.audio.destroy();
  mod.el.remove();
  delete modules[id];
  markDirty();
}

function duplicateModule(id) {
  closeModuleMenus();
  const mod = modules[id];
  if (!mod) return;
  const newMod = addModule(mod.type, mod.x + 30, mod.y + 30);
  for (const [k, v] of Object.entries(mod.params)) {
    newMod.params[k] = v;
    newMod.audio.setParam(k, v);
  }
  updateKnobVisuals(newMod);
}

function resetModuleParams(id) {
  closeModuleMenus();
  const mod = modules[id];
  if (!mod) return;
  for (const [k, p] of Object.entries(mod.def.params || {})) {
    mod.params[k] = p.default;
    mod.audio.setParam(k, p.default);
  }
  updateKnobVisuals(mod);
}

function disconnectModule(id) {
  closeModuleMenus();
  for (let i = cables.length - 1; i >= 0; i--) {
    if (cables[i].src.moduleId === id || cables[i].dst.moduleId === id) removeCable(i);
  }
}

export function updateKnobVisuals(mod) {
  mod.el.querySelectorAll('.knob').forEach(knob => {
    const paramName = knob.dataset.param;
    const p = mod.def.params[paramName];
    if (p && mod.params[paramName] != null) {
      const angle = valueToAngle(mod.params[paramName], p);
      knob.querySelector('.knob-indicator').style.transform = `translateX(-50%) rotate(${angle}deg)`;
      const valEl = document.getElementById(`knob-val-${mod.id}-${paramName}`);
      if (valEl) valEl.textContent = formatValue(mod.params[paramName], p);
    }
  });
}

function toggleModuleMenu(e, id) {
  e.stopPropagation();
  const menu = document.getElementById(`module-menu-${id}`);
  const wasOpen = menu.classList.contains('open');
  closeModuleMenus();
  if (!wasOpen) menu.classList.add('open');
}

function closeModuleMenus() {
  document.querySelectorAll('.module-menu.open').forEach(m => m.classList.remove('open'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.module-menu-wrapper')) closeModuleMenus();
});

export function clearAll() {
  const ids = Object.keys(modules).map(Number);
  ids.forEach(id => removeModule(id));
}

// Make modules accessible for inline textarea oninput
window.modules = modules;
