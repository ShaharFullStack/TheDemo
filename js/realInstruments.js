/**
 * HandSynth - Real Instrument Samples Module
 * Manages loading and playing of real instrument audio samples
 */

import { mapRange } from './utils.js';

// Real instrument gain compensation - can be adjusted if samples are too loud/quiet
let realInstrumentGain = null;
const REAL_INSTRUMENT_BOOST_DB = 12; // Default +12dB boost for real instruments

// Sample library configuration with Philharmonia Orchestra samples
const SAMPLE_LIBRARY = {
  realPiano: {
    name: 'Grand Piano',
    type: 'real',
    baseUrl: './audio/piano/',
    samples: {
      'C2': 'C2.mp3', 'C3': 'C3.mp3', 'C4': 'C4.mp3', 'C5': 'C5.mp3', 'C6': 'C6.mp3'
    },
    baseNote: 'C4',
    range: { min: 'C2', max: 'C7' },
    articulations: ['normal']
  },
  realGuitar: {
    name: 'Acoustic Guitar',
    type: 'real',
    baseUrl: './audio/guitar/',
    samples: {
      'E2': 'E2.mp3', 'A2': 'A2.mp3', 'D3': 'D3.mp3', 'G3': 'G3.mp3', 'B3': 'B3.mp3', 'E4': 'E4.mp3'
    },
    baseNote: 'E3',
    range: { min: 'E2', max: 'E5' },
    articulations: ['normal']
  },
  realViolin: {
    name: 'Violin',
    type: 'real',
    baseUrl: './audio/violin/',
    samples: {
      'G3': 'G3.mp3', 'D4': 'D4.mp3', 'A4': 'A4.mp3', 'E5': 'E5.mp3'
    },
    baseNote: 'A4',
    range: { min: 'G3', max: 'E7' },
    articulations: ['normal']
  },
  realFlute: {
    name: 'Concert Flute',
    type: 'real',
    baseUrl: './audio/flute/',
    samples: {
      'C4': 'flute_C4_1_mezzo-forte_normal.mp3',
      'D4': 'flute_D4_1_mezzo-forte_normal.mp3',
      'E4': 'flute_E4_1_mezzo-forte_normal.mp3',
      'F4': 'flute_F4_1_mezzo-forte_normal.mp3',
      'G4': 'flute_G4_1_mezzo-forte_normal.mp3',
      'A4': 'flute_A4_1_mezzo-forte_normal.mp3',
      'B4': 'flute_B4_1_mezzo-forte_normal.mp3',
      'C5': 'flute_C5_1_mezzo-forte_normal.mp3',
      'D5': 'flute_D5_1_mezzo-forte_normal.mp3',
      'E5': 'flute_E5_1_mezzo-forte_normal.mp3',
      'F5': 'flute_F5_1_mezzo-forte_normal.mp3',
      'G5': 'flute_G5_1_mezzo-forte_normal.mp3',
      'A5': 'flute_A5_1_mezzo-forte_normal.mp3',
      'B5': 'flute_B5_1_mezzo-forte_normal.mp3',
      'C6': 'flute_C6_1_mezzo-forte_normal.mp3',
      'D6': 'flute_D6_1_mezzo-forte_normal.mp3',
      'E6': 'flute_E6_1_mezzo-forte_normal.mp3',
      'F6': 'flute_F6_1_mezzo-forte_normal.mp3',
      'G6': 'flute_G6_1_mezzo-forte_normal.mp3',
      'A6': 'flute_A6_1_mezzo-forte_normal.mp3',
      'B6': 'flute_B6_1_mezzo-forte_normal.mp3',
      'C7': 'flute_C7_1_mezzo-forte_normal.mp3',
      'D7': 'flute_D7_1_mezzo-forte_normal.mp3',
      'E7': 'flute_E7_1_mezzo-forte_normal.mp3',
      'F7': 'flute_F7_1_mezzo-forte_normal.mp3',
      'G7': 'flute_G7_1_mezzo-forte_normal.mp3'
    },
    chromaticSamples: {
      // Add additional chromatic samples for better pitch coverage
      'C#4': 'flute_Cs4_1_mezzo-forte_normal.mp3',
      'D#4': 'flute_Ds4_1_mezzo-forte_normal.mp3',
      'F#4': 'flute_Fs4_1_mezzo-forte_normal.mp3',
      'G#4': 'flute_Gs4_1_mezzo-forte_normal.mp3',
      'A#4': 'flute_As4_1_mezzo-forte_normal.mp3',
      'C#5': 'flute_Cs5_1_mezzo-forte_normal.mp3',
      'D#5': 'flute_Ds5_1_mezzo-forte_normal.mp3',
      'F#5': 'flute_Fs5_1_mezzo-forte_normal.mp3',
      'G#5': 'flute_Gs5_1_mezzo-forte_normal.mp3',
      'A#5': 'flute_As5_1_mezzo-forte_normal.mp3',
      'C#6': 'flute_Cs6_1_mezzo-forte_normal.mp3',
      'D#6': 'flute_Ds6_1_mezzo-forte_normal.mp3',
      'F#6': 'flute_Fs6_1_mezzo-forte_normal.mp3',
      'G#6': 'flute_Gs6_1_mezzo-forte_normal.mp3',
      'A#6': 'flute_As6_1_mezzo-forte_normal.mp3'
    },
    baseNote: 'A4',
    range: { min: 'C4', max: 'G7' },
    articulations: ['normal', 'staccato'],
    dynamics: ['pianissimo', 'piano', 'mezzo-piano', 'mezzo-forte', 'forte', 'fortissimo']
  },
  realCello: {
    name: 'Cello',
    type: 'real',
    baseUrl: './audio/cello/',
    samples: {
      'C2': 'cello_C2_1_mezzo-piano_arco-normal.mp3',
      'D2': 'cello_D2_1_mezzo-piano_arco-normal.mp3',
      'E2': 'cello_E2_1_mezzo-piano_arco-normal.mp3',
      'F2': 'cello_F2_1_mezzo-piano_arco-normal.mp3',
      'G2': 'cello_G2_1_mezzo-piano_arco-normal.mp3',
      'A2': 'cello_A2_1_mezzo-piano_arco-normal.mp3',
      'B2': 'cello_B2_1_mezzo-piano_arco-normal.mp3',
      'C3': 'cello_C3_1_mezzo-piano_arco-normal.mp3',
      'D3': 'cello_D3_1_mezzo-piano_arco-normal.mp3',
      'E3': 'cello_E3_1_mezzo-piano_arco-normal.mp3',
      'F3': 'cello_F3_1_mezzo-piano_arco-normal.mp3',
      'G3': 'cello_G3_1_mezzo-piano_arco-normal.mp3',
      'A3': 'cello_A3_1_mezzo-piano_arco-normal.mp3',
      'B3': 'cello_B3_1_mezzo-piano_arco-normal.mp3',
      'C4': 'cello_C4_1_mezzo-piano_arco-normal.mp3',
      'D4': 'cello_D4_1_mezzo-piano_arco-normal.mp3',
      'E4': 'cello_E4_1_mezzo-piano_arco-normal.mp3',
      'F4': 'cello_F4_1_mezzo-piano_arco-normal.mp3',
      'G4': 'cello_G4_1_mezzo-piano_arco-normal.mp3',
      'A4': 'cello_A4_1_mezzo-piano_arco-normal.mp3',
      'B4': 'cello_B4_1_mezzo-piano_arco-normal.mp3',
      'C5': 'cello_C5_1_mezzo-piano_arco-normal.mp3',
      'D5': 'cello_D5_1_mezzo-piano_arco-normal.mp3',
      'E5': 'cello_E5_1_mezzo-piano_arco-normal.mp3',
      'F5': 'cello_F5_1_mezzo-piano_arco-normal.mp3',
      'G5': 'cello_G5_1_mezzo-piano_arco-normal.mp3',
      'A5': 'cello_A5_1_mezzo-piano_arco-normal.mp3',
      'B5': 'cello_B5_1_mezzo-piano_arco-normal.mp3',
      'C6': 'cello_C6_1_mezzo-piano_arco-normal.mp3',
      'D6': 'cello_D6_1_mezzo-piano_arco-normal.mp3',
      'E6': 'cello_E6_1_mezzo-piano_arco-normal.mp3',
      'F6': 'cello_F6_1_mezzo-piano_arco-normal.mp3',
      'G6': 'cello_G6_1_mezzo-piano_arco-normal.mp3',
      'A6': 'cello_A6_1_mezzo-piano_arco-normal.mp3',
      'B6': 'cello_B6_1_mezzo-piano_arco-normal.mp3',
      'C7': 'cello_C7_1_mezzo-piano_arco-normal.mp3'
    },
    chromaticSamples: {
      'C#2': 'cello_Cs2_1_mezzo-piano_arco-normal.mp3',
      'D#2': 'cello_Ds2_1_mezzo-piano_arco-normal.mp3',
      'F#2': 'cello_Fs2_1_mezzo-piano_arco-normal.mp3',
      'G#2': 'cello_Gs2_1_mezzo-piano_arco-normal.mp3',
      'A#2': 'cello_As2_1_mezzo-piano_arco-normal.mp3',
      'C#3': 'cello_Cs3_1_mezzo-piano_arco-normal.mp3',
      'D#3': 'cello_Ds3_1_mezzo-piano_arco-normal.mp3',
      'F#3': 'cello_Fs3_1_mezzo-piano_arco-normal.mp3',
      'G#3': 'cello_Gs3_1_mezzo-piano_arco-normal.mp3',
      'A#3': 'cello_As3_1_mezzo-piano_arco-normal.mp3',
      'C#4': 'cello_Cs4_1_mezzo-piano_arco-normal.mp3',
      'D#4': 'cello_Ds4_1_mezzo-piano_arco-normal.mp3',
      'F#4': 'cello_Fs4_1_mezzo-piano_arco-normal.mp3',
      'G#4': 'cello_Gs4_1_mezzo-piano_arco-normal.mp3',
      'A#4': 'cello_As4_1_mezzo-piano_arco-normal.mp3',
      'C#5': 'cello_Cs5_1_mezzo-piano_arco-normal.mp3',
      'D#5': 'cello_Ds5_1_mezzo-piano_arco-normal.mp3'
    },
    baseNote: 'C4', // Cello C string
    range: { min: 'C2', max: 'C7' },
    articulations: ['arco-normal', 'arco-sul-ponticello', 'pizzicato'],
    dynamics: ['pianissimo', 'piano', 'mezzo-piano', 'mezzo-forte', 'forte', 'fortissimo']
  },
  realSaxophone: {
    name: 'Saxophone',
    type: 'real',
    baseUrl: './audio/saxophone/',
    samples: {
      'Bb3': 'Bb3.mp3', 'F4': 'F4.mp3', 'Bb4': 'Bb4.mp3', 'F5': 'F5.mp3'
    },
    baseNote: 'Bb4',
    range: { min: 'Bb3', max: 'F6' },
    articulations: ['normal']
  }
};

