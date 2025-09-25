/**
 * HandSynth - Utility Functions
 * Helper functions used across different modules
 */

// Calculate distance between two points
function calculateDistance(point1, point2) {
    if (!point1 || !point2) return Infinity;
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Enhanced map range function
  function mapRange(value, inMin, inMax, outMin, outMax) {
    // Ensure value is within range
    value = Math.max(inMin, Math.min(inMax, value));
    // Perform the mapping
    const result = ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    return result;
  }
  
  // Linear interpolation helper for smoother transitions
  function lerp(start, end, t) {
    return start * (1 - t) + end * t;
  }
  
  // Show message overlay
  function showMessage(message, duration = 2000) {
    const messageEl = document.createElement('div');
    messageEl.style.position = 'fixed';
    messageEl.style.top = '50%';
    messageEl.style.left = '50%';
    messageEl.style.transform = 'translate(-50%, -50%)';
    messageEl.style.backgroundColor = 'rgba(0,0,0,0.8)';
    messageEl.style.color = 'white';
    messageEl.style.padding = '20px';
    messageEl.style.borderRadius = '10px';
    messageEl.style.zIndex = '1000';
    messageEl.style.fontSize = '24px';
    messageEl.style.fontFamily = 'Arial, sans-serif';
    messageEl.style.textAlign = 'center';
    messageEl.style.direction = 'rtl';
    messageEl.textContent = message;
    document.body.appendChild(messageEl);
    
    // Remove message after specified duration
    setTimeout(() => {
      document.body.removeChild(messageEl);
    }, duration);
  }
  
  // Handle window resizing
  function onWindowResize(camera, renderer) {
    if (!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Export utility functions
  export {
    calculateDistance,
    mapRange,
    lerp,
    showMessage,
    onWindowResize
  };