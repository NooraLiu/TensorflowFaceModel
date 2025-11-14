// =============================================================================
// MAIN APPLICATION - MODULAR FACE TRACKING
// Coordinates all modules to create the face-controlled cube application
// =============================================================================

import { 
  setupScene, 
  setupCamera, 
  setupRenderer, 
  setupControls, 
  setupLighting,
  handleWindowResize 
} from './sceneSetup.js';

import { createCube } from './sceneObjects.js';
import { MediaPipeFaceTracking } from '../lib/faceTrackingSystem.js';
import { createDetectors } from '../lib/faceDetectors.js';
import { 
  BlinkEffectManager, 
  EyebrowEffectManager, 
  SmileFrownEffectManager 
} from './dataMapping.js';
import { processFaceLandmarks } from './faceTrackingCoordinator.js';

// =============================================================================
// ERROR HANDLING
// =============================================================================

function showError(message) {
  console.error(message);
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// =============================================================================
// SCENE SETUP
// =============================================================================

const scene = setupScene();
const camera = setupCamera();
const renderer = setupRenderer();
const controls = setupControls(camera, renderer);
setupLighting(scene);

// Create cube and add to scene
const cube = createCube();
scene.add(cube);

// =============================================================================
// INITIALIZE DETECTION SYSTEMS
// =============================================================================

// Create all detectors using the factory function
const detectors = createDetectors();

// Effect managers
const blinkEffectManager = new BlinkEffectManager(scene);  // Handles blink circles
const eyebrowEffectManager = new EyebrowEffectManager();  // Handles WOW text
const smileFrownEffectManager = new SmileFrownEffectManager();  // Handles emoji overlays

const systems = {
  calibration: detectors.calibration,
  mouthDetector: detectors.mouth,
  blinkDetector: detectors.blink,
  headPoseDetector: detectors.headPose,
  eyebrowDetector: detectors.eyebrow,
  smileFrownDetector: detectors.smileFrown,
  blinkEffectManager,
  eyebrowEffectManager,
  smileFrownEffectManager,
  cube
};

// =============================================================================
// ANIMATION LOOP
// =============================================================================

function animate() {
  requestAnimationFrame(animate);
  blinkEffectManager.updateCircles();  // Update blink effect circles
  controls.update();
  renderer.render(scene, camera);
}

// =============================================================================
// WINDOW RESIZE HANDLER
// =============================================================================

window.addEventListener('resize', () => {
  handleWindowResize(camera, renderer);
});

// =============================================================================
// INITIALIZE MEDIAPIPE
// =============================================================================

function initialize() {
  try {
    // Start animation loop
    animate();
    
    // Initialize MediaPipe using the new class
    const faceTrackingSystem = new MediaPipeFaceTracking({
      drawMesh: true,
      showVideo: true
    });
    
    faceTrackingSystem.initialize((results, meshCtx, meshCanvas) => {
      processFaceLandmarks(results, meshCtx, meshCanvas, systems, faceTrackingSystem);
    });
    
    console.log('Face tracking initialized successfully');
  } catch (error) {
    showError(error.message);
  }
}

// Wait for DOM and MediaPipe libraries to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  setTimeout(initialize, 100);
}

