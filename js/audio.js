/**
 * HandSynth - Audio Module
 * Audio synthesis with Tone.js 
 */

import { soundPresets, selectedSound, MIN_PINCH_DIST, MAX_PINCH_DIST } from './musicTheory.js';
import { mapRange, showMessage } from './utils.js';
import { updateNoteDisplay } from './ui.js';

// Audio variables
let melodySynth, harmonySynth, filter, reverb, delay;
let leftHandIsPlaying = false;
let rightHandIsPlaying = false;
let currentMelodyNote = null;
let currentChord = null;
let leftHandVolume = 0; // Default volume (higher)
let rightHandVolume = 0; // Default volume (higher)
let lastMelodyNote = null;
let lastChord = null;

// Effect variables
let lastEffectChangeTime = 0;
const EFFECT_CHANGE_THRESHOLD = 80; // 80ms minimum between effect changes

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

  // Create reverb and delay effects
  reverb = new Tone.Reverb({
    decay: 1.5,
    wet: 0,  // Start with dry signal, will be controlled by pinch
    preDelay: 0.05,
  });
  reverb.generate(); // Generate the reverb impulse

  delay = new Tone.PingPongDelay({
    delayTime: "8n",
    feedback: 0,  // Start with no feedback, will be controlled by pinch
    wet: 0       // Start with dry signal, will be controlled by pinch
  });

  limiter.connect(delay);
  delay.connect(reverb);
  reverb.connect(compressor);

  filter = new Tone.Filter({
    type: "lowpass",
    frequency: 8000,   // Increased from 2000 for more clarity
    Q: 0.5,            // Reduced from 1 for smoother filtering
    rolloff: -12       // Gentler rolloff for more natural sound
  });

  // Connect filter after it's defined
  filter.connect(delay);
  
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

// Set volume based on distance from center and effects based on pinch distance
function setVolume(hand, distanceFromCenter, pinchDistance) {
  if (!window.audioStarted) return; // Only adjust volume if audio is started

  // Map distance from center to volume (center = soft, edges = loud)
  const volume = mapRange(distanceFromCenter, 0, 0.5, -30, 5);

  // Set volume for the appropriate hand
  if (hand === 'left') {
    leftHandVolume = volume;
    if (harmonySynth) {
      harmonySynth.volume.value = volume;
    }
  } else {
    rightHandVolume = volume;
    if (melodySynth) {
      melodySynth.volume.value = volume;
    }
  }

  // Control effects with pinch distance (with throttling to prevent noise)
  setEffects(pinchDistance);
}

// Set reverb and delay effects based on pinch distance with sensitivity control
function setEffects(pinchDistance) {
  if (!window.audioStarted || !reverb || !delay) return;

  const now = Date.now();

  // Throttle effect changes to prevent audio artifacts
  if (now - lastEffectChangeTime < EFFECT_CHANGE_THRESHOLD) {
    return;
  }

  lastEffectChangeTime = now;

  // Map pinch distance to effect intensity (pinched = more effect)
  const effectIntensity = mapRange(pinchDistance, MIN_PINCH_DIST, MAX_PINCH_DIST, 1, 0);

  // Apply reverb
  const reverbWet = effectIntensity * 0.4; // Max 40% wet signal
  reverb.wet.rampTo(reverbWet, 0.1);

  // Apply delay
  const delayWet = effectIntensity * 0.3; // Max 30% wet signal
  const delayFeedback = effectIntensity * 0.4; // Max 40% feedback

  delay.wet.rampTo(delayWet, 0.1);
  delay.feedback.rampTo(delayFeedback, 0.1);
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
  setEffects,
  melodySynth,
  harmonySynth,
  leftHandIsPlaying,
  rightHandIsPlaying,
  currentMelodyNote,
  currentChord,
  noteChangeTime,
  chordChangeTime
};