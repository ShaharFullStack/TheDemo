/**
 * HandSynth - Visualization (Performance Optimized)
 * Three.js particle system and visual effects with improved performance
 */

import { lerp, onWindowResize } from './utils.js';
import { leftHandIsPlaying, rightHandIsPlaying, currentMelodyNote, currentChord, noteChangeTime, chordChangeTime } from './audio.js';
import { notes } from './musicTheory.js';

// THREE.js variables
let scene, camera, renderer;
let particles;

// Performance optimization
let isLowPerformanceDevice = false;
let lastFrameTime = 0;
let frameCount = 0;
let fpsSum = 0;
let averageFps = 60;

// Animation variables
let particleExplosionFactor = 0;
let pulseFactor = 0;
let particleTargetPositions = [];
let animationIntensity = 0;
let lastAnimatedNote = null;
let lastAnimatedChord = null;

// Detect if we're on a low-performance device
function detectPerformance() {
  // Check if running on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Initial assumption based on device type
  isLowPerformanceDevice = isMobile;
  
  // We'll refine this based on actual FPS after a few frames
  console.log("Initial performance assessment:", isLowPerformanceDevice ? "Low performance device" : "High performance device");
}

// Setup THREE.js scene, camera and renderer
function setupThreeJS() {
  // Detect performance characteristics
  detectPerformance();
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000a14);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.z = 200;
  
  // Create renderer with settings appropriate for performance
  renderer = new THREE.WebGLRenderer({ 
    antialias: !isLowPerformanceDevice, // Disable antialiasing on low-end devices
    alpha: true,
    preserveDrawingBuffer: true, // Needed for trails effect
    powerPreference: "high-performance" // Request high-performance GPU
  });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(isLowPerformanceDevice ? 1 : window.devicePixelRatio); // Lower resolution for low-end devices
  renderer.autoClearColor = false; // Don't clear color buffer to create trails
  
  // Add renderer to DOM
  const container = document.getElementById('container');
  if (container) {
    container.appendChild(renderer.domElement);
  } else {
    console.error("Container element not found!");
    return;
  }
  
  // Add event listener for window resize
  window.addEventListener('resize', () => onWindowResize(camera, renderer));
  
  // Create particle system for visualization
  createParticleSystem();
}

