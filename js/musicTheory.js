/**
 * HandSynth - Music Theory
 * Scales, notes, chord definitions and position mapping
 */

import { mapRange } from './utils.js';

// Music theory variables
let selectedScale = 'major';
let selectedRoot = 'C';
let octave = 4;
let selectedSound = 'pad';

// Track hand positions for change detection
let lastRightHandY = 0;
let lastLeftHandY = 0;
let lastMelodyNote = null;
let lastChord = null;

// Scales definition
const scales = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  pentatonic: [0, 2, 4, 7, 9, 12],
  majorBlues: [0, 2, 4, 6, 7, 10, 12],
  minorBlues: [0, 3, 5, 6, 7, 10, 12],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
};

// Notes and chord types
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const chordTypes = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  minor7: [0, 3, 7, 10],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus4: [0, 5, 7],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11]
};

// Update sound presets with optimized settings to reduce distortion
const soundPresets = {
  // Synthetic instruments (Tone.js)
  synth: {
    type: 'synthetic',
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.8 }
  },
  bell: {
    type: 'synthetic',
    oscillator: { type: 'sine4' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 1.5 }
  },
  pad: {
    type: 'synthetic',
    oscillator: { type: 'sine8' },
    envelope: { attack: 0.4, decay: 0.7, sustain: 0.6, release: 2 }
  },
  pluck: {
    type: 'synthetic',
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.3 }
  },
  piano: {
    type: 'synthetic',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0.7, release: 0.3 }
  },
  
  // Real instruments (sampled)
  realPiano: {
    type: 'real',
    name: 'Grand Piano',
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.8, release: 0.5 }
  },
  realGuitar: {
    type: 'real',
    name: 'Acoustic Guitar',
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 1.0 }
  },
  realViolin: {
    type: 'real',
    name: 'Violin',
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.8, release: 0.8 }
  },
  realFlute: {
    type: 'real',
    name: 'Flute',
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.6 }
  },
  realSaxophone: {
    type: 'real',
    name: 'Saxophone',
    envelope: { attack: 0.03, decay: 0.2, sustain: 0.8, release: 0.5 }
  },
  realCello: {
    type: 'real',
    name: 'Cello',
    envelope: { attack: 0.08, decay: 0.3, sustain: 0.9, release: 1.0 }
  }
};

// Gesture variables
const MIN_PINCH_DIST = 0.01;
const MAX_PINCH_DIST = 0.1;

// Improved note mapping function with inverted direction (hand up = high pitch, hand down = low pitch)
function getNoteFromPosition(y) {
  // Track position change
  const positionChanged = Math.abs(y - lastRightHandY) > 0.0001;
  lastRightHandY = y;
  
  // FIXED: Inverted mapping - higher hand position (lower y value) = higher note
  // Map from full range (0.0-1.0) to positions (0-14), but inverted
  const position = Math.floor(mapRange(y, 0.0, 1.0, 14, 0));
  
  // Always use the selectedScale instead of the passed scale parameter
  const scaleArray = scales[selectedScale];
  const octaveOffset = Math.floor(position / scaleArray.length);
  const indexInScale = position % scaleArray.length;
  
  const semitones = scaleArray[indexInScale];
  const rootIndex = notes.indexOf(selectedRoot);
  const midiBase = 60 + rootIndex;
  const midiNote = midiBase + semitones + (octave - 4 + octaveOffset) * 12;
  
  const noteIndex = midiNote % 12;
  const noteOctave = Math.floor(midiNote / 12) - 1;
  const noteName = notes[noteIndex] + noteOctave;
  
  if (positionChanged) {
    // console.log(`Hand Y: ${y.toFixed(3)} → Position: ${position} → Note: ${noteName}`);
  }
  
  return noteName;
}

// Improved chord position mapping with inverted direction (hand up = high pitch, hand down = low pitch)
function getChordFromPosition(y) {
  // Track position change
  const positionChanged = Math.abs(y - lastLeftHandY) > 0.0001;
  lastLeftHandY = y;
  
  // FIXED: Inverted mapping - higher hand position (lower y value) = higher chord position
  // Map from full range (0.0-1.0) to chord positions (0-7), but inverted
  const position = Math.floor(mapRange(y, 0.5, 1.0, 7, 0));
  
  const scaleArray = scales[selectedScale];
  const scaleDegree = position % scaleArray.length;
  
  // Get root note for this scale degree
  const rootIndex = notes.indexOf(selectedRoot);
  const degreeOffset = scaleArray[scaleDegree];
  const chordRootIndex = (rootIndex + degreeOffset) % 12;
  const chordRoot = notes[chordRootIndex];
  
  // Determine chord type
  let chordType;
  if (selectedScale === 'major') {
    const chordTypes = ['major', 'minor', 'minor', 'major', 'dominant7', 'minor', 'diminished'];
    chordType = chordTypes[scaleDegree % 7];
  } else if (selectedScale === 'minor') {
    const chordTypes = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];
    chordType = chordTypes[scaleDegree % 7];
  } else if (selectedScale === 'majorBlues') {
    const chordTypes = ['dominant7', 'diminished', 'dominant7', 'diminished', 'dominant7', 'minor', 'diminished'];
    chordType = chordTypes[scaleDegree % 7];
  } else if (selectedScale === 'minorBlues') {
    const chordTypes = ['minor7', 'dominant7', 'minor7', 'diminished', 'minor7', 'diminished', 'dominant7'];
    chordType = chordTypes[scaleDegree % 7];
  }
  else {
    chordType = scaleDegree % 2 === 0 ? 'major' : 'minor';
  }
  
  // Generate chord notes
  const chordNotes = [];
  const intervals = chordTypes[chordType];
  
  const octaveOffset = Math.floor(position / 7);
  const midiBase = 48 + chordRootIndex + (octave - 4 + octaveOffset) * 12;
  
  intervals.forEach(interval => {
    const midiNote = midiBase + interval;
    const noteIndex = midiNote % 12;
    const noteOctave = Math.floor(midiNote / 12) - 1;
    chordNotes.push(notes[noteIndex] + noteOctave);
  });
  
  const chord = {
    root: chordRoot,
    type: chordType,
    notes: chordNotes,
    name: `${chordRoot} ${chordType === 'major' ? '' : chordType === 'minor' ? 'm' : chordType === 'minor7' ? 'm7' : chordType === 'diminished' ? 'dim' : chordType === 'augmented' ? 'aug' : chordType}`
  };
  
  if (positionChanged) {
    // console.log(`Hand Y: ${y.toFixed(3)} → Position: ${position} → Chord: ${chord.name}`);
  }
  
  return chord;
}

// Function to update scale, root, and octave
function updateMusicParameters(scale, root, newOctave, sound) {
  if (scale) selectedScale = scale;
  if (root) selectedRoot = root;
  if (newOctave) octave = newOctave;
  if (sound) {
    selectedSound = sound;
    console.log(`Updated selectedSound to: ${selectedSound}`);
  }
}

// Getter functions for current values (to ensure modules get fresh values)
function getSelectedSound() {
  return selectedSound;
}

function getSelectedScale() {
  return selectedScale;
}

function getSelectedRoot() {
  return selectedRoot;
}

function getOctave() {
  return octave;
}

// Export music theory elements
export {
  selectedScale,
  selectedRoot,
  octave,
  selectedSound,
  scales,
  notes,
  chordTypes,
  soundPresets,
  MIN_PINCH_DIST,
  MAX_PINCH_DIST,
  getNoteFromPosition,
  getChordFromPosition,
  updateMusicParameters,
  getSelectedSound,
  getSelectedScale,
  getSelectedRoot,
  getOctave
};