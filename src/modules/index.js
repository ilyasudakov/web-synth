import oscillator from './oscillator.js';
import lfo from './lfo.js';
import filter from './filter.js';
import vca from './vca.js';
import envelope from './envelope.js';
import delay from './delay.js';
import reverb from './reverb.js';
import noise from './noise.js';
import clock from './clock.js';
import sequencer from './sequencer.js';
import snh from './snh.js';
import keyboard from './keyboard.js';
import output from './output.js';
import text from './text.js';

export const MODULE_DEFS = {
  oscillator,
  lfo,
  filter,
  vca,
  envelope,
  delay,
  reverb,
  noise,
  clock,
  sequencer,
  snh,
  keyboard,
  output,
  text,
};

/** Module catalog for the "Add Module" dropdown */
export const MODULE_CATALOG = [
  {
    section: 'Sources',
    items: [
      { type: 'oscillator', name: 'Oscillator', desc: 'Generates waveforms: sine, square, saw, triangle' },
      { type: 'lfo', name: 'LFO', desc: 'Low-frequency oscillator for modulating other params' },
      { type: 'noise', name: 'Noise', desc: 'White noise generator' },
      { type: 'keyboard', name: 'Keyboard', desc: 'Play notes with mouse or keys A-K' },
    ],
  },
  {
    section: 'Sequencing',
    items: [
      { type: 'clock', name: 'Clock', desc: 'Master tempo \u2014 triggers connected modules at BPM' },
      { type: 'sequencer', name: 'Sequencer', desc: 'Random pentatonic sequence, steps on clock' },
      { type: 'snh', name: 'Sample & Hold', desc: 'Random frequency on each clock tick' },
    ],
  },
  {
    section: 'Processing',
    items: [
      { type: 'filter', name: 'Filter', desc: 'LP / HP / BP / Notch with frequency & resonance' },
      { type: 'vca', name: 'VCA', desc: 'Voltage-controlled amplifier \u2014 controls volume via CV' },
      { type: 'envelope', name: 'Envelope', desc: 'ADSR shape \u2014 outputs 0..1 CV on gate trigger' },
      { type: 'delay', name: 'Delay', desc: 'Echo effect with feedback and dry/wet mix' },
      { type: 'reverb', name: 'Reverb', desc: 'Convolution reverb with decay and dry/wet mix' },
    ],
  },
  {
    section: 'Output',
    items: [
      { type: 'output', name: 'Output', desc: 'Sends audio to your speakers' },
    ],
  },
  {
    section: 'Utility',
    items: [
      { type: 'text', name: 'Note', desc: 'Sticky note \u2014 jot down ideas on the canvas' },
    ],
  },
];
