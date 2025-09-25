/**
 * HandSynth - Preset Manager
 * Local storage system for saving and loading custom sound presets
 */

import { showMessage } from './utils.js';
import { updateMusicParameters } from './musicTheory.js';
import { updateSynths, setDelayTimeManual } from './audio.js';

class PresetManager {
    constructor(knobManager) {
        this.knobManager = knobManager;
        this.customPresets = this.loadCustomPresets();
        this.currentPresetName = '';
    }

    // Get current settings as a preset object
    getCurrentSettings() {
        const settings = {
            // Musical settings
            musical: {
                root: document.getElementById('panel-root-select').value,
                scale: document.getElementById('panel-scale-select').value,
                octave: parseInt(document.getElementById('panel-octave-select').value),
                instrument: document.getElementById('panel-sound-select').value
            },

            // Audio processing settings
            audio: {
                masterVolume: this.knobManager.getKnob('master-volume').getValue(),
                inputGain: this.knobManager.getKnob('input-gain').getValue(),

                // Reverb & Spatial
                reverbAmount: this.knobManager.getKnob('reverb-amount').getValue(),
                reverbSize: this.knobManager.getKnob('reverb-size').getValue(),
                reverbPredelay: this.knobManager.getKnob('reverb-predelay').getValue(),
                stereoWidth: this.knobManager.getKnob('stereo-width').getValue(),

                // Delay & Modulation
                delayAmount: this.knobManager.getKnob('delay-amount').getValue(),
                delayTime: document.getElementById('delay-time').value,
                delayFeedback: this.knobManager.getKnob('delay-feedback').getValue(),
                chorusRate: this.knobManager.getKnob('chorus-rate').getValue(),
                chorusDepth: this.knobManager.getKnob('chorus-depth').getValue(),

                // EQ & Filtering
                filterFreq: this.knobManager.getKnob('filter-freq').getValue(),
                highpassFreq: this.knobManager.getKnob('highpass-freq').getValue(),
                midFreq: this.knobManager.getKnob('mid-freq').getValue(),
                midGain: this.knobManager.getKnob('mid-gain').getValue(),
                midQ: this.knobManager.getKnob('mid-q').getValue(),

                // Dynamics & Saturation
                compressorRatio: this.knobManager.getKnob('compressor-ratio').getValue(),
                compressorThreshold: this.knobManager.getKnob('compressor-threshold').getValue(),
                compressorAttack: this.knobManager.getKnob('compressor-attack').getValue(),
                compressorRelease: this.knobManager.getKnob('compressor-release').getValue(),
                saturation: this.knobManager.getKnob('saturation').getValue()
            },

            // Metadata
            metadata: {
                name: '',
                createdAt: new Date().toISOString(),
                version: '1.0'
            }
        };

        return settings;
    }

