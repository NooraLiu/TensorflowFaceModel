// =============================================================================
// DATA MAPPING MODULE - MOVEMENT VARIANT
// Maps face detection data to 3D movement and visual effects
// =============================================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// =============================================================================
// MOVEMENT CONTROLLER
// =============================================================================

export class MovementController {
  constructor() {
    this.position = { x: 0, z: 0 }; // Only track X and Z, Y is controlled by mouth
    this.velocity = { x: 0, z: 0 };
    this.cameraRotationY = 0;
    this.cameraRotationX = 0; // Vertical camera rotation (pitch)
    this.cameraHeight = 5; // Camera height above ground
    
    // Sensitivity settings
    this.movementSensitivity = 0.8;
    this.rollSensitivity = 0.10;
    this.cameraSensitivity = 2.5;
    this.cameraPitchSensitivity = 3.0; // Sensitivity for up/down camera movement
    this.cameraHeightSensitivity = 1.0; // Sensitivity for head roll -> camera height
    
    // Movement constants
    this.BASE_MOVEMENT_SPEED = 0.1; // Base speed multiplier
    this.CAMERA_ROTATION_SPEED = 0.02; // Speed of camera rotation accumulation
    this.CAMERA_PITCH_SPEED = 0.015; // Speed of camera pitch accumulation
    this.MOVEMENT_THRESHOLD = 0.04; // Minimum head tilt to trigger movement
    this.TURN_THRESHOLD = 0.04; // Minimum head turn to trigger camera rotation
    this.ROLL_THRESHOLD = 0.04; // Minimum head roll to trigger left/right movement
    this.THRESHOLD_SMOOTHING = 0.7; // Smoothing factor for threshold filtering
    
    // Movement mode settings
    this.cameraRelativeMovement = true;
    this.invertCameraControls = true; // Default: inverted
    this.controlMode = 'original'; // 'original' or 'head-turn'
    this.clampCameraToGround = true; // Prevent camera from going below ground level
    this.lookAtCube = true; // Always look at the cube
    
    // Mouse tracking for head-turn mode
    this.mousePosition = { x: 0, z: 0 };
    this.mouseNormalized = { x: 0, y: 0 }; // Normalized screen coordinates
  }

  applyMovementThreshold(rawMovement) {
    if (Math.abs(rawMovement) < this.MOVEMENT_THRESHOLD) {
      return 0;
    }
    const scaledMovement = rawMovement - (Math.sign(rawMovement) * this.MOVEMENT_THRESHOLD);
    return scaledMovement * this.THRESHOLD_SMOOTHING;
  }

  applyRollThreshold(rawMovement) {
    if (Math.abs(rawMovement) < this.ROLL_THRESHOLD) {
      return 0;
    }
    const scaledMovement = rawMovement - (Math.sign(rawMovement) * this.ROLL_THRESHOLD);
    return scaledMovement * this.THRESHOLD_SMOOTHING;
  }

  applyTurnThreshold(rawTurn) {
    const absTurn = Math.abs(rawTurn);
    if (absTurn < this.TURN_THRESHOLD) {
      return 0;
    }
    const scaledTurn = rawTurn - (Math.sign(rawTurn) * this.TURN_THRESHOLD);
    return scaledTurn * this.THRESHOLD_SMOOTHING;
  }

  applyAccelerationCurve(movement) {
    const absMovement = Math.abs(movement);
    if (absMovement === 0) return 0;
    
    const accelerationFactor = Math.pow(absMovement, 2.5);
    return Math.sign(movement) * accelerationFactor;
  }

  applyRollAccelerationCurve(movement) {
    const absMovement = Math.abs(movement);
    if (absMovement === 0) return 0;
    
    const accelerationFactor = Math.pow(absMovement, 1.1);
    return Math.sign(movement) * accelerationFactor;
  }

  applyTurnAccelerationCurve(movement) {
    const absMovement = Math.abs(movement);
    if (absMovement === 0) return 0;
    
    const accelerationFactor = Math.pow(absMovement, 2.0);
    return Math.sign(movement) * accelerationFactor;
  }

  updateMovement(headMovement, cube) {
    if (this.controlMode === 'head-turn') {
      this.updateMouseBasedMovement(headMovement, cube);
    } else {
      this.updateOriginalMovement(headMovement, cube);
    }
  }

