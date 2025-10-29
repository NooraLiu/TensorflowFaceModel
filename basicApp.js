// =============================================================================
// BASIC APP - ULTRA SIMPLE WITH LIBRARY SCENE AND FACE DETECTION
// =============================================================================

import { 
  createSimpleFaceDetector,
  createSimpleScene 
} from './lib/FaceTrackingLibrary.js';

// =============================================================================
// BASIC APP CLASS - MINIMAL CODE WITH LIBRARY METHODS
// =============================================================================

class BasicApp {
  constructor() {
    // Create scene manager (handles all Three.js setup)
    this.sceneManager = createSimpleScene({
      backgroundColor: 0x222222,  // Same as sketch.js
      cameraPosition: { x: 0, y: 0, z: 2 },  // Same as sketch.js
      enableControls: true
    });
    
    // Create face detector (handles all MediaPipe setup)
    this.faceDetector = createSimpleFaceDetector();
    
    // Blink tracking for sketch.js behavior
    this.lastBlinkTime = 0;
    this.BLINK_COOLDOWN = 150;
  }

  async initialize() {
    try {
      this.updateStatus('Initializing ultra simple face tracking...', '#FFD700');
      
      // Initialize face detector with automatic camera setup (one line!)
      await this.faceDetector
        .enableMeshDrawing(true)  // Enable face mesh visualization
        .initializeCamera('video', 'mesh-canvas');  // Setup camera and MediaPipe
      
      // Set callback for when face data is processed (one line!)
      this.faceDetector.onLandmarks((faceData, landmarks) => {
        this.handleFaceData(faceData, landmarks);
      });
      
      this.updateStatus('Ultra simple face tracking initialized!', '#00FF88');
      
    } catch (error) {
      console.error('Basic app initialization error:', error);
      this.showError(`Initialization failed: ${error.message}`);
    }
  }

  handleFaceData(faceData, landmarks) {
    // Handle calibration
    if (!faceData.isCalibrated) {
      this.faceDetector.addCalibrationSample(landmarks);
      this.updateStatus(`Calibrating face baseline... ${faceData.calibrationProgress}%`, '#FFD700');
      
      // During calibration, keep cube neutral (using scene manager methods)
      this.sceneManager.setCubeRotation(0, 0, 0);
      this.sceneManager.setCubeScale(1);
      this.sceneManager.setCubeWireframe(false);
      return;
    }

    // Face tracking is calibrated - apply movements using scene manager
    const { headMovement, mouthOpenness, eyebrowRaise, blink } = faceData;

    // Apply head rotations (same as sketch.js) - one line!
    this.sceneManager.setCubeRotation(
      headMovement.tilt,  // X rotation
      headMovement.turn,  // Y rotation  
      headMovement.roll   // Z rotation
    );

    // Apply mouth scaling (same as sketch.js) - one line!
    this.sceneManager.setCubeScale(mouthOpenness);

    // Apply eyebrow wireframe toggle (same as sketch.js) - one line!
    this.sceneManager.setCubeWireframe(eyebrowRaise.shouldToggleWireframe);

    // Handle blink detection with cooldown (same as sketch.js)
    const currentTime = Date.now();
    if (blink.detected && (currentTime - this.lastBlinkTime) > this.BLINK_COOLDOWN) {
      this.sceneManager.createBlinkCircle();
      this.lastBlinkTime = currentTime;
      console.log('Blink detected! L:', blink.leftRatio, 'R:', blink.rightRatio);
    }
  }

  updateStatus(message, color = '#00FF88') {
    const statusDiv = document.getElementById('calibration-status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.style.color = color;
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    } else {
      console.error(message);
    }
  }
}

// =============================================================================
// GLOBAL FUNCTIONS
// =============================================================================

function goToMovementControl() {
  window.location.href = 'movement.html';
}

window.goToMovementControl = goToMovementControl;

// =============================================================================
// APPLICATION STARTUP
// =============================================================================

const basicApp = new BasicApp();

document.addEventListener('DOMContentLoaded', () => {
  basicApp.initialize();
});
