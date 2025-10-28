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
let cameraSensitivity = 1.0; // User-adjustable sensitivity for camera rotation (default 1.0x)
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

// =============================================================================
// BLINK DETECTION SYSTEM
// =============================================================================

// Blink detection variables
let blinkCircles = []; // Array to store blink-triggered circles
let lastBlinkState = { left: false, right: false };
let lastBlinkTime = 0;
const BLINK_THRESHOLD = 0.25;
const BLINK_COOLDOWN = 150;

// =============================================================================
// MOUTH SMOOTHING SYSTEM
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
      
      // Blink detection
      const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
      const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
      const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
      const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
      const leftEyeRatio = leftEyeHeight / leftEyeWidth;
      const rightEyeRatio = rightEyeHeight / rightEyeWidth;
      
      const leftBlink = leftEyeRatio < BLINK_THRESHOLD;
      const rightBlink = rightEyeRatio < BLINK_THRESHOLD;
      const bothEyesBlink = leftBlink && rightBlink;
      
      const wasOpen = !lastBlinkState.left && !lastBlinkState.right;
      const nowClosed = bothEyesBlink;
      const currentTime = Date.now();
      
      if (nowClosed && wasOpen && (currentTime - lastBlinkTime) > BLINK_COOLDOWN) {
        createBlinkCircle();
        lastBlinkTime = currentTime;
        console.log('Blink detected!');
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

      // Eyebrow calculations
      const eyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) + 
        Math.pow(rightEye.y - leftEye.y, 2)
      );
      const leftEyebrowToHead = Math.abs(leftEyebrowBottom.y - headTop.y) / eyeDistance;
      const rightEyebrowToHead = Math.abs(rightEyebrowBottom.y - headTop.y) / eyeDistance;
      const avgEyebrowToHead = (leftEyebrowToHead + rightEyebrowToHead) / 2;
      
      // Calibration
      if (!isCalibrated) {
        eyebrowReadings.push(avgEyebrowToHead);
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
          
          eyebrowBaseline = eyebrowReadings[Math.floor(eyebrowReadings.length / 2)];
          headTurnBaseline = headTurnReadings[Math.floor(headTurnReadings.length / 2)];
          headTiltBaseline = headTiltReadings[Math.floor(headTiltReadings.length / 2)];
          headRollBaseline = headRollReadings[Math.floor(headRollReadings.length / 2)];
          
          isCalibrated = true;
          console.log('Baselines calibrated');
          
          if (statusDiv) {
            statusDiv.textContent = 'Face baseline calibrated! All systems active.';
            statusDiv.style.color = '#00FF00';
          }
        }
        
        cube.rotation.y = 0;
        cube.rotation.x = 0;
        cube.rotation.z = 0;
        cube.material.forEach(mat => {
          mat.wireframe = false;
        });
        return;
      }
      
      // Apply controls after calibration
      const headTurnAngle = (rawHeadTurnAngle - headTurnBaseline) * Math.PI * 4;
      const rawHeadTiltMovement = (rawHeadTiltAngle - headTiltBaseline) * 20; // Forward/backward movement
      const rawHeadRollMovement = (rawHeadRollAngle - headRollBaseline) * 20; // Left/right movement

      // Apply threshold filters to all head movements
      const filteredHeadTurnAngle = applyTurnThreshold(headTurnAngle);
      const filteredHeadTiltMovement = applyMovementThreshold(rawHeadTiltMovement);
      const filteredHeadRollMovement = applyRollThreshold(rawHeadRollMovement);

      // Update cube movement based on filtered head movements
      cubeVelocity.z += filteredHeadTiltMovement * BASE_MOVEMENT_SPEED * movementSensitivity; // Forward/backward
      cubeVelocity.x -= filteredHeadRollMovement * BASE_MOVEMENT_SPEED * rollSensitivity; // Left/right (reversed)
      
      // Apply damping to velocity
      cubeVelocity.x *= MOVEMENT_DAMPING;
      cubeVelocity.z *= MOVEMENT_DAMPING;
      
      // Update cube position
      cubePosition.x += cubeVelocity.x;
      cubePosition.z += cubeVelocity.z;
      
      // Apply position to cube
      cube.position.x = cubePosition.x;
      cube.position.z = cubePosition.z;
      
      // Apply other controls
      const cameraRotation = (invertCameraControls ? -filteredHeadTurnAngle : filteredHeadTurnAngle) * cameraSensitivity;
      cameraRotationY = cameraRotation; // Apply filtered head turn to camera rotation
      cube.rotation.y = 0; // No cube Y-axis rotation
      cube.rotation.z = 0; // No Z-axis rotation since we use head roll for movement
      cube.scale.setScalar(cubeScale);
      
      // Update camera to follow cube
      updateCameraFollow();
      
      // Eyebrow wireframe control
      const eyebrowMovement = eyebrowBaseline - avgEyebrowToHead;
      const eyebrowAsymmetry = Math.abs(leftEyebrowToHead - rightEyebrowToHead);
      const isSymmetrical = eyebrowAsymmetry < 0.3;
      const eyebrowIntensity = Math.max(0, Math.min(eyebrowMovement * 50, 1.0));
      
      if (eyebrowIntensity > 0.91 && isSymmetrical) {
        cube.material.forEach(mat => {
          mat.wireframe = true;
        });
      } else {
        cube.material.forEach(mat => {
          mat.wireframe = false;
        });
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
// BLINK CIRCLE EFFECTS
// =============================================================================

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