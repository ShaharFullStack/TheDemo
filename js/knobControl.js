/**
 * HandSynth - Professional Knob Control System
 * Realistic knob controls with smooth rotation and professional feel
 */

class KnobControl {
    constructor(element) {
        this.element = element;
        this.indicator = element.querySelector('.knob-indicator');
        this.valueDisplay = element.querySelector('.knob-value');

        // Get parameters from data attributes
        this.min = parseFloat(element.dataset.min) || 0;
        this.max = parseFloat(element.dataset.max) || 100;
        this.value = parseFloat(element.dataset.value) || 0;
        this.unit = element.dataset.unit || '';
        this.step = parseFloat(element.dataset.step) || 1;

        // Rotation parameters
        this.minAngle = -135; // -135 degrees
        this.maxAngle = 135;  // 135 degrees (270 degree range)
        this.isDragging = false;
        this.startY = 0;
        this.startValue = 0;

        // Callbacks
        this.onchange = null;

        this.init();
        this.updateDisplay();
    }

    init() {
        // Mouse events
        this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Touch events for mobile
        this.element.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this));

        // Wheel event for fine control
        this.element.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

        // Double-click to reset to default
        this.element.addEventListener('dblclick', this.onDoubleClick.bind(this));

        // Prevent text selection
        this.element.addEventListener('selectstart', (e) => e.preventDefault());
    }

    onMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;
        this.startY = e.clientY;
        this.startValue = this.value;
        document.body.style.cursor = 'ns-resize';
        this.element.classList.add('dragging');
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const deltaY = this.startY - e.clientY;
        const sensitivity = (this.max - this.min) / 300; // Adjust sensitivity
        const newValue = this.startValue + (deltaY * sensitivity);

        this.setValue(newValue);
    }

    onMouseUp() {
        if (!this.isDragging) return;

        this.isDragging = false;
        document.body.style.cursor = '';
        this.element.classList.remove('dragging');
    }

    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.isDragging = true;
        this.startY = touch.clientY;
        this.startValue = this.value;
    }

    onTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const touch = e.touches[0];
        const deltaY = this.startY - touch.clientY;
        const sensitivity = (this.max - this.min) / 300;
        const newValue = this.startValue + (deltaY * sensitivity);

        this.setValue(newValue);
    }

    onTouchEnd() {
        this.isDragging = false;
    }

    onWheel(e) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -this.step : this.step;
        const newValue = this.value + delta;

        this.setValue(newValue);
    }

    onDoubleClick() {
        const defaultValue = parseFloat(this.element.dataset.value) || 0;
        this.setValue(defaultValue);
    }

    setValue(newValue, notify = true) {
        // Clamp value to range
        this.value = Math.max(this.min, Math.min(this.max, newValue));

        this.updateDisplay();

        if (notify && this.onchange) {
            this.onchange(this.value);
        }
    }

    updateDisplay() {
        // Update rotation
        const normalizedValue = (this.value - this.min) / (this.max - this.min);
        const angle = this.minAngle + (normalizedValue * (this.maxAngle - this.minAngle));

        this.indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;

        // Update value display
        const displayValue = this.formatValue(this.value);
        this.valueDisplay.textContent = displayValue;
    }

    formatValue(value) {
        let formatted;

        // Format based on value range and unit
        if (this.unit === 'Hz' || this.unit === 'hz') {
            if (value >= 1000) {
                formatted = (value / 1000).toFixed(1) + 'k';
            } else {
                formatted = Math.round(value).toString();
            }
        } else if (this.unit === 's') {
            if (value < 0.01) {
                formatted = Math.round(value * 1000) + 'ms';
            } else if (value < 1) {
                formatted = Math.round(value * 1000) + 'ms';
            } else {
                formatted = value.toFixed(1);
            }
        } else if (this.unit === 'dB' || this.unit === 'db') {
            formatted = value >= 0 ? '+' + value.toFixed(0) : value.toFixed(0);
        } else if (this.unit === '%') {
            formatted = Math.round(value).toString();
        } else if (this.unit === ':1') {
            formatted = value.toFixed(0);
        } else {
            // Default formatting
            if (value >= 10) {
                formatted = value.toFixed(0);
            } else if (value >= 1) {
                formatted = value.toFixed(1);
            } else {
                formatted = value.toFixed(2);
            }
        }

        return formatted;
    }

    // Public API
    getValue() {
        return this.value;
    }

    setOnChange(callback) {
        this.onchange = callback;
    }

    destroy() {
        // Clean up event listeners
        this.element.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        // ... add other cleanup as needed
    }
}

// Knob Manager to handle all knobs
class KnobManager {
    constructor() {
        this.knobs = new Map();
    }

    initializeAll() {
        const knobElements = document.querySelectorAll('.knob');

        knobElements.forEach(element => {
            const knob = new KnobControl(element);
            this.knobs.set(element.id, knob);
        });
    }

    getKnob(id) {
        return this.knobs.get(id);
    }

    setKnobValue(id, value) {
        const knob = this.knobs.get(id);
        if (knob) {
            knob.setValue(value, false); // Don't trigger callback
        }
    }

    setKnobValueWithCallback(id, value) {
        const knob = this.knobs.get(id);
        if (knob) {
            knob.setValue(value, true); // Trigger callback to update audio parameters
        }
    }

    setKnobCallback(id, callback) {
        const knob = this.knobs.get(id);
        if (knob) {
            knob.setOnChange(callback);
        }
    }

    destroyAll() {
        this.knobs.forEach(knob => knob.destroy());
        this.knobs.clear();
    }
}

export { KnobControl, KnobManager };