// Note to frequency mapping (A4 = 440Hz)
const NOTE_FREQUENCIES = {
  'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5,
  'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1, 'A': 0,
  'A#': 1, 'Bb': 1, 'B': 2
};

// State management
let realInstrumentSamplers = new Map();
let realInstrumentInitialized = false;
let currentInstrument = null;

/**
 * Convert note name to frequency
 * @param {string} note - Note name (e.g., "A4", "C#5")
 * @returns {number} Frequency in Hz
 */
function noteToFrequency(note) {
  if (!note || typeof note !== 'string') return 440;
  
  const match = note.match(/([A-G][#b]?)(\d+)/);
  if (!match) return 440;
  
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr);
  
  // Calculate semitones from A4
  const noteOffset = NOTE_FREQUENCIES[noteName] || 0;
  const octaveOffset = (octave - 4) * 12;
  const semitones = noteOffset + octaveOffset;
  
  // A4 = 440Hz, each semitone is 2^(1/12) ratio
  return 440 * Math.pow(2, semitones / 12);
}

/**
 * Calculate pitch ratio between two notes
 * @param {string} fromNote - Source note
 * @param {string} toNote - Target note
 * @returns {number} Pitch ratio for playback adjustment
 */
function calculatePitchRatio(fromNote, toNote) {
  const fromFreq = noteToFrequency(fromNote);
  const toFreq = noteToFrequency(toNote);
  return toFreq / fromFreq;
}

/**
 * Find the closest available sample for a given note
 * @param {string} instrumentId - Instrument identifier
 * @param {string} targetNote - Target note to play
 * @returns {object} Object with sampleNote, filename, and pitchRatio
 */
function findClosestSample(instrumentId, targetNote) {
  const instrument = SAMPLE_LIBRARY[instrumentId];
  if (!instrument) return null;
  
  // Get all available sample notes (main + chromatic)
  let sampleNotes = Object.keys(instrument.samples);
  if (instrument.chromaticSamples) {
    sampleNotes = [...sampleNotes, ...Object.keys(instrument.chromaticSamples)];
  }
  
  // Find the closest sample by frequency
  const targetFreq = noteToFrequency(targetNote);
  let closestNote = sampleNotes[0];
  let closestDistance = Math.abs(noteToFrequency(closestNote) - targetFreq);
  
  for (const sampleNote of sampleNotes) {
    const distance = Math.abs(noteToFrequency(sampleNote) - targetFreq);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestNote = sampleNote;
    }
  }
  
  return {
    sampleNote: closestNote,
    filename: instrument.samples[closestNote],
    pitchRatio: calculatePitchRatio(closestNote, targetNote)
  };
}

/**
 * Initialize real instrument samplers with Tone.js
 */
async function initializeRealInstruments() {
  console.log('Initializing real instrument samplers...');
  
  for (const [instrumentId, config] of Object.entries(SAMPLE_LIBRARY)) {
    try {
      // Create sample map for Tone.Sampler
      const sampleMap = {};
      
      // Add main samples
      for (const [note, filename] of Object.entries(config.samples)) {
        sampleMap[note] = config.baseUrl + filename;
      }
      
      // Add chromatic samples if they exist
      if (config.chromaticSamples) {
        for (const [note, filename] of Object.entries(config.chromaticSamples)) {
          sampleMap[note] = config.baseUrl + filename;
        }
      }
      
      // Create Tone.Sampler with appropriate settings for each instrument
      let samplerOptions = {
        urls: sampleMap,
        onload: () => {
          console.log(`${config.name} samples loaded successfully (${Object.keys(sampleMap).length} samples)`);
        },
        onerror: (error) => {
          console.warn(`Error loading ${config.name} samples:`, error);
        },
        attack: 0.01,
        release: 1,
        curve: "exponential"
      };
      
      // Adjust sampler settings based on instrument type
      if (instrumentId === 'realFlute') {
        samplerOptions.attack = 0.05;
        samplerOptions.release = 0.8;
      } else if (instrumentId === 'realCello') {
        samplerOptions.attack = 0.08;
        samplerOptions.release = 1.2;
      }
      
      const sampler = new Tone.Sampler(samplerOptions);
      realInstrumentSamplers.set(instrumentId, sampler);
      
    } catch (error) {
      console.warn(`Failed to initialize ${config.name}:`, error);
    }
  }
  
  console.log('Real instrument initialization completed');
}

/**
 * Check if samples exist for a given instrument
 * @param {string} instrumentId - Instrument identifier
 * @returns {Promise<boolean>} Whether samples are available
 */
async function checkSamplesAvailable(instrumentId) {
  const config = SAMPLE_LIBRARY[instrumentId];
  if (!config) return false;
  
  try {
    // Test load one sample to verify availability
    const testNote = Object.keys(config.samples)[0];
    const testUrl = config.baseUrl + config.samples[testNote];
    
    const response = await fetch(testUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn(`Sample check failed for ${config.name}:`, error);
    return false;
  }
}

/**
 * Get list of available real instruments
 * @returns {Array<string>} Array of available instrument IDs
 */
function getAvailableRealInstruments() {
  return Object.keys(SAMPLE_LIBRARY);
}

/**
 * Connect a real instrument sampler to the audio chain
 * @param {string} instrumentId - Instrument to connect
 * @param {Tone.AudioNode} destination - Where to connect the output
 */
function connectRealInstrument(instrumentId, destination) {
  const sampler = realInstrumentSamplers.get(instrumentId);
  if (sampler && destination) {
    // Create dedicated gain node for real instruments if it doesn't exist
    if (!realInstrumentGain) {
      realInstrumentGain = new Tone.Gain(Tone.dbToGain(REAL_INSTRUMENT_BOOST_DB));
      realInstrumentGain.connect(destination);
    }
    
    // Connect sampler through the dedicated gain node
    sampler.connect(realInstrumentGain);
    currentInstrument = instrumentId;
    console.log(`Connected ${SAMPLE_LIBRARY[instrumentId].name} to audio chain with ${REAL_INSTRUMENT_BOOST_DB}dB boost`);
  }
}

/**
 * Disconnect current real instrument
 */
function disconnectRealInstrument() {
  if (currentInstrument) {
    const sampler = realInstrumentSamplers.get(currentInstrument);
    if (sampler) {
      sampler.disconnect();
    }
    currentInstrument = null;
  }
  
  // Disconnect and cleanup the gain node
  if (realInstrumentGain) {
    realInstrumentGain.disconnect();
    realInstrumentGain = null;
  }
}

/**
 * Play a note on a real instrument with dynamic and articulation control
 * @param {string} instrumentId - Instrument to use
 * @param {string} note - Note to play (e.g., "C4")
 * @param {number} velocity - Velocity (0-1)
 * @param {number} duration - Duration in seconds (optional)
 * @param {string} dynamic - Dynamic level (optional)
 * @param {string} articulation - Articulation type (optional)
 */
function playRealNote(instrumentId, note, velocity = 0.8, duration, dynamic, articulation) {
  const sampler = realInstrumentSamplers.get(instrumentId);
  if (!sampler) {
    console.warn(`Real instrument sampler not found: ${instrumentId}`);
    return;
  }
  
  const config = SAMPLE_LIBRARY[instrumentId];
  if (!config) return;
  
  try {
    // Find the best sample for this note
    let sampleNote = findBestSampleForNote(instrumentId, note, dynamic, articulation);
    
    if (duration) {
      sampler.triggerAttackRelease(sampleNote, duration, Tone.now(), velocity);
    } else {
      sampler.triggerAttack(sampleNote, Tone.now(), velocity);
    }
    
    console.log(`Playing ${note} on ${config.name} using sample ${sampleNote}`);
  } catch (error) {
    console.warn(`Error playing note ${note} on ${instrumentId}:`, error);
  }
}

/**
 * Stop a note on a real instrument
 * @param {string} instrumentId - Instrument to use
 * @param {string} note - Note to stop (optional)
 */
function stopRealNote(instrumentId, note) {
  const sampler = realInstrumentSamplers.get(instrumentId);
  if (!sampler) return;
  
  try {
    if (note) {
      const sampleNote = findClosestSample(instrumentId, note)?.sampleNote || note;
      sampler.triggerRelease(sampleNote);
    } else {
      sampler.releaseAll();
    }
  } catch (error) {
    console.warn(`Error stopping note on ${instrumentId}:`, error);
  }
}

/**
 * Find the best sample for a given note with dynamic and articulation considerations
 * @param {string} instrumentId - Instrument identifier
 * @param {string} targetNote - Target note to play
 * @param {string} dynamic - Dynamic level (optional)
 * @param {string} articulation - Articulation type (optional)
 * @returns {string} Best sample note to use
 */
function findBestSampleForNote(instrumentId, targetNote, dynamic, articulation) {
  const config = SAMPLE_LIBRARY[instrumentId];
  if (!config) return targetNote;
  
  // For now, use the closest available sample
  // In the future, this could consider dynamic and articulation
  const result = findClosestSample(instrumentId, targetNote);
  return result ? result.sampleNote : targetNote;
}

/**
 * Play a chord on a real instrument
 * @param {string} instrumentId - Instrument to use
 * @param {Array<string>} notes - Array of notes to play
 * @param {number} velocity - Velocity (0-1)
 * @param {number} duration - Duration in seconds (optional)
 * @param {string} dynamic - Dynamic level (optional)
 * @param {string} articulation - Articulation type (optional)
 */
function playRealChord(instrumentId, notes, velocity = 0.8, duration, dynamic, articulation) {
  const sampler = realInstrumentSamplers.get(instrumentId);
  if (!sampler || !notes || notes.length === 0) return;
  
  try {
    // Map notes to best available samples
    const sampleNotes = notes.map(note => findBestSampleForNote(instrumentId, note, dynamic, articulation));
    
    if (duration) {
      sampleNotes.forEach(sampleNote => {
        sampler.triggerAttackRelease(sampleNote, duration, Tone.now(), velocity);
      });
    } else {
      sampleNotes.forEach(sampleNote => {
        sampler.triggerAttack(sampleNote, Tone.now(), velocity);
      });
    }
    
    console.log(`Playing chord [${notes.join(', ')}] on ${SAMPLE_LIBRARY[instrumentId].name}`);
  } catch (error) {
    console.warn(`Error playing chord on ${instrumentId}:`, error);
    
    // Fallback: try playing notes individually
    try {
      notes.forEach(note => playRealNote(instrumentId, note, velocity, duration, dynamic, articulation));
    } catch (fallbackError) {
      console.warn(`Fallback chord playing also failed:`, fallbackError);
    }
  }
}

/**
 * Stop a chord on a real instrument
 * @param {string} instrumentId - Instrument to use
 * @param {Array<string>} notes - Array of notes to stop (optional)
 */
function stopRealChord(instrumentId, notes) {
  const sampler = realInstrumentSamplers.get(instrumentId);
  if (!sampler) return;
  
  try {
    if (notes && notes.length > 0) {
      notes.forEach(note => sampler.triggerRelease(note));
    } else {
      sampler.releaseAll();
    }
  } catch (error) {
    console.warn(`Error stopping real chord on ${instrumentId}:`, error);
  }
}

/**
 * Set volume for a real instrument
 * @param {string} instrumentId - Instrument identifier
 * @param {number} volume - Volume in dB
 */
function setRealInstrumentVolume(instrumentId, volume) {
  const sampler = realInstrumentSamplers.get(instrumentId);
  if (sampler) {
    sampler.volume.rampTo(volume, 0.1);
  }
}

/**
 * Set the overall real instrument boost level
 * @param {number} boostDb - Boost in dB (can be negative to reduce volume)
 */
function setRealInstrumentBoost(boostDb) {
  if (realInstrumentGain) {
    const gainValue = Tone.dbToGain(boostDb);
    realInstrumentGain.gain.rampTo(gainValue, 0.1);
    console.log(`Real instrument boost set to ${boostDb}dB`);
  }
}

/**
 * Map velocity to dynamic level for realistic instrument expression
 * @param {number} velocity - Velocity (0-1)
 * @returns {string} Dynamic level
 */
function velocityToDynamic(velocity) {
  if (velocity < 0.2) return 'pianissimo';
  if (velocity < 0.35) return 'piano';
  if (velocity < 0.5) return 'mezzo-piano';
  if (velocity < 0.65) return 'mezzo-forte';
  if (velocity < 0.8) return 'forte';
  return 'fortissimo';
}

/**
 * Get appropriate articulation based on note context
 * @param {string} instrumentId - Instrument identifier
 * @param {number} pinchDistance - Hand pinch distance for gesture control
 * @returns {string} Articulation type
 */
function getArticulationForNote(instrumentId, pinchDistance = 0.1) {
  const config = SAMPLE_LIBRARY[instrumentId];
  if (!config || !config.articulations) return 'normal';
  
  // Use pinch distance to determine articulation
  // Pinched = staccato/pizzicato, Open = legato/normal
  if (pinchDistance < 0.05) {
    // Tight pinch - use short articulations
    if (config.articulations.includes('staccato')) return 'staccato';
    if (config.articulations.includes('pizzicato')) return 'pizzicato';
  }
  
  // Default to normal/legato articulations
  if (config.articulations.includes('normal')) return 'normal';
  if (config.articulations.includes('arco-normal')) return 'arco-normal';
  
  return config.articulations[0]; // Fallback to first available
}

/**
 * Check if an instrument ID refers to a real instrument
 * @param {string} instrumentId - Instrument identifier
 * @returns {boolean} True if it's a real instrument
 */
function isRealInstrument(instrumentId) {
  return SAMPLE_LIBRARY.hasOwnProperty(instrumentId);
}

/**
 * Get real instrument configuration
 * @param {string} instrumentId - Instrument identifier
 * @returns {object|null} Instrument configuration or null
 */
function getRealInstrumentConfig(instrumentId) {
  return SAMPLE_LIBRARY[instrumentId] || null;
}

// Export functions
export {
  SAMPLE_LIBRARY,
  initializeRealInstruments,
  checkSamplesAvailable,
  getAvailableRealInstruments,
  connectRealInstrument,
  disconnectRealInstrument,
  playRealNote,
  stopRealNote,
  playRealChord,
  stopRealChord,
  setRealInstrumentVolume,
  setRealInstrumentBoost,
  isRealInstrument,
  getRealInstrumentConfig,
  realInstrumentSamplers,
  noteToFrequency,
  calculatePitchRatio,
  findClosestSample,
  findBestSampleForNote,
  velocityToDynamic,
  getArticulationForNote
};