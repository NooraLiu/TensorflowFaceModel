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

const systems = {
  calibration: detectors.calibration,
  mouthDetector: detectors.mouth,
  blinkDetector: detectors.blink,
  headPoseDetector: detectors.headPose,
  eyebrowDetector: detectors.eyebrow,
  blinkEffectManager,
  groundColorManager,
  eyebrowEffectManager,
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
// MOUSE TRACKING FOR HEAD-TURN MODE
// =============================================================================

window.addEventListener('mousemove', (event) => {
  // Convert mouse position to normalized device coordinates (-1 to +1)
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = -(event.clientY / window.innerHeight) * 2 + 1; // Invert Y
  
  movementController.updateMousePosition(x, y, camera);
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
  const clampCameraToggle = document.getElementById('clamp-camera-toggle');
  const lookAtCubeToggle = document.getElementById('look-at-cube-toggle');
  const modeSelector = document.getElementById('mode-selector');
  const modeDescription = document.getElementById('mode-description');
  
  // Mode selector
  if (modeSelector && modeDescription) {
    modeSelector.addEventListener('change', (event) => {
      const mode = event.target.value;
      movementController.setControlMode(mode);
      
      // Update description
      if (mode === 'head-turn') {
        modeDescription.textContent = 'Mouse: move, Head turn: rotate, Head nod: pitch, Head tilt: height';
      } else {
        modeDescription.textContent = 'Head tilt: forward/back, Head roll: left/right';
      }
    });
  }
  
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
  
  if (clampCameraToggle) {
    clampCameraToggle.addEventListener('change', (event) => {
      movementController.clampCameraToGround = event.target.checked;
      console.log(`Clamp camera to ground: ${movementController.clampCameraToGround}`);
    });
    clampCameraToggle.checked = movementController.clampCameraToGround;
  }
  
  if (lookAtCubeToggle) {
    lookAtCubeToggle.addEventListener('change', (event) => {
      movementController.lookAtCube = event.target.checked;
      console.log(`Look at cube: ${movementController.lookAtCube}`);
    });
    lookAtCubeToggle.checked = movementController.lookAtCube;
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
