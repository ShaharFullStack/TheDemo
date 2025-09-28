/**
 * HandSynth - Enhanced Music Theory Module
 * Advanced scales, voice leading, chord progressions and position mapping
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

// Voice leading state - tracks the last chord voicing for smooth transitions
let lastChordVoicing = null;
let voiceLeadingEnabled = true;

// Enhanced scales definition with modes and proper blues scales
const scales = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10], // Same as natural minor
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  majorBlues: [0, 2, 3, 4, 7, 9, 10], // Major blues with both 3rds
  minorBlues: [0, 3, 5, 6, 7, 10], // Classic blues scale
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

// Sharp and flat note arrays for proper accidental handling
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const notesWithFlats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Enhanced chord types with more options
const chordTypes = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  diminished7: [0, 3, 6, 9],
  halfDiminished7: [0, 3, 6, 10],
  augmented7: [0, 4, 8, 10]
};

// Enhanced chord progression mappings
const CHORD_PROGRESSIONS = {
  major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
  minor: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
  dorian: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
  phrygian: ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
  lydian: ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
  mixolydian: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
  aeolian: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
  locrian: ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor'],
  majorBlues: ['dominant7', 'dominant7', 'minor7', 'dominant7', 'dominant7', 'minor7'],
  minorBlues: ['minor7', 'major7', 'minor7', 'minor7', 'dominant7', 'dominant7'],
  pentatonic: ['major', 'minor', 'minor', 'major', 'minor'],
  pentatonicMinor: ['minor', 'major', 'minor', 'minor', 'major'],
  chromatic: ['major', 'minor', 'major', 'minor', 'major', 'minor', 'major', 'minor', 'major', 'minor', 'major', 'minor']
};

// Voice leading and music theory functions
export function resetVoiceLeading() {
  lastChordVoicing = null;
  console.log('Voice leading state reset');
}

export function setVoiceLeadingEnabled(enabled) {
  voiceLeadingEnabled = enabled;
  if (!enabled) {
    lastChordVoicing = null;
  }
  console.log(`Voice leading ${enabled ? 'enabled' : 'disabled'}`);
}

// Convert note name to MIDI number for voice leading calculations
function noteNameToMidi(noteName) {
  const noteRegex = /^([A-G][#b]?)(\d+)$/;
  const match = noteName.match(noteRegex);
  if (!match) return 60; // Fallback to middle C

  const [, note, octave] = match;
  const noteMap = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };

  return (parseInt(octave) * 12) + (noteMap[note] || 0);
}

// Helper function to get appropriate note names based on key signature
function getNotesForScale(scaleName, rootNote = null) {
  const currentRoot = rootNote || selectedRoot || 'C';

  // Keys that use flats according to circle of fifths
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  
  // For minor scales, determine based on the relative major
  let keyToCheck = currentRoot;
  if (scaleName.includes('minor')) {
    const minorToRelativeMajor = {
      'C': 'Eb', 'C#': 'E', 'Db': 'E', 'D': 'F', 'D#': 'F#', 'Eb': 'Gb',
      'E': 'G', 'F': 'Ab', 'F#': 'A', 'Gb': 'A', 'G': 'Bb', 'G#': 'B',
      'Ab': 'B', 'A': 'C', 'A#': 'C#', 'Bb': 'Db', 'B': 'D'
    };
    keyToCheck = minorToRelativeMajor[currentRoot] || currentRoot;
  }

  // Special cases for blues scales - use the key's natural accidentals
  if (scaleName.includes('Blues')) {
    keyToCheck = currentRoot;
  }

  // Determine if we should use flats or sharps
  const useFlats = flatKeys.includes(keyToCheck);
  return useFlats ? notesWithFlats : notes;
}

// Safe note calculation with bounds checking
function calculateNoteFromMIDI(midiNote) {
  const clampedMidi = Math.max(0, Math.min(127, Math.round(midiNote)));
  const noteIndex = clampedMidi % 12;
  const octave = Math.floor(clampedMidi / 12);

  const validNoteIndex = Math.max(0, Math.min(11, noteIndex));
  const validOctave = Math.max(0, Math.min(9, octave));

  const appropriateNotes = getNotesForScale(selectedScale, selectedRoot);
  return appropriateNotes[validNoteIndex] + validOctave;
}

// Optimized voice leading system for real-time performance
function applyVoiceLeading(chordNotes, chordRoot, baseOctave) {
  if (!chordNotes || chordNotes.length < 3 || !voiceLeadingEnabled) return chordNotes;

  try {
    const chordMidi = chordNotes.slice(0, 3).map(noteNameToMidi);
    const rootMidi = noteNameToMidi(chordNotes[0]);

    const triadBaseOctave = Math.max(3, baseOctave); // Lowered by one octave
    const triadBaseMidi = triadBaseOctave * 12;

    let triadVoicing = [];
    for (let i = 0; i < 3; i++) {
      let note = chordMidi[i];
      const noteClass = note % 12;
      note = triadBaseMidi + noteClass;
      triadVoicing.push(note);
    }

    triadVoicing.sort((a, b) => a - b);

    if (lastChordVoicing && lastChordVoicing.length === 3) {
      triadVoicing = applyFastVoiceLeading(triadVoicing, lastChordVoicing);
    }

    lastChordVoicing = [...triadVoicing];

    const bassOctave = Math.max(1, triadBaseOctave - 2); // Lowered bass note
    const bassNote = (rootMidi % 12) + (bassOctave * 12);
    const finalVoicing = [bassNote, ...triadVoicing];

    return finalVoicing.map(midi => calculateNoteFromMIDI(midi));
  } catch (error) {
    console.warn('Voice leading error, using fallback:', error);
    return chordNotes;
  }
}

// Fast voice leading for real-time performance
function applyFastVoiceLeading(newTriad, lastTriad) {
  if (!lastTriad || lastTriad.length !== 3) return newTriad;

  const currentMovement = newTriad.reduce((total, note, index) => {
    return total + Math.abs(note - lastTriad[index]);
  }, 0);

  if (currentMovement <= 12) return newTriad;

  const rootPosition = [...newTriad];
  const firstInversion = [newTriad[1], newTriad[2], newTriad[0] + 12];

  const rootMovement = rootPosition.reduce((total, note, index) => {
    return total + Math.abs(note - lastTriad[index]);
  }, 0);

  const firstMovement = firstInversion.reduce((total, note, index) => {
    return total + Math.abs(note - lastTriad[index]);
  }, 0);

  return firstMovement < rootMovement ? firstInversion.sort((a, b) => a - b) : rootPosition;
}

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

// Enhanced note mapping function with arpeggio support and better scale handling
function getNoteFromPosition(y, isArpeggioMode = false, currentChord = null) {
  // Validate and clamp input
  const validY = Math.max(0, Math.min(1, typeof y === 'number' ? y : 0.5));
  const positionChanged = Math.abs(validY - lastRightHandY) > 0.001;
  lastRightHandY = validY;

  // Get current scale and settings with fallbacks
  const currentScale = selectedScale || 'major';
  const scaleArray = scales[currentScale] || scales.major;
  const currentOctave = Math.max(2, Math.min(7, octave || 4));
  const currentRoot = selectedRoot || 'C';

  // Check if arpeggio mode is active and we have a chord to arpeggiate
  if (isArpeggioMode && currentChord && currentChord.notes && currentChord.notes.length > 0) {
    return getArpeggioNote(validY, currentChord, currentOctave);
  }

  // Regular scale mode with enhanced position mapping
  const scaleLength = scaleArray.length;
  const totalRange = Math.max(14, (scaleLength + 1) + 6);
  const position = Math.floor(mapRange(validY, 0.2, 1.0, totalRange - 1, 0));

  // Calculate octave offset and scale position
  let octaveOffset = Math.floor(position / (scaleLength + 1));
  let indexInScale = position % (scaleLength + 1);
  
  // Handle the 8th note (octave) case
  if (indexInScale === scaleLength) {
    indexInScale = 0;
    octaveOffset += 1;
  }

  // Validate scale data
  const semitones = scaleArray[indexInScale];
  if (typeof semitones !== 'number' || semitones < 0 || semitones > 12) {
    console.warn(`Invalid semitones at index ${indexInScale} for scale ${currentScale}:`, semitones);
    return `${currentRoot}${currentOctave}`;
  }

  // Calculate root note index with proper note array
  const appropriateNotes = getNotesForScale(currentScale, currentRoot);
  let rootIndex = appropriateNotes.indexOf(currentRoot);
  if (rootIndex === -1) {
    rootIndex = notes.indexOf(currentRoot);
    if (rootIndex === -1) rootIndex = 0;
  }

  // Calculate final MIDI note
  const midiBase = 60 + rootIndex;
  const finalOctaveOffset = currentOctave - 5 + octaveOffset;
  const midiNote = midiBase + semitones + (finalOctaveOffset * 12);

  return calculateNoteFromMIDI(midiNote);
}

// Enhanced chord position mapping with voice leading and proper chord progressions
function getChordFromPosition(y, use7thChords = false) {
  // Validate and clamp input
  const validY = Math.max(0, Math.min(1, typeof y === 'number' ? y : 0.5));
  const positionChanged = Math.abs(validY - lastLeftHandY) > 0.001;
  lastLeftHandY = validY;

  // Get current settings with enhanced fallbacks
  const currentScale = selectedScale || 'major';
  const scaleArray = scales[currentScale] || scales.major;
  const currentRoot = selectedRoot || 'C';
  const currentOctave = Math.max(1, Math.min(5, octave || 3)); // Lowered chord octave range

  // Enhanced position mapping for chords - always 8 positions
  const position = Math.floor(mapRange(validY, 0.25, 1.0, 7, 0));

  // Handle 8th position (root chord octave higher)
  let scaleDegree, isOctaveHigher = false;
  if (position === 7) {
    scaleDegree = 0;
    isOctaveHigher = true;
  } else {
    scaleDegree = position % Math.max(scaleArray.length, 7);
  }

  // Get appropriate notes array based on current scale and root
  const appropriateNotes = getNotesForScale(currentScale, currentRoot);
  
  // Validate root note
  let rootIndex = appropriateNotes.indexOf(currentRoot);
  if (rootIndex === -1) {
    rootIndex = notes.indexOf(currentRoot);
    if (rootIndex === -1) {
      console.warn(`getChordFromPosition: Invalid root note: ${currentRoot}`);
      return createFallbackChord(currentRoot, currentOctave);
    }
  }

  // Calculate chord root
  const degreeOffset = scaleArray[scaleDegree];
  if (typeof degreeOffset !== 'number' || degreeOffset < 0 || degreeOffset > 11) {
    console.warn(`getChordFromPosition: Invalid degreeOffset for scale ${currentScale}, degree ${scaleDegree}:`, degreeOffset);
    return createFallbackChord(currentRoot, currentOctave);
  }

  const chordRootIndex = (rootIndex + degreeOffset) % 12;
  const chordRoot = appropriateNotes[chordRootIndex];

  // Get basic chord type from progression
  const chordProgression = CHORD_PROGRESSIONS[currentScale] || CHORD_PROGRESSIONS.major;
  let chordTypeKey = chordProgression[scaleDegree % chordProgression.length] || 'major';

  // Optionally convert to 7th chords for richer harmony
  if (use7thChords) {
    if (chordTypeKey === 'major') {
      chordTypeKey = scaleDegree === 4 ? 'dominant7' : 'major7';
    } else if (chordTypeKey === 'minor') {
      chordTypeKey = 'minor7';
    } else if (chordTypeKey === 'diminished') {
      chordTypeKey = 'diminished7';
    }
  }

  // Validate chord type
  if (!chordTypes[chordTypeKey]) {
    console.warn(`Unknown chord type key: ${chordTypeKey}, defaulting to major.`);
    return createChord(chordRoot, 'major', currentOctave - 1);
  }

  const chordOctave = isOctaveHigher ? currentOctave : currentOctave - 1; // Lowered octave offset
  return createChord(chordRoot, chordTypeKey, chordOctave);
}

// Helper function to create a chord with proper error handling
function createChord(chordRoot, chordTypeKey, octave) {
  const intervals = chordTypes[chordTypeKey];

  if (!intervals || !Array.isArray(intervals)) {
    console.error(`Invalid intervals for chordTypeKey: ${chordTypeKey}`);
    return createFallbackChord(chordRoot, octave);
  }

  const chordNotes = [];
  const appropriateNotes = getNotesForScale(selectedScale, selectedRoot);
  
  // Find chord root index in appropriate array
  let chordRootIndex = appropriateNotes.indexOf(chordRoot);
  if (chordRootIndex === -1) {
    chordRootIndex = notes.indexOf(chordRoot);
    if (chordRootIndex === -1) {
      return createFallbackChord('C', octave);
    }
  }

  const midiBaseForChord = (12 * Math.max(1, octave - 1)) + chordRootIndex; // Moved down one octave

  // Generate chord notes with validation
  intervals.forEach(interval => {
    if (typeof interval !== 'number' || interval < 0 || interval > 24) {
      console.warn(`Invalid interval in chordType ${chordTypeKey}: ${interval}`);
      return;
    }

    const midiNote = midiBaseForChord + interval;
    const noteName = calculateNoteFromMIDI(midiNote);
    chordNotes.push(noteName);
  });

  // Ensure we have at least one note
  if (chordNotes.length === 0) {
    console.warn(`No valid notes generated for chord: ${chordRoot} ${chordTypeKey}`);
    chordNotes.push(calculateNoteFromMIDI(midiBaseForChord));
  }

  // Generate display name
  const chordNameDisplay = getChordDisplayName(chordTypeKey);

  return {
    root: chordRoot,
    type: chordTypeKey,
    notes: voiceLeadingEnabled ? applyVoiceLeading(chordNotes, chordRoot, octave) : chordNotes,
    name: `${chordRoot}${chordNameDisplay}`,
    scaleDegree: lastLeftHandY,
    midiBase: midiBaseForChord
  };
}

// Helper function for chord display names
function getChordDisplayName(chordTypeKey) {
  const displayNames = {
    'major': '',
    'minor': 'm',
    'diminished': 'dim',
    'augmented': 'aug',
    'dominant7': '7',
    'minor7': 'm7',
    'major7': 'maj7',
    'diminished7': 'dim7'
  };

  return displayNames[chordTypeKey] || '';
}

// Fallback chord creation
function createFallbackChord(root, octave) {
  const appropriateNotes = getNotesForScale(selectedScale, selectedRoot);
  const safeRoot = appropriateNotes.includes(root) || notes.includes(root) || notesWithFlats.includes(root) ? root : 'C';
  const safeOctave = Math.max(1, Math.min(6, octave));

  // Find root index in appropriate array
  let rootIndex = appropriateNotes.indexOf(safeRoot);
  if (rootIndex === -1) {
    rootIndex = notes.indexOf(safeRoot);
    if (rootIndex === -1) {
      rootIndex = notesWithFlats.indexOf(safeRoot);
      if (rootIndex === -1) rootIndex = 0;
    }
  }

  // Create basic triad for fallback
  const basicTriad = [
    `${safeRoot}${safeOctave}`,
    `${appropriateNotes[(rootIndex + 4) % 12]}${safeOctave}`,
    `${appropriateNotes[(rootIndex + 7) % 12]}${safeOctave}`
  ];

  return {
    root: safeRoot,
    type: 'major',
    notes: voiceLeadingEnabled ? applyVoiceLeading(basicTriad, safeRoot, safeOctave) : basicTriad,
    name: safeRoot,
    error: true
  };
}

// Function to update scale, root, and octave
function updateMusicParameters(scale, root, newOctave, sound) {
  if (scale) {
    // Normalize scale names to match the scales object keys
    const scaleMap = {
      'minorblues': 'minorBlues',
      'majorblues': 'majorBlues',
      'pentatonicmajor': 'pentatonic',
      'pentatonicminor': 'pentatonicMinor'
    };
    selectedScale = scaleMap[scale] || scale;
    console.log(`Updated selectedScale to: ${selectedScale}`);
    // Reset voice leading when scale changes
    resetVoiceLeading();
  }
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

// Enhanced debugging and validation functions
export function validateMusicConfig() {
  const issues = [];

  // Check scale
  if (!scales[selectedScale]) {
    issues.push(`Invalid scale: ${selectedScale}`);
  }

  // Check root note - validate against both sharp and flat arrays
  if (!notes.includes(selectedRoot) && !notesWithFlats.includes(selectedRoot)) {
    issues.push(`Invalid root note: ${selectedRoot}`);
  }

  // Check octave
  if (octave < 1 || octave > 8) {
    issues.push(`Octave out of range: ${octave}`);
  }

  // Check scale data integrity
  const scaleArray = scales[selectedScale];
  if (scaleArray) {
    scaleArray.forEach((semitone, index) => {
      if (typeof semitone !== 'number' || semitone < 0 || semitone > 11) {
        issues.push(`Invalid semitone at index ${index} in scale ${selectedScale}: ${semitone}`);
      }
    });
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
    config: { selectedScale, selectedRoot, octave }
  };
}

// Get available chord progressions for current scale
export function getAvailableChordProgressions(scaleName) {
  const scale = scales[scaleName];
  if (!scale) return [];

  const progression = CHORD_PROGRESSIONS[scaleName] || CHORD_PROGRESSIONS.major;
  return progression.slice(0, scale.length);
}

// Test function for debugging
export function testMusicLogic(scaleName = null, use7ths = false) {
  console.log('Testing enhanced music logic...');
  console.log(`Using ${use7ths ? '7th chords' : 'basic triads'}`);

  // Test validation
  const validation = validateMusicConfig();
  console.log('Config validation:', validation);

  // Test specific scale or current scale
  const testScale = scaleName || selectedScale;
  const originalScale = selectedScale;
  selectedScale = testScale;

  console.log(`\nTesting scale: ${testScale}`);
  console.log('Position -> Note | Chord (Notes)');
  console.log('----------------------------------------');

  // Test note and chord generation
  for (let i = 0; i <= 10; i++) {
    const y = i / 10;
    try {
      const note = getNoteFromPosition(y);
      const chord = getChordFromPosition(y, use7ths);
      console.log(`${y.toFixed(1)} -> ${note.padEnd(4)} | ${chord.name.padEnd(6)} (${chord.notes.join(', ')})`);
    } catch (error) {
      console.error(`Error at position ${y}:`, error);
    }
  }

  // Restore original scale
  selectedScale = originalScale;
  console.log('\nMusic logic test completed');
}

// Quick test for all scales
export function testAllScales(use7ths = false) {
  console.log(`Testing all scales with ${use7ths ? '7th chords' : 'basic triads'}:`);

  Object.keys(scales).forEach(scaleName => {
    console.log(`\n=== ${scaleName.toUpperCase()} ===`);
    try {
      testMusicLogic(scaleName, use7ths);
    } catch (error) {
      console.error(`Error testing scale ${scaleName}:`, error);
    }
  });
}

// Make testing functions available globally for browser console
if (typeof window !== 'undefined') {
  window.testMusicLogic = testMusicLogic;
  window.testAllScales = testAllScales;
  window.validateMusicConfig = validateMusicConfig;
  window.resetVoiceLeading = resetVoiceLeading;
  window.setVoiceLeadingEnabled = setVoiceLeadingEnabled;
}

// Export music theory elements
export {
  selectedScale,
  selectedRoot,
  octave,
  selectedSound,
  scales,
  notes,
  notesWithFlats,
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
  getOctave,
  CHORD_PROGRESSIONS
};