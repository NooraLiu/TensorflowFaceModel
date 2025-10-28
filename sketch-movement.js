import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =============================================================================
// UTILITY FUNCTIONS
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
// THREE.JS SETUP
// =============================================================================

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 8);

// Renderer setup
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

// =============================================================================
// CALIBRATION SYSTEM
// =============================================================================

// Eyebrow baseline calibration
let eyebrowBaseline = null;
let eyebrowReadings = [];

// Robust eyebrow detection system
let leftEyebrowRatioHistory = [];
let rightEyebrowRatioHistory = [];
let avgEyebrowRatioHistory = [];
let eyebrowBaselines = { left: null, right: null, average: null };
let lastEyebrowVelocity = 0;
const EYEBROW_HISTORY_SIZE = 10;
const EYEBROW_RATIO_THRESHOLD = 0.01; // Minimum distance increase from baseline (eyebrow raised)
const HEAD_POSE_TOLERANCE = 0.05; // Maximum deviation from calibration pose for eyebrow detection

// Head position baseline calibration
let headTurnBaseline = null;
let headTiltBaseline = null;
let headRollBaseline = null;
let headTurnReadings = [];
let headTiltReadings = [];
let headRollReadings = [];

const CALIBRATION_SAMPLES = 30;
let isCalibrated = false;

// =============================================================================
// MOVEMENT SYSTEM
// =============================================================================

// Cube movement variables
let cubePosition = { x: 0, z: 0 };
const BASE_MOVEMENT_SPEED = 0.1; // Base speed multiplier
let movementSensitivity = 0.3; // User-adjustable sensitivity for forward/backward (default 0.3x)
let rollSensitivity = 0.10; // User-adjustable sensitivity for left/right (default 0.10x)
let cameraSensitivity = 2.0; // User-adjustable sensitivity for camera rotation (default 2.0x for camera-relative, 1.5x for world)
const MOVEMENT_DAMPING = 0.85;
let cubeVelocity = { x: 0, z: 0 };

// Movement threshold system
const MOVEMENT_THRESHOLD = 0.03; // Minimum head tilt to trigger movement
const ROLL_THRESHOLD = 0.04; // Minimum head roll to trigger left/right movement
const TURN_THRESHOLD = 0.02; // Minimum head turn to trigger camera rotation
const THRESHOLD_SMOOTHING = 0.7; // Smoothing factor for threshold filtering

// Camera following variables
const CAMERA_FOLLOW_SPEED = 0.05;
const CAMERA_HEIGHT = 5;
const CAMERA_DISTANCE = 8;
let cameraRotationY = 0; // Camera Y-axis rotation from head turns
let invertCameraControls = true; // Toggle for camera control direction (default: inverted)
const CAMERA_ROTATION_SPEED = 0.02; // Speed of camera rotation accumulation
let cameraRelativeMovement = true; // Toggle for camera-relative vs world-coordinate movement

// =============================================================================
// SMILE DETECTION SYSTEM
// =============================================================================

// Smile detection variables
let smileHistory = [];
let lastSmileTime = 0;
let smileCurveCanvas = null; // 2D canvas for smile curve
let smileCurveCtx = null;
const SMILE_HISTORY_SIZE = 5;
const SMILE_THRESHOLD = 0.015; // Minimum mouth corner elevation for smile detection
const SMILE_COOLDOWN = 1000; // Minimum time between smile detections (ms)

// Frown detection variables
let lastFrownTime = 0;
const FROWN_THRESHOLD = -0.01; // Minimum mouth corner depression for frown detection (negative value)
const FROWN_COOLDOWN = 1000; // Minimum time between frown detections (ms)

// =============================================================================
// EYEBROW "WOW" TEXT SYSTEM
// =============================================================================

// Wow text variables
let wowTexts = []; // Array to store wow text objects
let lastWowTime = 0;
const WOW_COOLDOWN = 500; // Minimum time between wow displays (ms)

// Blink detection variables
let blinkCircles = []; // Array to store blink-triggered circles
let lastBlinkState = { left: false, right: false };
let lastBlinkTime = 0;
const BLINK_THRESHOLD = 0.3; // Relaxed threshold for better detection
const BLINK_COOLDOWN = 100; // Reduced cooldown for more responsive detection

// =============================================================================
// BLINK DETECTION SYSTEM
// =============================================================================

// Mouth smoothing variables
let mouthOpenHistory = [];
const MOUTH_HISTORY_SIZE = 8;
const MOUTH_CHANGE_THRESHOLD = 0.4;
let lastSmoothedMouthValue = 1.0;

// =============================================================================
// 3D SCENE SETUP
// =============================================================================

// Create ground plane
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 }); // Light green
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
ground.receiveShadow = true;
scene.add(ground);

// Create cube with colored faces
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterials = [
  new THREE.MeshPhongMaterial({ color: 0xff0000 }), // Right face - Red
  new THREE.MeshPhongMaterial({ color: 0x00ff00 }), // Left face - Green  
  new THREE.MeshPhongMaterial({ color: 0x0000ff }), // Top face - Blue
  new THREE.MeshPhongMaterial({ color: 0xffff00 }), // Bottom face - Yellow
  new THREE.MeshPhongMaterial({ color: 0xff00ff }), // Front face - Magenta
  new THREE.MeshPhongMaterial({ color: 0x00ffff })  // Back face - Cyan
];
const cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
cube.position.set(0, 0.5, 0);
cube.castShadow = true;
scene.add(cube);

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// =============================================================================
// MEDIAPIPE INITIALIZATION
// =============================================================================

