// =============================================================================
// MAIN APPLICATION - PAC-MAN FACE TRACKING
// Coordinates all modules to create the face-controlled Pac-Man application
// =============================================================================

import * as THREE from 'three';
import { 
  setupScene, 
  setupCamera, 
  setupRenderer, 
  setupControls, 
  setupLighting,
  handleWindowResize 
} from './sceneSetup.js';

import { createPacman, createGround, createStars, createBombs, loadGhosts, createObstacles, removeObstacles } from './sceneObjects.js';
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

// Create ground and Pac-Man
const ground = createGround(scene);
const pacman = createPacman();
scene.add(pacman.group);

// Create stars
const stars = createStars(scene, 10);
let score = 0;
let lives = 3;

// Create bombs (start with terrain 0 - Forest)
const bombs = createBombs(scene, 5, 0);

// Create ghosts (will load async)
let ghosts = [];
loadGhosts(scene, 5, '../Models/ghost.glb').then((loadedGhosts) => {
  ghosts = loadedGhosts;
  systems.ghosts = ghosts;
  console.log('Ghosts loaded and ready!');
});

// Create obstacles (start with terrain 0)
let obstacles = createObstacles(scene, 0);
let currentTerrain = 0;

// =============================================================================
// INITIALIZE DETECTION SYSTEMS
// =============================================================================

// Create all detectors using the factory function
const detectors = createDetectors();

// Create movement controller
const movementController = new MovementController();

// Initialize obstacles for collision detection
movementController.setObstacles(obstacles);

// Effect managers
const blinkEffectManager = new BlinkEffectManager(scene);
const groundColorManager = new GroundColorManager(ground, scene, createObstacles, removeObstacles, movementController, bombs);
groundColorManager.setObstacles(obstacles);
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
  pacman,
  camera,
  controls,
  stars,
  bombs,
  scene,
  ghosts,
  lives
};

// =============================================================================
// ANIMATION LOOP
// =============================================================================

function updateGhosts(ghosts, pacman, movementController) {
  const BOUNDARY = 9.5;
  const GHOST_COLLISION_DISTANCE = 0.6;
  
  // Get current terrain from groundColorManager
  const currentTerrain = groundColorManager.currentColorIndex;
  
  ghosts.forEach(ghost => {
    // Update visibility based on terrain
    const shouldBeVisible = ghost.userData.visibleInTerrain === currentTerrain && ghost.userData.active;
    ghost.visible = shouldBeVisible;
    
    if (!ghost.userData.active || !shouldBeVisible) return;
    
    // Simple AI: move randomly, occasionally chase Pac-Man
    if (Math.random() < 0.02) {
      // 2% chance each frame to change direction
      ghost.userData.velocity.x = (Math.random() - 0.5) * 0.04;
      ghost.userData.velocity.z = (Math.random() - 0.5) * 0.04;
    }
    
    // Sometimes chase Pac-Man
    if (Math.random() < 0.01) {
      const dx = pacman.group.position.x - ghost.position.x;
      const dz = pacman.group.position.z - ghost.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance > 0) {
        ghost.userData.velocity.x = (dx / distance) * 0.03;
        ghost.userData.velocity.z = (dz / distance) * 0.03;
      }
    }
    
    // Update position
    ghost.position.x += ghost.userData.velocity.x;
    ghost.position.z += ghost.userData.velocity.z;
    
    // Keep within boundaries
    if (Math.abs(ghost.position.x) >= BOUNDARY) {
      ghost.position.x = Math.sign(ghost.position.x) * BOUNDARY;
      ghost.userData.velocity.x *= -1;
    }
    if (Math.abs(ghost.position.z) >= BOUNDARY) {
      ghost.position.z = Math.sign(ghost.position.z) * BOUNDARY;
      ghost.userData.velocity.z *= -1;
    }
    
    // Bobbing animation
    ghost.position.y = Math.sin(Date.now() * 0.003 + ghost.position.x) * 0.1;
    
    // Face movement direction
    if (ghost.userData.velocity.x !== 0 || ghost.userData.velocity.z !== 0) {
      const angle = Math.atan2(ghost.userData.velocity.x, ghost.userData.velocity.z);
      ghost.rotation.y = angle;
    }
    
    // Check collision with Pac-Man
    const dx = pacman.group.position.x - ghost.position.x;
    const dz = pacman.group.position.z - ghost.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < GHOST_COLLISION_DISTANCE) {
      handleGhostCollision(ghost, pacman);
    }
  });
}

