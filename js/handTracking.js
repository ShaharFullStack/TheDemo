/**
 * HandSynth - Hand Tracking Module (Performance Optimized)
 * MediaPipe hand tracking integration with improved performance
 */

import { calculateDistance, showMessage } from './utils.js';
import { getNoteFromPosition, getChordFromPosition } from './musicTheory.js';
import { playMelodyNote, playChord, stopMelody, stopChord, setVolume, updateGestureParameters } from './audio.js';
import { updateTrackingStatus } from './controlPanel.js';

// Hand tracking variables
let hands;
let handDetected = false;
let isLeftHandPresent = false;
let isRightHandPresent = false;
let leftHandLandmarks = null;
let rightHandLandmarks = null;
let canvasCtx, canvasElement, videoElement;

// Performance optimization variables
let isLowPerformanceDevice = false;
let lastProcessTime = 0;
const THROTTLE_INTERVAL = 16; // ms (approximately 60fps)
let processingFrame = false;
let lastRenderTime = 0;

// Detect if we're on a low-performance device
function detectPerformance() {
    // Check if running on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Initial assumption based on device type
    isLowPerformanceDevice = isMobile;

    // Set throttling based on device type
    if (isLowPerformanceDevice) {
        console.log("Optimizing for mobile performance");
    }
}

// Initialize hand tracking with MediaPipe
function setupHandTracking() {
    if (!videoElement || !canvasElement || !canvasCtx) {
        console.error("Video or Canvas element not ready for Hand Tracking setup.");
        return;
    }

    // Detect performance characteristics
    detectPerformance();

    try {
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        // Adjust settings based on device performance
        hands.setOptions({
            maxNumHands: 2,
            // Lower model complexity on low-performance devices
            modelComplexity: isLowPerformanceDevice ? 0 : 1,
            minDetectionConfidence: isLowPerformanceDevice ? 0.7 : 0.75,
            minTrackingConfidence: isLowPerformanceDevice ? 0.7 : 0.75
        });

        hands.onResults(onHandResults);

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                // Performance optimization: throttle frame processing
                const now = performance.now();
                if (processingFrame || now - lastProcessTime < THROTTLE_INTERVAL) {
                    return; // Skip this frame
                }

                processingFrame = true;
                lastProcessTime = now;

                if (videoElement.readyState >= 2) {
                    try {
                        await hands.send({ image: videoElement });
                    } catch (error) {
                        console.error("Error in hand tracking:", error);
                    }
                }
                processingFrame = false;
            },
            // Lower resolution for mobile devices
            width: isLowPerformanceDevice ? 640 : 1280,
            height: isLowPerformanceDevice ? 480 : 720
        });

        camera.start()
            .then(() => {
                console.log("Camera started successfully.");
                showMessage("Camera is on, Press 'Start Audio' to play.");
                updateTrackingStatus('active');
            })
            .catch(err => {
                console.error("Error starting webcam:", err);
                updateTrackingStatus('error');
                const instructions = document.getElementById('instructions');
                if (instructions) instructions.textContent = "Cannot access webcam. Please allow access.";
            });

    } catch (error) {
        console.error("Error setting up MediaPipe Hands:", error);
    }
}

// Get video and canvas elements for hand tracking
function setupWebcamElements() {
    videoElement = document.querySelector('.input_video');
    if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.classList.add('input_video');
        document.body.appendChild(videoElement);
    }

    canvasElement = document.querySelector('.output_canvas_overlay');
    if (!canvasElement) {
        canvasElement = document.createElement('canvas');
        canvasElement.classList.add('output_canvas_overlay');
        canvasElement.width = isLowPerformanceDevice ? 640 : 1280;
        canvasElement.height = isLowPerformanceDevice ? 480 : 720;
        document.body.appendChild(canvasElement);
    }

    if (canvasElement) {
        canvasCtx = canvasElement.getContext('2d');

        // Optimize canvas rendering
        if (canvasCtx) {
            // Turn off image smoothing for better performance
            canvasCtx.imageSmoothingEnabled = !isLowPerformanceDevice;
            canvasCtx.imageSmoothingQuality = isLowPerformanceDevice ? 'low' : 'high';
        }
    } else {
        console.error("Output canvas element not found!");
    }
}

