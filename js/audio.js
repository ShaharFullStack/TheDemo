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

// Professional audio processing chain
let masterGain, inputGain;
let highpassFilter, midEQ, compressor, saturation, chorus, stereoWidener;
let limiter;

// Effect variables
let lastEffectChangeTime = 0;
const EFFECT_CHANGE_THRESHOLD = 80; // 80ms minimum between effect changes

// Time tracking for animation
let noteChangeTime = 0;
let chordChangeTime = 0;

// Professional audio chain setup
function setupProfessionalAudioChain() {
  // Create master output chain
  limiter = new Tone.Limiter(-1).toDestination();

  masterGain = new Tone.Gain(0.8); // -2dB default master level
  masterGain.connect(limiter);

  // Stereo widener for spatial enhancement
  stereoWidener = new Tone.StereoWidener(0); // 0% width by default
  stereoWidener.connect(masterGain);

  // Compressor for dynamics control
  compressor = new Tone.Compressor({
    threshold: -12,
    ratio: 3,
    attack: 0.01,
    release: 0.2
  });
  compressor.connect(stereoWidener);

  // Saturation for warmth
  saturation = new Tone.Distortion({
    distortion: 0,
    oversample: '4x'
  });
  saturation.connect(compressor);

  // EQ section
  midEQ = new Tone.EQ3({
    low: 0,
    mid: 0,
    high: 0,
    lowFrequency: 400,
    highFrequency: 2500
  });
  midEQ.connect(saturation);

  // High-pass filter (low cut)
  highpassFilter = new Tone.Filter({
    type: "highpass",
    frequency: 20,
    Q: 0.7
  });
  highpassFilter.connect(midEQ);

  // Low-pass filter (high cut)
  filter = new Tone.Filter({
    type: "lowpass",
    frequency: 8000,
    Q: 0.5,
    rolloff: -12
  });
  filter.connect(highpassFilter);

  // Chorus for modulation
  chorus = new Tone.Chorus({
    frequency: 1.5,
    delayTime: 2.5,
    depth: 0,
    spread: 180
  }).start();
  chorus.connect(filter);

  // Delay line
  delay = new Tone.PingPongDelay({
    delayTime: "4n",
    feedback: 0.25,
    wet: 0
  });
  delay.connect(chorus);

  // Reverb
  reverb = new Tone.Reverb({
    decay: 2.0,
    wet: 0,
    preDelay: 0.05,
    roomSize: 0.7
  });
  reverb.generate();
  reverb.connect(delay);

  // Input gain stage
  inputGain = new Tone.Gain(1);
  inputGain.connect(reverb);
  inputGain.connect(delay); // Parallel reverb/delay send

  console.log("Professional audio chain initialized");
}

