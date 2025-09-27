/**
 * HandSynth - UI Module
 * User interface elements, controls, and visualizers
 */

import { showMessage } from './utils.js';
import { updateSynths } from './audio.js';
import { resetKnobsToDefaults } from './controlPanel.js';
import {
    scales,
    notes,
    selectedRoot,
    selectedScale,
    octave,
    getSelectedSound,
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

// Create modern header menu with dropdown controls
function createUI() {
    const uiContainer = document.createElement('div');
    uiContainer.className = 'ui-container';
    document.body.appendChild(uiContainer);

    // Create left side controls
    const leftControls = document.createElement('div');
    leftControls.style.display = 'flex';
    leftControls.style.gap = '20px';

    // Create right side controls
    const rightControls = document.createElement('div');
    rightControls.style.display = 'flex';
    rightControls.style.gap = '15px';
    rightControls.style.alignItems = 'center';

    // Helper function to create dropdown
    const createDropdown = (label, options, selectedValue, onChange) => {
        const container = document.createElement('div');
        container.className = 'ui-control';

        const trigger = document.createElement('div');
        trigger.className = 'dropdown-trigger';

        const currentText = document.createElement('span');
        currentText.textContent = selectedValue || options[0];

        const arrow = document.createElement('span');
        arrow.className = 'dropdown-arrow';
        arrow.textContent = '▼';

        trigger.appendChild(currentText);
        trigger.appendChild(arrow);

        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';

        options.forEach(option => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = option;

            if (option === selectedValue) {
                item.classList.add('selected');
            }

            item.addEventListener('click', () => {
                // Remove selected from all items
                menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
                // Add selected to clicked item
                item.classList.add('selected');
                // Update trigger text
                currentText.textContent = option;
                // Close dropdown
                closeAllDropdowns();
                // Call onChange callback
                onChange(option);
            });

            menu.appendChild(item);
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            trigger.classList.toggle('active');
            menu.classList.toggle('open');
        });

        container.appendChild(trigger);
        container.appendChild(menu);

        return container;
    };

    // Close all dropdowns function
    const closeAllDropdowns = () => {
        document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
            trigger.classList.remove('active');
        });
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('open');
        });
    };

    // Click outside to close dropdowns
    document.addEventListener('click', closeAllDropdowns);

    // Root note dropdown
    const rootDropdown = createDropdown(
        'Root Note',
        notes,
        selectedRoot,
        (value) => {
            updateMusicParameters(null, value, null, null);
            updateUI();
        }
    );

    // Scale dropdown
    const scaleDropdown = createDropdown(
        'Scale',
        Object.keys(scales).map(scale => scale.charAt(0).toUpperCase() + scale.slice(1)),
        selectedScale.charAt(0).toUpperCase() + selectedScale.slice(1),
        (value) => {
            updateMusicParameters(value.toLowerCase(), null, null, null);
            updateUI();
        }
    );

    // Octave dropdown
    const octaveOptions = [];
    for (let i = 2; i <= 6; i++) {
        octaveOptions.push(`Octave ${i}`);
    }
    const octaveDropdown = createDropdown(
        'Octave',
        octaveOptions,
        `Octave ${octave}`,
        (value) => {
            const octaveNum = parseInt(value.split(' ')[1]);
            updateMusicParameters(null, null, octaveNum, null);
            updateUI();
        }
    );

    // Sound dropdown
    const soundDropdown = createDropdown(
        'Sound',
        Object.keys(soundPresets).map(sound => sound.charAt(0).toUpperCase() + sound.slice(1)),
        getSelectedSound().charAt(0).toUpperCase() + getSelectedSound().slice(1),
        (value) => {
            const selectedValue = value.toLowerCase();
            console.log(`Header UI: Sound changed to ${selectedValue}`);

            // Reset knobs to defaults when switching to built-in instruments
            resetKnobsToDefaults();

            updateMusicParameters(null, null, null, selectedValue);
            updateSynths();

            // Sync with control panel if it exists
            const panelSoundSelect = document.getElementById('panel-sound-select');
            if (panelSoundSelect) {
                panelSoundSelect.value = `builtin:${selectedValue}`;
                console.log(`Synced control panel to: builtin:${selectedValue}`);
            }

            showMessage(`Sound changed to ${selectedValue}`);
        }
    );

    // Sound Control Panel toggle button
    const controlToggle = document.createElement('button');
    controlToggle.id = 'control-panel-toggle';
    controlToggle.className = 'control-toggle';
    controlToggle.innerHTML = `
        <span class="toggle-icon">⚙️</span>
        <span class="toggle-text">Sound Controls</span>
    `;
    controlToggle.title = 'Toggle Sound Control Panel';

    // Performance panel toggle button
    const perfButton = document.createElement('button');
    perfButton.className = 'ui-button performance-toggle';
    perfButton.innerHTML = '📊 Performance';
    perfButton.title = 'Toggle Performance Monitor (Ctrl+Shift+P)';
    perfButton.addEventListener('click', () => {
        import('./feedbackPanel.js').then(module => {
            module.feedbackPanel.toggle();
        });
    });

    // Add controls to containers
    leftControls.appendChild(rootDropdown);
    leftControls.appendChild(scaleDropdown);
    leftControls.appendChild(octaveDropdown);
    leftControls.appendChild(soundDropdown);

    rightControls.appendChild(controlToggle);
    rightControls.appendChild(perfButton);

    // Add containers to main UI
    uiContainer.appendChild(leftControls);
    uiContainer.appendChild(rightControls);

    // Display initial instructions
    createInstructionsPanel();
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
    <p>Hand distance from center: Control volume</p>
    <p>Pinch gesture: Control reverb + delay effects</p>
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
    setPlayingState,
    showMessage
};