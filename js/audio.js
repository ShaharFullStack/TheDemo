/**
 * HandSynth - Audio Module
 * Audio synthesis with Tone.js 
 */

import { soundPresets, selectedSound, MIN_PINCH_DIST, MAX_PINCH_DIST } from './musicTheory.js';
import { mapRange, showMessage } from './utils.js';
import { updateNoteDisplay } from './ui.js';

// Audio variables
let melodySynth, harmonySynth, filter, reverb;
let leftHandIsPlaying = false;
let rightHandIsPlaying = false;
let currentMelodyNote = null;
let currentChord = null;
let leftHandVolume = -10; // Default volume
let rightHandVolume = -10; // Default volume
let lastMelodyNote = null;
let lastChord = null;

// Time tracking for animation
let noteChangeTime = 0;
let chordChangeTime = 0;

// Setup audio with Tone.js - with improved audio quality settings
function setupAudio() {
  // Set overall audio quality parameters - fixed the latencyHint issue
  // Create context with options instead of setting properties directly
  Tone.context.lookAhead = 0.2;  // This property is still writable

  // Create a limiter to prevent audio clipping
  const limiter = new Tone.Limiter(-3).toDestination();
  
  // Improve overall sound with slightly deeper reverb and a gentle compressor
  const compressor = new Tone.Compressor(-12, 3).toDestination();
  
  reverb = new Tone.Reverb({
    decay: 2.0,
    wet: 0.3,
    preDelay: 0.07,
  });
  reverb.generate(); // Generate the reverb impulse
  limiter.connect(reverb);  

  filter = new Tone.Filter({
    type: "lowpass",
    frequency: 8000,   // Increased from 2000 for more clarity
    Q: 0.5,            // Reduced from 1 for smoother filtering
    rolloff: -12       // Gentler rolloff for more natural sound
  });
  
  // Connect filter after it's defined
  filter.connect(reverb);
  reverb.connect(compressor);
  
  // Create synths with optimized settings
  melodySynth = new Tone.Synth({
    oscillator: {
      type: soundPresets[selectedSound].oscillator.type,
      modulationType: "sine",
      harmonicity: 1
    },
    envelope: {
      attack: soundPresets[selectedSound].envelope.attack,
      decay: soundPresets[selectedSound].envelope.decay,
      sustain: soundPresets[selectedSound].envelope.sustain,
      release: soundPresets[selectedSound].envelope.release,
    },
    portamento: 0.02   // Small portamento for smoother transitions
  });
  
  harmonySynth = new Tone.PolySynth({
    maxPolyphony: 6,   // Limit max polyphony to prevent overloading
    voice: Tone.Synth,
    options: {
      oscillator: {
        type: soundPresets[selectedSound].oscillator.type,
        modulationType: "sine",
        harmonicity: 1
      },
      envelope: {
        attack: soundPresets[selectedSound].envelope.attack * 1.2,  // Slightly slower attack for chords
        decay: soundPresets[selectedSound].envelope.decay,
        sustain: soundPresets[selectedSound].envelope.sustain,
        release: soundPresets[selectedSound].envelope.release * 1.5,  // Longer release for smoother chord transitions
      },
      portamento: 0.02  // Small portamento for smoother transitions
    }
  });
  
  // Connect in proper order for better sound quality
  melodySynth.connect(filter);
  harmonySynth.connect(filter);
  
  // Set initial volume with better defaults
  melodySynth.volume.value = rightHandVolume;
  harmonySynth.volume.value = leftHandVolume;
  
  // Create a status element to show current note/chord
  const noteEl = document.createElement('div');
  noteEl.id = 'note-display';
  noteEl.className = 'note-indicator';
  document.body.appendChild(noteEl);
  
  // Make global audioStarted available
  window.audioStarted = true;
  
  console.log("Audio system initialized successfully");
}

