/**
 * HandSynth - Control Panel Module
 * Full-featured sound control panel with slide-down animation
 */

import { scales, notes, soundPresets, selectedRoot, selectedScale, octave, getSelectedSound, updateMusicParameters } from './musicTheory.js';
import {
    updateSynths,
    setReverbAmountManual, setDelayAmountManual, setDelayTimeManual, setFilterFrequencyManual,
    setMasterVolumeManual, setInputGainManual, setReverbSizeManual, setReverbPredelayManual,
    setStereoWidthManual, setDelayFeedbackManual, setChorusRateManual, setChorusDepthManual,
    setHighpassFreqManual, setMidFreqManual, setMidGainManual, setMidQManual,
    setCompressorRatioManual, setCompressorThresholdManual, setCompressorAttackManual,
    setCompressorReleaseManual, setSaturationManual,
    setDistortionManual, setPhaserRateManual, setPhaserDepthManual,
    setTremoloRateManual, setTremoloDepthManual, setAutoWahManual,
    setEnvelopeAttackManual, setEnvelopeDecayManual, setEnvelopeSustainManual, setEnvelopeReleaseManual,
    setOscillatorDetuneManual, setFMFrequencyManual, setFMDepthManual, setOscillatorTypeManual
} from './audio.js';
import { showMessage } from './utils.js';
import { KnobManager } from './knobControl.js';
import { PresetManager } from './presetManager.js';

// Control panel variables
let isControlPanelOpen = false;
let knobManager = null;
let presetManager = null;

// Initialize the control panel
function initControlPanel() {
    populateSelectors();
    setupKnobControls();
    setupPresetManager();
    setupEventListeners();
    initializeStatusIndicators();
}

