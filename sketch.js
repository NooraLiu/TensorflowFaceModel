import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function showError(message) {
  console.error(message);
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// =============================================================================
// THREE.JS SETUP
// =============================================================================

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 2;

// Renderer setup
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

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

const CALIBRATION_SAMPLES = 30; // Number of samples for baseline
let isCalibrated = false;

// =============================================================================
// BLINK DETECTION SYSTEM
// =============================================================================

// Blink detection variables
let blinkCircles = []; // Array to store blink-triggered circles
let lastBlinkState = { left: false, right: false }; // Track previous blink state
let lastBlinkTime = 0; // Track when last blink was detected
const BLINK_THRESHOLD = 0.25; // Eye aspect ratio threshold for blink detection (height/width)
const BLINK_COOLDOWN = 150; // Minimum milliseconds between blink detections

// =============================================================================
// 3D CUBE SETUP
// =============================================================================

// Create cube geometry
const geometry = new THREE.BoxGeometry();

// Create materials for each face of the cube with distinct colors
const materials = [
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // Right face - Red
  new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // Left face - Green  
  new THREE.MeshBasicMaterial({ color: 0x0000ff }), // Top face - Blue
  new THREE.MeshBasicMaterial({ color: 0xffff00 }), // Bottom face - Yellow
  new THREE.MeshBasicMaterial({ color: 0xff00ff }), // Front face - Magenta
  new THREE.MeshBasicMaterial({ color: 0x00ffff })  // Back face - Cyan
];

// Create cube mesh and add to scene
const cube = new THREE.Mesh(geometry, materials);
scene.add(cube);

// Add directional lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1,1,1);
scene.add(light);

// =============================================================================
// MEDIAPIPE INITIALIZATION
// =============================================================================

function initializeMediaPipe() {
  // Check if MediaPipe libraries are loaded
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
    // Configure MediaPipe FaceMesh
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

    // Initialize camera
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
// MAIN FACE PROCESSING FUNCTION
// =============================================================================

function onResults(results, meshCtx, meshCanvas) {
  // Clear the canvas
  meshCtx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);
  
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
  
  try {
    const landmarks = results.multiFaceLandmarks[0];

    // Draw face mesh visualization
    drawFaceMesh(meshCtx, landmarks, meshCanvas.width, meshCanvas.height);

    // Extract key facial landmarks
    const landmarkData = extractLandmarks(landmarks);
    
    if (!landmarkData) return;
    
    // Perform blink detection
    detectBlinks(landmarkData);
    
    // Handle calibration phase
    if (!isCalibrated) {
      handleCalibration(landmarkData);
      return;
    }
    
    // Apply face-controlled movements to cube
    applyHeadMovements(landmarkData);
    applyMouthControl(landmarkData);
    applyEyebrowControl(landmarkData);
    
  } catch (error) {
    console.error('Error processing face landmarks:', error);
  }
}

// =============================================================================
// LANDMARK EXTRACTION
// =============================================================================

function extractLandmarks(landmarks) {
  // Face orientation points
  const left = landmarks[234];
  const right = landmarks[454];
  const nose = landmarks[1];

  // Mouth points
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];
  const lipCornerLeft = landmarks[61];
  const lipCornerRight = landmarks[291];

  // Eyebrow points
  const leftEyebrowBottom = landmarks[55];
  const rightEyebrowBottom = landmarks[285];
  const headTop = landmarks[10];
  
  // Eye reference points
  const leftEye = landmarks[33];
  const rightEye = landmarks[362];

  // Blink detection points
  const leftEyeTop = landmarks[159];
  const leftEyeBottom = landmarks[145];
  const rightEyeTop = landmarks[386];
  const rightEyeBottom = landmarks[374];
  
  // Eye width points
  const leftEyeLeft = landmarks[33];
  const leftEyeRight = landmarks[133];
  const rightEyeLeft = landmarks[362];
  const rightEyeRight = landmarks[263];
  
  // Head roll detection points
  const leftEyeInner = landmarks[33];
  const rightEyeInner = landmarks[362];

  // Check if all required landmarks are available
  const requiredPoints = [
    left, right, nose, upperLip, lowerLip, lipCornerLeft, lipCornerRight,
    leftEyebrowBottom, rightEyebrowBottom, headTop, leftEye, rightEye,
    leftEyeTop, leftEyeBottom, rightEyeTop, rightEyeBottom,
    leftEyeLeft, leftEyeRight, rightEyeLeft, rightEyeRight,
    leftEyeInner, rightEyeInner
  ];
  
  if (requiredPoints.some(point => !point)) {
    return null;
  }
  
  return {
    face: { left, right, nose },
    mouth: { upperLip, lowerLip, lipCornerLeft, lipCornerRight },
    eyebrows: { leftEyebrowBottom, rightEyebrowBottom, headTop },
    eyes: {
      reference: { leftEye, rightEye },
      blink: {
        leftTop: leftEyeTop, leftBottom: leftEyeBottom,
        rightTop: rightEyeTop, rightBottom: rightEyeBottom
      },
      width: {
        leftLeft: leftEyeLeft, leftRight: leftEyeRight,
        rightLeft: rightEyeLeft, rightRight: rightEyeRight
      },
      inner: { leftEyeInner, rightEyeInner }
    }
  };
}

