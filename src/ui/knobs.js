let knobDragState = null;

export function valueToAngle(val, p) {
  const norm = p.log
    ? (Math.log(val) - Math.log(p.min)) / (Math.log(p.max) - Math.log(p.min))
    : (val - p.min) / (p.max - p.min);
  return -140 + norm * 280;
}

export function angleToValue(angle, p) {
  const norm = (angle + 140) / 280;
  return p.log
    ? Math.exp(Math.log(p.min) + norm * (Math.log(p.max) - Math.log(p.min)))
    : p.min + norm * (p.max - p.min);
}

export function formatValue(val, p) {
  if (val >= 1000) return (val / 1000).toFixed(1) + 'k' + p.unit;
  if (val < 0.01) return val.toFixed(4) + p.unit;
  if (val < 1) return val.toFixed(2) + p.unit;
  return val.toFixed(1) + p.unit;
}

/** Parse user input back to a number, handling "1.5k" → 1500 etc. */
function parseInput(str, p) {
  str = str.trim().replace(p.unit, '').trim();
  let val;
  if (str.endsWith('k') || str.endsWith('K')) {
    val = parseFloat(str) * 1000;
  } else {
    val = parseFloat(str);
  }
  if (isNaN(val)) return null;
  return Math.max(p.min, Math.min(p.max, val));
}

function applyValue(mod, paramName, val) {
  const p = mod.def.params[paramName];
  mod.params[paramName] = val;
  mod.audio.setParam(paramName, val);
  const angle = valueToAngle(val, p);
  const knob = mod.el.querySelector(`.knob[data-param="${paramName}"]`);
  if (knob) knob.querySelector('.knob-indicator').style.transform = `translateX(-50%) rotate(${angle}deg)`;
  const valEl = document.getElementById(`knob-val-${mod.id}-${paramName}`);
  if (valEl) valEl.textContent = formatValue(val, p);
}

export function setupKnobs(el, mod) {
  el.querySelectorAll('.knob').forEach(knob => {
    knob.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const paramName = knob.dataset.param;
      knobDragState = {
        mod, knob, paramName,
        p: mod.def.params[paramName],
        startY: e.clientY,
        startVal: mod.params[paramName],
      };
    });

    knob.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const paramName = knob.dataset.param;
      const p = mod.def.params[paramName];
      applyValue(mod, paramName, p.default);
    });
  });

  // Editable value labels
  el.querySelectorAll('.knob-value').forEach(valEl => {
    valEl.style.cursor = 'pointer';
    valEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const paramName = valEl.id.replace(`knob-val-${mod.id}-`, '');
      const p = mod.def.params[paramName];
      if (!p) return;

      // Replace span with input
      const currentVal = mod.params[paramName];
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'knob-input';
      input.value = currentVal >= 1000 ? (currentVal / 1000).toFixed(1) + 'k' :
                     currentVal < 1 ? currentVal.toFixed(2) : currentVal.toFixed(1);
      input.style.width = '52px';
      input.style.textAlign = 'center';

      valEl.style.display = 'none';
      valEl.parentNode.insertBefore(input, valEl.nextSibling);
      input.focus();
      input.select();

      function commit() {
        const parsed = parseInput(input.value, p);
        if (parsed !== null) applyValue(mod, paramName, parsed);
        input.remove();
        valEl.style.display = '';
      }

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
        if (ke.key === 'Escape') { input.remove(); valEl.style.display = ''; }
        ke.stopPropagation(); // prevent keyboard shortcuts
      });
    });
  });
}

export function handleKnobDrag(e) {
  if (!knobDragState) return false;
  const s = knobDragState;
  const dy = s.startY - e.clientY;
  let newAngle = valueToAngle(s.startVal, s.p) + dy * 1.5;
  newAngle = Math.max(-140, Math.min(140, newAngle));
  const newVal = angleToValue(newAngle, s.p);
  s.mod.params[s.paramName] = newVal;
  s.mod.audio.setParam(s.paramName, newVal);
  s.knob.querySelector('.knob-indicator').style.transform = `translateX(-50%) rotate(${newAngle}deg)`;
  const valEl = document.getElementById(`knob-val-${s.mod.id}-${s.paramName}`);
  if (valEl) valEl.textContent = formatValue(newVal, s.p);
  return true;
}

export function clearKnobDrag() { knobDragState = null; }
export function isKnobDragging() { return !!knobDragState; }
