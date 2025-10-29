// =============================================================================
// MOVEMENT APP - SKETCH-MOVEMENT.JS RECREATION USING LIBRARY METHODS
// =============================================================================

import { 
  createSimpleFaceDetector,
  createSimpleScene,
  CalibrationSystem,
  GestureDetector,
  MovementController
} from './lib/FaceTrackingLibrary.js';

// =============================================================================
// MOVEMENT APP CLASS - SAME PATTERN AS BASIC APP
// =============================================================================

class MovementApp {
  constructor() {
    // Create scene manager with sketch-movement.js appearance (same pattern as basicApp.js)
    this.sceneManager = createSimpleScene({
      backgroundColor: 0x87CEEB,  // Sky blue background like sketch-movement.js
      cameraPosition: { x: 0, y: 5, z: 8 },  // Same as sketch-movement.js
      enableControls: true,
      cubeColors: [
        0xff8f8f, // Right face - Light Pink rgb(255, 143, 143)
        0xfff1cb, // Left face - Light Yellow rgb(255, 241, 203)
        0xc2e2fa, // Top face - Light Blue rgb(194, 226, 250)
        0xb7a3e3, // Bottom face - Light Purple rgb(183, 163, 227)
        0xf5d2d2, // Front face - Pale Pink rgb(245, 210, 210)
        0xffc7a7  // Back face - Light Orange rgb(255, 199, 167)
      ],
      groundColor: 0x90EE90  // Light green ground
    });
    
    // Create face detector (same as basicApp.js)
    this.faceDetector = createSimpleFaceDetector();
    
    // Movement-specific systems (using library classes directly)
    this.calibration = new CalibrationSystem();
    this.gestureDetector = new GestureDetector(this.calibration);
    this.movementController = new MovementController({
      movementSensitivity: 0.3,
      rollSensitivity: 0.10,
      cameraSensitivity: 2.0,
      cameraRelativeMovement: true,
      invertCameraControls: true
    });
    
    // State tracking
    this.lastSmileState = false;
  }

  async initialize() {
    try {
      this.updateStatus('Initializing movement-based face tracking...', '#FFD700');
      
      // Setup scene for movement style (ground plane, lighting, shadows)
      this.setupMovementScene();
      
      // Initialize face detector with camera setup (same as basicApp.js)
      await this.faceDetector
        .enableMeshDrawing(true)
        .initializeCamera('video', 'mesh-canvas');
      
      // Set callback for face tracking (same pattern as basicApp.js)
      this.faceDetector.onLandmarks((faceData, landmarks) => {
        this.handleFaceTracking(faceData, landmarks);
      });
      
      // Start face detection (same as basicApp.js)
      await this.faceDetector.start();
      
      this.setupControls();
      this.updateStatus('Movement app ready - Tilt head to move cube!', '#00FF88');
      
    } catch (error) {
      this.showError('Failed to initialize movement app: ' + error.message);
    }
  }

  setupMovementScene() {
    // Add ground plane (sketch-movement.js style)
    this.sceneManager.addGroundPlane();
    
    // Position cube like sketch-movement.js
    this.sceneManager.setCubePosition(0, 0.5, 0);
    
    // Setup camera like sketch-movement.js
    this.sceneManager.setCameraPosition(0, 5, 8);
    
    // Enable shadows and proper lighting
    this.sceneManager.setupMovementLighting();
    this.sceneManager.enableShadows();
  }

  handleFaceTracking(faceData, landmarks) {
    if (!this.calibration.isCalibrated) {
      // Calibration phase (same logic as sketch-movement.js)
      const headPose = this.gestureDetector.calculateHeadPose(landmarks);
      const eyebrowRatio = this.gestureDetector.calculateEyebrowRatio(landmarks);
      
      this.calibration.addSample(
        eyebrowRatio.average,
        headPose.turn,
        headPose.tilt,
        headPose.roll
      );
      
      this.updateStatus(`Calibrating... ${this.calibration.getProgress()}%`, '#FFD700');
      return;
    }

    // Main movement functionality
    this.processHeadMovement(landmarks);
    this.processSmileDetection(landmarks);
    
    // Update debug info
    this.updateDebugInfo(landmarks);
  }

  processHeadMovement(landmarks) {
    // Get head pose
    const headPose = this.gestureDetector.calculateHeadPose(landmarks);
    
    // Get calibrated head movement
    const headMovement = this.calibration.getHeadMovement(
      headPose.turn,
      headPose.tilt,
      headPose.roll
    );

    // Update cube position using movement controller (sketch-movement.js functionality)
    this.movementController.updateMovement(headMovement, this.sceneManager.getCube());
    
    // Update camera follow (sketch-movement.js functionality)
    this.movementController.updateCameraFollow(this.sceneManager.getCamera());
  }

