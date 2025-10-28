import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Error handling function
function showError(message) {
  console.error(message);
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

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

// Blink detection variables
let blinkCircles = []; // Array to store blink-triggered circles
let lastBlinkState = { left: false, right: false }; // Track previous blink state
let lastBlinkTime = 0; // Track when last blink was detected
const BLINK_THRESHOLD = 0.25; // Eye aspect ratio threshold for blink detection (height/width)
const BLINK_COOLDOWN = 150; // Minimum milliseconds between blink detections (increased)

// Add cube with different colors on each face
const geometry = new THREE.BoxGeometry();

// Create materials for each face of the cube
const materials = [
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // Right face - Red
  new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // Left face - Green  
  new THREE.MeshBasicMaterial({ color: 0x0000ff }), // Top face - Blue
  new THREE.MeshBasicMaterial({ color: 0xffff00 }), // Bottom face - Yellow
  new THREE.MeshBasicMaterial({ color: 0xff00ff }), // Front face - Magenta
  new THREE.MeshBasicMaterial({ color: 0x00ffff })  // Back face - Cyan
];

const cube = new THREE.Mesh(geometry, materials);
scene.add(cube);

// Lighting (optional)
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1,1,1);
scene.add(light);

// Wait for MediaPipe to load and initialize
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
    // MediaPipe FaceMesh setup
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

    // Start camera
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

