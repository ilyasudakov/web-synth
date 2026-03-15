import { modules, cables, view, setModuleIdCounter } from './state.js';
import { addModule, clearAll, updateKnobVisuals } from './ui/renderer.js';
import { connectModules, updateCables } from './ui/cables.js';
import { toggleBypass } from './ui/bypass.js';
import { applyTransform } from './ui/viewport.js';
import { showToast } from './toast.js';
import { onDirty } from './dirty.js';

const STORAGE_KEY = 'websynth_session';
const SLOTS_KEY = 'websynth_slots';
const CURRENT_KEY = 'websynth_current'; // { name, saved }
const AUTOSAVE_KEY = 'websynth_autosave';

let sessionName = 'Untitled';
let isDirty = false;
let autosaveTimer = null;

// ── Session name & status ──

export function getSessionName() { return sessionName; }
export function getIsDirty() { return isDirty; }
export function isSavedSession() {
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}');
  return sessionName in slots;
}

export function setSessionName(name) {
  sessionName = name;
  localStorage.setItem(CURRENT_KEY, JSON.stringify({ name }));
  updateSessionUI();
}

export function markDirty() {
  if (!isDirty) {
    isDirty = true;
    updateSessionUI();
  }
  scheduleAutosave();
}

export function markClean() {
  isDirty = false;
  updateSessionUI();
}

function updateSessionUI() {
  const nameEl = document.getElementById('session-name');
  const statusEl = document.getElementById('session-status');
  if (nameEl) nameEl.textContent = sessionName;
  if (statusEl) {
    statusEl.className = 'session-status';
    if (isDirty) {
      statusEl.classList.add('unsaved');
      statusEl.title = 'Unsaved changes';
    } else if (isSavedSession()) {
      statusEl.classList.add('saved');
      statusEl.title = 'Saved';
    } else {
      statusEl.classList.add('new');
      statusEl.title = 'New session';
    }
  }
  // Update page title
  document.title = `${isDirty ? '\u2022 ' : ''}${sessionName} — Web Synth`;
}

// ── Autosave ──

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializeSession()));
  }, 1000);
}

// ── Serialize / Restore ──

export function serializeSession() {
  const mods = [];
  for (const mod of Object.values(modules)) {
    const options = {};
    mod.el.querySelectorAll('.module-select').forEach((sel, idx) => {
      const name = Object.keys(mod.def.options || {})[idx];
      if (name) options[name] = sel.value;
    });
    mods.push({
      id: mod.id,
      type: mod.type,
      x: mod.x,
      y: mod.y,
      params: { ...mod.params },
      options,
      bypassed: mod.bypassed || false,
      text: mod._text || '',
    });
  }
  return {
    version: 1,
    name: sessionName,
    modules: mods,
    cables: cables.map(c => ({ src: c.src, dst: c.dst, color: c.color })),
    view: { zoom: view.zoom, panX: view.panX, panY: view.panY },
    nextId: Object.keys(modules).length ? Math.max(...Object.keys(modules).map(Number)) + 1 : 0,
    timestamp: Date.now(),
  };
}

export function restoreSession(data, { silent = false } = {}) {
  clearAll();

  if (data.name) sessionName = data.name;

  if (data.view) {
    view.zoom = data.view.zoom || 1;
    view.panX = data.view.panX || 0;
    view.panY = data.view.panY || 0;
    applyTransform();
  }

  const idMap = {};
  for (const mData of data.modules) {
    const mod = addModule(mData.type, mData.x, mData.y);
    idMap[mData.id] = mod;
    for (const [k, v] of Object.entries(mData.params || {})) { mod.params[k] = v; mod.audio.setParam(k, v); }
    for (const [k, v] of Object.entries(mData.options || {})) { mod.audio.setOption(k, v); }
    updateKnobVisuals(mod);
    const selects = mod.el.querySelectorAll('.module-select');
    const optionKeys = Object.keys(mod.def.options || {});
    selects.forEach((sel, i) => { const key = optionKeys[i]; if (key && mData.options[key]) sel.value = mData.options[key]; });
    if (mData.text) { mod._text = mData.text; const ta = mod.el.querySelector('.module-textarea'); if (ta) ta.value = mData.text; }
    if (mData.bypassed) toggleBypass({ stopPropagation() {} }, mod.id);
  }

  for (const cData of data.cables) {
    const srcMod = idMap[cData.src.moduleId];
    const dstMod = idMap[cData.dst.moduleId];
    if (srcMod && dstMod) {
      connectModules(
        { moduleId: srcMod.id, portName: cData.src.portName },
        { moduleId: dstMod.id, portName: cData.dst.portName },
      );
    }
  }

  if (data.nextId) setModuleIdCounter(data.nextId);
  isDirty = false;
  localStorage.setItem(CURRENT_KEY, JSON.stringify({ name: sessionName }));
  updateSessionUI();
  requestAnimationFrame(() => updateCables());
  if (!silent) showToast(`Loaded "${sessionName}"`);
}