// Process detected hands - with updated visual feedback for inverted volume
function onHandResults(results) {
    if (!canvasCtx || !canvasElement) return;

    // Performance optimization: throttle rendering on low-performance devices
    const now = performance.now();
    if (isLowPerformanceDevice && now - lastRenderTime < THROTTLE_INTERVAL) {
        return; // Skip this render cycle
    }
    lastRenderTime = now;

    // Display a message if hands are detected
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const handCount = results.multiHandLandmarks.length;
        if (!handDetected) {
            console.log(`Detected ${handCount} hand(s)`);
        }
    }

    // Reset hand states
    let wasLeftHandPresent = isLeftHandPresent;
    let wasRightHandPresent = isRightHandPresent;
    isLeftHandPresent = false;
    isRightHandPresent = false;
    leftHandLandmarks = null;
    rightHandLandmarks = null;
    handDetected = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    // Drawing setup
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);


    // Process detected hands
    if (handDetected) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            if (!results.multiHandedness || !results.multiHandedness[i]) continue;

            const classification = results.multiHandedness[i];
            const landmarks = results.multiHandLandmarks[i];
            const isLeft = classification.label === 'Left';

            // Assign landmarks based on handedness
            if (!isLeft) {
                isLeftHandPresent = true;
                leftHandLandmarks = landmarks;

                // LEFT HAND: Vertical position controls harmony/chords
                if (landmarks && landmarks.length > 8) {
                    const wrist = landmarks[0];

                    // Ensure wrist position is valid
                    if (wrist && typeof wrist.y === 'number') {
                        const thumbTip = landmarks[4];
                        const indexTip = landmarks[8];
                        const pinchDist = calculateDistance(thumbTip, indexTip);

                        // Volume control based on horizontal distance from center
                        const distanceFromCenter = Math.abs(wrist.x - 0.5);
                        setVolume('left', distanceFromCenter, pinchDist);

                        // Update gesture parameters for real instrument responsiveness
                        updateGestureParameters(pinchDist, wrist, 'left');

                        // Get chord based on hand height
                        const chord = getChordFromPosition(wrist.y);

                        // Only try to play if window.audioStarted is true
                        if (window.audioStarted) {
                            // Playing or not based on hand presence - pass gesture data
                            playChord(chord, wrist, pinchDist);
                        }

                        // Update chord visualizer
                        const chordViz = document.querySelector('.chord-viz');
                        if (chordViz) {
                            chordViz.classList.add('chord-active');
                        }

                        // Draw chord name above hand - simplified on low-performance devices
                        if (!isLowPerformanceDevice) {
                            canvasCtx.font = 'bold 24px Arial';
                            canvasCtx.fillStyle = 'white';
                            canvasCtx.fillText(chord.name,
                                (wrist.x * canvasElement.width) - 15,
                                (wrist.y * canvasElement.height) - 30);
                        }

                        // Visual feedback for volume (distance from center) and effects (pinch)
                        // Simplify visuals on low-performance devices
                        if (!isLowPerformanceDevice) {
                            const volumeLevel = mapRange(distanceFromCenter, 0, 0.5, 0, 1);
                            const effectLevel = mapRange(pinchDist, 0.01, 0.1, 1, 0);

                            // Volume indicator (distance from center)
                            canvasCtx.beginPath();
                            canvasCtx.arc(
                                wrist.x * canvasElement.width,
                                wrist.y * canvasElement.height,
                                30 * volumeLevel, 0, Math.PI * 2
                            );
                            canvasCtx.fillStyle = `rgba(200, 55, 100, ${volumeLevel})`;
                            canvasCtx.fill();

                            // Effect indicator (pinch distance)
                            canvasCtx.beginPath();
                            canvasCtx.arc(
                                (thumbTip.x + indexTip.x) / 2 * canvasElement.width,
                                (thumbTip.y + indexTip.y) / 2 * canvasElement.height,
                                15 * effectLevel, 0, Math.PI * 2
                            );
                            canvasCtx.fillStyle = `rgba(100, 255, 100, ${effectLevel})`;
                            canvasCtx.fill();

                            // Draw a line connecting thumb and index finger for effect control
                            canvasCtx.beginPath();
                            canvasCtx.moveTo(thumbTip.x * canvasElement.width, thumbTip.y * canvasElement.height);
                            canvasCtx.lineTo(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height);
                            canvasCtx.strokeStyle = 'rgb(255, 230, 0)';
                            canvasCtx.lineWidth = 3;
                            canvasCtx.stroke();
                        }
                    } else {
                        console.error("Invalid left wrist position detected");
                    }
                }
            } else {
                // RIGHT HAND: Controls melody
                isRightHandPresent = true;
                rightHandLandmarks = landmarks;

                if (landmarks && landmarks.length > 8) {
                    const wrist = landmarks[0];

                    // Ensure wrist position is valid
                    if (wrist && typeof wrist.y === 'number') {
                        const thumbTip = landmarks[4];
                        const indexTip = landmarks[8];
                        const pinchDist = calculateDistance(thumbTip, indexTip);

                        // Volume control based on horizontal distance from center
                        const distanceFromCenter = Math.abs(wrist.x - 0.5);
                        setVolume('right', distanceFromCenter, pinchDist);

                        // Update gesture parameters for real instrument responsiveness
                        updateGestureParameters(pinchDist, wrist, 'right');

                        // Get melody note based on hand height
                        const note = getNoteFromPosition(wrist.y, 'major');

                        // Only try to play if window.audioStarted is true
                        if (window.audioStarted) {
                            // Play the note - pass gesture data
                            playMelodyNote(note, wrist, pinchDist);
                        }

                        // Draw note name above hand - simplified on low-performance devices
                        if (!isLowPerformanceDevice) {
                            canvasCtx.font = 'bold 24px Arial';
                            canvasCtx.fillStyle = 'magenta';
                            canvasCtx.fillText(note,
                                (wrist.x * canvasElement.width) - 15,
                                (wrist.y * canvasElement.height) - 30);
                        }

                        // Visual feedback for volume (distance from center) and effects (pinch)
                        // Simplify visuals on low-performance devices
                        if (!isLowPerformanceDevice) {
                            const volumeLevel = mapRange(distanceFromCenter, 0, 0.5, 0, 1);
                            const effectLevel = mapRange(pinchDist, 0.01, 0.1, 1, 0);

                            // Volume indicator (distance from center)
                            canvasCtx.beginPath();
                            canvasCtx.arc(
                                wrist.x * canvasElement.width,
                                wrist.y * canvasElement.height,
                                30 * volumeLevel, 0, Math.PI * 2
                            );
                            canvasCtx.fillStyle = `rgba(100, 100, 255, ${volumeLevel})`;
                            canvasCtx.fill();

                            // Effect indicator (pinch distance)
                            canvasCtx.beginPath();
                            canvasCtx.arc(
                                (thumbTip.x + indexTip.x) / 2 * canvasElement.width,
                                (thumbTip.y + indexTip.y) / 2 * canvasElement.height,
                                15 * effectLevel, 0, Math.PI * 2
                            );
                            canvasCtx.fillStyle = `rgba(255, 100, 255, ${effectLevel})`;
                            canvasCtx.fill();

                            // Draw a line connecting thumb and index finger for effect control
                            canvasCtx.beginPath();
                            canvasCtx.moveTo(thumbTip.x * canvasElement.width, thumbTip.y * canvasElement.height);
                            canvasCtx.lineTo(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height);
                            canvasCtx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
                            canvasCtx.lineWidth = 5;
                            canvasCtx.stroke();
                        }
                    } else {
                        console.error("Invalid right wrist position detected");
                    }
                }
            }

            // Draw hand landmarks and connections - with thickness based on performance
            const color = isLeft ? 'rgba(0, 255, 200, 0.8)' : 'rgb(231, 150, 0)';
            const lineWidth = isLowPerformanceDevice ? 5 : 10;
            const dotRadius = isLowPerformanceDevice ? 1 : 2;

            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: color, lineWidth: lineWidth });
            drawLandmarks(canvasCtx, landmarks, { color: color, lineWidth: 1, radius: dotRadius });
        }
    } else {
        // No hands detected, stop playing
        if (window.audioStarted) {
            stopMelody();
            stopChord();
        }

        if (!isRightHandPresent && wasRightHandPresent && window.audioStarted) {
            stopChord();
            const chordViz = document.querySelector('.chord-viz');
            if (chordViz) chordViz.classList.remove('chord-active');
        }

        canvasCtx.restore();
    }

    // Helper function to map range
    function mapRange(value, inMin, inMax, outMin, outMax) {
        // Ensure value is within range
        value = Math.max(inMin, Math.min(inMax, value));
        // Perform the mapping
        const result = ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
        return result;
    }

}
// Export hand tracking functions
export {
    setupHandTracking,
    setupWebcamElements,
    onHandResults
}