  processSmileDetection(landmarks) {
    // Smile detection for ground color changes (sketch-movement.js feature)
    const smileResult = this.gestureDetector.detectSmile(landmarks);
    
    if (smileResult.detected && !this.lastSmileState) {
      // Change ground to pink when smiling
      this.sceneManager.getGround().material.color.setHex(0xFFB6C1);
      this.lastSmileState = true;
    } else if (!smileResult.detected && this.lastSmileState) {
      // Change back to green when not smiling
      this.sceneManager.getGround().material.color.setHex(0x90EE90);
      this.lastSmileState = false;
    }
  }

  setupControls() {
    // Movement sensitivity controls (same as original sketch-movement.js)
    this.setupSensitivitySliders();
    this.setupMovementModeControls();
  }

  setupSensitivitySliders() {
    // Movement Sensitivity Slider
    const movementSlider = document.getElementById('sensitivity-slider');
    if (movementSlider) {
      movementSlider.value = this.movementController.movementSensitivity;
      movementSlider.addEventListener('input', (e) => {
        this.movementController.movementSensitivity = parseFloat(e.target.value);
        document.getElementById('sensitivity-value').textContent = e.target.value + 'x';
      });
    }

    // Roll Sensitivity Slider (left/right movement)
    const rollSlider = document.getElementById('roll-sensitivity-slider');
    if (rollSlider) {
      rollSlider.value = this.movementController.rollSensitivity;
      rollSlider.addEventListener('input', (e) => {
        this.movementController.rollSensitivity = parseFloat(e.target.value);
        document.getElementById('roll-sensitivity-value').textContent = e.target.value + 'x';
      });
    }

    // Camera Sensitivity Slider (camera rotation)
    const cameraSlider = document.getElementById('camera-sensitivity-slider');
    if (cameraSlider) {
      cameraSlider.value = this.movementController.cameraSensitivity;
      cameraSlider.addEventListener('input', (e) => {
        this.movementController.cameraSensitivity = parseFloat(e.target.value);
        document.getElementById('camera-sensitivity-value').textContent = e.target.value + 'x';
      });
    }
  }

  setupMovementModeControls() {
    // Camera-relative vs World coordinate movement toggle
    const movementModeToggle = document.getElementById('camera-relative-toggle');
    if (movementModeToggle) {
      movementModeToggle.checked = this.movementController.cameraRelativeMovement;
      movementModeToggle.addEventListener('change', (e) => {
        this.movementController.cameraRelativeMovement = e.target.checked;
        console.log('Movement mode:', e.target.checked ? 'Camera-relative' : 'World coordinates');
      });
    }

    // Invert camera controls toggle
    const invertToggle = document.getElementById('invert-camera-toggle');
    if (invertToggle) {
      invertToggle.checked = this.movementController.invertCameraControls;
      invertToggle.addEventListener('change', (e) => {
        this.movementController.invertCameraControls = e.target.checked;
      });
    }
  }

  updateDebugInfo(landmarks) {
    // Display debug information (same as sketch-movement.js)
    const headPose = this.gestureDetector.calculateHeadPose(landmarks);
    const cubePos = this.sceneManager.getCube().position;
    
    const debugDiv = document.getElementById('debug-info');
    if (debugDiv) {
      debugDiv.innerHTML = `
        <strong>Head Pose:</strong><br>
        Turn: ${headPose.turn.toFixed(3)}<br>
        Tilt: ${headPose.tilt.toFixed(3)}<br>
        Roll: ${headPose.roll.toFixed(3)}<br><br>
        <strong>Cube Position:</strong><br>
        X: ${cubePos.x.toFixed(2)}<br>
        Y: ${cubePos.y.toFixed(2)}<br>
        Z: ${cubePos.z.toFixed(2)}<br><br>
        <strong>Movement Mode:</strong><br>
        ${this.movementController.cameraRelativeMovement ? 'Camera-Relative' : 'World Coordinates'}
      `;
    }
  }

  updateStatus(message, color = '#FFFFFF') {
    const statusDiv = document.getElementById('status');
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
    }
    console.error(message);
  }
}

// =============================================================================
// INITIALIZE MOVEMENT APP (same pattern as basicApp.js)
// =============================================================================

const movementApp = new MovementApp();
movementApp.initialize();