// Update synths based on selected sound - with improved distortion prevention
function updateSynths() {
  if (!melodySynth || !harmonySynth) {
    console.log("Audio not initialized yet, can't update synths");
    return;
  }
  
  const preset = soundPresets[selectedSound];
  
  try {
    // Stop all current sounds first
    melodySynth.triggerRelease();
    harmonySynth.releaseAll();
    
    // Wait for release to complete
    setTimeout(() => {
      // Completely rebuild synths for clean sound when changing
      
      // Dispose old synths
      melodySynth.dispose();
      harmonySynth.dispose();
      
      // Create new melody synth
      melodySynth = new Tone.Synth({
        oscillator: {
          type: preset.oscillator.type,
          modulationType: "sine"
        },
        envelope: {
          attack: preset.envelope.attack,
          decay: preset.envelope.decay,
          sustain: preset.envelope.sustain,
          release: preset.envelope.release
        },
        portamento: 0.02
      });
      
      // Create new harmony synth
      harmonySynth = new Tone.PolySynth({
        maxPolyphony: 6,
        voice: Tone.Synth,
        options: {
          oscillator: {
            type: preset.oscillator.type,
            modulationType: "sine"
          },
          envelope: {
            attack: preset.envelope.attack * 1.2,
            decay: preset.envelope.decay,
            sustain: preset.envelope.sustain,
            release: preset.envelope.release * 1.5
          },
          portamento: 0.02
        }
      });
      
      // Reconnect to the audio chain
      melodySynth.connect(filter);
      harmonySynth.connect(filter);
      
      // Restore volumes
      melodySynth.volume.value = rightHandVolume;
      harmonySynth.volume.value = leftHandVolume;
      
      // Reset playing states
      rightHandIsPlaying = false;
      leftHandIsPlaying = false;
      currentMelodyNote = null;
      currentChord = null;
      
      showMessage(`Switched sound to ${selectedSound}`);
    }, 100);
  } catch (error) {
    console.error("Error updating synths:", error);
  }
}

// FIXED: Improved melody note function with reduced distortion and animation triggers
function playMelodyNote(note) {
  if (!window.audioStarted || !melodySynth) return;
  
  // Check if the note has actually changed
  const noteChanged = note !== lastMelodyNote;
  lastMelodyNote = note;
  
  try {
    if (!rightHandIsPlaying) {
      // First time playing a note
      melodySynth.triggerAttack(note, Tone.now(), 0.8);  // Reduced velocity for cleaner sound
      rightHandIsPlaying = true;
      currentMelodyNote = note;
      
      // Trigger animation effect for new note
      noteChangeTime = Date.now() * 0.001;
      
    //   console.log("Started playing melody note:", note);
    } else if (noteChanged) {
      // FIXED: Use proper scheduled timing for clean note transitions
      const now = Tone.now();
      
      // Release the current note with a precise timestamp
      melodySynth.triggerRelease(now + 0.02);
      
      // Schedule the attack of the new note with a slight delay
      melodySynth.triggerAttack(note, now + 0.07, 0.7);
      currentMelodyNote = note;
      
      // Trigger animation effect for note change
      noteChangeTime = Date.now() * 0.001;
      
    //   console.log("Changed melody note to:", note);
    }
    
    updateNoteDisplay();
  } catch (error) {
    console.error("Error playing melody note:", error);
  }
}