    // Apply settings from a preset
    applySettings(settings) {
        try {
            // Apply musical settings
            if (settings.musical) {
                const { root, scale, octave, instrument } = settings.musical;

                document.getElementById('panel-root-select').value = root;
                document.getElementById('panel-scale-select').value = scale;
                document.getElementById('panel-octave-select').value = octave;
                document.getElementById('panel-sound-select').value = instrument;

                // Extract the actual instrument name from builtin: prefix if needed
                const actualInstrument = instrument && instrument.startsWith('builtin:')
                    ? instrument.replace('builtin:', '')
                    : instrument;

                updateMusicParameters(scale, root, octave, actualInstrument);
                updateSynths();

                // Sync with main screen selectors
                const mainRootSelect = document.getElementById('root-select');
                const mainScaleSelect = document.getElementById('scale-select');
                const mainOctaveSelect = document.getElementById('octave-select');
                const mainSoundSelect = document.getElementById('sound-select');

                if (mainRootSelect) mainRootSelect.value = root;
                if (mainScaleSelect) mainScaleSelect.value = scale;
                if (mainOctaveSelect) mainOctaveSelect.value = octave;
                if (mainSoundSelect && actualInstrument) {
                    mainSoundSelect.value = actualInstrument;
                }
            }

            // Apply audio settings
            if (settings.audio) {
                const audio = settings.audio;

                // Set all knob values with callbacks to update audio parameters
                this.knobManager.setKnobValueWithCallback('master-volume', audio.masterVolume || 0);
                this.knobManager.setKnobValueWithCallback('input-gain', audio.inputGain || 100);

                this.knobManager.setKnobValueWithCallback('reverb-amount', audio.reverbAmount || 0);
                this.knobManager.setKnobValueWithCallback('reverb-size', audio.reverbSize || 2.0);
                this.knobManager.setKnobValueWithCallback('reverb-predelay', audio.reverbPredelay || 50);
                this.knobManager.setKnobValueWithCallback('stereo-width', audio.stereoWidth || 100);

                this.knobManager.setKnobValueWithCallback('delay-amount', audio.delayAmount || 0);
                const delayTimeSelect = document.getElementById('delay-time');
                if (delayTimeSelect) {
                    delayTimeSelect.value = audio.delayTime || '4n';
                    // Manually trigger delay time update
                    setDelayTimeManual(audio.delayTime || '4n');
                }
                this.knobManager.setKnobValueWithCallback('delay-feedback', audio.delayFeedback || 25);
                this.knobManager.setKnobValueWithCallback('chorus-rate', audio.chorusRate || 1.5);
                this.knobManager.setKnobValueWithCallback('chorus-depth', audio.chorusDepth || 0);

                this.knobManager.setKnobValueWithCallback('filter-freq', audio.filterFreq || 8000);
                this.knobManager.setKnobValueWithCallback('highpass-freq', audio.highpassFreq || 20);
                this.knobManager.setKnobValueWithCallback('mid-freq', audio.midFreq || 1000);
                this.knobManager.setKnobValueWithCallback('mid-gain', audio.midGain || 0);
                this.knobManager.setKnobValueWithCallback('mid-q', audio.midQ || 1.0);

                this.knobManager.setKnobValueWithCallback('compressor-ratio', audio.compressorRatio || 3);
                this.knobManager.setKnobValueWithCallback('compressor-threshold', audio.compressorThreshold || -12);
                this.knobManager.setKnobValueWithCallback('compressor-attack', audio.compressorAttack || 0.01);
                this.knobManager.setKnobValueWithCallback('compressor-release', audio.compressorRelease || 0.2);
                this.knobManager.setKnobValueWithCallback('saturation', audio.saturation || 0);
            }

            return true;
        } catch (error) {
            console.error('Error applying preset settings:', error);
            return false;
        }
    }

    // Save current settings as a preset
    savePreset(name) {
        if (!name || name.trim() === '') {
            showMessage('Please enter a preset name');
            return false;
        }

        name = name.trim();

        // Check if name already exists
        if (this.customPresets[name]) {
            if (!confirm(`Preset "${name}" already exists. Overwrite?`)) {
                return false;
            }
        }

        const settings = this.getCurrentSettings();
        settings.metadata.name = name;

        this.customPresets[name] = settings;
        this.saveCustomPresets();
        this.updateCustomPresetsDropdown();

        this.currentPresetName = name;
        document.getElementById('custom-presets').value = name;

        showMessage(`Preset "${name}" saved successfully!`);
        return true;
    }

    // Load a preset by name
    loadPreset(name) {
        if (!name || !this.customPresets[name]) {
            showMessage('Please select a preset to load');
            return false;
        }

        const success = this.applySettings(this.customPresets[name]);

        if (success) {
            this.currentPresetName = name;
            document.getElementById('preset-name').value = name;
            showMessage(`Preset "${name}" loaded successfully!`);
            return true;
        } else {
            showMessage('Error loading preset');
            return false;
        }
    }

