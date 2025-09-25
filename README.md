# HandSynth

HandSynth is an interactive musical instrument that uses hand gestures to create music. It tracks your hands using your webcam and MediaPipe, allowing you to play melodies and chords by moving your hands.

## Features

- **Left Hand**: Controls harmony/chords based on vertical position
- **Right Hand**: Controls melody notes based on vertical position
- **Pinch Gesture**: Controls volume for each hand independently
- **3D Visualization**: Responsive particle system that reacts to your music
- **Customizable**: Choose from different scales, root notes, octaves, and instrument sounds

## Installation

1. Clone this repository
2. Open the `index.html` file in a modern web browser
3. Allow webcam access when prompted
4. Click the "Start Audio" button to begin playing

## Controls

- **Right Hand Position**: Higher positions play higher notes, lower positions play lower notes
- **Left Hand Position**: Higher positions play higher chords, lower positions play lower chords
- **Pinch**: Bring your thumb and index finger together to reduce volume, spread them apart to increase volume

## File Structure

```
HandSynth/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── js/                 # JavaScript modules
│   ├── app.js          # Main application entry point
│   ├── audio.js        # Audio synthesis with Tone.js
│   ├── handTracking.js # Hand tracking with MediaPipe
│   ├── musicTheory.js  # Scales, notes, chord definitions
│   ├── ui.js           # UI elements and controls
│   ├── visualization.js # Three.js visualization
│   └── utils.js        # Utility functions
```

## Requirements

- Modern web browser with WebGL support
- Webcam
- Stable internet connection (for loading libraries)

## Libraries Used

- [Three.js](https://threejs.org/) - 3D visualization
- [Tone.js](https://tonejs.github.io/) - Audio synthesis
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) - Hand tracking

## Troubleshooting

- If you don't see your hands being tracked, make sure your camera is properly connected and authorized
- If you don't hear any sound, check that your speakers are on and that you've clicked the "Start Audio" button
- For best performance, use in a well-lit environment with a clear background

## Development

The code is organized into modular files for better maintainability:

- `app.js`: Main application logic and initialization
- `audio.js`: Handles all audio synthesis through Tone.js
- `handTracking.js`: Handles hand detection and tracking with MediaPipe
- `musicTheory.js`: Contains scales, notes, and chord definitions
- `ui.js`: Creates and manages UI elements
- `visualization.js`: Handles the Three.js particle system
- `utils.js`: Contains utility functions used across modules

