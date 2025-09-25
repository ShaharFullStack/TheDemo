/**
 * HandSynth - UI Module
 * User interface elements, controls, and visualizers
 */

import { showMessage } from './utils.js';
import { updateSynths } from './audio.js';
import {
    scales,
    notes,
    selectedRoot,
    selectedScale,
    octave,
    selectedSound,
    soundPresets,
    updateMusicParameters,
    getNoteFromPosition,
    getChordFromPosition
} from './musicTheory.js';

// Current UI state
let currentMelodyNote = null;
let currentChord = null;
let leftHandIsPlaying = false;
let rightHandIsPlaying = false;

// Create UI elements for scale and sound selection
function createUI() {
    const uiContainer = document.createElement('div');
    uiContainer.className = 'ui-container';
    document.body.appendChild(uiContainer);

    // Root note selector
    const rootSelector = document.createElement('select');
    rootSelector.className = 'ui-select';
    rootSelector.id = 'root-select';

    notes.forEach(note => {
        const option = document.createElement('option');
        option.value = note;
        option.textContent = note;
        rootSelector.appendChild(option);
    });

    // Scale selector
    const scaleSelector = document.createElement('select');
    scaleSelector.className = 'ui-select';
    scaleSelector.id = 'scale-select';

    Object.keys(scales).forEach(scale => {
        const option = document.createElement('option');
        option.value = scale;
        option.textContent = scale.charAt(0).toUpperCase() + scale.slice(1);
        scaleSelector.appendChild(option);
    });

    // Sound selector
    const soundSelector = document.createElement('select');
    soundSelector.className = 'ui-select';
    soundSelector.id = 'sound-select';

    Object.keys(soundPresets).forEach(sound => {
        const option = document.createElement('option');
        option.value = sound;
        option.textContent = sound.charAt(0).toUpperCase() + sound.slice(1);
        soundSelector.appendChild(option);
    });

    // Octave selector
    const octaveSelector = document.createElement('select');
    octaveSelector.className = 'ui-select';
    octaveSelector.id = 'octave-select';

    for (let i = 2; i <= 6; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Octave ${i}`;
        if (i === 4) option.selected = true;
        octaveSelector.appendChild(option);
    }

    // Create labels and add everything to UI container
    const createLabeledControl = (label, element) => {
        const container = document.createElement('div');
        container.className = 'ui-control';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;

        container.appendChild(labelEl);
        container.appendChild(element);
        return container;
    };

    uiContainer.appendChild(createLabeledControl('Root Note:', rootSelector));
    uiContainer.appendChild(createLabeledControl('Scale:', scaleSelector));
    uiContainer.appendChild(createLabeledControl('Octave:', octaveSelector));
    uiContainer.appendChild(createLabeledControl('Sound:', soundSelector));

    // Add event listeners after creating the elements
    rootSelector.addEventListener('change', function () {
        updateMusicParameters(null, this.value, null, null);
        updateUI();
    });

    scaleSelector.addEventListener('change', function () {
        updateMusicParameters(this.value, null, null, null);
        updateUI();
    });

    octaveSelector.addEventListener('change', function () {
        updateMusicParameters(null, null, parseInt(this.value), null);
        updateUI();
    });

    soundSelector.addEventListener('change', function () {
        updateMusicParameters(null, null, null, this.value);
        updateSynths();
    });

    // Display initial instructions
    createInstructionsPanel();
}


// Create keys for each note in the selected scale across 2 octaves
const keyCount = 16; // Two octaves of keys

for (let i = 0; i < keyCount; i++) {
    const key = document.createElement('div');
    key.className = 'key';

    // FIXED: Apply inverted mapping (higher = higher pitch)
    const y = mapRange(i, 0, keyCount, 1.0, 0.0);
    const note = getNoteFromPosition(y, selectedScale);

    key.dataset.note = note;

}

// Highlight active keys
if (currentMelodyNote && rightHandIsPlaying) {
    // Find the matching key for the current melody note
    keys.forEach(key => {
        if (key.dataset.note === currentMelodyNote) {
            key.classList.add('active');
        }
    });
}

if (currentChord && leftHandIsPlaying) {
    // Find keys for each note in the chord
    currentChord.notes.forEach(chordNote => {
        keys.forEach(key => {
            if (key.dataset.note === chordNote) {
                key.classList.add('active');
            }
        });
    });
}



// Create instructions panel
function createInstructionsPanel() {
    const instructionsEl = document.createElement('div');
    instructionsEl.id = 'instructions';
    instructionsEl.innerHTML = `
    <h2>Instructions</h2> 
    <p>Move your hands to play music!</p>
    <p>Right hand: Play melody notes</p>
    <p>Left hand: Play chords</p>
    <p>Pinch gesture: Control volume</p>
    <p>Select scale and sound from the UI</p>
    <p>Press 'Start Audio' to begin</p>
  `;
    instructionsEl.style.direction = 'rtl';
    document.body.appendChild(instructionsEl);
    
    // Set up timer to hide instructions 12 seconds after audio starts
    const checkAudioStartedAndHide = () => {
        if (window.audioStarted) {
            // Audio has started, set timeout to hide instructions after 12 seconds
            setTimeout(() => {
                // Fade out instructions panel with CSS transition
                instructionsEl.style.transition = 'opacity 1s ease';
                instructionsEl.style.opacity = '0';
                
                // Remove from DOM after fade completes
                setTimeout(() => {
                    if (instructionsEl.parentNode) {
                        instructionsEl.parentNode.removeChild(instructionsEl);
                    }
                }, 1000);
            }, 12000); // 12 seconds
            
            // Clear the interval once we've set up the timeout
            clearInterval(checkInterval);
        }
    };
    
    // Check periodically if audio has started
    const checkInterval = setInterval(checkAudioStartedAndHide, 500);
}

// Update note display
function updateNoteDisplay() {
    let noteEl = document.getElementById('note-display');
    if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.id = 'note-display';
        noteEl.className = 'note-indicator';
        document.body.appendChild(noteEl);
    }

    let displayText = '';

    if (currentChord && leftHandIsPlaying) {
        displayText += `Chord: ${currentChord.name}`;
    }

    if (currentMelodyNote && rightHandIsPlaying) {
        if (displayText) displayText += ' | ';
        displayText += `Note: ${currentMelodyNote}`;
    }

    if (!displayText) {
        displayText = `Scale: ${selectedRoot} ${selectedScale}`;
    }

    noteEl.textContent = displayText;
    noteEl.style.direction = 'rtl';
    noteEl.className = 'note-indicator' + ((leftHandIsPlaying || rightHandIsPlaying) ? ' playing' : '');
}

// FIXED: Improved note grid drawing for inverted direction
function drawNoteGrid(ctx, canvasWidth, canvasHeight) {
    const gridLines = 16; // Two octaves

    ctx.save();

    // Draw horizontal lines for the notes
    for (let i = 0; i <= gridLines; i++) {
        // FIXED: Distribute grid lines across full screen height
        const y = mapRange(i, 0, gridLines, 0.05, 0.95) * canvasHeight;

        // Change style for the center dividing line (between octaves)
        if (i === 7) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
        }

        // Draw the line
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();

        // Draw note labels
        if (i < gridLines) { // Don't draw label for the last line
            ctx.font = '12px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        }
    }

    ctx.restore();
}

// Update UI elements when scale or root changes
function updateUI() {
    updateNoteDisplay();
    console.log("UI updated with scale:", selectedScale, "root:", selectedRoot, "octave:", octave);
}

// Function to set playing states and notes
function setPlayingState(hand, isPlaying, note) {
    if (hand === 'left') {
        leftHandIsPlaying = isPlaying;
        if (isPlaying) {
            currentChord = note;
        } else {
            currentChord = null;
        }
    } else {
        rightHandIsPlaying = isPlaying;
        if (isPlaying) {
            currentMelodyNote = note;
        } else {
            currentMelodyNote = null;
        }
    }

    updateNoteDisplay();
}

// Helper function to map range
function mapRange(value, inMin, inMax, outMin, outMax) {
    // Ensure value is within range
    value = Math.max(inMin, Math.min(inMax, value));
    // Perform the mapping
    const result = ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    return result;
}

// Export UI functions
export {
    createUI,
    updateUI,
    updateNoteDisplay,
    drawNoteGrid,
    setPlayingState,
    showMessage
};