// Handle face mesh results
function onResults(results, meshCtx, meshCanvas) {
  // Clear the canvas
  meshCtx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);
  
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
  
  try {
    const landmarks = results.multiFaceLandmarks[0];

    // Draw face mesh
    drawFaceMesh(meshCtx, landmarks, meshCanvas.width, meshCanvas.height);

    // Simple head yaw estimation for cube control
    const left = landmarks[234];  // approximate left side of face
    const right = landmarks[454]; // approximate right side of face
    const nose = landmarks[1];    // nose tip

    // Mouth openness detection
    const upperLip = landmarks[13];   // upper lip center
    const lowerLip = landmarks[14];   // lower lip center
    const lipCornerLeft = landmarks[61];  // left corner of mouth
    const lipCornerRight = landmarks[291]; // right corner of mouth

    // Eyebrow position detection (distance from eyebrow bottom to head top)
    const leftEyebrowBottom = landmarks[55];  // left eyebrow bottom edge
    const rightEyebrowBottom = landmarks[285]; // right eyebrow bottom edge  
    const headTop = landmarks[10];            // top of the head/forehead
    
    // Get reference points for head orientation normalization
    const leftEye = landmarks[33];   // left eye inner corner
    const rightEye = landmarks[362]; // right eye inner corner

    // Blink detection using eye landmarks
    const leftEyeTop = landmarks[159];    // left eye top
    const leftEyeBottom = landmarks[145]; // left eye bottom
    const rightEyeTop = landmarks[386];   // right eye top
    const rightEyeBottom = landmarks[374]; // right eye bottom

    if (left && right && nose && upperLip && lowerLip && lipCornerLeft && lipCornerRight && 
        leftEyebrowBottom && rightEyebrowBottom && headTop &&
        leftEye && rightEye && leftEyeTop && leftEyeBottom && rightEyeTop && rightEyeBottom) {
      
      // Calculate eye aspect ratios for blink detection
      const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
      const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
      
      // Calculate individual eye widths for proper aspect ratios
      const leftEyeLeft = landmarks[33];   // left eye inner corner
      const leftEyeRight = landmarks[133]; // left eye outer corner
      const rightEyeLeft = landmarks[362]; // right eye inner corner  
      const rightEyeRight = landmarks[263]; // right eye outer corner
      
      const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
      const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
      
      // Calculate proper eye aspect ratios (height/width for each eye)
      const leftEyeRatio = leftEyeHeight / leftEyeWidth;
      const rightEyeRatio = rightEyeHeight / rightEyeWidth;
      
      // Simple and reliable blink detection
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
      // horizontal head angle (relative to nose position)
      const leftRelativeToNose = left.x - nose.x;   // negative when face turns right
      const rightRelativeToNose = right.x - nose.x; // negative when face turns left
      
      // vertical head angle (relative to nose position)
      const leftVerticalToNose = left.y - nose.y;   // negative when head tilts up
      const rightVerticalToNose = right.y - nose.y; // negative when head tilts up

      // Head roll detection (side-to-side tilting) using eye positions
      const leftEyeInner = landmarks[33];   // left eye inner corner
      const rightEyeInner = landmarks[362]; // right eye inner corner
      
      // Calculate the angle between the eyes to detect head roll
      const eyeDeltaX = rightEyeInner.x - leftEyeInner.x;
      const eyeDeltaY = rightEyeInner.y - leftEyeInner.y;
      const rawHeadRollAngle = Math.atan2(eyeDeltaY, eyeDeltaX); // Angle in radians

      // Calculate raw head angles
      const rawHeadTurnAngle = (rightRelativeToNose + leftRelativeToNose) / 2; // Average gives turn direction
      const rawHeadTiltAngle = (leftVerticalToNose + rightVerticalToNose) / 2; // Average gives tilt direction

      // Calculate mouth openness
      const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
      const mouthWidth = Math.abs(lipCornerRight.x - lipCornerLeft.x);
      
      // Normalize mouth openness (adjust these values based on your preference)
      const normalizedMouthOpen = Math.min(mouthHeight / (mouthWidth * 0.3), 3.0); // Cap at 3x size
      const cubeScale = Math.max(0.3, normalizedMouthOpen); // Minimum size of 0.3
      
      // Apply scale to cube
      cube.scale.setScalar(cubeScale);

      // Calculate eyebrow-to-head distance (normalized for head tilt)
      // Use the distance between eyes as a reference for normalization
      const eyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) + 
        Math.pow(rightEye.y - leftEye.y, 2)
      );
      
      // Calculate the distance from eyebrow bottom to head top, normalized by eye distance
      const leftEyebrowToHead = Math.abs(leftEyebrowBottom.y - headTop.y) / eyeDistance;
      const rightEyebrowToHead = Math.abs(rightEyebrowBottom.y - headTop.y) / eyeDistance;
      const avgEyebrowToHead = (leftEyebrowToHead + rightEyebrowToHead) / 2;
      
      // Calibrate baseline positions (eyebrows and head)
      if (!isCalibrated) {
        eyebrowReadings.push(avgEyebrowToHead);
        headTurnReadings.push(rawHeadTurnAngle);
        headTiltReadings.push(rawHeadTiltAngle);
        headRollReadings.push(rawHeadRollAngle);
        
        // Update calibration status
        const statusDiv = document.getElementById('calibration-status');
        if (statusDiv) {
          const progress = Math.round((eyebrowReadings.length / CALIBRATION_SAMPLES) * 100);
          statusDiv.textContent = `🔧 Calibrating face baseline... ${progress}%`;
        }
        
        if (eyebrowReadings.length >= CALIBRATION_SAMPLES) {
          // Use median of readings for more stable baseline
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
            statusDiv.textContent = '✅ Face baseline calibrated!';
            statusDiv.style.color = '#00FF00';
          }
        }
        // During calibration, keep cube neutral
        cube.rotation.y = 0;
        cube.rotation.x = 0;
        // Set all faces to solid, colored mode
        cube.material.forEach(mat => {
          mat.wireframe = false;
        });
        return;
      }
      
      // Calculate relative movements from baselines
      const headTurnAngle = (rawHeadTurnAngle - headTurnBaseline) * Math.PI * 4; // Relative to neutral
      const headTiltAngle = (rawHeadTiltAngle - headTiltBaseline) * Math.PI * 4; // Relative to neutral
      const headRollAngle = (rawHeadRollAngle - headRollBaseline) * 2; // Side-to-side tilt

      cube.rotation.y = headTurnAngle; // rotate cube based on relative face turn
      cube.rotation.x = headTiltAngle; // tilt cube based on relative head tilt
      cube.rotation.z = headRollAngle; // roll cube based on relative head roll
      
      // Calculate relative eyebrow movement from baseline
      const eyebrowMovement = eyebrowBaseline - avgEyebrowToHead; // Reversed: baseline minus current
      
      // Check for symmetrical eyebrow movement (filter out head tilts)
      const eyebrowAsymmetry = Math.abs(leftEyebrowToHead - rightEyebrowToHead);
      const isSymmetrical = eyebrowAsymmetry < 0.3; // Allow some natural asymmetry
      
      const eyebrowIntensity = Math.max(0, Math.min(eyebrowMovement * 50, 1.0)); // Adjusted multiplier
      
      // Use eyebrow movement to control cube wireframe (only if movement is symmetrical)
      if (eyebrowIntensity > 0.91 && isSymmetrical) {
        // Eyebrows raised symmetrically - change to wireframe
        cube.material.forEach(mat => {
          mat.wireframe = true;
        });
      } else {
        // Neutral eyebrows or asymmetrical movement - normal solid colored faces
        cube.material.forEach(mat => {
          mat.wireframe = false;
        });
      }
    }
  } catch (error) {
    console.error('Error processing face landmarks:', error);
  }
}