// Populate all the select elements with options
function populateSelectors() {
    // Populate root note selector
    const panelRootSelect = document.getElementById('panel-root-select');
    notes.forEach(note => {
        const option = document.createElement('option');
        option.value = note;
        option.textContent = note;
        if (note === selectedRoot) option.selected = true;
        panelRootSelect.appendChild(option);
    });

    // Populate scale selector
    const panelScaleSelect = document.getElementById('panel-scale-select');
    Object.keys(scales).forEach(scale => {
        const option = document.createElement('option');
        option.value = scale;
        option.textContent = scale.charAt(0).toUpperCase() + scale.slice(1);
        if (scale === selectedScale) option.selected = true;
        panelScaleSelect.appendChild(option);
    });

    // Populate octave selector
    const panelOctaveSelect = document.getElementById('panel-octave-select');
    for (let i = 2; i <= 6; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Octave ${i}`;
        if (i === octave) option.selected = true;
        panelOctaveSelect.appendChild(option);
    }

    // Sound selector will be populated after preset manager is initialized
    populateSoundSelector();
}

// Populate sound selector with both default and custom presets
function populateSoundSelector() {
    const panelSoundSelect = document.getElementById('panel-sound-select');

    // Clear existing options
    panelSoundSelect.innerHTML = '';

    // Add a separator for built-in sounds
    const builtinGroup = document.createElement('optgroup');
    builtinGroup.label = 'Built-in Instruments';
    panelSoundSelect.appendChild(builtinGroup);

    // Add built-in sound presets
    Object.keys(soundPresets).forEach(sound => {
        const option = document.createElement('option');
        option.value = `builtin:${sound}`;
        option.textContent = sound.charAt(0).toUpperCase() + sound.slice(1);
        if (sound === getSelectedSound()) option.selected = true;
        builtinGroup.appendChild(option);
    });

    // Add custom presets if available
    if (presetManager) {
        const customPresets = presetManager.getCustomPresetNames();
        if (customPresets.length > 0) {
            const customGroup = document.createElement('optgroup');
            customGroup.label = 'Custom Presets';
            panelSoundSelect.appendChild(customGroup);

            customPresets.forEach(presetName => {
                const option = document.createElement('option');
                option.value = `custom:${presetName}`;
                option.textContent = `${presetName} (Custom)`;
                customGroup.appendChild(option);
            });
        }
    }
}

// Setup all knob controls
function setupKnobControls() {
    knobManager = new KnobManager();
    knobManager.initializeAll();

    // Set up all knob callbacks
    knobManager.setKnobCallback('master-volume', (value) => {
        setMasterVolumeManual(value);
    });

    knobManager.setKnobCallback('input-gain', (value) => {
        setInputGainManual(value);
    });

    knobManager.setKnobCallback('reverb-amount', (value) => {
        setReverbAmountManual(value / 100);
    });

    knobManager.setKnobCallback('reverb-size', (value) => {
        setReverbSizeManual(value);
    });

    knobManager.setKnobCallback('reverb-predelay', (value) => {
        setReverbPredelayManual(value);
    });

    knobManager.setKnobCallback('stereo-width', (value) => {
        setStereoWidthManual(value);
    });

    knobManager.setKnobCallback('delay-amount', (value) => {
        setDelayAmountManual(value / 100);
    });

    knobManager.setKnobCallback('delay-feedback', (value) => {
        setDelayFeedbackManual(value);
    });

    knobManager.setKnobCallback('chorus-rate', (value) => {
        setChorusRateManual(value);
    });

    knobManager.setKnobCallback('chorus-depth', (value) => {
        setChorusDepthManual(value);
    });

    knobManager.setKnobCallback('filter-freq', (value) => {
        setFilterFrequencyManual(value);
    });

    knobManager.setKnobCallback('highpass-freq', (value) => {
        setHighpassFreqManual(value);
    });

    knobManager.setKnobCallback('mid-freq', (value) => {
        setMidFreqManual(value);
    });

    knobManager.setKnobCallback('mid-gain', (value) => {
        setMidGainManual(value);
    });

    knobManager.setKnobCallback('mid-q', (value) => {
        setMidQManual(value);
    });

    knobManager.setKnobCallback('compressor-ratio', (value) => {
        setCompressorRatioManual(value);
    });

    knobManager.setKnobCallback('compressor-threshold', (value) => {
        setCompressorThresholdManual(value);
    });

    knobManager.setKnobCallback('compressor-attack', (value) => {
        setCompressorAttackManual(value);
    });

    knobManager.setKnobCallback('compressor-release', (value) => {
        setCompressorReleaseManual(value);
    });

    knobManager.setKnobCallback('saturation', (value) => {
        setSaturationManual(value);
    });

    // Advanced Audio Controls
    knobManager.setKnobCallback('distortion', (value) => {
        setDistortionManual(value);
    });

    knobManager.setKnobCallback('phaser-rate', (value) => {
        setPhaserRateManual(value);
    });

    knobManager.setKnobCallback('phaser-depth', (value) => {
        setPhaserDepthManual(value);
    });

    knobManager.setKnobCallback('tremolo-rate', (value) => {
        setTremoloRateManual(value);
    });

    knobManager.setKnobCallback('tremolo-depth', (value) => {
        setTremoloDepthManual(value);
    });

    knobManager.setKnobCallback('auto-wah', (value) => {
        setAutoWahManual(value);
    });

    // Envelope Controls
    knobManager.setKnobCallback('envelope-attack', (value) => {
        setEnvelopeAttackManual(value);
    });

    knobManager.setKnobCallback('envelope-decay', (value) => {
        setEnvelopeDecayManual(value);
    });

    knobManager.setKnobCallback('envelope-sustain', (value) => {
        setEnvelopeSustainManual(value);
    });

    knobManager.setKnobCallback('envelope-release', (value) => {
        setEnvelopeReleaseManual(value);
    });

    // Oscillator Controls
    knobManager.setKnobCallback('oscillator-detune', (value) => {
        setOscillatorDetuneManual(value);
    });

    knobManager.setKnobCallback('fm-frequency', (value) => {
        setFMFrequencyManual(value);
    });

    knobManager.setKnobCallback('fm-depth', (value) => {
        setFMDepthManual(value);
    });
}

// Setup preset manager
function setupPresetManager() {
    presetManager = new PresetManager(knobManager);
    presetManager.updateCustomPresetsDropdown();

    // Update sound selector with custom presets
    populateSoundSelector();
}

// Setup all event listeners
function setupEventListeners() {
    // Toggle panel button
    const toggleBtn = document.getElementById('control-panel-toggle');
    const closeBtn = document.getElementById('close-panel');
    const panel = document.getElementById('sound-control-panel');

    toggleBtn.addEventListener('click', () => {
        toggleControlPanel();
    });

    closeBtn.addEventListener('click', () => {
        toggleControlPanel(false);
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (isControlPanelOpen && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
            toggleControlPanel(false);
        }
    });

    // Musical settings
    document.getElementById('panel-root-select').addEventListener('change', (e) => {
        updateMusicParameters(null, e.target.value, null, null);
        showMessage(`Root note changed to ${e.target.value}`);
    });

    document.getElementById('panel-scale-select').addEventListener('change', (e) => {
        updateMusicParameters(e.target.value, null, null, null);
        showMessage(`Scale changed to ${e.target.value}`);
    });

    document.getElementById('panel-octave-select').addEventListener('change', (e) => {
        updateMusicParameters(null, null, parseInt(e.target.value), null);
        showMessage(`Octave changed to ${e.target.value}`);
    });

    document.getElementById('panel-sound-select').addEventListener('change', (e) => {
        const value = e.target.value;
        console.log(`Control panel: Sound selector changed to ${value}`);

        if (value.startsWith('builtin:')) {
            // Handle built-in instrument selection
            const instrumentName = value.replace('builtin:', '');
            console.log(`Control panel: Switching to builtin instrument: ${instrumentName}`);

            // Reset knobs to defaults when switching to built-in instruments
            resetKnobsToDefaults();

            updateMusicParameters(null, null, null, instrumentName);
            updateSynths();
            showMessage(`Instrument changed to ${instrumentName}`);

            // Sync with main screen selector
            const mainSoundSelect = document.getElementById('sound-select');
            if (mainSoundSelect) {
                mainSoundSelect.value = instrumentName;
                console.log(`Synced main UI to: ${instrumentName}`);
            }

        } else if (value.startsWith('custom:')) {
            // Handle custom preset selection
            const presetName = value.replace('custom:', '');
            console.log(`Control panel: Loading custom preset: ${presetName}`);
            if (presetManager.loadPreset(presetName)) {
                showMessage(`Loaded custom preset: ${presetName}`);
            }
        }
    });

    // Delay time selector (non-knob control)
    document.getElementById('delay-time').addEventListener('change', (e) => {
        setDelayTimeManual(e.target.value);
        showMessage(`Delay time set to ${e.target.selectedOptions[0].text}`);
    });

    // Oscillator type selector
    document.getElementById('oscillator-type').addEventListener('change', (e) => {
        setOscillatorTypeManual(e.target.value);
        showMessage(`Oscillator waveform changed to ${e.target.value}`);
    });

    // Preset management event listeners
    setupPresetEventListeners();

    // Reset button
    document.getElementById('reset-settings').addEventListener('click', () => {
        resetToDefaults();
    });
}

// Setup preset management event listeners
function setupPresetEventListeners() {
    // Save preset button
    document.getElementById('save-preset').addEventListener('click', () => {
        const name = document.getElementById('preset-name').value.trim();
        if (name) {
            if (presetManager.savePreset(name)) {
                // Refresh the sound selector to show the new preset
                populateSoundSelector();
            }
        } else {
            showMessage('Please enter a preset name');
        }
    });

    // Load preset button
    document.getElementById('load-preset').addEventListener('click', () => {
        const selectedPreset = document.getElementById('custom-presets').value;
        if (selectedPreset) {
            presetManager.loadPreset(selectedPreset);
        } else {
            showMessage('Please select a preset to load');
        }
    });

    // Delete preset button
    document.getElementById('delete-preset').addEventListener('click', () => {
        const selectedPreset = document.getElementById('custom-presets').value;
        if (selectedPreset) {
            if (presetManager.deletePreset(selectedPreset)) {
                // Refresh the sound selector to remove the deleted preset
                populateSoundSelector();
            }
        } else {
            showMessage('Please select a preset to delete');
        }
    });

    // Export preset button
    document.getElementById('export-preset').addEventListener('click', () => {
        const selectedPreset = document.getElementById('custom-presets').value;
        if (selectedPreset) {
            presetManager.exportPreset(selectedPreset);
        } else {
            showMessage('Please select a preset to export');
        }
    });

    // Import preset button
    document.getElementById('import-preset').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    // Import file input
    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            presetManager.importPreset(file).then(() => {
                // Refresh the sound selector to show the imported preset
                populateSoundSelector();
            }).catch(() => {
                // Error already handled in importPreset
            });
        }
        // Reset the input
        e.target.value = '';
    });

    // Custom presets dropdown selection
    document.getElementById('custom-presets').addEventListener('change', (e) => {
        const selectedPreset = e.target.value;
        if (selectedPreset) {
            document.getElementById('preset-name').value = selectedPreset;

            // Update button states
            updatePresetButtonStates(true);
        } else {
            document.getElementById('preset-name').value = '';
            updatePresetButtonStates(false);
        }
    });

    // Preset name input
    document.getElementById('preset-name').addEventListener('input', (e) => {
        const name = e.target.value.trim();
        const saveBtn = document.getElementById('save-preset');

        if (name) {
            saveBtn.disabled = false;
        } else {
            saveBtn.disabled = true;
        }
    });

    // Initialize button states
    updatePresetButtonStates(false);
}

// Update preset button states based on selection
function updatePresetButtonStates(hasSelection) {
    document.getElementById('load-preset').disabled = !hasSelection;
    document.getElementById('delete-preset').disabled = !hasSelection;
    document.getElementById('export-preset').disabled = !hasSelection;

    const presetName = document.getElementById('preset-name').value.trim();
    document.getElementById('save-preset').disabled = !presetName;
}

// Setup master volume connection (placeholder for compatibility)
function setupMasterVolumeConnection() {
    // Professional audio chain handles master volume control
    console.log('Professional audio chain connected');
}

// Toggle the control panel
function toggleControlPanel(forceState = null) {
    const panel = document.getElementById('sound-control-panel');
    const toggleBtn = document.getElementById('control-panel-toggle');

    if (forceState !== null) {
        isControlPanelOpen = forceState;
    } else {
        isControlPanelOpen = !isControlPanelOpen;
    }

    if (isControlPanelOpen) {
        panel.classList.add('open');
        toggleBtn.style.opacity = '0.7';
    } else {
        panel.classList.remove('open');
        toggleBtn.style.opacity = '1';
    }
}


// Initialize status indicators
function initializeStatusIndicators() {
    updateTrackingStatus('initializing');
    updateAudioStatus('not-started');

    // Monitor audio status
    const checkAudioStatus = () => {
        if (window.audioStarted) {
            updateAudioStatus('active');
        } else {
            updateAudioStatus('not-started');
        }
    };

    setInterval(checkAudioStatus, 1000);
}

// Update tracking status indicator
function updateTrackingStatus(status) {
    const statusDot = document.getElementById('tracking-status');
    const statusText = document.getElementById('tracking-text');

    statusDot.className = 'status-dot';
    switch (status) {
        case 'active':
            statusDot.classList.add('active');
            statusText.textContent = 'Tracking Hands';
            break;
        case 'error':
            statusDot.classList.add('error');
            statusText.textContent = 'Camera Error';
            break;
        case 'initializing':
        default:
            statusText.textContent = 'Initializing...';
            break;
    }
}

// Update audio status indicator
function updateAudioStatus(status) {
    const statusDot = document.getElementById('audio-status');
    const statusText = document.getElementById('audio-text');

    statusDot.className = 'status-dot';
    switch (status) {
        case 'active':
            statusDot.classList.add('active');
            statusText.textContent = 'Audio Active';
            break;
        case 'error':
            statusDot.classList.add('error');
            statusText.textContent = 'Audio Error';
            break;
        case 'not-started':
        default:
            statusText.textContent = 'Not Started';
            break;
    }
}

// Reset knobs to default values (for built-in sound changes)
function resetKnobsToDefaults() {
    // Check if audio is initialized before resetting knobs
    if (!window.audioStarted || !knobManager) {
        console.log("Audio not started yet or knobManager not initialized, skipping knob reset");
        return;
    }
    
    try {
        // Reset all knobs to their default values with callbacks
    knobManager.setKnobValueWithCallback('master-volume', 0);
    knobManager.setKnobValueWithCallback('input-gain', 100);
    knobManager.setKnobValueWithCallback('reverb-amount', 0);
    knobManager.setKnobValueWithCallback('reverb-size', 2.0);
    knobManager.setKnobValueWithCallback('reverb-predelay', 50);
    knobManager.setKnobValueWithCallback('stereo-width', 100);
    knobManager.setKnobValueWithCallback('delay-amount', 0);
    knobManager.setKnobValueWithCallback('delay-feedback', 25);
    knobManager.setKnobValueWithCallback('chorus-rate', 1.5);
    knobManager.setKnobValueWithCallback('chorus-depth', 0);
    knobManager.setKnobValueWithCallback('filter-freq', 8000);
    knobManager.setKnobValueWithCallback('highpass-freq', 20);
    knobManager.setKnobValueWithCallback('mid-freq', 1000);
    knobManager.setKnobValueWithCallback('mid-gain', 0);
    knobManager.setKnobValueWithCallback('mid-q', 1.0);
    knobManager.setKnobValueWithCallback('compressor-ratio', 3);
    knobManager.setKnobValueWithCallback('compressor-threshold', -12);
    knobManager.setKnobValueWithCallback('compressor-attack', 0.01);
    knobManager.setKnobValueWithCallback('compressor-release', 0.2);
    knobManager.setKnobValueWithCallback('saturation', 0);

    // Reset advanced audio controls
    knobManager.setKnobValueWithCallback('distortion', 0);
    knobManager.setKnobValueWithCallback('phaser-rate', 0.5);
    knobManager.setKnobValueWithCallback('phaser-depth', 0);
    knobManager.setKnobValueWithCallback('tremolo-rate', 10.0);
    knobManager.setKnobValueWithCallback('tremolo-depth', 0);
    knobManager.setKnobValueWithCallback('auto-wah', 0);

    // Reset envelope controls
    knobManager.setKnobValueWithCallback('envelope-attack', 0.1);
    knobManager.setKnobValueWithCallback('envelope-decay', 0.3);
    knobManager.setKnobValueWithCallback('envelope-sustain', 0.7);
    knobManager.setKnobValueWithCallback('envelope-release', 0.8);

    // Reset oscillator controls
    knobManager.setKnobValueWithCallback('oscillator-detune', 0);
    knobManager.setKnobValueWithCallback('fm-frequency', 1.0);
    knobManager.setKnobValueWithCallback('fm-depth', 0);

        // Reset delay time and oscillator type selectors
        document.getElementById('delay-time').value = '4n';
        document.getElementById('oscillator-type').value = 'sine';
        setDelayTimeManual('4n');
        setOscillatorTypeManual('sine');
        
    } catch (error) {
        console.error("Error resetting knobs to defaults:", error);
        showMessage("Error resetting audio controls");
    }
}

// Reset all settings to defaults
function resetToDefaults() {
    if (confirm('Reset all settings to defaults?')) {
        // Reset all knobs to their default values
        knobManager.setKnobValue('master-volume', 0);
        knobManager.setKnobValue('input-gain', 100);
        knobManager.setKnobValue('reverb-amount', 0);
        knobManager.setKnobValue('reverb-size', 2.0);
        knobManager.setKnobValue('reverb-predelay', 50);
        knobManager.setKnobValue('stereo-width', 100);
        knobManager.setKnobValue('delay-amount', 0);
        knobManager.setKnobValue('delay-feedback', 25);
        knobManager.setKnobValue('chorus-rate', 1.5);
        knobManager.setKnobValue('chorus-depth', 0);
        knobManager.setKnobValue('filter-freq', 8000);
        knobManager.setKnobValue('highpass-freq', 20);
        knobManager.setKnobValue('mid-freq', 1000);
        knobManager.setKnobValue('mid-gain', 0);
        knobManager.setKnobValue('mid-q', 1.0);
        knobManager.setKnobValue('compressor-ratio', 3);
        knobManager.setKnobValue('compressor-threshold', -12);
        knobManager.setKnobValue('compressor-attack', 0.01);
        knobManager.setKnobValue('compressor-release', 0.2);
        knobManager.setKnobValue('saturation', 0);

        // Reset selectors
        document.getElementById('delay-time').value = '4n';
        document.getElementById('oscillator-type').value = 'sine';
        document.getElementById('panel-root-select').value = 'C';
        document.getElementById('panel-scale-select').value = 'major';
        document.getElementById('panel-octave-select').value = 4;
        document.getElementById('panel-sound-select').value = 'builtin:pad';

        // Reset musical settings
        updateMusicParameters('major', 'C', 4, 'pad');

        // Update synths
        updateSynths();

        showMessage('Settings reset to defaults');
    }
}

// Public API
export {
    initControlPanel,
    toggleControlPanel,
    updateTrackingStatus,
    updateAudioStatus,
    setupMasterVolumeConnection,
    resetKnobsToDefaults
};