// =============================================================================
// BLINK DETECTION
// =============================================================================

function detectBlinks(landmarkData) {
  const { eyes } = landmarkData;
  
  // Calculate eye heights
  const leftEyeHeight = Math.abs(eyes.blink.leftTop.y - eyes.blink.leftBottom.y);
  const rightEyeHeight = Math.abs(eyes.blink.rightTop.y - eyes.blink.rightBottom.y);
  
  // Calculate eye widths
  const leftEyeWidth = Math.abs(eyes.width.leftRight.x - eyes.width.leftLeft.x);
  const rightEyeWidth = Math.abs(eyes.width.rightRight.x - eyes.width.rightLeft.x);
  
  // Calculate eye aspect ratios (height/width)
  const leftEyeRatio = leftEyeHeight / leftEyeWidth;
  const rightEyeRatio = rightEyeHeight / rightEyeWidth;
  
  // Detect blinks when both eyes close
  const leftBlink = leftEyeRatio < BLINK_THRESHOLD;
  const rightBlink = rightEyeRatio < BLINK_THRESHOLD;
  const bothEyesBlink = leftBlink && rightBlink;
  
  // Trigger only on transition from open to closed
  const wasOpen = !lastBlinkState.left && !lastBlinkState.right;
  const nowClosed = bothEyesBlink;
  const currentTime = Date.now();
  
  if (nowClosed && wasOpen && (currentTime - lastBlinkTime) > BLINK_COOLDOWN) {
    createBlinkCircle();
    lastBlinkTime = currentTime;
    console.log('Blink detected! L:', leftEyeRatio.toFixed(3), 'R:', rightEyeRatio.toFixed(3));
  }
  
  // Update state for next frame
  lastBlinkState.left = leftBlink;
  lastBlinkState.right = rightBlink;
}

// =============================================================================
// CALIBRATION SYSTEM
// =============================================================================

function handleCalibration(landmarkData) {
  const { face, eyebrows, eyes } = landmarkData;
  
  // Calculate baseline measurements
  const eyeDistance = Math.sqrt(
    Math.pow(eyes.reference.rightEye.x - eyes.reference.leftEye.x, 2) + 
    Math.pow(eyes.reference.rightEye.y - eyes.reference.leftEye.y, 2)
  );
  
  const leftEyebrowToHead = Math.abs(eyebrows.leftEyebrowBottom.y - eyebrows.headTop.y) / eyeDistance;
  const rightEyebrowToHead = Math.abs(eyebrows.rightEyebrowBottom.y - eyebrows.headTop.y) / eyeDistance;
  const avgEyebrowToHead = (leftEyebrowToHead + rightEyebrowToHead) / 2;
  
  // Head angle calculations
  const leftRelativeToNose = face.left.x - face.nose.x;
  const rightRelativeToNose = face.right.x - face.nose.x;
  const leftVerticalToNose = face.left.y - face.nose.y;
  const rightVerticalToNose = face.right.y - face.nose.y;
  
  const rawHeadTurnAngle = (rightRelativeToNose + leftRelativeToNose) / 2;
  const rawHeadTiltAngle = (leftVerticalToNose + rightVerticalToNose) / 2;
  
  const eyeDeltaX = eyes.inner.rightEyeInner.x - eyes.inner.leftEyeInner.x;
  const eyeDeltaY = eyes.inner.rightEyeInner.y - eyes.inner.leftEyeInner.y;
  const rawHeadRollAngle = Math.atan2(eyeDeltaY, eyeDeltaX);
  
  // Collect calibration samples
  eyebrowReadings.push(avgEyebrowToHead);
  headTurnReadings.push(rawHeadTurnAngle);
  headTiltReadings.push(rawHeadTiltAngle);
  headRollReadings.push(rawHeadRollAngle);
  
  // Update calibration progress
  const statusDiv = document.getElementById('calibration-status');
  if (statusDiv) {
    const progress = Math.round((eyebrowReadings.length / CALIBRATION_SAMPLES) * 100);
    statusDiv.textContent = `Calibrating face baseline... ${progress}%`;
  }
  
  // Complete calibration when enough samples collected
  if (eyebrowReadings.length >= CALIBRATION_SAMPLES) {
    // Use median of readings for stable baseline
    eyebrowReadings.sort((a, b) => a - b);
    headTurnReadings.sort((a, b) => a - b);
    headTiltReadings.sort((a, b) => a - b);
    headRollReadings.sort((a, b) => a - b);
    
    eyebrowBaseline = eyebrowReadings[Math.floor(eyebrowReadings.length / 2)];
    headTurnBaseline = headTurnReadings[Math.floor(headTurnReadings.length / 2)];
    headTiltBaseline = headTiltReadings[Math.floor(headTiltReadings.length / 2)];
    headRollBaseline = headRollReadings[Math.floor(headRollReadings.length / 2)];
    
    isCalibrated = true;
    console.log('Baselines calibrated:', {
      eyebrow: eyebrowBaseline,
      headTurn: headTurnBaseline,
      headTilt: headTiltBaseline,
      headRoll: headRollBaseline
    });
    
    // Update UI to show calibration complete
    if (statusDiv) {
      statusDiv.textContent = 'Face baseline calibrated!';
      statusDiv.style.color = '#00FF00';
    }
  }
  
  // Keep cube neutral during calibration
  cube.rotation.y = 0;
  cube.rotation.x = 0;
  cube.rotation.z = 0;
  cube.material.forEach(mat => {
    mat.wireframe = false;
  });
}

