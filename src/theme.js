const THEME_KEY = 'websynth_theme';

const THEMES = {
  dark: {
    '--bg': '#1a1a2e',
    '--bg-grid': 'rgba(255,255,255,0.04)',
    '--bg-grid-major': 'rgba(255,255,255,0.08)',
    '--surface': '#16213e',
    '--surface-alt': '#0f3460',
    '--border': '#533483',
    '--text': '#e0e0e0',
    '--text-dim': '#888',
    '--text-muted': '#666',
    '--accent': '#e94560',
    '--accent2': '#533483',
    '--port-input': '#00d2ff',
    '--port-output': '#e94560',
    '--module-shadow': 'rgba(0,0,0,0.4)',
    '--input-bg': '#111',
    '--bypass-active': '#4caf50',
  },
  light: {
    '--bg': '#e8e8f0',
    '--bg-grid': 'rgba(0,0,0,0.06)',
    '--bg-grid-major': 'rgba(0,0,0,0.12)',
    '--surface': '#ffffff',
    '--surface-alt': '#eef',
    '--border': '#b0a0d0',
    '--text': '#222',
    '--text-dim': '#666',
    '--text-muted': '#999',
    '--accent': '#d03050',
    '--accent2': '#7c5cbf',
    '--port-input': '#0090c0',
    '--port-output': '#d03050',
    '--module-shadow': 'rgba(0,0,0,0.12)',
    '--input-bg': '#f5f5f5',
    '--bypass-active': '#2e8b57',
  },
};

let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';

export function getTheme() { return currentTheme; }

export function applyTheme(name) {
  currentTheme = name;
  const vars = THEMES[name];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
  document.body.classList.toggle('theme-light', name === 'light');
  document.body.classList.toggle('theme-dark', name === 'dark');
  localStorage.setItem(THEME_KEY, name);

  // Update toggle button text
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = name === 'dark' ? '\u263E' : '\u2600'; // moon / sun
}

export function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  applyTheme(currentTheme);
}