  updateMouseBasedMovement(headMovement, cube) {
    // Calculate direction to mouse position
    const dx = this.mousePosition.x - this.position.x;
    const dz = this.mousePosition.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Only move if mouse is far enough away
    if (distance > 0.5) {
      // Normalize direction
      const dirX = dx / distance;
      const dirZ = dz / distance;
      
      // Base speed towards mouse (increased sensitivity)
      const baseSpeed = 0.15;
      const targetVelX = dirX * baseSpeed;
      const targetVelZ = dirZ * baseSpeed;
      
      // Smoothly interpolate velocity
      this.velocity.x += (targetVelX - this.velocity.x) * 0.15;
      this.velocity.z += (targetVelZ - this.velocity.z) * 0.15;
    }
    
    // Use head turn (left/right) to rotate camera horizontally
    const scaledHeadTurn = headMovement.turn * Math.PI * 4;
    const filteredHeadTurn = this.applyTurnThreshold(scaledHeadTurn);
    const acceleratedTurn = this.applyTurnAccelerationCurve(filteredHeadTurn);
    
    // Rotate camera with head turn
    if (Math.abs(acceleratedTurn) > 0) {
      const rotationDirection = this.invertCameraControls ? -1 : 1;
      this.cameraRotationY += acceleratedTurn * this.CAMERA_ROTATION_SPEED * this.cameraSensitivity * rotationDirection;
    }
    
    // Use head tilt (up/down) to rotate camera vertically
    const scaledHeadTilt = headMovement.tilt * 20;
    const filteredHeadTilt = this.applyMovementThreshold(scaledHeadTilt);
    
    // Use a gentler acceleration curve for camera pitch (more linear response)
    const absMovement = Math.abs(filteredHeadTilt);
    let acceleratedTilt = 0;
    if (absMovement > 0) {
      // Use power of 1.2 instead of 2.5 for more symmetric response
      const accelerationFactor = Math.pow(absMovement, 1.2);
      acceleratedTilt = Math.sign(filteredHeadTilt) * accelerationFactor;
    }
    
    // Rotate camera pitch with head tilt (inverted: nod down = look up)
    if (Math.abs(acceleratedTilt) > 0) {
      this.cameraRotationX -= acceleratedTilt * this.CAMERA_PITCH_SPEED * this.cameraPitchSensitivity;
      // Clamp camera pitch based on setting
      const minPitch = this.clampCameraToGround ? 0 : -Math.PI / 3; // 0 = parallel to ground
      const maxPitch = Math.PI / 3;
      this.cameraRotationX = Math.max(minPitch, Math.min(maxPitch, this.cameraRotationX));
    }
    
    // Use head roll (tilt left/right) to adjust camera height
    const scaledHeadRoll = headMovement.roll * 20;
    const filteredHeadRoll = this.applyRollThreshold(scaledHeadRoll);
    
    // Adjust camera height with head roll
    if (Math.abs(filteredHeadRoll) > 0) {
      const absRoll = Math.abs(filteredHeadRoll);
      const acceleratedRoll = Math.sign(filteredHeadRoll) * Math.pow(absRoll, 1.2);
      this.cameraHeight += acceleratedRoll * 0.05 * this.cameraHeightSensitivity;
      // Clamp camera height to reasonable bounds
      this.cameraHeight = Math.max(1, Math.min(15, this.cameraHeight));
    }
    
    // Apply velocity damping
    this.velocity.x *= 0.9;
    this.velocity.z *= 0.9;
    
    // Update position
    this.position.x += this.velocity.x;
    this.position.z += this.velocity.z;
    
    // Update cube position
    cube.position.x = this.position.x;
    cube.position.z = this.position.z;
  }

