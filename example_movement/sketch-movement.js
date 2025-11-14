// =============================================================================
// MAIN APPLICATION - MOVEMENT FACE TRACKING
// Coordinates all modules to create the face-controlled movement application
// =============================================================================

import { 
  setupScene, 
  setupCamera, 
  setupRenderer, 
  setupControls, 
  setupLighting,
  handleWindowResize 
} from './sceneSetup.js';

import { createCube, createGround } from './sceneObjects.js';
import { MediaPipeFaceTracking } from '../lib/faceTrackingSystem.js';
import { createDetectors } from '../lib/faceDetectors.js';
import { 
  BlinkEffectManager,
  GroundColorManager,
  EyebrowEffectManager,
  SmileFrownEffectManager,
  MovementController
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

// Create ground and cube
const ground = createGround(scene);
const cube = createCube();
scene.add(cube);

// =============================================================================
// INITIALIZE DETECTION SYSTEMS
// =============================================================================

// Create all detectors using the factory function
const detectors = createDetectors();

// Create movement controller
const movementController = new MovementController();

// Effect managers
const blinkEffectManager = new BlinkEffectManager(scene);
const groundColorManager = new GroundColorManager(ground);
const eyebrowEffectManager = new EyebrowEffectManager();
const smileFrownEffectManager = new SmileFrownEffectManager();

const systems = {
  calibration: detectors.calibration,
  mouthDetector: detectors.mouth,
  blinkDetector: detectors.blink,
  headPoseDetector: detectors.headPose,
  eyebrowDetector: detectors.eyebrow,
  smileFrownDetector: detectors.smileFrown,
  blinkEffectManager,
  groundColorManager,
  eyebrowEffectManager,
  smileFrownEffectManager,
  movementController,
  cube,
  camera,
  controls
};

// =============================================================================
// ANIMATION LOOP
// =============================================================================

function animate() {
  requestAnimationFrame(animate);
  blinkEffectManager.updateCircles();
  
  // Update cube movement even when no face is detected (maintains momentum)
  if (detectors.calibration.isCalibrated) {
    // Apply damping to maintain momentum
    movementController.velocity.x *= 0.85;
    movementController.velocity.z *= 0.85;
    
    movementController.position.x += movementController.velocity.x;
    movementController.position.z += movementController.velocity.z;
    
    cube.position.x = movementController.position.x;
    cube.position.z = movementController.position.z;
    
    movementController.updateCameraFollow(camera, controls);
  }
  
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
// UI CONTROLS
// =============================================================================

function initializeSensitivityControls() {
  const sensitivitySlider = document.getElementById('sensitivity-slider');
  const sensitivityValue = document.getElementById('sensitivity-value');
  const rollSensitivitySlider = document.getElementById('roll-sensitivity-slider');
  const rollSensitivityValue = document.getElementById('roll-sensitivity-value');
  const cameraSensitivitySlider = document.getElementById('camera-sensitivity-slider');
  const cameraSensitivityValue = document.getElementById('camera-sensitivity-value');
  const invertCameraToggle = document.getElementById('invert-camera-toggle');
  const cameraRelativeToggle = document.getElementById('camera-relative-toggle');
  
  if (sensitivitySlider && sensitivityValue) {
    // Initialize slider value from MovementController default
    sensitivitySlider.value = movementController.movementSensitivity;
    sensitivityValue.textContent = `${movementController.movementSensitivity.toFixed(1)}x`;
    
    sensitivitySlider.addEventListener('input', (event) => {
      movementController.setSensitivity('movement', parseFloat(event.target.value));
      sensitivityValue.textContent = `${movementController.movementSensitivity.toFixed(1)}x`;
      console.log(`Forward/Back sensitivity updated to: ${movementController.movementSensitivity}x`);
    });
  }
  
  if (rollSensitivitySlider && rollSensitivityValue) {
    // Initialize slider value from MovementController default
    rollSensitivitySlider.value = movementController.rollSensitivity;
    rollSensitivityValue.textContent = `${movementController.rollSensitivity.toFixed(2)}x`;
    
    rollSensitivitySlider.addEventListener('input', (event) => {
      movementController.setSensitivity('roll', parseFloat(event.target.value));
      rollSensitivityValue.textContent = `${movementController.rollSensitivity.toFixed(2)}x`;
      console.log(`Left/Right sensitivity updated to: ${movementController.rollSensitivity}x`);
    });
  }
  
  if (cameraSensitivitySlider && cameraSensitivityValue) {
    // Initialize slider value from MovementController default
    cameraSensitivitySlider.value = movementController.cameraSensitivity;
    cameraSensitivityValue.textContent = `${movementController.cameraSensitivity.toFixed(1)}x`;
    
    cameraSensitivitySlider.addEventListener('input', (event) => {
      movementController.setSensitivity('camera', parseFloat(event.target.value));
      cameraSensitivityValue.textContent = `${movementController.cameraSensitivity.toFixed(1)}x`;
      console.log(`Camera sensitivity updated to: ${movementController.cameraSensitivity}x`);
    });
  }
  
  if (invertCameraToggle) {
    invertCameraToggle.addEventListener('change', (event) => {
      movementController.invertCameraControls = event.target.checked;
      console.log(`Camera controls inverted: ${movementController.invertCameraControls}`);
    });
    invertCameraToggle.checked = movementController.invertCameraControls;
  }
  
  if (cameraRelativeToggle) {
    cameraRelativeToggle.addEventListener('change', (event) => {
      movementController.setMode(event.target.checked);
      console.log(`Camera-relative movement: ${movementController.cameraRelativeMovement}`);
      
      if (cameraSensitivitySlider) {
        cameraSensitivitySlider.value = movementController.cameraSensitivity;
      }
      if (cameraSensitivityValue) {
        cameraSensitivityValue.textContent = `${movementController.cameraSensitivity.toFixed(1)}x`;
      }
      
      console.log(`Camera sensitivity updated to: ${movementController.cameraSensitivity}x for ${movementController.cameraRelativeMovement ? 'camera-relative' : 'world coordinate'} mode`);
    });
    cameraRelativeToggle.checked = movementController.cameraRelativeMovement;
  }
}

// =============================================================================
// INITIALIZE MEDIAPIPE
// =============================================================================

function initialize() {
  try {
    // Start animation loop
    animate();
    
    // Initialize sensitivity controls
    initializeSensitivityControls();
    
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
