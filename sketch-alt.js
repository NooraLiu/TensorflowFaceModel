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

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Add cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, material);
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
  
  if (!videoElement) {
    showError('Video element not found');
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

    faceMesh.onResults(onResults);

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
function onResults(results) {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
  
  try {
    const landmarks = results.multiFaceLandmarks[0];

    // Simple head yaw estimation
    const left = landmarks[234];  // approximate left side of face
    const right = landmarks[454]; // approximate right side of face
    const nose = landmarks[1];    // nose tip

    if (left && right && nose) {
      // horizontal head angle
      const dx = right.x - left.x;
      const dz = nose.z || 0; // depth of nose (fallback to 0 if undefined)

      cube.rotation.y = dx * Math.PI;   // rotate cube based on face left-right
      cube.rotation.x = dz * Math.PI/2; // optional: up-down tilt
    }
  } catch (error) {
    console.error('Error processing face landmarks:', error);
  }
}

// Animate cube
function animate() {
  requestAnimationFrame(animate);
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