// Create optimized particle system based on device performance
function createParticleSystem() {
  // Adjust particle count based on performance
  const baseCount = isLowPerformanceDevice ? 2000 : 6000;
  const count = baseCount;
  
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  
  // Create particles in multiple layers for more depth and interest
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // Distribute particles in different patterns based on index ranges
    if (i < count * 0.7) {
      // Spherical distribution for 70% of particles
      const radius = 50 + (Math.random() * 10 - 5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    } else if (i < count * 0.9) {
      // Disc/plane distribution for 20% of particles
      const discRadius = 70 * Math.sqrt(Math.random());
      const discTheta = Math.random() * Math.PI * 2;
      
      positions[i3] = discRadius * Math.cos(discTheta);
      positions[i3 + 1] = (Math.random() * 20 - 10);  // thin vertical spread
      positions[i3 + 2] = discRadius * Math.sin(discTheta);
    } else {
      // Tight core cluster for 10% of particles
      const coreRadius = 20 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = coreRadius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = coreRadius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = coreRadius * Math.cos(phi);
    }
    
    // Vary initial colors with a blue-purple gradient
    const depth = Math.sqrt(
      positions[i3] * positions[i3] +
      positions[i3 + 1] * positions[i3 + 1] +
      positions[i3 + 2] * positions[i3 + 2]
    ) / 70;
    
    colors[i3] = 0.3 + depth * 0.3;       // R: more red farther out
    colors[i3 + 1] = 0.3 + depth * 0.1;   // G: slight green
    colors[i3 + 2] = 0.9 - depth * 0.3;   // B: more blue in the center
    
    // Vary particle sizes for more visual interest
    sizes[i] = 0.5 + Math.random() * 1.5;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  // Use simpler materials for low-performance devices
  const material = new THREE.PointsMaterial({
    size: isLowPerformanceDevice ? 1.5 : 1.0, // Larger points on low-end devices for visibility
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false  // prevents rendering artifacts
  });
  
  particles = new THREE.Points(geometry, material);
  
  // Store original positions for animation reference
  particles.userData = {
    originalPositions: new Float32Array(positions),
    velocities: new Float32Array(positions.length) // Add velocities array for smooth motion
  };
  
  scene.add(particles);
}

// Function to update particles for note change
function updateParticlesForNoteChange() {
  // Just trigger the animation, actual work happens in animate()
  particleExplosionFactor = 1.0;
}

// Function to update particles for chord change
function updateParticlesForChordChange() {
  // Just trigger the animation, actual work happens in animate()
  pulseFactor = 1.0;
}

// Calculate FPS for performance monitoring
function calculateFPS(timestamp) {
  if (lastFrameTime === 0) {
    lastFrameTime = timestamp;
    return 60; // Default assumption
  }
  
  const deltaTime = timestamp - lastFrameTime;
  const fps = 1000 / deltaTime;
  
  // Update rolling average
  frameCount++;
  fpsSum += fps;
  
  if (frameCount >= 30) {
    averageFps = fpsSum / frameCount;
    
    // Adjust performance settings if needed
    if (averageFps < 30 && !isLowPerformanceDevice) {
      console.log("Detected low performance. Switching to performance mode.");
      isLowPerformanceDevice = true;
      
      // Reduce render quality
      renderer.setPixelRatio(1);
      
      // Recreate particle system with fewer particles
      scene.remove(particles);
      createParticleSystem();
    }
    
    // Reset counters
    frameCount = 0;
    fpsSum = 0;
  }
  
  lastFrameTime = timestamp;
  return fps;
}

// Animation loop with enhanced musical reactivity and smooth trails - optimized for performance
function animate(timestamp) {
  // Calculate FPS for adaptive performance
  const currentFps = calculateFPS(timestamp);
  
  const now = Date.now() * 0.001;
  
  // Apply trail effect by not fully clearing the canvas
  // Draw a semi-transparent overlay instead of clearing
  if (renderer && scene && camera) {
    // Add a transparent overlay to create fade effect rather than clearing
    const fadeSpeed = leftHandIsPlaying || rightHandIsPlaying ? 0.12 : 0.15;
    renderer.clearColor(0, 0, 0, fadeSpeed);  // Faster fade when playing
  }
  
  // Smooth transitions for animation values using lerp
  animationIntensity = lerp(animationIntensity, 
                           (leftHandIsPlaying || rightHandIsPlaying) ? 1.0 : 0.0, 
                           0.05);
  
  // Smooth decay of effect triggers
  particleExplosionFactor *= 0.95; // Decay explosion effect
  pulseFactor *= 0.94; // Decay pulse effect
  
  // Check for changes in notes/chords to trigger animations
  if (currentMelodyNote !== lastAnimatedNote) {
    lastAnimatedNote = currentMelodyNote;
    particleExplosionFactor = 1.0; // Trigger explosion effect
  }
  
  if (currentChord !== lastAnimatedChord && currentChord) {
    lastAnimatedChord = currentChord;
    pulseFactor = 1.0; // Trigger pulse effect
  }
  
  // Calculate musical energy for animation
  let musicalEnergy = 0;
  
  if (rightHandIsPlaying && currentMelodyNote) {
    const noteParts = currentMelodyNote.match(/([A-G]#?)(\d+)/);
    if (noteParts) {
      const noteRoot = noteParts[1];
      const noteOctave = parseInt(noteParts[2]);
      const noteIndex = notes.indexOf(noteRoot);
      // Higher notes create more energy
      musicalEnergy = 0.5 + (noteIndex + (noteOctave - 2) * 12) / 48;
    }
  }
  
  if (leftHandIsPlaying && currentChord) {
    // Different chord types create different energy patterns
    const chordEnergyMap = {
      'major': 0.5,
      'minor': 0.4,
      'dominant7': 0.7,
      'minor7': 0.6,
      'diminished': 0.8,
      'augmented': 0.9
    };
    
    const chordEnergy = chordEnergyMap[currentChord.type] || 0.5;
    musicalEnergy = Math.max(musicalEnergy, chordEnergy);
  }
  
  // Update particle animation with enhanced reactivity and smoother motion
  if (particles) {
    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;
    const sizes = particles.geometry.attributes.size ? particles.geometry.attributes.size.array : null;
    const originalPositions = particles.userData ? particles.userData.originalPositions : null;
    
    // Store original positions if not already stored
    if (!particles.userData) {
      particles.userData = {
        originalPositions: new Float32Array(positions.length),
        velocities: new Float32Array(positions.length) // Add velocity for smoother motion
      };
      for (let i = 0; i < positions.length; i++) {
        particles.userData.originalPositions[i] = positions[i];
        particles.userData.velocities[i] = 0; // Initialize velocities to zero
      }
    }
    
    // Calculate time factors for animation
    const noteChangeAge = now - noteChangeTime;
    const chordChangeAge = now - chordChangeTime;
    
    // Performance optimization: process fewer particles or skip frames on low-end devices
    const particleUpdateInterval = isLowPerformanceDevice ? 2 : 1; // Update every nth particle on low-end devices
    
    // Animate particles with smoother motion using velocity - with performance optimizations
    for (let i = 0; i < positions.length; i += 3 * particleUpdateInterval) {
      const i3 = i / 3;
      const originalX = particles.userData.originalPositions[i];
      const originalY = particles.userData.originalPositions[i+1];
      const originalZ = particles.userData.originalPositions[i+2];
      
      // Calculate distance from center for various effects
      const distance = Math.sqrt(
        originalX * originalX + 
        originalY * originalY + 
        originalZ * originalZ
      );
      
      // Create wave-like motion synchronized with music - simplified for performance
      const waveFrequency = 0.5 + musicalEnergy;
      const wavePhase = distance * 0.1;
      
      // Calculate amplitude based on musical elements - smaller on low-end devices
      const baseAmplitude = isLowPerformanceDevice ? 
                      0.03 * (1 + animationIntensity * 3) : 
                      0.05 * (1 + animationIntensity * 5);
      
      // Apply melody-based vertical movement
      let verticalBias = 0;
      if (rightHandIsPlaying && currentMelodyNote) {
        const noteParts = currentMelodyNote.match(/([A-G]#?)(\d+)/);
        if (noteParts) {
          const noteRoot = noteParts[1];
          const noteOctave = parseInt(noteParts[2]);
          const noteIndex = notes.indexOf(noteRoot);
          // Higher notes move particles upward
          verticalBias = (noteIndex + (noteOctave - 3) * 12) / 36;
        }
      }
      
      // Apply note change explosion effect - smoother wave
      const explosionEffect = particleExplosionFactor * Math.sin(noteChangeAge * 8) * 
                             Math.exp(-noteChangeAge * 2.5) * distance * 0.01;
      
      // Apply chord change pulse effect
      const pulseEffect = pulseFactor * Math.sin(chordChangeAge * 6) * 
                         Math.exp(-chordChangeAge * 1.8) * 0.2;
      
      // Target positions - combine all movement effects
      const targetX = originalX + 
                    Math.sin(now * waveFrequency + wavePhase) * baseAmplitude * originalX + 
                    explosionEffect * originalX;
                     
      const targetY = originalY + 
                    Math.cos(now * waveFrequency + wavePhase) * baseAmplitude * originalY + 
                    explosionEffect * originalY + 
                    verticalBias * animationIntensity * 4;
                       
      const targetZ = originalZ + 
                    Math.sin(now * waveFrequency * 0.7 + wavePhase) * baseAmplitude * originalZ + 
                    explosionEffect * originalZ;
      
      // Apply smoother motion using velocity approach (momentum/inertia)
      const smoothFactor = 0.05; // How quickly to reach target (lower = smoother but slower)
      
      // Update velocities with smoother acceleration
      particles.userData.velocities[i] = lerp(
        particles.userData.velocities[i], 
        (targetX - positions[i]) * 0.2, 
        smoothFactor
      );
      
      particles.userData.velocities[i+1] = lerp(
        particles.userData.velocities[i+1], 
        (targetY - positions[i+1]) * 0.2, 
        smoothFactor
      );
      
      particles.userData.velocities[i+2] = lerp(
        particles.userData.velocities[i+2], 
        (targetZ - positions[i+2]) * 0.2, 
        smoothFactor
      );
      
      // Apply velocities to positions
      positions[i] += particles.userData.velocities[i];
      positions[i+1] += particles.userData.velocities[i+1];
      positions[i+2] += particles.userData.velocities[i+2];
      
      // Update particle sizes if available - make them pulse with the music
      if (sizes) {
        const baseSize = 0.5 + Math.random() * 1.5; // original assigned size
        const pulsingEffect = musicalEnergy * 0.5 * Math.sin(now * 6 + i3 * 0.05);
        sizes[i3] = baseSize + pulsingEffect + (explosionEffect * 3) + pulseEffect; 
      }
      
      // Enhanced color effects based on music - simpler for performance
      if (leftHandIsPlaying && currentChord) {
        // Enhanced chord colors with pulse effect
        const chordRootIndex = notes.indexOf(currentChord.root);
        const hue = chordRootIndex / 12;
        
        // Different color schemes for different chord types
        let saturation, lightness;
        
        if (currentChord.type === 'major') {
          saturation = 0.7 + pulseEffect * 0.3;
          lightness = 0.6 + pulseEffect * 0.2;
        } else if (currentChord.type === 'minor') {
          saturation = 0.5 + pulseEffect * 0.3;
          lightness = 0.4 + pulseEffect * 0.2;
        } else if (currentChord.type.includes('7')) {
          saturation = 0.8 + pulseEffect * 0.2;
          lightness = 0.5 + pulseEffect * 0.3;
        } else if (currentChord.type === 'diminished') {
          saturation = 0.9;
          lightness = 0.3 + pulseEffect * 0.4;
        } else {
          saturation = 0.6 + pulseEffect * 0.4;
          lightness = 0.5 + pulseEffect * 0.3;
        }
        
        // Distance-based color variation for more depth
        const distanceFactor = Math.min(1, distance / 50);
        saturation *= (0.8 + distanceFactor * 0.2);
        lightness *= (0.8 + distanceFactor * 0.2);
        
        // Convert HSL to RGB with animated variation
        const h = (hue + now * 0.05 * (currentChord.type === 'diminished' ? 0.3 : 0.1)) * 6;
        const s = saturation;
        const l = lightness;
        
        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          
          r = hue2rgb(p, q, (h + 2) / 6);
          g = hue2rgb(p, q, h / 6);
          b = hue2rgb(p, q, (h + 4) / 6);
        }
        
        colors[i] = r;
        colors[i+1] = g;
        colors[i+2] = b;
      } else if (rightHandIsPlaying && currentMelodyNote) {
        // Enhanced melody note colors with explosion effect
        const noteRoot = currentMelodyNote.slice(0, -1);
        const noteIndex = notes.indexOf(noteRoot);
        const hue = noteIndex / 12;
        
        // Extract octave for brightness variation
        const noteOctave = parseInt(currentMelodyNote.slice(-1));
        const octaveBrightness = (noteOctave - 2) / 5; // Normalize octave range
        
        // Create pulsing effect synchronized with note changes
        const notePulse = Math.sin(noteChangeAge * 12) * Math.exp(-noteChangeAge * 4) * 0.3;
        
        // Convert HSL to RGB with reactive animation
        const h = (hue + now * 0.1) * 6; // Slowly shift hue over time
        const s = 0.8 + notePulse * 0.2;
        const l = 0.5 + octaveBrightness * 0.3 + notePulse * 0.2;
        
        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          
          r = hue2rgb(p, q, (h + 2) / 6);
          g = hue2rgb(p, q, h / 6);
          b = hue2rgb(p, q, (h + 4) / 6);
        }
        
        // Add shimmer effect for higher notes - but only on high-performance devices
        if (noteOctave > 4 && !isLowPerformanceDevice) {
          const shimmer = Math.sin(now * 20 + i3) * 0.1 * (noteOctave - 4) / 3;
          r = Math.min(1, r + shimmer);
          g = Math.min(1, g + shimmer);
          b = Math.min(1, b + shimmer);
        }
        
        colors[i] = r;
        colors[i+1] = g;
        colors[i+2] = b;
      } else {
        // Default ambient color with gentle pulsing
        const pulseRate = 0.2;
        const pulseMagnitude = 0.1;
        const pulse = Math.sin(now * pulseRate) * pulseMagnitude;
        
        colors[i] = 0.3 + pulse * 0.1;
        colors[i+1] = 0.3 + pulse * 0.1;
        colors[i+2] = 0.8 + pulse * 0.2;
      }
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
    if (sizes) particles.geometry.attributes.size.needsUpdate = true;
    
    // Enhance particle system rotation based on musical activity - slower on low-end devices
    const rotationSpeed = isLowPerformanceDevice ? 
                        0.001 * (1 + animationIntensity) : 
                        0.002 * (1 + animationIntensity);
    particles.rotation.y += rotationSpeed;
    
    if (leftHandIsPlaying || rightHandIsPlaying) {
      // Create more complex rotation patterns when music is playing - simpler on low-end devices
      const chordFactor = currentChord ? 
                         (currentChord.type === 'major' ? 0.5 : 
                          currentChord.type === 'minor' ? -0.3 : 
                          currentChord.type.includes('7') ? 0.7 : 0.12) : 0;
      
      if (!isLowPerformanceDevice) {
        particles.rotation.z += 0.001 * (1 + chordFactor);
        particles.rotation.x += 0.0005 * animationIntensity;
      } else {
        // Simpler rotation for low-end devices
        particles.rotation.z += 0.0005 * (1 + chordFactor);
      }
    }
  }
  
  // Render the scene with trails
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Export visualization functions
export {
  setupThreeJS,
  createParticleSystem,
  animate,
  updateParticlesForNoteChange,
  updateParticlesForChordChange
};