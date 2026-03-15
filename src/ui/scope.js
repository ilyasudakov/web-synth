import { getAudioContext } from '../audio.js';

const scopes = new Map(); // moduleId → { analyser, canvas, ctx2d, animId, mode }

/**
 * Create and attach a scope visualizer to a module.
 * Connects an AnalyserNode to the module's output (or input for output-type modules).
 */
export function createScope(mod) {
  const audioCtx = getAudioContext();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  // Find a node to tap into
  let sourceNode = null;
  if (mod.def.outputs.length > 0) {
    sourceNode = mod.audio.getOutput(mod.def.outputs[0]);
  } else if (mod.def.inputs.includes('in')) {
    sourceNode = mod.audio.getInput('in');
  }

  if (sourceNode) {
    try { sourceNode.connect(analyser); } catch (e) { /* already connected or incompatible */ }
  }

  const canvas = mod.el.querySelector('.scope-canvas');
  if (!canvas) return;
  const ctx2d = canvas.getContext('2d');

  const scope = { analyser, canvas, ctx2d, animId: null, mode: 'wave', sourceNode };
  scopes.set(mod.id, scope);
  drawScope(mod.id);
}

export function destroyScope(modId) {
  const scope = scopes.get(modId);
  if (!scope) return;
  cancelAnimationFrame(scope.animId);
  if (scope.sourceNode) {
    try { scope.sourceNode.disconnect(scope.analyser); } catch (e) { /* noop */ }
  }
  scopes.delete(modId);
}

export function toggleScopeMode(modId) {
  const scope = scopes.get(modId);
  if (scope) scope.mode = scope.mode === 'wave' ? 'fft' : 'wave';
}

function drawScope(modId) {
  const scope = scopes.get(modId);
  if (!scope) return;

  const { analyser, canvas, ctx2d, mode } = scope;
  const w = canvas.width;
  const h = canvas.height;

  // Get theme colors from CSS vars
  const styles = getComputedStyle(document.body);
  const bgColor = styles.getPropertyValue('--bg').trim() || '#1a1a2e';
  const lineColor = styles.getPropertyValue('--accent').trim() || '#e94560';
  const dimColor = styles.getPropertyValue('--text-muted').trim() || '#666';

  ctx2d.fillStyle = bgColor;
  ctx2d.fillRect(0, 0, w, h);

  // Center line
  ctx2d.strokeStyle = dimColor;
  ctx2d.lineWidth = 0.5;
  ctx2d.beginPath();
  if (mode === 'wave') {
    ctx2d.moveTo(0, h / 2);
    ctx2d.lineTo(w, h / 2);
  }
  ctx2d.stroke();

  if (mode === 'wave') {
    // Waveform
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    analyser.getByteTimeDomainData(data);

    ctx2d.strokeStyle = lineColor;
    ctx2d.lineWidth = 1.5;
    ctx2d.beginPath();
    const sliceW = w / bufLen;
    for (let i = 0; i < bufLen; i++) {
      const v = data[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx2d.moveTo(0, y);
      else ctx2d.lineTo(i * sliceW, y);
    }
    ctx2d.stroke();
  } else {
    // FFT bars
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(data);

    const barW = w / bufLen * 2;
    ctx2d.fillStyle = lineColor;
    for (let i = 0; i < bufLen / 2; i++) {
      const barH = (data[i] / 255) * h;
      ctx2d.fillRect(i * barW, h - barH, barW - 1, barH);
    }
  }

  scope.animId = requestAnimationFrame(() => drawScope(modId));
}

export function isScopeActive(modId) {
  return scopes.has(modId);
}