// Setup audio with Tone.js - with improved audio quality settings
function setupAudio() {
  // Set overall audio quality parameters - fixed the latencyHint issue
  // Create context with options instead of setting properties directly
  Tone.context.lookAhead = 0.2;  // This property is still writable

  // Create professional audio processing chain
  setupProfessionalAudioChain();
  
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
  
  // Connect synths to professional audio chain
  melodySynth.connect(inputGain);
  harmonySynth.connect(inputGain);
  
  // Set initial volume with better defaults
  melodySynth.volume.value = rightHandVolume;
  harmonySynth.volume.value = leftHandVolume;

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
  if (!preset) {
    console.error(`Invalid sound preset: ${selectedSound}`);
    return;
  }
  
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

// Manual effect control functions for the control panel
function setReverbAmountManual(amount) {
  if (reverb) {
    reverb.wet.rampTo(amount, 0.1);
  }
}

function setDelayAmountManual(amount) {
  if (delay) {
    delay.wet.rampTo(amount, 0.1);
  }
}

function setDelayTimeManual(time) {
  if (delay) {
    delay.delayTime.value = time;
  }
}

function setFilterFrequencyManual(freq) {
  if (filter) {
    filter.frequency.rampTo(freq, 0.1);
  }
}

// Professional audio control functions
function setMasterVolumeManual(value) {
  if (masterGain) {
    masterGain.gain.rampTo(Tone.dbToGain(value), 0.1);
  }
}

function setInputGainManual(value) {
  if (inputGain) {
    const gainValue = value / 100; // Convert percentage to gain
    inputGain.gain.rampTo(gainValue, 0.1);
  }
}

function setReverbSizeManual(value) {
  if (reverb) {
    reverb.decay = value;
  }
}

function setReverbPredelayManual(value) {
  if (reverb) {
    reverb.preDelay = value / 1000; // Convert ms to seconds
  }
}

function setStereoWidthManual(value) {
  if (stereoWidener) {
    const width = (value - 100) / 100; // Convert 0-200% to -1 to 1
    stereoWidener.width.rampTo(width, 0.1);
  }
}

function setDelayFeedbackManual(value) {
  if (delay) {
    delay.feedback.rampTo(value / 100, 0.1);
  }
}

function setChorusRateManual(value) {
  if (chorus && chorus.frequency && typeof chorus.frequency.rampTo === 'function') {
    chorus.frequency.rampTo(value, 0.1);
  }
}

function setChorusDepthManual(value) {
  if (chorus && chorus.depth && typeof chorus.depth.rampTo === 'function') {
    chorus.depth.rampTo(value / 100, 0.1);
  }
}

function setHighpassFreqManual(freq) {
  if (highpassFilter) {
    highpassFilter.frequency.rampTo(freq, 0.1);
  }
}

function setMidFreqManual(freq) {
  if (midEQ) {
    midEQ.mid.frequency.rampTo(freq, 0.1);
  }
}

function setMidGainManual(gain) {
  if (midEQ) {
    midEQ.mid.rampTo(gain, 0.1);
  }
}

function setMidQManual(q) {
  if (midEQ) {
    midEQ.mid.Q.rampTo(q, 0.1);
  }
}

function setCompressorRatioManual(ratio) {
  if (compressor) {
    compressor.ratio.rampTo(ratio, 0.1);
  }
}

function setCompressorThresholdManual(threshold) {
  if (compressor) {
    compressor.threshold.rampTo(threshold, 0.1);
  }
}

function setCompressorAttackManual(attack) {
  if (compressor) {
    compressor.attack.rampTo(attack, 0.1);
  }
}

function setCompressorReleaseManual(release) {
  if (compressor) {
    compressor.release.rampTo(release, 0.1);
  }
}

function setSaturationManual(amount) {
  if (saturation) {
    saturation.distortion = amount / 100;
  }
}

// Advanced Audio Controls
function setDistortionManual(value) {
  // Use saturation for distortion effect
  if (saturation) {
    saturation.distortion = value / 100;
  }
}

function setPhaserRateManual(value) {
  // Placeholder - would need Tone.Phaser
  console.log(`Phaser rate set to ${value} Hz`);
}

function setPhaserDepthManual(value) {
  // Placeholder - would need Tone.Phaser
  console.log(`Phaser depth set to ${value}%`);
}

function setTremoloRateManual(value) {
  // Placeholder - would need Tone.Tremolo
  console.log(`Tremolo rate set to ${value} Hz`);
}

function setTremoloDepthManual(value) {
  // Placeholder - would need Tone.Tremolo
  console.log(`Tremolo depth set to ${value}%`);
}

function setAutoWahManual(value) {
  // Use filter frequency modulation for auto-wah effect
  if (filter && value > 0) {
    const baseFreq = 1000;
    const modDepth = value * 50; // Scale the modulation depth
    filter.frequency.rampTo(baseFreq + modDepth, 0.1);
  }
}

// Envelope Controls
function setEnvelopeAttackManual(value) {
  if (melodySynth && melodySynth.envelope) {
    melodySynth.envelope.attack = value;
  }
  if (harmonySynth && harmonySynth.envelope) {
    harmonySynth.envelope.attack = value;
  }
}

function setEnvelopeDecayManual(value) {
  if (melodySynth && melodySynth.envelope) {
    melodySynth.envelope.decay = value;
  }
  if (harmonySynth && harmonySynth.envelope) {
    harmonySynth.envelope.decay = value;
  }
}

function setEnvelopeSustainManual(value) {
  if (melodySynth && melodySynth.envelope) {
    melodySynth.envelope.sustain = value;
  }
  if (harmonySynth && harmonySynth.envelope) {
    harmonySynth.envelope.sustain = value;
  }
}

function setEnvelopeReleaseManual(value) {
  if (melodySynth && melodySynth.envelope) {
    melodySynth.envelope.release = value;
  }
  if (harmonySynth && harmonySynth.envelope) {
    harmonySynth.envelope.release = value;
  }
}

// Oscillator Controls
function setOscillatorDetuneManual(value) {
  if (melodySynth && melodySynth.oscillator) {
    melodySynth.oscillator.detune.rampTo(value, 0.1);
  }
  if (harmonySynth && harmonySynth.oscillator) {
    harmonySynth.oscillator.detune.rampTo(value, 0.1);
  }
}

function setFMFrequencyManual(value) {
  // Placeholder for FM synthesis - would need Tone.FMSynth
  console.log(`FM frequency set to ${value} Hz`);
}

function setFMDepthManual(value) {
  // Placeholder for FM synthesis - would need Tone.FMSynth
  console.log(`FM depth set to ${value}%`);
}

function setOscillatorTypeManual(type) {
  if (melodySynth && melodySynth.oscillator) {
    melodySynth.oscillator.type = type;
  }
  if (harmonySynth && harmonySynth.oscillator) {
    harmonySynth.oscillator.type = type;
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
  setEffects,
  // Basic effects
  setReverbAmountManual,
  setDelayAmountManual,
  setDelayTimeManual,
  setFilterFrequencyManual,
  // Professional controls
  setMasterVolumeManual,
  setInputGainManual,
  setReverbSizeManual,
  setReverbPredelayManual,
  setStereoWidthManual,
  setDelayFeedbackManual,
  setChorusRateManual,
  setChorusDepthManual,
  setHighpassFreqManual,
  setMidFreqManual,
  setMidGainManual,
  setMidQManual,
  setCompressorRatioManual,
  setCompressorThresholdManual,
  setCompressorAttackManual,
  setCompressorReleaseManual,
  setSaturationManual,
  // Advanced audio controls
  setDistortionManual,
  setPhaserRateManual,
  setPhaserDepthManual,
  setTremoloRateManual,
  setTremoloDepthManual,
  setAutoWahManual,
  // Envelope controls
  setEnvelopeAttackManual,
  setEnvelopeDecayManual,
  setEnvelopeSustainManual,
  setEnvelopeReleaseManual,
  // Oscillator controls
  setOscillatorDetuneManual,
  setFMFrequencyManual,
  setFMDepthManual,
  setOscillatorTypeManual,
  // Audio objects
  melodySynth,
  harmonySynth,
  reverb,
  delay,
  filter,
  masterGain,
  inputGain,
  // State variables
  leftHandIsPlaying,
  rightHandIsPlaying,
  currentMelodyNote,
  currentChord,
  noteChangeTime,
  chordChangeTime
};