  updateOriginalMovement(headMovement, cube) {
    // Apply movement multipliers to raw relative differences from calibration
    const scaledHeadTurn = headMovement.turn * Math.PI * 4;
    const scaledHeadTilt = headMovement.tilt * 20;
    const scaledHeadRoll = headMovement.roll * 20;
    
    const filteredHeadTurnAngle = this.applyTurnThreshold(scaledHeadTurn);
    const filteredHeadTiltMovement = this.applyMovementThreshold(scaledHeadTilt);
    const filteredHeadRollMovement = this.applyRollThreshold(scaledHeadRoll);

    const acceleratedTiltMovement = this.applyAccelerationCurve(filteredHeadTiltMovement);
    const acceleratedRollMovement = this.applyRollAccelerationCurve(filteredHeadRollMovement);
    const forwardMovement = acceleratedTiltMovement * this.BASE_MOVEMENT_SPEED * this.movementSensitivity;
    const rightMovement = -acceleratedRollMovement * this.BASE_MOVEMENT_SPEED * this.rollSensitivity;
    
    if (this.cameraRelativeMovement) {
      const cosRotation = Math.cos(this.cameraRotationY);
      const sinRotation = Math.sin(this.cameraRotationY);
      
      this.velocity.z += forwardMovement * cosRotation - rightMovement * sinRotation;
      this.velocity.x += forwardMovement * sinRotation + rightMovement * cosRotation;
    } else {
      this.velocity.z += forwardMovement;
      this.velocity.x += rightMovement;
    }

    // Camera rotation
    const filteredCameraInput = this.applyTurnThreshold(scaledHeadTurn);
    
    if (this.cameraRelativeMovement) {
      if (Math.abs(filteredCameraInput) > 0) {
        const acceleratedCameraInput = this.applyTurnAccelerationCurve(filteredCameraInput);
        const rotationDirection = this.invertCameraControls ? -1 : 1;
        this.cameraRotationY += acceleratedCameraInput * this.CAMERA_ROTATION_SPEED * this.cameraSensitivity * rotationDirection;
      }
    } else {
      const cameraRotation = (this.invertCameraControls ? -filteredCameraInput : filteredCameraInput) * this.cameraSensitivity;
      this.cameraRotationY = cameraRotation;
    }

    // Apply velocity damping
    this.velocity.x *= 0.85;
    this.velocity.z *= 0.85;

    // Update position
    this.position.x += this.velocity.x;
    this.position.z += this.velocity.z;

    // Update cube position (only X and Z, Y is controlled by mouth in coordinator)
    cube.position.x = this.position.x;
    cube.position.z = this.position.z;
  }

  updateCameraFollow(camera, controls) {
    const CAMERA_FOLLOW_SPEED = 0.05;
    const CAMERA_DISTANCE = 8;
    
    // Calculate camera position based on both horizontal and vertical rotation
    const rotatedDistance = CAMERA_DISTANCE;
    
    // Horizontal rotation (Y-axis)
    const targetCameraX = this.position.x + Math.sin(this.cameraRotationY) * rotatedDistance * Math.cos(this.cameraRotationX);
    const targetCameraZ = this.position.z + Math.cos(this.cameraRotationY) * rotatedDistance * Math.cos(this.cameraRotationX);
    
    // Vertical rotation (X-axis / pitch) plus dynamic height
    const targetCameraY = this.cameraHeight + Math.sin(this.cameraRotationX) * rotatedDistance;
    
    camera.position.x += (targetCameraX - camera.position.x) * CAMERA_FOLLOW_SPEED;
    camera.position.y += (targetCameraY - camera.position.y) * CAMERA_FOLLOW_SPEED;
    camera.position.z += (targetCameraZ - camera.position.z) * CAMERA_FOLLOW_SPEED;
    
    // Adjust look-at target based on setting
    let targetLookX, targetLookY, targetLookZ;
    
    if (this.lookAtCube) {
      // Look at the cube center
      targetLookX = this.position.x;
      targetLookY = 1; // Cube center height
      targetLookZ = this.position.z;
    } else {
      // Look based on camera pitch angle to maintain viewing angle
      targetLookX = this.position.x;
      targetLookY = this.cameraHeight - Math.cos(this.cameraRotationX) * rotatedDistance * Math.tan(this.cameraRotationX);
      targetLookZ = this.position.z;
    }
    
    controls.target.x += (targetLookX - controls.target.x) * CAMERA_FOLLOW_SPEED;
    controls.target.y += (targetLookY - controls.target.y) * CAMERA_FOLLOW_SPEED;
    controls.target.z += (targetLookZ - controls.target.z) * CAMERA_FOLLOW_SPEED;
  }