function handleGhostCollision(ghost, pacman) {
  if (!ghost.userData.active) return;
  
  ghost.userData.active = false;
  
  // Flash the ghost
  const originalMaterial = ghost.children[0]?.material;
  let flashCount = 0;
  const flashInterval = setInterval(() => {
    ghost.visible = !ghost.visible;
    flashCount++;
    if (flashCount >= 6) {
      clearInterval(flashInterval);
      ghost.visible = false;
    }
  }, 100);
  
  // Flash Pac-Man red to indicate damage
  const originalYellowMaterial = pacman.upperJaw.material;
  const originalPinkMaterial = pacman.upperJawInner.material;
  const redMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xff0000,
    shininess: 30,
    side: THREE.FrontSide
  });
  const redInnerMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    shininess: 30,
    side: THREE.BackSide
  });
  
  let pacmanFlashCount = 0;
  const pacmanFlashInterval = setInterval(() => {
    if (pacmanFlashCount % 2 === 0) {
      // Red flash
      pacman.upperJaw.material = redMaterial;
      pacman.lowerJaw.material = redMaterial;
      pacman.upperJawInner.material = redInnerMaterial;
      pacman.lowerJawInner.material = redInnerMaterial;
    } else {
      // Back to original
      pacman.upperJaw.material = originalYellowMaterial;
      pacman.lowerJaw.material = originalYellowMaterial;
      pacman.upperJawInner.material = originalPinkMaterial;
      pacman.lowerJawInner.material = originalPinkMaterial;
    }
    pacmanFlashCount++;
    if (pacmanFlashCount >= 8) {
      clearInterval(pacmanFlashInterval);
      // Ensure back to original
      pacman.upperJaw.material = originalYellowMaterial;
      pacman.lowerJaw.material = originalYellowMaterial;
      pacman.upperJawInner.material = originalPinkMaterial;
      pacman.lowerJawInner.material = originalPinkMaterial;
      redMaterial.dispose();
      redInnerMaterial.dispose();
    }
  }, 150);
  
  // Lose a life
  lives--;
  updateLivesDisplay();
  
  console.log(`Ghost collision! Lives remaining: ${lives}`);
  
  // Check for game over
  if (lives <= 0) {
    showGameOver();
    return;
  }
  
  // Ghost stays defeated - no respawn
}

function updateLivesDisplay() {
  const livesDiv = document.getElementById('lives');
  if (livesDiv) {
    const hearts = '❤️ '.repeat(lives).trim();
    livesDiv.innerHTML = hearts || '💔';
  }
}

function showGameOver() {
  const gameOverDiv = document.getElementById('game-over');
  const finalScoreSpan = document.getElementById('final-score');
  const scoreDiv = document.getElementById('score');
  
  if (gameOverDiv && finalScoreSpan && scoreDiv) {
    const currentScore = parseInt(scoreDiv.textContent.split(': ')[1] || '0');
    finalScoreSpan.textContent = currentScore;
    gameOverDiv.style.display = 'block';
  }
  
  console.log('GAME OVER');
}

function animate() {
  requestAnimationFrame(animate);
  blinkEffectManager.updateCircles();
  
  // Update ghosts movement
  if (ghosts.length > 0) {
    updateGhosts(ghosts, pacman, movementController);
  }
  
  // Update Pac-Man movement even when no face is detected (maintains momentum)
  if (detectors.calibration.isCalibrated) {
    // Apply damping and collision detection through MovementController
    const newX = movementController.position.x + movementController.velocity.x * 0.85;
    const newZ = movementController.position.z + movementController.velocity.z * 0.85;
    
    // Check for obstacle collision with sliding
    const fullCollision = movementController.checkObstacleCollision(newX, newZ);
    const xCollision = movementController.checkObstacleCollision(newX, movementController.position.z);
    const zCollision = movementController.checkObstacleCollision(movementController.position.x, newZ);
    
    movementController.velocity.x *= 0.85;
    movementController.velocity.z *= 0.85;
    
    if (!fullCollision) {
      // No collision, update both axes
      movementController.position.x = newX;
      movementController.position.z = newZ;
    } else {
      // Try sliding along obstacles
      if (!xCollision) {
        movementController.position.x = newX;
      }
      if (!zCollision) {
        movementController.position.z = newZ;
      }
    }
    
    // Apply boundaries
    const BOUNDARY = 9.5;
    if (Math.abs(movementController.position.x) >= BOUNDARY) {
      movementController.position.x = Math.sign(movementController.position.x) * BOUNDARY;
      movementController.velocity.x = 0;
    }
    if (Math.abs(movementController.position.z) >= BOUNDARY) {
      movementController.position.z = Math.sign(movementController.position.z) * BOUNDARY;
      movementController.velocity.z = 0;
    }
    
    pacman.group.position.x = movementController.position.x;
    pacman.group.position.z = movementController.position.z;
    
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