// =============================================================================
// HEAD MOVEMENT DETECTION AND CONTROL
// =============================================================================

function applyHeadMovements(landmarkData) {
  const { face, eyes } = landmarkData;
  
  // Calculate raw head angles
  const leftRelativeToNose = face.left.x - face.nose.x;
  const rightRelativeToNose = face.right.x - face.nose.x;
  const leftVerticalToNose = face.left.y - face.nose.y;
  const rightVerticalToNose = face.right.y - face.nose.y;
  
  const rawHeadTurnAngle = (rightRelativeToNose + leftRelativeToNose) / 2;
  const rawHeadTiltAngle = (leftVerticalToNose + rightVerticalToNose) / 2;
  
  // Head roll detection using eye positions
  const eyeDeltaX = eyes.inner.rightEyeInner.x - eyes.inner.leftEyeInner.x;
  const eyeDeltaY = eyes.inner.rightEyeInner.y - eyes.inner.leftEyeInner.y;
  const rawHeadRollAngle = Math.atan2(eyeDeltaY, eyeDeltaX);
  
  // Calculate relative movements from calibrated baselines
  const headTurnAngle = (rawHeadTurnAngle - headTurnBaseline) * Math.PI * 4;
  const headTiltAngle = (rawHeadTiltAngle - headTiltBaseline) * Math.PI * 4;
  const headRollAngle = (rawHeadRollAngle - headRollBaseline) * 2;
  
  // Apply rotations to cube
  cube.rotation.y = headTurnAngle; // Left/right head turn
  cube.rotation.x = headTiltAngle; // Up/down head tilt
  cube.rotation.z = headRollAngle; // Side-to-side head roll
}

// =============================================================================
// MOUTH CONTROL (SCALING)
// =============================================================================

function applyMouthControl(landmarkData) {
  const { mouth } = landmarkData;
  
  // Calculate mouth dimensions
  const mouthHeight = Math.abs(mouth.lowerLip.y - mouth.upperLip.y);
  const mouthWidth = Math.abs(mouth.lipCornerRight.x - mouth.lipCornerLeft.x);
  
  // Normalize mouth openness and apply to cube scale
  const normalizedMouthOpen = Math.min(mouthHeight / (mouthWidth * 0.3), 3.0);
  const cubeScale = Math.max(0.3, normalizedMouthOpen);
  
  cube.scale.setScalar(cubeScale);
}

// =============================================================================
// EYEBROW CONTROL (WIREFRAME MODE)
// =============================================================================