// Blink circle functions
function createBlinkCircle() {
  // Create a new circle at random position
  const circle = {
    geometry: new THREE.CircleGeometry(0.1, 32),
    material: new THREE.MeshBasicMaterial({ 
      color: Math.random() * 0xffffff, // Random color
      transparent: true,
      opacity: 1.0
    }),
    position: {
      x: (Math.random() - 0.5) * 4, // Random X between -2 and 2
      y: (Math.random() - 0.5) * 4, // Random Y between -2 and 2
      z: (Math.random() - 0.5) * 2  // Random Z between -1 and 1
    },
    age: 0,
    maxAge: 180 // Fade out over 3 seconds (60fps * 3)
  };
  
  // Create mesh and add to scene
  circle.mesh = new THREE.Mesh(circle.geometry, circle.material);
  circle.mesh.position.set(circle.position.x, circle.position.y, circle.position.z);
  scene.add(circle.mesh);
  
  // Add to array
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
    
    // Optional: Make them slowly rise
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

// Draw face mesh visualization
function drawFaceMesh(ctx, landmarks, width, height) {
  const FACE_CONNECTIONS = [
    // Face oval
    [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288],
    [397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
    
    // Left eye
    [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    
    // Right eye  
    [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
    
    // Lips outer
    [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318],
    [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308],
    
    // Nose
    [1, 2, 5, 4, 6, 168, 8, 9, 10, 151, 195, 197, 196, 3, 51, 48, 115, 131, 134, 102, 49, 220, 305, 291, 303, 267, 269, 270, 267, 271, 272],
    
    // Eyebrows
    [46, 53, 52, 51, 48, 115, 131, 134, 102, 48, 64],
    [276, 283, 282, 295, 285, 336, 296, 334, 293, 300, 276]
  ];

  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#FF0000';

  // Draw landmarks as points
  for (let i = 0; i < landmarks.length; i++) {
    const x = landmarks[i].x * width;
    const y = landmarks[i].y * height;
    
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw connections
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 1;
  
  // Draw face contour
  const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
  
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

  // Draw eyes
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

  // Draw eyebrows with enhanced visualization
  ctx.strokeStyle = '#00FF88'; // Green-cyan for eyebrows
  ctx.lineWidth = 2;
  
  // Correct MediaPipe eyebrow landmark points (following the natural eyebrow curve)
  const leftEyebrow = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
  const rightEyebrow = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
  
  // Draw left eyebrow
  ctx.beginPath();
  for (let i = 0; i < leftEyebrow.length - 1; i++) {
    const point1 = landmarks[leftEyebrow[i]];
    const point2 = landmarks[leftEyebrow[i + 1]];
    
    if (point1 && point2) {
      if (i === 0) {
        ctx.moveTo(point1.x * width, point1.y * height);
      }
      ctx.lineTo(point2.x * width, point2.y * height);
    }
  }
  ctx.stroke();

  // Draw right eyebrow
  ctx.beginPath();
  for (let i = 0; i < rightEyebrow.length - 1; i++) {
    const point1 = landmarks[rightEyebrow[i]];
    const point2 = landmarks[rightEyebrow[i + 1]];
    
    if (point1 && point2) {
      if (i === 0) {
        ctx.moveTo(point1.x * width, point1.y * height);
      }
      ctx.lineTo(point2.x * width, point2.y * height);
    }
  }
  ctx.stroke();

  // Highlight key points used for head tracking
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

  // Highlight mouth tracking points for size control
  ctx.fillStyle = '#FF00FF'; // Magenta for mouth points
  const mouthTrackingPoints = [13, 14, 61, 291]; // upper lip, lower lip, left corner, right corner
  mouthTrackingPoints.forEach(pointIndex => {
    const point = landmarks[pointIndex];
    if (point) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  // Highlight eyebrow tracking points
  ctx.fillStyle = '#00FF88'; // Green-cyan for eyebrow points
  const eyebrowTrackingPoints = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 
                                 300, 293, 334, 296, 336, 285, 295, 282, 283, 276]; // key eyebrow landmarks
  eyebrowTrackingPoints.forEach(pointIndex => {
    const point = landmarks[pointIndex];
    if (point) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

// Animate cube
function animate() {
  requestAnimationFrame(animate);
  updateBlinkCircles(); // Update blink circles each frame
  controls.update();
  renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// Start animation immediately
animate();

// Initialize MediaPipe when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMediaPipe);
} else {
  // DOM is already ready
  setTimeout(initializeMediaPipe, 100); // Small delay to ensure scripts are loaded
}