  setSensitivity(type, value) {
    switch(type) {
      case 'movement':
        this.movementSensitivity = value;
        break;
      case 'roll':
        this.rollSensitivity = value;
        break;
      case 'camera':
        this.cameraSensitivity = value;
        break;
    }
  }

  setMode(cameraRelative) {
    this.cameraRelativeMovement = cameraRelative;
    if (cameraRelative) {
      this.cameraSensitivity = 2.0;
    } else {
      this.cameraSensitivity = 1.5;
      this.cameraRotationY = 0;
    }
  }

  setControlMode(mode) {
    this.controlMode = mode;
    console.log(`Control mode changed to: ${mode}`);
  }

  updateMousePosition(normalizedX, normalizedY, camera) {
    // Convert normalized screen coordinates to world coordinates
    // normalizedX and normalizedY are in range [-1, 1]
    this.mouseNormalized.x = normalizedX;
    this.mouseNormalized.y = normalizedY;
    
    // Use raycasting to project mouse position onto the ground plane (y=0)
    // Calculate ray direction from camera through mouse position
    const vector = new THREE.Vector3(normalizedX, normalizedY, 0.5);
    vector.unproject(camera);
    
    const dir = new THREE.Vector3();
    dir.subVectors(vector, camera.position).normalize();
    
    // Find intersection with ground plane (y = 0)
    // ray: P = camera.position + t * dir
    // plane: y = 0
    // Solve: camera.position.y + t * dir.y = 0
    const t = -camera.position.y / dir.y;
    
    if (t > 0) {
      // Calculate intersection point
      this.mousePosition.x = camera.position.x + dir.x * t;
      this.mousePosition.z = camera.position.z + dir.z * t;
    }
  }
}

// =============================================================================
// VISUAL EFFECTS MANAGERS
// =============================================================================

export class BlinkEffectManager {
  constructor(scene) {
    this.scene = scene;
    this.blinkCircles = [];
  }

  onBlinkDetected(blinkData) {
    if (blinkData.detected) {
      this.createBlinkCircle();
    }
  }

  createBlinkCircle() {
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
    this.scene.add(circle.mesh);
    this.blinkCircles.push(circle);
  }

  updateCircles() {
    for (let i = this.blinkCircles.length - 1; i >= 0; i--) {
      const circle = this.blinkCircles[i];
      circle.age++;
      
      const fadeProgress = circle.age / circle.maxAge;
      circle.material.opacity = Math.max(0, 1 - fadeProgress);
      circle.mesh.position.y += 0.005;
      
      if (circle.age >= circle.maxAge) {
        this.scene.remove(circle.mesh);
        circle.geometry.dispose();
        circle.material.dispose();
        this.blinkCircles.splice(i, 1);
      }
    }
  }
}

export class GroundColorManager {
  constructor(ground) {
    this.ground = ground;
    this.colors = [
      0xa3dc9a, // rgb(163, 220, 154)
      0xdee791, // rgb(222, 231, 145)  
      0xfff9bd, // rgb(255, 249, 189)
      0xffd6ba  // rgb(255, 214, 186)
    ];
    this.currentColorIndex = 0;
  }

  onBlinkDetected(blinkData) {
    if (blinkData.detected) {
      this.changePlaneColor();
    }
  }

  changePlaneColor() {
    this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
    const newColor = this.colors[this.currentColorIndex];
    this.ground.material.color.setHex(newColor);
    console.log(`Plane color changed to: #${newColor.toString(16).padStart(6, '0')}`);
  }
}

export class EyebrowEffectManager {
  constructor() {
    this.lastWowTime = 0;
    this.WOW_COOLDOWN = 500;
  }

  onEyebrowRaise(eyebrowRaised) {
    if (eyebrowRaised) {
      const currentTime = Date.now();
      if ((currentTime - this.lastWowTime) > this.WOW_COOLDOWN) {
        this.createWowText();
        this.lastWowTime = currentTime;
        console.log('WOW! Eyebrows raised!');
      }
    }
  }

  createWowText() {
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
    
    setTimeout(() => {
      if (wowElement.parentNode) {
        wowElement.parentNode.removeChild(wowElement);
      }
    }, 2000);
  }
}

