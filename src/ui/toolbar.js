import { MODULE_CATALOG } from '../modules/index.js';
import { addModule, clearAll } from './renderer.js';
import { loadPreset } from '../presets.js';
import {
  saveSession, saveAs, newSession, renameSession,
  loadSlot, deleteSlot, exportSession, importSession, renderSlots,
} from '../session.js';
import { toggleTheme } from '../theme.js';
import { toggleHandMode } from './viewport.js';

// Expose globals for inline handlers
window.addModule = (type) => addModule(type);
window.clearAll = clearAll;
window.loadPreset = (name) => loadPreset(name);
window.saveSession = saveSession;
window.saveAs = saveAs;
window.newSession = newSession;
window.renameSession = renameSession;
window.loadSlot = loadSlot;
window.deleteSlot = deleteSlot;
window.exportSession = exportSession;
window.importSession = importSession;
window.toggleTheme = toggleTheme;
window.toggleHandMode = toggleHandMode;

export function toggleDropdown(id) {
  const el = document.getElementById(id);
  const wasOpen = el.classList.contains('open');
  closeDropdowns();
  if (!wasOpen) {
    el.classList.add('open');
    if (id === 'session-dropdown') renderSlots();
  }
}

export function closeDropdowns() {
  document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
}

window.toggleDropdown = toggleDropdown;
window.closeDropdowns = closeDropdowns;

document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown-wrapper')) closeDropdowns();
});

export function buildToolbarHTML() {
  // Modules dropdown
  let modulesHtml = '';
  for (const group of MODULE_CATALOG) {
    modulesHtml += `<div class="dropdown-section">${group.section}</div>`;
    for (const item of group.items) {
      modulesHtml += `
        <div class="dropdown-item" onclick="addModule('${item.type}');closeDropdowns()">
          <span class="dropdown-item-name">${item.name}</span>
          <span class="dropdown-item-desc">${item.desc}</span>
        </div>`;
    }
  }

  // Presets dropdown
  const presets = [
    { key: 'simple', name: 'Simple', desc: 'Osc &rarr; VCA &rarr; Output &mdash; just a tone' },
    { key: 'keys', name: 'Keys', desc: 'Keyboard &rarr; Osc &rarr; Env &rarr; VCA &rarr; Out &mdash; play with A-K' },
    { key: 'generative', name: 'Generative', desc: 'Clock &rarr; Sequencer &rarr; Osc &rarr; Filter &rarr; Delay &mdash; auto-plays' },
    { key: 'ambient', name: 'Ambient', desc: 'Slow S&amp;H &rarr; Osc + LFO &rarr; Filter &rarr; Delay &mdash; dreamy' },
    { key: 'mono-rack', name: 'Mono Rack', desc: 'Keyboard &rarr; Mono Voice &rarr; Delay &rarr; Reverb &mdash; complete synth' },
    { key: 'drums', name: 'Drums', desc: 'Drum Machine &rarr; Delay &rarr; Output &mdash; instant beats' },
    { key: 'experimental-beat', name: 'Experimental Beat', desc: 'Breakbeat + random bass + filtered pad &mdash; full track' },
  ];
  let presetsHtml = presets.map(p => `
    <div class="dropdown-item" onclick="loadPreset('${p.key}');closeDropdowns()">
      <span class="dropdown-item-name">${p.name}</span>
      <span class="dropdown-item-desc">${p.desc}</span>
    </div>`).join('');

  return `
    <div class="dropdown-wrapper">
      <button class="toolbar-btn" onclick="toggleDropdown('modules-dropdown')">+ Add Module &#9662;</button>
      <div class="dropdown" id="modules-dropdown">${modulesHtml}</div>
    </div>

    <div class="dropdown-wrapper">
      <button class="toolbar-btn" onclick="toggleDropdown('presets-dropdown')">Presets &#9662;</button>
      <div class="dropdown" id="presets-dropdown">${presetsHtml}</div>
    </div>

    <div class="toolbar-separator"></div>

    <div class="dropdown-wrapper">
      <button class="toolbar-btn" onclick="toggleDropdown('session-dropdown')">File &#9662;</button>
      <div class="dropdown" id="session-dropdown">
        <div class="dropdown-item" onclick="newSession();closeDropdowns()">
          <span class="dropdown-item-name">New session</span>
          <span class="dropdown-item-desc">Start from scratch</span>
        </div>
        <div class="dropdown-item" onclick="saveSession();closeDropdowns()">
          <span class="dropdown-item-name">Save</span>
          <span class="dropdown-item-desc">Ctrl+S</span>
        </div>
        <div class="dropdown-item" onclick="saveAs();closeDropdowns()">
          <span class="dropdown-item-name">Save as...</span>
          <span class="dropdown-item-desc">Save with a new name</span>
        </div>
        <div class="dropdown-item" onclick="renameSession();closeDropdowns()">
          <span class="dropdown-item-name">Rename</span>
          <span class="dropdown-item-desc">Change session name</span>
        </div>
        <div class="dropdown-section">Open</div>
        <div id="session-slots"></div>
        <div class="dropdown-section">File</div>
        <div class="dropdown-item" onclick="exportSession();closeDropdowns()">
          <span class="dropdown-item-name">Export .json</span>
          <span class="dropdown-item-desc">Download patch file</span>
        </div>
        <div class="dropdown-item" onclick="importSession();closeDropdowns()">
          <span class="dropdown-item-name">Import .json</span>
          <span class="dropdown-item-desc">Load from file</span>
        </div>
        <div class="dropdown-section"></div>
        <div class="dropdown-item module-menu-danger" onclick="clearAll();closeDropdowns()">
          <span class="dropdown-item-name">Clear all</span>
          <span class="dropdown-item-desc">Remove everything from canvas</span>
        </div>
      </div>
    </div>

    <div class="toolbar-spacer"></div>

    <div class="session-indicator">
      <div class="session-status new" id="session-status" title="New session"></div>
      <span class="session-name" id="session-name" onclick="renameSession()" title="Click to rename">Untitled</span>
      <button class="session-save-btn" onclick="saveSession()" title="Save (Ctrl+S)">Save</button>
    </div>

    <div class="toolbar-separator"></div>

    <button id="hand-mode-btn" onclick="toggleHandMode()" title="Hand tool (H)">&#9995;</button>
    <button id="theme-toggle" onclick="toggleTheme()" title="Toggle theme"></button>
  `;
}