// FIXED: Complete revision of chord playing to eliminate distortion and enhance animation
function playChord(chord) {
  if (!window.audioStarted || !harmonySynth) return;
  
  // Check if the chord has actually changed by comparing note arrays
  const chordChanged = !lastChord || 
                       JSON.stringify(chord.notes) !== JSON.stringify(lastChord.notes);
  
  try {
    if (!leftHandIsPlaying) {
      // First-time playing
      harmonySynth.triggerAttack(chord.notes, Tone.now(), 0.6);  // Reduced velocity for softer attack
      leftHandIsPlaying = true;
      currentChord = chord;
      lastChord = {...chord}; // Make a copy to prevent reference issues
      
      // Trigger animation effects for new chord
      chordChangeTime = Date.now() * 0.001;
      
    //   console.log("Started playing chord:", chord.name, chord.notes);
    } else if (chordChanged) {
      // CRITICAL FIX: Using proper sequence to eliminate distortion
      
      // 1. Release all current notes in the past to ensure clean release
      harmonySynth.releaseAll(Tone.now() - 0.005);
      
      // 2. Dispose of the synth and recreate it only if necessary
      if (harmonySynth && harmonySynth.dispose) {
          harmonySynth.dispose();
      }
      harmonySynth = new Tone.PolySynth({
        maxPolyphony: 8,
        voice: Tone.Synth,
        options: {
          oscillator: {
            type: soundPresets[selectedSound].oscillator.type,
            modulationType: "sine"
          },
          envelope: {
            attack: soundPresets[selectedSound].envelope.attack * 1.2,
            decay: soundPresets[selectedSound].envelope.decay,
            sustain: soundPresets[selectedSound].envelope.sustain,
            release: soundPresets[selectedSound].envelope.release * 1.5
          },
          portamento: 0.02
        }
      });
      harmonySynth.connect(filter);
      harmonySynth.volume.value = leftHandVolume;
      // 3. Play the new chord with minimal delay using Tone.now()
      harmonySynth.triggerAttack(chord.notes, Tone.now(), 0.6);
      currentChord = chord;
      lastChord = {...chord};
      chordChangeTime = Date.now() * 0.001;
    //   console.log("Changed chord to:", chord.name, chord.notes);
    }
    
    updateNoteDisplay();
  } catch (error) {
    console.error("Error playing chord:", error);
  }
}

// Stop melody
function stopMelody() {
  if (rightHandIsPlaying && melodySynth) {
    melodySynth.triggerRelease();
    rightHandIsPlaying = false;
    currentMelodyNote = null;
    updateNoteDisplay();
    // console.log("Stopped melody");
  }
}

// Stop chord - FIXED to ensure chords actually stop
function stopChord() {
  if (leftHandIsPlaying && harmonySynth) {
    // Use releaseAll instead of triggerRelease for PolySynth
    harmonySynth.releaseAll();
    
    // More aggressive approach to ensure sound stops
    setTimeout(() => {
      // If sound is still playing, rebuild the synth
      if (leftHandIsPlaying && harmonySynth) {
        harmonySynth.dispose();
        
        // Recreate harmony synth with same settings
        harmonySynth = new Tone.PolySynth({
          maxPolyphony: 8,
          voice: Tone.Synth,
          options: {
            oscillator: {
              type: soundPresets[selectedSound].oscillator.type,
              modulationType: "sine"
            },
            envelope: {
              attack: soundPresets[selectedSound].envelope.attack * 1.2,
              decay: soundPresets[selectedSound].envelope.decay,
              sustain: soundPresets[selectedSound].envelope.sustain,
              release: soundPresets[selectedSound].envelope.release * 1.5
            },
            portamento: 0.02
          }
        });
        
        // Reconnect to audio chain
        harmonySynth.connect(filter);
        harmonySynth.volume.value = leftHandVolume;
      }
    }, 100);
    
    leftHandIsPlaying = false;
    currentChord = null;
    updateNoteDisplay();
    // console.log("Stopped chord");
  }
}

// Set volume based on pinch distance - INVERTED: pinch = soft, open hand = loud
function setVolume(hand, pinchDistance) {
  if (!window.audioStarted) return; // Only adjust volume if audio is started
  
  // Map pinch distance to volume (closer fingers = softer)
  const volume = mapRange(pinchDistance, MIN_PINCH_DIST, MAX_PINCH_DIST, -70, -15);
  
  if (hand === 'left') {
    leftHandVolume = volume;
    if (harmonySynth) {
      harmonySynth.volume.value = volume;
    }
    // console.log("Left hand volume:", volume);
  } else {
    rightHandVolume = volume;
    if (melodySynth) {
      melodySynth.volume.value = volume;
    }
    // console.log("Right hand volume:", volume);
  }
}

// Export audio functions and variables
export {
  setupAudio,
  updateSynths,
  playMelodyNote,
  playChord,
  stopMelody,
  stopChord,
  setVolume,
  melodySynth,
  harmonySynth,
  leftHandIsPlaying,
  rightHandIsPlaying,
  currentMelodyNote,
  currentChord,
  noteChangeTime,
  chordChangeTime
};