export class SmileFrownEffectManager {
  constructor() {
    this.lastSmileTime = 0;
    this.lastFrownTime = 0;
    this.SMILE_COOLDOWN = 1000;
    this.FROWN_COOLDOWN = 1000;
    this.smileCanvas = null;
    this.smileCtx = null;
    this.setupSmileCanvas();
  }

  setupSmileCanvas() {
    this.smileCanvas = document.createElement('canvas');
    this.smileCanvas.width = 220;
    this.smileCanvas.height = 80;
    this.smileCanvas.style.cssText = `
      position: fixed;
      top: 580px;
      left: 10px;
      z-index: 500;
      pointer-events: none;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 8px;
      background: rgba(0,0,0,0.8);
    `;
    
    this.smileCtx = this.smileCanvas.getContext('2d');
    document.body.appendChild(this.smileCanvas);
  }

  onExpressionDetected(expressionData) {
    const currentTime = Date.now();
    
    // Handle smile
    if (expressionData.smile.detected && (currentTime - this.lastSmileTime) > this.SMILE_COOLDOWN) {
      this.create2DSmileyFace();
      this.lastSmileTime = currentTime;
      console.log('Smile detected!');
    }
    
    // Handle frown
    if (expressionData.frown.detected && (currentTime - this.lastFrownTime) > this.FROWN_COOLDOWN) {
      this.create2DFrownFace();
      this.lastFrownTime = currentTime;
      console.log('Frown detected!');
    }
    
    // Update smile curve visualization
    this.updateSmileCurve(expressionData);
  }

  updateSmileCurve(expressionData) {
    if (!this.smileCtx) return;
    
    this.smileCtx.clearRect(0, 0, this.smileCanvas.width, this.smileCanvas.height);
    
    const centerX = this.smileCanvas.width / 2;
    const centerY = this.smileCanvas.height / 2;
    const curveWidth = 80;
    
    // Use raw elevation value directly (positive = smile, negative = frown)
    const smileIntensity = expressionData.smile.elevation;
    const curveHeight = Math.abs(smileIntensity) * 400;
    
    const SMILE_THRESHOLD = 0.015;
    const FROWN_THRESHOLD = -0.01;
    
    this.smileCtx.beginPath();
    this.smileCtx.lineWidth = 3;
    
    // Set color based on expression type
    if (smileIntensity > SMILE_THRESHOLD) {
      this.smileCtx.strokeStyle = '#FF6B6B'; // Red when smiling
    } else if (smileIntensity < FROWN_THRESHOLD) {
      this.smileCtx.strokeStyle = '#6B6BFF'; // Blue when frowning
    } else {
      this.smileCtx.strokeStyle = '#00FF88'; // Green when neutral
    }
    
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * 2 - 1;
      const x = centerX + t * curveWidth;
      
      let y;
      if (smileIntensity > 0) {
        // Smile: curve downward (flipped)
        y = centerY + curveHeight * (1 - t * t);
      } else {
        // Frown: curve upward (flipped)
        y = centerY - curveHeight * (1 - t * t);
      }
      
      if (i === 0) {
        this.smileCtx.moveTo(x, y);
      } else {
        this.smileCtx.lineTo(x, y);
      }
    }
    
    this.smileCtx.stroke();
    
    this.smileCtx.fillStyle = '#FFFFFF';
    this.smileCtx.font = '12px Arial';
    this.smileCtx.textAlign = 'center';
    this.smileCtx.fillText('Mouth Expression', centerX, 15);
  }

  create2DSmileyFace() {
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
    
    setTimeout(() => {
      if (smileyElement.parentNode) {
        smileyElement.parentNode.removeChild(smileyElement);
      }
    }, 3000);
  }

  create2DFrownFace() {
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
    
    setTimeout(() => {
      if (frownElement.parentNode) {
        frownElement.parentNode.removeChild(frownElement);
      }
    }, 3000);
  }
}

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

export function mouthToCubeHeight(mouthData) {
  // mouthData.smoothed is already scaled by detector (capped at 3.0)
  const cubeHeight = 0.5 + (mouthData.smoothed - 1.0) * 2.0;
  return Math.max(0.5, cubeHeight);
}

export function mouthToCubeScale(mouthData) {
  // mouthData.smoothed is already scaled by detector (capped at 3.0)
  return Math.max(0.3, mouthData.smoothed);
}
