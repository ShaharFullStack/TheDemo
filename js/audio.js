/**
 * HandSynth - Audio Module
 * Audio synthesis with Tone.js 
 */

import { soundPresets, getSelectedSound, MIN_PINCH_DIST, MAX_PINCH_DIST } from './musicTheory.js';
import { mapRange, showMessage } from './utils.js';
import { updateNoteDisplay } from './ui.js';
import { 
  initializeRealInstruments, 
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
  velocityToDynamic,
  getArticulationForNote
} from './realInstruments.js';

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

// Real instrument variables
let currentInstrumentType = 'synthetic'; // 'synthetic' or 'real'
let currentRealInstrument = null;
let realInstrumentInitialized = false;

// Gesture-based parameters for real instruments
let currentPinchDistance = 0.05; // Default pinch distance
let currentHandSpeed = 0; // Hand movement speed
let lastHandPositions = { left: null, right: null };

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
async function setupAudio() {
  // Set overall audio quality parameters - fixed the latencyHint issue
  // Create context with options instead of setting properties directly
  Tone.context.lookAhead = 0.2;  // This property is still writable

  // Create professional audio processing chain
  setupProfessionalAudioChain();
  
  // Initialize real instruments
  if (!realInstrumentInitialized) {
    await initializeRealInstruments();
    realInstrumentInitialized = true;
  }
  
  // Get current sound selection
  const currentSound = getSelectedSound();
  const preset = soundPresets[currentSound];
  
  // Determine if we're using real or synthetic instruments
  currentInstrumentType = preset.type || 'synthetic';
  
  if (currentInstrumentType === 'real') {
    // Set up real instrument
    currentRealInstrument = currentSound;
    connectRealInstrument(currentSound, inputGain);
    
    // Create dummy synths for compatibility (won't be used)
    melodySynth = new Tone.Synth();
    harmonySynth = new Tone.PolySynth();
    melodySynth.volume.value = -Infinity;
    harmonySynth.volume.value = -Infinity;
    
    console.log(`Initialized real instrument: ${preset.name}`);
  } else {
    // Create synthetic synths with optimized settings
    melodySynth = new Tone.Synth({
      oscillator: {
        type: preset.oscillator.type,
        modulationType: "sine",
        harmonicity: 1
      },
      envelope: {
        attack: preset.envelope.attack,
        decay: preset.envelope.decay,
        sustain: preset.envelope.sustain,
        release: preset.envelope.release,
      },
      portamento: 0.02   // Small portamento for smoother transitions
    });
    
    harmonySynth = new Tone.PolySynth({
      maxPolyphony: 6,   // Limit max polyphony to prevent overloading
      voice: Tone.Synth,
      options: {
        oscillator: {
          type: preset.oscillator.type,
          modulationType: "sine",
          harmonicity: 1
        },
        envelope: {
          attack: preset.envelope.attack * 1.2,  // Slightly slower attack for chords
          decay: preset.envelope.decay,
          sustain: preset.envelope.sustain,
          release: preset.envelope.release * 1.5,  // Longer release for smoother chord transitions
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
    
    console.log(`Initialized synthetic instrument: ${currentSound}`);
  }

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

  const currentSound = getSelectedSound();
  const preset = soundPresets[currentSound];
  if (!preset) {
    console.error(`Invalid sound preset: ${currentSound}`);
    return;
  }
  
  console.log(`Updating synths with sound: ${currentSound}`);
  
  try {
    // Stop all current sounds first
    if (currentInstrumentType === 'real' && currentRealInstrument) {
      stopRealNote(currentRealInstrument);
      stopRealChord(currentRealInstrument);
      disconnectRealInstrument();
    } else {
      melodySynth.triggerRelease();
      harmonySynth.releaseAll();
    }
    
    // Wait for release to complete
    setTimeout(async () => {
      // Determine new instrument type
      currentInstrumentType = preset.type || 'synthetic';
      
      if (currentInstrumentType === 'real') {
        // Switch to real instrument
        currentRealInstrument = currentSound;
        connectRealInstrument(currentSound, inputGain);
        
        // Mute synthetic synths
        melodySynth.volume.value = -Infinity;
        harmonySynth.volume.value = -Infinity;
        
        console.log(`Switched to real instrument: ${preset.name}`);
        showMessage(`Switched to ${preset.name}`);
      } else {
        // Switch to synthetic instrument
        currentRealInstrument = null;
        
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
        melodySynth.connect(inputGain);
        harmonySynth.connect(inputGain);
        
        // Restore volumes
        melodySynth.volume.value = rightHandVolume;
        harmonySynth.volume.value = leftHandVolume;
        
        console.log(`Switched to synthetic instrument: ${currentSound}`);
        showMessage(`Switched sound to ${currentSound}`);
      }
      
      // Reset playing states
      rightHandIsPlaying = false;
      leftHandIsPlaying = false;
      currentMelodyNote = null;
      currentChord = null;
      
    }, 100);
  } catch (error) {
    console.error("Error updating synths:", error);
  }
}

// FIXED: Improved melody note function with gesture-responsive real instruments
function playMelodyNote(note, handPosition = null, pinchDistance = null) {
  if (!window.audioStarted) return;
  
  // Update gesture parameters if provided
  if (pinchDistance !== null) currentPinchDistance = pinchDistance;
  
  // Check if the note has actually changed
  const noteChanged = note !== lastMelodyNote;
  lastMelodyNote = note;
  
  try {
    if (currentInstrumentType === 'real' && currentRealInstrument) {
      // Calculate gesture-based parameters for real instruments
      const velocity = mapRange(Math.abs(rightHandVolume), -30, 5, 0.2, 0.9);
      
      // Use pinch distance to control dynamics and articulation
      const gestureIntensity = mapRange(currentPinchDistance, MIN_PINCH_DIST, MAX_PINCH_DIST, 1.0, 0.0);
      const adjustedVelocity = velocity * (0.5 + gestureIntensity * 0.5); // Pinched = softer, open = louder
      
      // Select dynamic based on both volume and gesture
      let dynamic = velocityToDynamic(adjustedVelocity);
      
      // Gesture-based articulation selection
      let articulation = 'normal';
      if (currentPinchDistance < MIN_PINCH_DIST * 1.5) {
        // Very pinched = special articulations
        if (currentRealInstrument === 'realFlute') {
          articulation = Math.random() > 0.5 ? 'staccato' : 'tenuto';
        } else if (currentRealInstrument === 'realCello') {
          articulation = Math.random() > 0.5 ? 'arco-staccato' : 'arco-spiccato';
        }
      } else if (currentPinchDistance > MAX_PINCH_DIST * 0.8) {
        // Open hand = legato/smooth articulations
        if (currentRealInstrument === 'realFlute') {
          articulation = 'legato';
        } else if (currentRealInstrument === 'realCello') {
          articulation = 'arco-legato';
        }
      }
      
      // Calculate hand speed for additional articulation control
      if (handPosition && lastHandPositions.right) {
        const distance = Math.sqrt(
          Math.pow(handPosition.x - lastHandPositions.right.x, 2) + 
          Math.pow(handPosition.y - lastHandPositions.right.y, 2)
        );
        currentHandSpeed = distance;
        
        // Fast movements = more aggressive articulations
        if (currentHandSpeed > 0.05 && currentRealInstrument === 'realCello') {
          articulation = Math.random() > 0.7 ? 'arco-detache' : 'arco-spiccato';
        }
      }
      
      if (handPosition) lastHandPositions.right = { ...handPosition };
      
      if (!rightHandIsPlaying) {
        // First time playing a note
        playRealNote(currentRealInstrument, note, adjustedVelocity, null, dynamic, articulation);
        rightHandIsPlaying = true;
        currentMelodyNote = note;
        
        // Trigger animation effect for new note
        noteChangeTime = Date.now() * 0.001;
        
        console.log(`Playing ${note} with ${dynamic} ${articulation} (pinch: ${currentPinchDistance.toFixed(3)})`);
        
      } else if (noteChanged) {
        // Stop current note and play new one with gesture-based parameters
        stopRealNote(currentRealInstrument, currentMelodyNote);
        setTimeout(() => {
          playRealNote(currentRealInstrument, note, adjustedVelocity, null, dynamic, articulation);
          currentMelodyNote = note;
          
          // Trigger animation effect for note change
          noteChangeTime = Date.now() * 0.001;
          
          console.log(`Changed to ${note} with ${dynamic} ${articulation} (pinch: ${currentPinchDistance.toFixed(3)})`);
        }, 30);
      }
    } else {
      // Use synthetic instrument
      if (!melodySynth) return;
      
      if (!rightHandIsPlaying) {
        // First time playing a note
        melodySynth.triggerAttack(note, Tone.now(), 0.8);  // Reduced velocity for cleaner sound
        rightHandIsPlaying = true;
        currentMelodyNote = note;
        
        // Trigger animation effect for new note
        noteChangeTime = Date.now() * 0.001;
        
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
      }
    }
    
    updateNoteDisplay();
  } catch (error) {
    console.error("Error playing melody note:", error);
  }
}

// FIXED: Complete revision of chord playing with gesture-responsive real instruments
function playChord(chord, handPosition = null, pinchDistance = null) {
  if (!window.audioStarted) return;
  
  // Update gesture parameters if provided
  if (pinchDistance !== null) currentPinchDistance = pinchDistance;
  
  // Check if the chord has actually changed by comparing note arrays
  const chordChanged = !lastChord || 
                       JSON.stringify(chord.notes) !== JSON.stringify(lastChord.notes);
  
  try {
    if (currentInstrumentType === 'real' && currentRealInstrument) {
      // Calculate gesture-based parameters for real instruments
      const velocity = mapRange(Math.abs(leftHandVolume), -30, 5, 0.3, 0.8); // Slightly softer for chords
      
      // Use pinch distance to control chord expression
      const gestureIntensity = mapRange(currentPinchDistance, MIN_PINCH_DIST, MAX_PINCH_DIST, 1.0, 0.0);
      const adjustedVelocity = velocity * (0.4 + gestureIntensity * 0.6); // More variation for chords
      
      // Select dynamic based on gesture
      let dynamic = velocityToDynamic(adjustedVelocity);
      
      // Gesture-based articulation for chords
      let articulation = 'arco-legato'; // Default for chords
      if (currentPinchDistance < MIN_PINCH_DIST * 2) {
        // Pinched = pizzicato or staccato
        if (currentRealInstrument === 'realCello') {
          articulation = Math.random() > 0.6 ? 'pizz-normal' : 'arco-staccato';
        }
      } else if (currentPinchDistance > MAX_PINCH_DIST * 0.7) {
        // Open hand = smooth sustained chords
        if (currentRealInstrument === 'realCello') {
          articulation = 'arco-legato';
        } else if (currentRealInstrument === 'realFlute') {
          articulation = 'legato';
        }
      }
      
      // Calculate hand speed for chord articulation
      if (handPosition && lastHandPositions.left) {
        const distance = Math.sqrt(
          Math.pow(handPosition.x - lastHandPositions.left.x, 2) + 
          Math.pow(handPosition.y - lastHandPositions.left.y, 2)
        );
        const leftHandSpeed = distance;
        
        // Fast movements = more aggressive chord attacks
        if (leftHandSpeed > 0.03 && currentRealInstrument === 'realCello') {
          articulation = 'arco-detache';
        }
      }
      
      if (handPosition) lastHandPositions.left = { ...handPosition };
      
      if (!leftHandIsPlaying) {
        // First-time playing
        playRealChord(currentRealInstrument, chord.notes, adjustedVelocity, null, dynamic, articulation);
        leftHandIsPlaying = true;
        currentChord = chord;
        lastChord = {...chord}; // Make a copy to prevent reference issues
        
        // Trigger animation effects for new chord
        chordChangeTime = Date.now() * 0.001;
        
        console.log(`Playing ${chord.name} chord with ${dynamic} ${articulation} (pinch: ${currentPinchDistance.toFixed(3)})`);
        
      } else if (chordChanged) {
        // Stop current chord and play new one with gesture-based parameters
        stopRealChord(currentRealInstrument, lastChord ? lastChord.notes : null);
        setTimeout(() => {
          playRealChord(currentRealInstrument, chord.notes, adjustedVelocity, null, dynamic, articulation);
          currentChord = chord;
          lastChord = {...chord};
          chordChangeTime = Date.now() * 0.001;
          
          console.log(`Changed to ${chord.name} chord with ${dynamic} ${articulation} (pinch: ${currentPinchDistance.toFixed(3)})`);
        }, 30);
      }
    } else {
      // Use synthetic instrument
      if (!harmonySynth) return;
      
      if (!leftHandIsPlaying) {
        // First-time playing
        harmonySynth.triggerAttack(chord.notes, Tone.now(), 0.6);  // Reduced velocity for softer attack
        leftHandIsPlaying = true;
        currentChord = chord;
        lastChord = {...chord}; // Make a copy to prevent reference issues
        
        // Trigger animation effects for new chord
        chordChangeTime = Date.now() * 0.001;
        
      } else if (chordChanged) {
        // CRITICAL FIX: Using proper sequence to eliminate distortion
        
        // 1. Release all current notes in the past to ensure clean release
        harmonySynth.releaseAll(Tone.now() - 0.005);
        
        // 2. Dispose of the synth and recreate it only if necessary
        if (harmonySynth && harmonySynth.dispose) {
            harmonySynth.dispose();
        }
        const currentSound = getSelectedSound();
        const preset = soundPresets[currentSound];
        harmonySynth = new Tone.PolySynth({
          maxPolyphony: 8,
          voice: Tone.Synth,
          options: {
            oscillator: {
              type: preset.oscillator ? preset.oscillator.type : 'sine',
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
        harmonySynth.connect(inputGain);
        harmonySynth.volume.value = leftHandVolume;
        // 3. Play the new chord with minimal delay using Tone.now()
        harmonySynth.triggerAttack(chord.notes, Tone.now(), 0.6);
        currentChord = chord;
        lastChord = {...chord};
        chordChangeTime = Date.now() * 0.001;
      }
    }
    
    updateNoteDisplay();
  } catch (error) {
    console.error("Error playing chord:", error);
  }
}

// Stop melody
function stopMelody() {
  if (rightHandIsPlaying) {
    if (currentInstrumentType === 'real' && currentRealInstrument) {
      stopRealNote(currentRealInstrument, currentMelodyNote);
    } else if (melodySynth) {
      melodySynth.triggerRelease();
    }
    rightHandIsPlaying = false;
    currentMelodyNote = null;
    updateNoteDisplay();
    // console.log("Stopped melody");
  }
}

// Stop chord - FIXED to ensure chords actually stop
function stopChord() {
  if (leftHandIsPlaying) {
    if (currentInstrumentType === 'real' && currentRealInstrument) {
      stopRealChord(currentRealInstrument, currentChord ? currentChord.notes : null);
    } else if (harmonySynth) {
      // Use releaseAll instead of triggerRelease for PolySynth
      harmonySynth.releaseAll();
      
      // More aggressive approach to ensure sound stops
      setTimeout(() => {
        // If sound is still playing, rebuild the synth
        if (leftHandIsPlaying && harmonySynth) {
          harmonySynth.dispose();
          
          // Recreate harmony synth with same settings
          const currentSound = getSelectedSound();
          const preset = soundPresets[currentSound];
          harmonySynth = new Tone.PolySynth({
            maxPolyphony: 8,
            voice: Tone.Synth,
            options: {
              oscillator: {
                type: preset.oscillator ? preset.oscillator.type : 'sine',
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
          
          // Reconnect to audio chain
          harmonySynth.connect(inputGain);
          harmonySynth.volume.value = leftHandVolume;
        }
      }, 100);
    }
    
    leftHandIsPlaying = false;
    currentChord = null;
    updateNoteDisplay();
    // console.log("Stopped chord");
  }
}

// Set volume based on distance from center and effects based on pinch distance
function setVolume(hand, distanceFromCenter, pinchDistance) {
  if (!window.audioStarted) return; // Only adjust volume if audio is started

  // Update gesture parameters for real instruments
  if (pinchDistance !== undefined && pinchDistance !== null) {
    currentPinchDistance = pinchDistance;
  }

  // Map distance from center to volume (center = soft, edges = loud)
  const volume = mapRange(distanceFromCenter, 0, 0.5, -30, 5);

  // Set volume for the appropriate hand
  if (hand === 'left') {
    leftHandVolume = volume;
    if (currentInstrumentType === 'real' && currentRealInstrument) {
      // For real instruments, we'll use volume changes to affect velocity in note triggering
      // The actual volume control happens during note playing
      setRealInstrumentVolume(currentRealInstrument, volume);
    } else if (harmonySynth) {
      harmonySynth.volume.value = volume;
    }
  } else {
    rightHandVolume = volume;
    if (currentInstrumentType === 'real' && currentRealInstrument) {
      // For real instruments, we'll use volume changes to affect velocity in note triggering
      // The actual volume control happens during note playing  
      setRealInstrumentVolume(currentRealInstrument, volume);
    } else if (melodySynth) {
      melodySynth.volume.value = volume;
    }
  }

  // Control effects with pinch distance (with throttling to prevent noise)
  setEffects(pinchDistance);
}

// New function to update gesture parameters for real instrument expression
function updateGestureParameters(handType, handPosition, pinchDistance, fingerPositions = null) {
  if (!window.audioStarted || currentInstrumentType !== 'real') return;
  
  // Update pinch distance
  if (pinchDistance !== undefined && pinchDistance !== null) {
    currentPinchDistance = pinchDistance;
  }
  
  // Update hand position for speed calculation
  if (handPosition) {
    if (handType === 'left') {
      if (lastHandPositions.left) {
        const distance = Math.sqrt(
          Math.pow(handPosition.x - lastHandPositions.left.x, 2) + 
          Math.pow(handPosition.y - lastHandPositions.left.y, 2)
        );
        currentHandSpeed = Math.max(currentHandSpeed * 0.8, distance); // Smooth speed tracking
      }
      lastHandPositions.left = { ...handPosition };
    } else {
      if (lastHandPositions.right) {
        const distance = Math.sqrt(
          Math.pow(handPosition.x - lastHandPositions.right.x, 2) + 
          Math.pow(handPosition.y - lastHandPositions.right.y, 2)
        );
        currentHandSpeed = Math.max(currentHandSpeed * 0.8, distance); // Smooth speed tracking
      }
      lastHandPositions.right = { ...handPosition };
    }
  }
  
  // Additional gesture-based controls can be added here
  // For example, finger positions could control tremolo, vibrato, etc.
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
  if (midEQ && midEQ.highFrequency) {
    // EQ3 uses highFrequency for the mid crossover
    midEQ.highFrequency.rampTo(freq, 0.1);
  } else {
    console.warn('Mid EQ frequency control not available');
  }
}

function setMidGainManual(gain) {
  if (midEQ && midEQ.mid) {
    midEQ.mid.rampTo(gain, 0.1);
  } else {
    console.warn('Mid EQ gain control not available');
  }
}

function setMidQManual(q) {
  // EQ3 doesn't have Q controls, it's a simple 3-band EQ
  console.log(`Mid Q set to ${q} (EQ3 doesn't support Q adjustment)`);
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
  updateGestureParameters,
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
  chordChangeTime,
  // Real instrument state
  currentInstrumentType,
  currentRealInstrument,
  currentPinchDistance,
  currentHandSpeed
};