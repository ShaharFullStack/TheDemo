/**
 * HandSynth - Main Application
 * Entry point for the hand gesture musical instrument
 */

// Import all necessary modules
import { setupAudio, updateSynths } from './audio.js';
import { setupHandTracking, setupWebcamElements } from './handTracking.js';
import { createUI, updateUI } from './ui.js';
import { initControlPanel, setupMasterVolumeConnection, updateAudioStatus, updateTrackingStatus } from './controlPanel.js';
import { showMessage } from './utils.js';

// Initialize global audioStarted state
window.audioStarted = false;

// Initialize the application when the window loads
window.addEventListener('load', init);

// Main initialization function
function init() {
  console.log('Initializing HandSynth application...');
  
  // Hide preloader after a short delay
  hidePreloader();

  // Create UI
  createUI();

  // Initialize control panel
  initControlPanel();

  // Get webcam elements for hand tracking
  setupWebcamElements();

  // Start hand tracking
  setupHandTracking();

  // Update status indicators
  updateTrackingStatus('initializing');
  
  // Wait for Tone.js to be ready before adding the button
  if (typeof Tone !== 'undefined') {
    console.log('Tone.js is available');
    addStartAudioButton();
  } else {
    console.log('Waiting for Tone.js to load...');
    // Wait a bit and try again
    setTimeout(() => {
      if (typeof Tone !== 'undefined') {
        console.log('Tone.js loaded after delay');
        addStartAudioButton();
      } else {
        console.error('Tone.js failed to load');
        showMessage('Audio library failed to load. Please refresh the page.');
      }
    }, 1000);
  }
}

// Hide preloader with smooth transition
function hidePreloader() {
  setTimeout(() => {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
      preloader.style.opacity = '0';
      preloader.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        preloader.style.display = 'none';
      }, 500);
    }
  }, 500);
}

// Add prominent start audio button
function addStartAudioButton() {
  const startButton = document.createElement('button');
  startButton.textContent = 'Start Audio';
  startButton.style.position = 'fixed';
  startButton.style.top = '50%';
  startButton.style.left = '50%';
  startButton.style.transform = 'translate(-50%, -50%)';
  startButton.style.zIndex = '1000';
  startButton.style.padding = '20px 40px';
  startButton.style.fontSize = '24px';
  startButton.style.backgroundColor = '#4CAF50';
  startButton.style.color = 'white';
  startButton.style.border = 'none';
  startButton.style.borderRadius = '10px';
  startButton.style.cursor = 'pointer';
  startButton.style.fontFamily = 'Montserrat, sans-serif';
  startButton.style.fontWeight = '600';

  document.body.appendChild(startButton);

  startButton.addEventListener('click', function() {
    console.log('Start Audio button clicked');
    
    // Check if Tone.js is loaded
    if (typeof Tone === 'undefined') {
      console.error('Tone.js is not loaded');
      showMessage('Audio library not loaded. Please refresh and try again.');
      return;
    }
    
    console.log('Tone.js is available, context state:', Tone.context.state);
    
    if (Tone.context.state !== 'running') {
      try {
        console.log('Starting Tone.js...');
        Tone.start().then(() => {
          console.log('Tone.js started successfully');
          window.audioStarted = true;
          document.body.removeChild(startButton);
          showMessage('Move your hands to play!');
          // Setup audio after user interaction
          setupAudio();
          // Setup master volume connection
          setupMasterVolumeConnection();
          // Update audio status
          updateAudioStatus('active');
        }).catch(err => {
          console.error("Error starting Tone.js:", err);
          showMessage('Error starting audio: ' + err.message);
        });
      } catch (error) {
        console.error("Exception starting Tone.js:", error);
        showMessage('Error starting audio: ' + error.message);
      }
    } else {
      console.log('Tone.js already running');
      window.audioStarted = true;
      document.body.removeChild(startButton);
      showMessage('Move your hands to play!');
      setupAudio();
      // Setup master volume connection
      setupMasterVolumeConnection();
      // Update audio status
      updateAudioStatus('active');
    }
  });
}

// Export globals and functions for other modules
export {
  init,
  addStartAudioButton
};