    // Delete a preset
    deletePreset(name) {
        if (!name || !this.customPresets[name]) {
            showMessage('Please select a preset to delete');
            return false;
        }

        if (!confirm(`Delete preset "${name}"? This cannot be undone.`)) {
            return false;
        }

        delete this.customPresets[name];
        this.saveCustomPresets();
        this.updateCustomPresetsDropdown();

        // Clear selection if deleted preset was selected
        if (this.currentPresetName === name) {
            this.currentPresetName = '';
            document.getElementById('custom-presets').value = '';
            document.getElementById('preset-name').value = '';
        }

        showMessage(`Preset "${name}" deleted successfully!`);
        return true;
    }

    // Export preset as JSON file
    exportPreset(name) {
        if (!name || !this.customPresets[name]) {
            showMessage('Please select a preset to export');
            return false;
        }

        const preset = this.customPresets[name];
        const dataStr = JSON.stringify(preset, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `handsynth-preset-${name.toLowerCase().replace(/\s+/g, '-')}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        showMessage(`Preset "${name}" exported successfully!`);
        return true;
    }

    // Import preset from JSON file
    importPreset(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const preset = JSON.parse(e.target.result);

                    // Validate preset structure
                    if (!this.validatePresetStructure(preset)) {
                        throw new Error('Invalid preset format');
                    }

                    const name = preset.metadata?.name || 'Imported Preset';
                    let finalName = name;
                    let counter = 1;

                    // Handle name conflicts
                    while (this.customPresets[finalName]) {
                        finalName = `${name} (${counter})`;
                        counter++;
                    }

                    preset.metadata.name = finalName;
                    preset.metadata.importedAt = new Date().toISOString();

                    this.customPresets[finalName] = preset;
                    this.saveCustomPresets();
                    this.updateCustomPresetsDropdown();

                    document.getElementById('custom-presets').value = finalName;
                    document.getElementById('preset-name').value = finalName;

                    showMessage(`Preset imported as "${finalName}"!`);
                    resolve(finalName);

                } catch (error) {
                    console.error('Import error:', error);
                    showMessage('Error importing preset: Invalid file format');
                    reject(error);
                }
            };

            reader.onerror = () => {
                showMessage('Error reading file');
                reject(new Error('File read error'));
            };

            reader.readAsText(file);
        });
    }

    // Validate preset structure
    validatePresetStructure(preset) {
        return (
            preset &&
            typeof preset === 'object' &&
            preset.musical &&
            preset.audio &&
            preset.metadata
        );
    }

    // Update the custom presets dropdown
    updateCustomPresetsDropdown() {
        const dropdown = document.getElementById('custom-presets');

        // Clear existing options except the first one
        while (dropdown.children.length > 1) {
            dropdown.removeChild(dropdown.lastChild);
        }

        // Add custom presets
        Object.keys(this.customPresets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            dropdown.appendChild(option);
        });
    }

    // Load custom presets from localStorage
    loadCustomPresets() {
        try {
            const stored = localStorage.getItem('handsynth-custom-presets');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading custom presets:', error);
            return {};
        }
    }

    // Save custom presets to localStorage
    saveCustomPresets() {
        try {
            localStorage.setItem('handsynth-custom-presets', JSON.stringify(this.customPresets));
        } catch (error) {
            console.error('Error saving custom presets:', error);
            showMessage('Error saving presets to local storage');
        }
    }

    // Get list of custom preset names
    getCustomPresetNames() {
        return Object.keys(this.customPresets);
    }

    // Get preset count
    getPresetCount() {
        return Object.keys(this.customPresets).length;
    }

    // Clear all custom presets
    clearAllPresets() {
        if (!confirm('Delete all custom presets? This cannot be undone.')) {
            return false;
        }

        this.customPresets = {};
        this.saveCustomPresets();
        this.updateCustomPresetsDropdown();
        this.currentPresetName = '';

        document.getElementById('custom-presets').value = '';
        document.getElementById('preset-name').value = '';

        showMessage('All custom presets deleted');
        return true;
    }
}

export { PresetManager };