function applyEyebrowControl(landmarkData) {
  const { eyebrows, eyes } = landmarkData;
  
  // Calculate normalized eyebrow distance
  const eyeDistance = Math.sqrt(
    Math.pow(eyes.reference.rightEye.x - eyes.reference.leftEye.x, 2) + 
    Math.pow(eyes.reference.rightEye.y - eyes.reference.leftEye.y, 2)
  );
  
  const leftEyebrowToHead = Math.abs(eyebrows.leftEyebrowBottom.y - eyebrows.headTop.y) / eyeDistance;
  const rightEyebrowToHead = Math.abs(eyebrows.rightEyebrowBottom.y - eyebrows.headTop.y) / eyeDistance;
  const avgEyebrowToHead = (leftEyebrowToHead + rightEyebrowToHead) / 2;
  
  // Calculate relative eyebrow movement from baseline
  const eyebrowMovement = eyebrowBaseline - avgEyebrowToHead;
  
  // Check for symmetrical eyebrow movement (filter out head tilts)
  const eyebrowAsymmetry = Math.abs(leftEyebrowToHead - rightEyebrowToHead);
  const isSymmetrical = eyebrowAsymmetry < 0.3;
  
  const eyebrowIntensity = Math.max(0, Math.min(eyebrowMovement * 50, 1.0));
  
  // Control wireframe mode based on eyebrow raises
  if (eyebrowIntensity > 0.91 && isSymmetrical) {
    // Eyebrows raised symmetrically - enable wireframe
    cube.material.forEach(mat => {
      mat.wireframe = true;
    });
  } else {
    // Normal state - solid colored faces
    cube.material.forEach(mat => {
      mat.wireframe = false;
    });
  }
}

// =============================================================================
// BLINK CIRCLE EFFECTS
// =============================================================================

function createBlinkCircle() {
  // Create a new circle with random properties
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
    maxAge: 180 // Fade out over 3 seconds (60fps * 3)
  };
  
  // Create mesh and add to scene
  circle.mesh = new THREE.Mesh(circle.geometry, circle.material);
  circle.mesh.position.set(circle.position.x, circle.position.y, circle.position.z);
  scene.add(circle.mesh);
  
  // Add to tracking array
  blinkCircles.push(circle);
  
  console.log('Blink detected! Circle created at:', circle.position);
}

function updateBlinkCircles() {
  // Update all blink circles
  for (let i = blinkCircles.length - 1; i >= 0; i--) {
    const circle = blinkCircles[i];
    circle.age++;
    
    // Fade out over time
    const fadeProgress = circle.age / circle.maxAge;
    circle.material.opacity = Math.max(0, 1 - fadeProgress);
    
    // Make circles slowly rise
    circle.mesh.position.y += 0.005;
    
    // Remove when fully faded
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
  // Set basic drawing styles
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#FF0000';

  // Draw all landmarks as small points
  for (let i = 0; i < landmarks.length; i++) {
    const x = landmarks[i].x * width;
    const y = landmarks[i].y * height;
    
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw face contour
  drawFaceContour(ctx, landmarks, width, height);
  
  // Draw eye contours
  drawEyeContours(ctx, landmarks, width, height);
  
  // Draw lip contour
  drawLipContour(ctx, landmarks, width, height);
  
  // Draw eyebrow contours
  drawEyebrowContours(ctx, landmarks, width, height);
  
  // Highlight key tracking points
  highlightTrackingPoints(ctx, landmarks, width, height);
}

function drawFaceContour(ctx, landmarks, width, height) {
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 1;
  
  const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 
                    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 
                    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
  
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
}

function drawEyeContours(ctx, landmarks, width, height) {
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 1;
  
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
}

function drawLipContour(ctx, landmarks, width, height) {
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 1;
  
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
}

function drawEyebrowContours(ctx, landmarks, width, height) {
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
}

function highlightTrackingPoints(ctx, landmarks, width, height) {
  // Highlight head tracking points (yellow)
  ctx.fillStyle = '#FFFF00';
  const headTrackingPoints = [1, 234, 454]; // nose, left face, right face
  headTrackingPoints.forEach(pointIndex => {
    const point = landmarks[pointIndex];
    if (point) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  // Highlight mouth tracking points (magenta)
  ctx.fillStyle = '#FF00FF';
  const mouthTrackingPoints = [13, 14, 61, 291]; // upper lip, lower lip, left corner, right corner
  mouthTrackingPoints.forEach(pointIndex => {
    const point = landmarks[pointIndex];
    if (point) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  // Highlight eyebrow tracking points (green-cyan)
  ctx.fillStyle = '#00FF88';
  const eyebrowTrackingPoints = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 
                                 300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
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
  updateBlinkCircles(); // Update blink circles each frame
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
// APPLICATION INITIALIZATION
// =============================================================================

// Start animation loop
animate();

// Initialize MediaPipe when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMediaPipe);
} else {
  // DOM is already ready, small delay to ensure scripts are loaded
  setTimeout(initializeMediaPipe, 100);
}