// ── User actions ──

/** Save current session (Ctrl+S style). If named, saves to slot. If untitled, prompts. */
export function saveSession() {
  if (sessionName === 'Untitled') {
    return saveAs();
  }
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}');
  slots[sessionName] = serializeSession();
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  markClean();
  showToast(`Saved "${sessionName}"`);
}

/** Save As — prompt for name */
export function saveAs() {
  const name = prompt('Session name:', sessionName === 'Untitled' ? '' : sessionName);
  if (!name) return;
  sessionName = name;
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}');
  slots[name] = serializeSession();
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  localStorage.setItem(CURRENT_KEY, JSON.stringify({ name }));
  markClean();
  showToast(`Saved "${name}"`);
}

/** New session */
export function newSession() {
  if (isDirty && !confirm('Discard unsaved changes?')) return;
  clearAll();
  sessionName = 'Untitled';
  isDirty = false;
  localStorage.setItem(CURRENT_KEY, JSON.stringify({ name: sessionName }));
  updateSessionUI();
  showToast('New session');
}

/** Rename current session */
export function renameSession() {
  const name = prompt('New name:', sessionName);
  if (!name || name === sessionName) return;
  // If was saved under old name, rename in slots
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}');
  if (slots[sessionName]) {
    slots[name] = slots[sessionName];
    delete slots[sessionName];
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  }
  sessionName = name;
  localStorage.setItem(CURRENT_KEY, JSON.stringify({ name }));
  markDirty();
  showToast(`Renamed to "${name}"`);
}

/** Load from slot */
export function loadSlot(name) {
  if (isDirty && !confirm('Discard unsaved changes?')) return;
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}');
  if (!slots[name]) return;
  restoreSession(slots[name]);
}

export function deleteSlot(name) {
  if (!confirm(`Delete "${name}"?`)) return;
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}');
  delete slots[name];
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  showToast(`Deleted "${name}"`);
}

export function renderSlots() {
  const container = document.getElementById('session-slots');
  if (!container) return;
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}');
  const names = Object.keys(slots);
  if (names.length === 0) {
    container.innerHTML = '<div style="padding:6px 14px;font-size:11px;color:var(--text-muted);">No saved sessions</div>';
    return;
  }
  container.innerHTML = names.map(name => {
    const ts = slots[name].timestamp;
    const date = ts ? new Date(ts).toLocaleString() : '';
    const safeName = name.replace(/'/g, "\\'");
    const isCurrent = name === sessionName;
    return `<div class="dropdown-item slot-item" style="flex-direction:row;align-items:center;gap:8px;${isCurrent ? 'background:var(--surface-alt);' : ''}">
      <div style="flex:1;cursor:pointer;" onclick="loadSlot('${safeName}');closeDropdowns()">
        <span class="dropdown-item-name">${isCurrent ? '\u25B6 ' : ''}${name}</span>
        <span class="dropdown-item-desc">${date}</span>
      </div>
      <button class="slot-delete" onclick="event.stopPropagation();deleteSlot('${safeName}');renderSlots();">&times;</button>
    </div>`;
  }).join('');
}

window.renderSlots = renderSlots;

export function exportSession() {
  const data = serializeSession();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sessionName.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported');
}

export function importSession() {
  document.getElementById('import-file').click();
}

// File input handler
document.getElementById('import-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      restoreSession(JSON.parse(reader.result));
    } catch (err) {
      showToast('Invalid file');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ── Init: try to restore autosave or last session ──

export function initSession() {
  // Wire up the dirty channel
  onDirty(() => markDirty());

  const current = JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null');
  if (current?.name) {
    sessionName = current.name;
    // Try to load from slots first
    const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}');
    if (slots[sessionName]) {
      restoreSession(slots[sessionName], { silent: true });
      return;
    }
  }
  // Try autosave
  const autosave = localStorage.getItem(AUTOSAVE_KEY);
  if (autosave) {
    try {
      const data = JSON.parse(autosave);
      if (data.modules?.length > 0) {
        restoreSession(data, { silent: true });
        isDirty = true;
        updateSessionUI();
        return;
      }
    } catch (e) { /* ignore */ }
  }
  updateSessionUI();
}