function initializeMediaPipe() {
  if (typeof FaceMesh === 'undefined' || typeof Camera === 'undefined') {
    showError('MediaPipe libraries not loaded. Please check your internet connection.');
    return;
  }

  const videoElement = document.getElementById('video');
  const meshCanvas = document.getElementById('mesh-canvas');
  const meshCtx = meshCanvas.getContext('2d');
  
  if (!videoElement || !meshCanvas) {
    showError('Video element or mesh canvas not found');
    return;
  }

  try {
    const faceMesh = new FaceMesh({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }});
    
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => onResults(results, meshCtx, meshCanvas));

    const cameraUtils = new Camera(videoElement, {
      onFrame: async () => { 
        try {
          await faceMesh.send({image: videoElement}); 
        } catch (error) {
          console.error('Error sending frame to FaceMesh:', error);
        }
      },
      width: 640,
      height: 480
    });
    
    cameraUtils.start().catch(error => {
      showError(`Camera error: ${error.message}. Please allow camera access and refresh the page.`);
    });

  } catch (error) {
    showError(`MediaPipe initialization error: ${error.message}`);
  }
}

// =============================================================================
// MAIN FACE PROCESSING
// =============================================================================

function onResults(results, meshCtx, meshCanvas) {
  meshCtx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);
  
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
  
  try {
    const landmarks = results.multiFaceLandmarks[0];
    drawFaceMesh(meshCtx, landmarks, meshCanvas.width, meshCanvas.height);

    // Extract landmarks
    const left = landmarks[234];
    const right = landmarks[454];
    const nose = landmarks[1];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const lipCornerLeft = landmarks[61];
    const lipCornerRight = landmarks[291];
    const leftEyebrowBottom = landmarks[55];
    const rightEyebrowBottom = landmarks[285];
    const headTop = landmarks[10];
    const leftEye = landmarks[33];
    const rightEye = landmarks[362];
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];
    const leftEyeLeft = landmarks[33];
    const leftEyeRight = landmarks[133];
    const rightEyeLeft = landmarks[362];
    const rightEyeRight = landmarks[263];
    const leftEyeInner = landmarks[33];
    const rightEyeInner = landmarks[362];

    if (left && right && nose && upperLip && lowerLip && lipCornerLeft && lipCornerRight && 
        leftEyebrowBottom && rightEyebrowBottom && headTop &&
        leftEye && rightEye && leftEyeTop && leftEyeBottom && rightEyeTop && rightEyeBottom) {
      
      // Improved blink detection
      const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
      const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
      const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
      const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
      const leftEyeRatio = leftEyeHeight / leftEyeWidth;
      const rightEyeRatio = rightEyeHeight / rightEyeWidth;
      
      const leftBlink = leftEyeRatio < BLINK_THRESHOLD;
      const rightBlink = rightEyeRatio < BLINK_THRESHOLD;
      
      // More flexible blink detection: either both eyes blink OR one eye blinks significantly
      const bothEyesBlink = leftBlink && rightBlink;
      const strongSingleBlink = (leftEyeRatio < BLINK_THRESHOLD * 0.8) || (rightEyeRatio < BLINK_THRESHOLD * 0.8);
      const anyBlinkDetected = bothEyesBlink || strongSingleBlink;
      
      // Track previous state for edge detection
      const wasOpen = !lastBlinkState.left && !lastBlinkState.right;
      const nowClosed = anyBlinkDetected;
      const currentTime = Date.now();
      
      // Detect blink: was open, now closed, and enough time has passed
      if (nowClosed && wasOpen && (currentTime - lastBlinkTime) > BLINK_COOLDOWN) {
        createBlinkCircle();
        changePlaneColor();
        lastBlinkTime = currentTime;
        console.log(`Blink detected! L:${leftEyeRatio.toFixed(3)} R:${rightEyeRatio.toFixed(3)}`);
      }
      
      lastBlinkState.left = leftBlink;
      lastBlinkState.right = rightBlink;

      // Head calculations
      const leftRelativeToNose = left.x - nose.x;
      const rightRelativeToNose = right.x - nose.x;
      const leftVerticalToNose = left.y - nose.y;
      const rightVerticalToNose = right.y - nose.y;
      const eyeDeltaX = rightEyeInner.x - leftEyeInner.x;
      const eyeDeltaY = rightEyeInner.y - leftEyeInner.y;
      const rawHeadRollAngle = Math.atan2(eyeDeltaY, eyeDeltaX);
      const rawHeadTurnAngle = (rightRelativeToNose + leftRelativeToNose) / 2;
      const rawHeadTiltAngle = (leftVerticalToNose + rightVerticalToNose) / 2;

      // Mouth calculations
      const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
      const mouthWidth = Math.abs(lipCornerRight.x - lipCornerLeft.x);
      const rawMouthOpen = Math.min(mouthHeight / (mouthWidth * 0.3), 3.0);
      const smoothedMouthOpen = smoothMouthOpening(rawMouthOpen);
      const cubeScale = Math.max(0.3, smoothedMouthOpen);
      const cubeHeight = 0.5 + (smoothedMouthOpen - 1.0) * 2.0; // Base height 0.5, mouth controls additional height

      // Smile detection: mouth corners vs mouth center
      const mouthCenterY = (upperLip.y + lowerLip.y) / 2;
      const leftCornerElevation = mouthCenterY - lipCornerLeft.y; // Positive when corner is above center
      const rightCornerElevation = mouthCenterY - lipCornerRight.y; // Positive when corner is above center
      const avgCornerElevation = (leftCornerElevation + rightCornerElevation) / 2;
      const isSymmetricalSmile = Math.abs(leftCornerElevation - rightCornerElevation) < 0.01;
      
        // Robust eyebrow ratio calculations with pitch compensation
        const eyebrowLeftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const eyebrowRightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
        const avgEyeHeight = (eyebrowLeftEyeHeight + eyebrowRightEyeHeight) / 2;
        
        // Check if eyes are blinking (small eye height indicates blink)
        const eyebrowLeftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
        const eyebrowRightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
        const eyebrowLeftEyeRatio = eyebrowLeftEyeHeight / eyebrowLeftEyeWidth;
        const eyebrowRightEyeRatio = eyebrowRightEyeHeight / eyebrowRightEyeWidth;
        const isBlinking = eyebrowLeftEyeRatio < BLINK_THRESHOLD || eyebrowRightEyeRatio < BLINK_THRESHOLD;
        
        // Simple eyebrow detection: distance from eyebrow to eye lower lid
        const leftEyebrowToLowerLid = Math.abs(leftEyebrowBottom.y - leftEyeBottom.y);
        const rightEyebrowToLowerLid = Math.abs(rightEyebrowBottom.y - rightEyeBottom.y);
        const avgEyebrowToLowerLid = (leftEyebrowToLowerLid + rightEyebrowToLowerLid) / 2;
        
        // Store for eyebrow detection
        var eyebrowDistance = avgEyebrowToLowerLid;

        // Calibration
        if (!isCalibrated) {
          eyebrowReadings.push(eyebrowDistance);
          headTurnReadings.push(rawHeadTurnAngle);
          headTiltReadings.push(rawHeadTiltAngle);
          headRollReadings.push(rawHeadRollAngle);
          
          const statusDiv = document.getElementById('status');
          if (statusDiv) {
            const progress = Math.round((eyebrowReadings.length / CALIBRATION_SAMPLES) * 100);
            statusDiv.textContent = `Calibrating face baseline... ${progress}%`;
          }
          
          if (eyebrowReadings.length >= CALIBRATION_SAMPLES) {
            eyebrowReadings.sort((a, b) => a - b);
            headTurnReadings.sort((a, b) => a - b);
            headTiltReadings.sort((a, b) => a - b);
            headRollReadings.sort((a, b) => a - b);
            
            // Store simple eyebrow baseline
            eyebrowBaselines.average = eyebrowReadings[Math.floor(eyebrowReadings.length / 2)];
            eyebrowBaseline = eyebrowBaselines.average; // Keep for compatibility
            headTurnBaseline = headTurnReadings[Math.floor(headTurnReadings.length / 2)];
            headTiltBaseline = headTiltReadings[Math.floor(headTiltReadings.length / 2)];
            headRollBaseline = headRollReadings[Math.floor(headRollReadings.length / 2)];
            
            isCalibrated = true;
            console.log('Baselines calibrated with simple eyebrow-to-lower-lid distance');
            console.log('Eyebrow baseline distance:', eyebrowBaselines.average);
            
            if (statusDiv) {
              statusDiv.textContent = 'Face baseline calibrated! All systems active.';
              statusDiv.style.color = '#00FF00';
            }
          }
          
          cube.rotation.y = 0;
          cube.rotation.x = 0;
          cube.rotation.z = 0;
          return;
        }      // Apply controls after calibration
      const headTurnAngle = (rawHeadTurnAngle - headTurnBaseline) * Math.PI * 4;
      const rawHeadTiltMovement = (rawHeadTiltAngle - headTiltBaseline) * 20; // Forward/backward movement
      const rawHeadRollMovement = (rawHeadRollAngle - headRollBaseline) * 20; // Left/right movement

      // Apply threshold filters to all head movements
      const filteredHeadTurnAngle = applyTurnThreshold(headTurnAngle);
      const filteredHeadTiltMovement = applyMovementThreshold(rawHeadTiltMovement);
      const filteredHeadRollMovement = applyRollThreshold(rawHeadRollMovement);

      // Apply different acceleration curves for forward/backward vs left/right movement
      const acceleratedTiltMovement = applyAccelerationCurve(filteredHeadTiltMovement);
      const acceleratedRollMovement = applyRollAccelerationCurve(filteredHeadRollMovement);
      const forwardMovement = acceleratedTiltMovement * BASE_MOVEMENT_SPEED * movementSensitivity;
      const rightMovement = -acceleratedRollMovement * BASE_MOVEMENT_SPEED * rollSensitivity;
      
      if (cameraRelativeMovement) {
        // Camera-relative movement: adjust for camera rotation
        const cosRotation = Math.cos(cameraRotationY);
        const sinRotation = Math.sin(cameraRotationY);
        
        // Forward/backward relative to camera direction
        cubeVelocity.z += forwardMovement * cosRotation - rightMovement * sinRotation;
        // Left/right relative to camera direction  
        cubeVelocity.x += forwardMovement * sinRotation + rightMovement * cosRotation;
      } else {
        // World-coordinate movement: original behavior
        cubeVelocity.z += forwardMovement; // Forward/backward in world coordinates
        cubeVelocity.x += rightMovement; // Left/right in world coordinates
      }
      
      // Apply damping to velocity
      cubeVelocity.x *= MOVEMENT_DAMPING;
      cubeVelocity.z *= MOVEMENT_DAMPING;
      
      // Update cube position
      cubePosition.x += cubeVelocity.x;
      cubePosition.z += cubeVelocity.z;
      
      // Apply position to cube
      cube.position.x = cubePosition.x;
      cube.position.z = cubePosition.z;
      cube.position.y = Math.max(0.5, cubeHeight); // Set height based on mouth, minimum 0.5 to stay above ground
      
      // Apply other controls
      const filteredCameraInput = applyTurnThreshold(headTurnAngle);
      
      if (cameraRelativeMovement) {
        // Accumulate camera rotation with acceleration curve
        if (Math.abs(filteredCameraInput) > 0) {
          const acceleratedCameraInput = applyTurnAccelerationCurve(filteredCameraInput);
          const rotationDirection = invertCameraControls ? -1 : 1;
          cameraRotationY += acceleratedCameraInput * CAMERA_ROTATION_SPEED * cameraSensitivity * rotationDirection;
        }
      } else {
        // Direct mapping mode (original behavior) - no acceleration curve for world space
        const cameraRotation = (invertCameraControls ? -filteredCameraInput : filteredCameraInput) * cameraSensitivity;
        cameraRotationY = cameraRotation;
      }
      
      cube.rotation.y = 0; // No cube Y-axis rotation
      cube.rotation.z = 0; // No Z-axis rotation since we use head roll for movement
      cube.scale.setScalar(cubeScale);
      
      // Update camera to follow cube
      updateCameraFollow();
      
      // Simple eyebrow "Wow" detection: only when head is close to calibration pose
      const headTurnDiff = Math.abs(rawHeadTurnAngle - headTurnBaseline);
      const headTiltDiff = Math.abs(rawHeadTiltAngle - headTiltBaseline);
      const headRollDiff = Math.abs(rawHeadRollAngle - headRollBaseline);
      const isHeadNearCalibrationPose = headTurnDiff < HEAD_POSE_TOLERANCE && 
                                       headTiltDiff < HEAD_POSE_TOLERANCE && 
                                       headRollDiff < HEAD_POSE_TOLERANCE;
      
      if (isHeadNearCalibrationPose && eyebrowBaselines.average !== null) {
        // When eyebrows are raised, distance to lower lid gets larger
        const distanceIncrease = eyebrowDistance - eyebrowBaselines.average;
        const currentWowTime = Date.now();
        
        // Only log when close to triggering or when triggered
        if (distanceIncrease > EYEBROW_RATIO_THRESHOLD * 0.7) {
          console.log(`Eyebrow distance increase: ${distanceIncrease.toFixed(4)}, Threshold: ${EYEBROW_RATIO_THRESHOLD}, In pose: ${isHeadNearCalibrationPose}`);
        }
        
        // Simple threshold: if distance increased significantly (eyebrows raised)
        if (distanceIncrease > EYEBROW_RATIO_THRESHOLD && (currentWowTime - lastWowTime) > WOW_COOLDOWN) {
          createWowText();
          lastWowTime = currentWowTime;
          console.log(`WOW! Eyebrows raised! Distance increase: ${distanceIncrease.toFixed(4)}`);
        }
      } else if (eyebrowBaselines.average !== null) {
        // Occasional debug info when not in calibration pose
        if (Math.random() < 0.01) { // Only 1% of frames
          console.log(`Head not in calibration pose - Turn: ${headTurnDiff.toFixed(3)}, Tilt: ${headTiltDiff.toFixed(3)}, Roll: ${headRollDiff.toFixed(3)}`);
        }
      }
      
      // Smile and frown detection with curve updates (only when head is close to calibration pose)
      updateSmileHistory(avgCornerElevation);
      update2DSmileCurve(avgCornerElevation);
      
      if (isHeadNearCalibrationPose) {
        const currentExpressionTime = Date.now();
        
        // Smile detection
        if (avgCornerElevation > SMILE_THRESHOLD && isSymmetricalSmile && (currentExpressionTime - lastSmileTime) > SMILE_COOLDOWN) {
          create2DSmileyFace(); // Show 2D smiley face overlay
          lastSmileTime = currentExpressionTime;
          console.log(`Smile detected! Corner elevation: ${avgCornerElevation.toFixed(4)}`);
        }
        
        // Frown detection
        if (avgCornerElevation < FROWN_THRESHOLD && isSymmetricalSmile && (currentExpressionTime - lastFrownTime) > FROWN_COOLDOWN) {
          create2DFrownFace(); // Show 2D frown face overlay
          lastFrownTime = currentExpressionTime;
          console.log(`Frown detected! Corner depression: ${avgCornerElevation.toFixed(4)}`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing face landmarks:', error);
  }
}

// =============================================================================
// MOVEMENT FILTERING SYSTEM
// =============================================================================

function applyMovementThreshold(rawMovement) {
  // Get absolute movement value
  const absMovement = Math.abs(rawMovement);
  
  // If movement is below threshold, return 0 (no movement)
  if (absMovement < MOVEMENT_THRESHOLD) {
    return 0;
  }
  
  // Apply smooth scaling above threshold to avoid sudden jumps
  const scaledMovement = rawMovement - (Math.sign(rawMovement) * MOVEMENT_THRESHOLD);
  return scaledMovement * THRESHOLD_SMOOTHING;
}

function applyRollThreshold(rawMovement) {
  // Get absolute movement value
  const absMovement = Math.abs(rawMovement);
  
  // If movement is below threshold, return 0 (no movement)
  if (absMovement < ROLL_THRESHOLD) {
    return 0;
  }
  
  // Apply smooth scaling above threshold to avoid sudden jumps
  const scaledMovement = rawMovement - (Math.sign(rawMovement) * ROLL_THRESHOLD);
  return scaledMovement * THRESHOLD_SMOOTHING;
}

function applyTurnThreshold(rawTurn) {
  // Get absolute turn value
  const absTurn = Math.abs(rawTurn);
  
  // If turn is below threshold, return 0 (no camera rotation)
  if (absTurn < TURN_THRESHOLD) {
    return 0;
  }
  
  // Apply smooth scaling above threshold to avoid sudden jumps
  const scaledTurn = rawTurn - (Math.sign(rawTurn) * TURN_THRESHOLD);
  return scaledTurn * THRESHOLD_SMOOTHING;
}

function applyAccelerationCurve(movement) {
  // Apply non-linear acceleration curve: slow near center, fast when tilted far
  const absMovement = Math.abs(movement);
  
  if (absMovement === 0) {
    return 0;
  }
  
  // Gentle acceleration curve: movement^1.2 for subtle acceleration
  // The further from center, the more acceleration applied
  const accelerationFactor = Math.pow(absMovement, 2.5); // Power of 1.2 for gentle, subtle curve
  
  // Preserve the original direction (sign)
  return Math.sign(movement) * accelerationFactor;
}

function applyRollAccelerationCurve(movement) {
  // Apply even gentler acceleration curve for left/right movement
  const absMovement = Math.abs(movement);
  
  if (absMovement === 0) {
    return 0;
  }
  
  // Very gentle curve for roll movement since it's naturally more sensitive
  const accelerationFactor = Math.pow(absMovement, 1.1); // Power of 1.1 for very subtle curve
  
  // Preserve the original direction (sign)
  return Math.sign(movement) * accelerationFactor;
}

function applyTurnAccelerationCurve(movement) {
  // Apply acceleration curve for head turn (camera rotation)
  const absMovement = Math.abs(movement);
  
  if (absMovement === 0) {
    return 0;
  }
  
  // Moderate curve for camera turn - responsive but controlled
  const accelerationFactor = Math.pow(absMovement, 2.0); // Power of 1.3 for camera rotation
  
  // Preserve the original direction (sign)
  return Math.sign(movement) * accelerationFactor;
}

// =============================================================================
// CAMERA FOLLOWING SYSTEM
// =============================================================================

function updateCameraFollow() {
  // Calculate camera position with rotation around the cube
  const rotatedDistance = CAMERA_DISTANCE;
  const targetCameraX = cubePosition.x + Math.sin(cameraRotationY) * rotatedDistance;
  const targetCameraY = CAMERA_HEIGHT;
  const targetCameraZ = cubePosition.z + Math.cos(cameraRotationY) * rotatedDistance;
  
  // Smoothly move camera toward target position
  camera.position.x += (targetCameraX - camera.position.x) * CAMERA_FOLLOW_SPEED;
  camera.position.y += (targetCameraY - camera.position.y) * CAMERA_FOLLOW_SPEED;
  camera.position.z += (targetCameraZ - camera.position.z) * CAMERA_FOLLOW_SPEED;
  
  // Update controls target to look at the cube
  const targetLookX = cubePosition.x;
  const targetLookY = 1; // Look at cube center
  const targetLookZ = cubePosition.z;
  
  controls.target.x += (targetLookX - controls.target.x) * CAMERA_FOLLOW_SPEED;
  controls.target.y += (targetLookY - controls.target.y) * CAMERA_FOLLOW_SPEED;
  controls.target.z += (targetLookZ - controls.target.z) * CAMERA_FOLLOW_SPEED;
}

// =============================================================================
// MOUTH SMOOTHING
// =============================================================================

function smoothMouthOpening(rawMouthValue) {
  mouthOpenHistory.push(rawMouthValue);
  
  if (mouthOpenHistory.length > MOUTH_HISTORY_SIZE) {
    mouthOpenHistory.shift();
  }
  
  const changeFromLast = Math.abs(rawMouthValue - lastSmoothedMouthValue);
  
  if (changeFromLast > MOUTH_CHANGE_THRESHOLD && mouthOpenHistory.length >= 3) {
    const recent = mouthOpenHistory.slice(-3);
    const isConsistent = recent.every(val => 
      Math.abs(val - rawMouthValue) < MOUTH_CHANGE_THRESHOLD * 0.5
    );
    
    if (!isConsistent) {
      const dampingFactor = 0.1;
      return lastSmoothedMouthValue + (rawMouthValue - lastSmoothedMouthValue) * dampingFactor;
    }
  }
  
  const average = mouthOpenHistory.reduce((sum, val) => sum + val, 0) / mouthOpenHistory.length;
  const smoothingFactor = 0.7;
  const smoothedValue = lastSmoothedMouthValue * (1 - smoothingFactor) + average * smoothingFactor;
  
  lastSmoothedMouthValue = smoothedValue;
  return smoothedValue;
}

// =============================================================================
// ROBUST EYEBROW DETECTION SYSTEM
// =============================================================================

function updateEyebrowHistory(leftRatio, rightRatio, avgRatio) {
  // Add current ratios to history
  leftEyebrowRatioHistory.push(leftRatio);
  rightEyebrowRatioHistory.push(rightRatio);
  avgEyebrowRatioHistory.push(avgRatio);
  
  // Maintain history size
  if (leftEyebrowRatioHistory.length > EYEBROW_HISTORY_SIZE) {
    leftEyebrowRatioHistory.shift();
    rightEyebrowRatioHistory.shift();
    avgEyebrowRatioHistory.shift();
  }
}

function calculateEyebrowVelocity() {
  if (avgEyebrowRatioHistory.length < 3) {
    return 0;
  }
  
  // Calculate velocity as rate of change over last few frames
  const recent = avgEyebrowRatioHistory.slice(-3);
  const velocity = recent[recent.length - 1] - recent[0];
  
  return Math.max(0, velocity); // Only positive velocity (eyebrow raising)
}

// =============================================================================
// 2D SMILE CURVE EFFECTS
// =============================================================================

function updateSmileHistory(cornerElevation) {
  smileHistory.push(cornerElevation);
  
  if (smileHistory.length > SMILE_HISTORY_SIZE) {
    smileHistory.shift();
  }
}

function create2DSmileCurveCanvas() {
  // Create 2D canvas overlay for smile curve
  smileCurveCanvas = document.createElement('canvas');
  smileCurveCanvas.width = 220; // Match width of sensitivity control panel
  smileCurveCanvas.height = 80;
  smileCurveCanvas.style.cssText = `
    position: fixed;
    top: 480px;
    left: 10px;
    z-index: 500;
    pointer-events: none;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 8px;
    background: rgba(0,0,0,0.8);
  `;
  
  smileCurveCtx = smileCurveCanvas.getContext('2d');
  document.body.appendChild(smileCurveCanvas);
}

function update2DSmileCurve(smileIntensity) {
  if (!smileCurveCanvas) {
    create2DSmileCurveCanvas();
  }
  
  // Clear canvas
  smileCurveCtx.clearRect(0, 0, smileCurveCanvas.width, smileCurveCanvas.height);
  
  // Draw the curve
  const centerX = smileCurveCanvas.width / 2;
  const centerY = smileCurveCanvas.height / 2;
  const curveWidth = 80; // Adjusted for narrower canvas
  const curveHeight = Math.abs(smileIntensity) * 400; // Scale factor for curve height
  
  smileCurveCtx.beginPath();
  smileCurveCtx.lineWidth = 3;
  
  // Set color based on expression type
  if (smileIntensity > SMILE_THRESHOLD) {
    smileCurveCtx.strokeStyle = '#FF6B6B'; // Red when smiling
  } else if (smileIntensity < FROWN_THRESHOLD) {
    smileCurveCtx.strokeStyle = '#6B6BFF'; // Blue when frowning
  } else {
    smileCurveCtx.strokeStyle = '#00FF88'; // Green when neutral
  }
  
  // Draw curve points
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * 2 - 1; // Range from -1 to 1
    const x = centerX + t * curveWidth;
    
    let y;
    if (smileIntensity > 0) {
      // Positive = smile: curve upward (inverted from 3D since canvas Y is flipped)
      y = centerY - curveHeight * (1 - t * t);
    } else {
      // Negative = frown: curve downward
      y = centerY + curveHeight * (1 - t * t);
    }
    
    if (i === 0) {
      smileCurveCtx.moveTo(x, y);
    } else {
      smileCurveCtx.lineTo(x, y);
    }
  }
  
  smileCurveCtx.stroke();
  
  // Add text label
  smileCurveCtx.fillStyle = '#FFFFFF';
  smileCurveCtx.font = '12px Arial';
  smileCurveCtx.textAlign = 'center';
  smileCurveCtx.fillText('Mouth Expression', centerX, 15);
}

function create2DSmileyFace() {
  // Create HTML overlay smiley face
  const smileyElement = document.createElement('div');
  smileyElement.textContent = '😊';
  smileyElement.style.cssText = `
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 64px;
    z-index: 1000;
    pointer-events: none;
    animation: smileyAnimation 3s ease-out forwards;
  `;
  
  // Add CSS animation keyframes if not already added
  if (!document.getElementById('smiley-animation-style')) {
    const style = document.createElement('style');
    style.id = 'smiley-animation-style';
    style.textContent = `
      @keyframes smileyAnimation {
        0% {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }
        50% {
          transform: translateX(-50%) scale(1.3);
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) scale(0.8) translateY(-30px);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(smileyElement);
  
  // Remove the element after animation completes
  setTimeout(() => {
    if (smileyElement.parentNode) {
      smileyElement.parentNode.removeChild(smileyElement);
    }
  }, 3000);
}

function create2DFrownFace() {
  // Create HTML overlay frown face
  const frownElement = document.createElement('div');
  frownElement.textContent = '☹️';
  frownElement.style.cssText = `
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 64px;
    z-index: 1000;
    pointer-events: none;
    animation: frownAnimation 3s ease-out forwards;
  `;
  
  // Add CSS animation keyframes if not already added
  if (!document.getElementById('frown-animation-style')) {
    const style = document.createElement('style');
    style.id = 'frown-animation-style';
    style.textContent = `
      @keyframes frownAnimation {
        0% {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }
        50% {
          transform: translateX(-50%) scale(1.3);
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) scale(0.8) translateY(-30px);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(frownElement);
  
  // Remove the element after animation completes
  setTimeout(() => {
    if (frownElement.parentNode) {
      frownElement.parentNode.removeChild(frownElement);
    }
  }, 3000);
}

// =============================================================================
// WOW TEXT EFFECTS
// =============================================================================

function createWowText() {
  // Create HTML overlay text instead of 3D text for better visibility
  const wowElement = document.createElement('div');
  wowElement.textContent = 'WOW!';
  wowElement.style.cssText = `
    position: fixed;
    top: 50px;
    left: 50%;
    transform: translateX(-50%);
    font-family: Arial, sans-serif;
    font-size: 48px;
    font-weight: bold;
    color: #${Math.floor(Math.random() * 16777215).toString(16)};
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    z-index: 1000;
    pointer-events: none;
    animation: wowAnimation 2s ease-out forwards;
  `;
  
  // Add CSS animation keyframes if not already added
  if (!document.getElementById('wow-animation-style')) {
    const style = document.createElement('style');
    style.id = 'wow-animation-style';
    style.textContent = `
      @keyframes wowAnimation {
        0% {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }
        50% {
          transform: translateX(-50%) scale(1.2);
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) scale(0.8) translateY(-20px);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(wowElement);
  
  // Remove the element after animation completes
  setTimeout(() => {
    if (wowElement.parentNode) {
      wowElement.parentNode.removeChild(wowElement);
    }
  }, 2000);
}

function updateWowTexts() {
  // No longer needed since we're using HTML overlay
  // Keeping function for compatibility
}

function changePlaneColor() {
  // Generate a random color
  const randomColor = Math.random() * 0xffffff;
  
  // Change the ground plane material color
  ground.material.color.setHex(randomColor);
  
  console.log(`Plane color changed to: #${randomColor.toString(16).padStart(6, '0')}`);
}

function createBlinkCircle() {
  const circle = {
    geometry: new THREE.CircleGeometry(0.1, 32),
    material: new THREE.MeshBasicMaterial({ 
      color: Math.random() * 0xffffff,
      transparent: true,
      opacity: 1.0
    }),
    position: {
      x: (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 2
    },
    age: 0,
    maxAge: 180
  };
  
  circle.mesh = new THREE.Mesh(circle.geometry, circle.material);
  circle.mesh.position.set(circle.position.x, circle.position.y, circle.position.z);
  scene.add(circle.mesh);
  
  blinkCircles.push(circle);
}

function updateBlinkCircles() {
  for (let i = blinkCircles.length - 1; i >= 0; i--) {
    const circle = blinkCircles[i];
    circle.age++;
    
    const fadeProgress = circle.age / circle.maxAge;
    circle.material.opacity = Math.max(0, 1 - fadeProgress);
    circle.mesh.position.y += 0.005;
    
    if (circle.age >= circle.maxAge) {
      scene.remove(circle.mesh);
      circle.geometry.dispose();
      circle.material.dispose();
      blinkCircles.splice(i, 1);
    }
  }
}

// =============================================================================
// FACE MESH VISUALIZATION
// =============================================================================

function drawFaceMesh(ctx, landmarks, width, height) {
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#FF0000';

  // Draw all landmarks as points
  for (let i = 0; i < landmarks.length; i++) {
    const x = landmarks[i].x * width;
    const y = landmarks[i].y * height;
    
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw face contour
  const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
  
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < faceOval.length - 1; i++) {
    const point1 = landmarks[faceOval[i]];
    const point2 = landmarks[faceOval[i + 1]];
    
    if (point1 && point2) {
      if (i === 0) {
        ctx.moveTo(point1.x * width, point1.y * height);
      }
      ctx.lineTo(point2.x * width, point2.y * height);
    }
  }
  ctx.stroke();

  // Draw eyes, lips, eyebrows
  const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33];
  const rightEye = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362];
  
  [leftEye, rightEye].forEach(eye => {
    ctx.beginPath();
    for (let i = 0; i < eye.length - 1; i++) {
      const point1 = landmarks[eye[i]];
      const point2 = landmarks[eye[i + 1]];
      
      if (point1 && point2) {
        if (i === 0) {
          ctx.moveTo(point1.x * width, point1.y * height);
        }
        ctx.lineTo(point2.x * width, point2.y * height);
      }
    }
    ctx.stroke();
  });

  // Draw lips
  const lips = [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 375, 321, 308, 324, 318, 61];
  
  ctx.beginPath();
  for (let i = 0; i < lips.length - 1; i++) {
    const point1 = landmarks[lips[i]];
    const point2 = landmarks[lips[i + 1]];
    
    if (point1 && point2) {
      if (i === 0) {
        ctx.moveTo(point1.x * width, point1.y * height);
      }
      ctx.lineTo(point2.x * width, point2.y * height);
    }
  }
  ctx.stroke();

  // Draw eyebrows
  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = 2;
  
  const leftEyebrow = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
  const rightEyebrow = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
  
  [leftEyebrow, rightEyebrow].forEach(eyebrow => {
    ctx.beginPath();
    for (let i = 0; i < eyebrow.length - 1; i++) {
      const point1 = landmarks[eyebrow[i]];
      const point2 = landmarks[eyebrow[i + 1]];
      
      if (point1 && point2) {
        if (i === 0) {
          ctx.moveTo(point1.x * width, point1.y * height);
        }
        ctx.lineTo(point2.x * width, point2.y * height);
      }
    }
    ctx.stroke();
  });

  // Highlight tracking points
  ctx.fillStyle = '#FFFF00';
  const headTrackingPoints = [1, 234, 454];
  headTrackingPoints.forEach(pointIndex => {
    const point = landmarks[pointIndex];
    if (point) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  ctx.fillStyle = '#FF00FF';
  const mouthTrackingPoints = [13, 14, 61, 291];
  mouthTrackingPoints.forEach(pointIndex => {
    const point = landmarks[pointIndex];
    if (point) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  ctx.fillStyle = '#00FF88';
  const eyebrowTrackingPoints = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
  eyebrowTrackingPoints.forEach(pointIndex => {
    const point = landmarks[pointIndex];
    if (point) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

// =============================================================================
// ANIMATION AND RENDERING
// =============================================================================

function animate() {
  requestAnimationFrame(animate);
  updateBlinkCircles();
  
  // Update cube movement even when no face is detected (maintains momentum)
  if (isCalibrated) {
    cubeVelocity.x *= MOVEMENT_DAMPING;
    cubeVelocity.z *= MOVEMENT_DAMPING;
    
    cubePosition.x += cubeVelocity.x;
    cubePosition.z += cubeVelocity.z;
    
    cube.position.x = cubePosition.x;
    cube.position.z = cubePosition.z;
    
    updateCameraFollow();
  }
  
  controls.update();
  renderer.render(scene, camera);
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

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
    // Update forward/back sensitivity when slider changes
    sensitivitySlider.addEventListener('input', (event) => {
      movementSensitivity = parseFloat(event.target.value);
      sensitivityValue.textContent = `${movementSensitivity.toFixed(1)}x`;
      console.log(`Forward/Back sensitivity updated to: ${movementSensitivity}x`);
    });
    
    // Initialize display
    sensitivityValue.textContent = `${movementSensitivity.toFixed(1)}x`;
  }
  
  if (rollSensitivitySlider && rollSensitivityValue) {
    // Update left/right sensitivity when slider changes
    rollSensitivitySlider.addEventListener('input', (event) => {
      rollSensitivity = parseFloat(event.target.value);
      rollSensitivityValue.textContent = `${rollSensitivity.toFixed(2)}x`;
      console.log(`Left/Right sensitivity updated to: ${rollSensitivity}x`);
    });
    
    // Initialize display
    rollSensitivityValue.textContent = `${rollSensitivity.toFixed(2)}x`;
  }
  
  if (cameraSensitivitySlider && cameraSensitivityValue) {
    // Update camera sensitivity when slider changes
    cameraSensitivitySlider.addEventListener('input', (event) => {
      cameraSensitivity = parseFloat(event.target.value);
      cameraSensitivityValue.textContent = `${cameraSensitivity.toFixed(1)}x`;
      console.log(`Camera sensitivity updated to: ${cameraSensitivity}x`);
    });
    
    // Initialize display
    cameraSensitivityValue.textContent = `${cameraSensitivity.toFixed(1)}x`;
  }
  
  if (invertCameraToggle) {
    // Update camera invert setting when toggle changes
    invertCameraToggle.addEventListener('change', (event) => {
      invertCameraControls = event.target.checked;
      console.log(`Camera controls inverted: ${invertCameraControls}`);
    });
    
    // Initialize state
    invertCameraToggle.checked = invertCameraControls;
  }
  
  if (cameraRelativeToggle) {
    // Update camera-relative movement setting when toggle changes
    cameraRelativeToggle.addEventListener('change', (event) => {
      cameraRelativeMovement = event.target.checked;
      console.log(`Camera-relative movement: ${cameraRelativeMovement}`);
      
      // Set different default camera sensitivity based on mode
      if (cameraRelativeMovement) {
        cameraSensitivity = 2.0; // Higher sensitivity for camera-relative mode
      } else {
        cameraSensitivity = 1.5; // Lower sensitivity for world coordinate mode
      }
      
      // Update the UI slider and display
      const cameraSensitivitySlider = document.getElementById('camera-sensitivity-slider');
      const cameraSensitivityValue = document.getElementById('camera-sensitivity-value');
      if (cameraSensitivitySlider) {
        cameraSensitivitySlider.value = cameraSensitivity;
      }
      if (cameraSensitivityValue) {
        cameraSensitivityValue.textContent = `${cameraSensitivity.toFixed(1)}x`;
      }
      
      console.log(`Camera sensitivity updated to: ${cameraSensitivity}x for ${cameraRelativeMovement ? 'camera-relative' : 'world coordinate'} mode`);
      
      // Reset camera rotation when switching modes to avoid confusion
      if (!cameraRelativeMovement) {
        cameraRotationY = 0;
      }
    });
    
    // Initialize state
    cameraRelativeToggle.checked = cameraRelativeMovement;
  }
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

animate();

// Initialize sensitivity controls
initializeSensitivityControls();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMediaPipe);
} else {
  setTimeout(initializeMediaPipe, 100);
}