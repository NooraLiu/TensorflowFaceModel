// =============================================================================
// DATA MAPPING MODULE - MOVEMENT VARIANT
// Maps face detection data to 3D movement and visual effects
// =============================================================================

import * as THREE from 'three';

// =============================================================================
// MOVEMENT CONTROLLER
// =============================================================================

export class MovementController {
  constructor() {
    this.position = { x: 0, z: 0 }; // Only track X and Z, Y is controlled by mouth
    this.velocity = { x: 0, z: 0 };
    this.cameraRotationY = 0;
    this.pacmanRotationY = Math.PI / 2; // Start at +90 degrees to match initial Pac-Man rotation
    this.obstacles = []; // Will be set from outside
    
    // Sensitivity settings
    this.movementSensitivity = 0.8;
    this.rollSensitivity = 0.10;
    this.cameraSensitivity = 2.5;
    this.turnSensitivity = 2.5; // For head roll to control Pac-Man rotation
    
    // Movement constants
    this.BASE_MOVEMENT_SPEED = 0.1; // Base speed multiplier
    this.CAMERA_ROTATION_SPEED = 0.02; // Speed of camera rotation accumulation
    this.ROTATION_SPEED = 0.02; // Speed of Pac-Man rotation
    this.MOVEMENT_THRESHOLD = 0.04; // Minimum head tilt to trigger movement
    this.TURN_THRESHOLD = 0.04; // Minimum head turn to trigger camera rotation
    this.ROLL_THRESHOLD = 0.04; // Minimum head roll to trigger left/right movement
    this.THRESHOLD_SMOOTHING = 0.7; // Smoothing factor for threshold filtering
    
    // Movement mode settings
    this.cameraRelativeMovement = true;
    this.invertCameraControls = true; // Default: inverted
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

  checkObstacleCollision(newX, newZ) {
    const PACMAN_RADIUS = 0.5; // Pac-Man's collision radius
    
    for (const obstacle of this.obstacles) {
      const dx = newX - obstacle.position.x;
      const dz = newZ - obstacle.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Get obstacle radius based on its geometry
      let obstacleRadius = 0.5;
      if (obstacle.geometry.parameters) {
        if (obstacle.geometry.parameters.radius) {
          obstacleRadius = obstacle.geometry.parameters.radius;
        } else if (obstacle.geometry.parameters.width) {
          obstacleRadius = Math.max(obstacle.geometry.parameters.width, obstacle.geometry.parameters.depth) / 2;
        }
      }
      
      // Check if collision would occur
      if (distance < PACMAN_RADIUS + obstacleRadius) {
        return true; // Collision detected
      }
    }
    
    return false; // No collision
  }
  
  setObstacles(obstacles) {
    this.obstacles = obstacles;
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
    
    // Pac-Man rotation based on head roll (left/right tilt)
    const scaledRollForRotation = headMovement.roll * Math.PI * 4;
    const filteredRollAngle = this.applyRollThreshold(scaledRollForRotation);
    if (Math.abs(filteredRollAngle) > 0) {
      const acceleratedRollInput = this.applyRollAccelerationCurve(filteredRollAngle);
      this.pacmanRotationY += acceleratedRollInput * this.ROTATION_SPEED * this.turnSensitivity * -1; // Roll right = turn right
    }
    
    // Clamp Pac-Man rotation to 0 to 180 degrees (front to sides)
    // Starting at 90 degrees (PI/2), can rotate to 0 (right side) or 180 (left side)
    const MIN_ROTATION = 0; // Right side view
    const MAX_ROTATION = Math.PI; // Left side view
    this.pacmanRotationY = Math.max(MIN_ROTATION, Math.min(MAX_ROTATION, this.pacmanRotationY));

    // Apply velocity damping
    this.velocity.x *= 0.85;
    this.velocity.z *= 0.85;

    // Calculate new position
    const newX = this.position.x + this.velocity.x;
    const newZ = this.position.z + this.velocity.z;
    
    // Check for obstacle collision with sliding
    const fullCollision = this.checkObstacleCollision(newX, newZ);
    const xCollision = this.checkObstacleCollision(newX, this.position.z);
    const zCollision = this.checkObstacleCollision(this.position.x, newZ);
    
    if (!fullCollision) {
      // No collision, update both axes
      this.position.x = newX;
      this.position.z = newZ;
    } else {
      // Try sliding along obstacles
      if (!xCollision) {
        // Can move in X direction
        this.position.x = newX;
      }
      if (!zCollision) {
        // Can move in Z direction
        this.position.z = newZ;
      }
    }
    
    // Clamp position to stay within the 20x20 plane boundaries
    const BOUNDARY = 9.5; // Slightly smaller than 10 to keep Pac-Man visible
    
    // Check X boundary and zero velocity if hitting edge
    if (this.position.x <= -BOUNDARY || this.position.x >= BOUNDARY) {
      this.position.x = Math.max(-BOUNDARY, Math.min(BOUNDARY, this.position.x));
      this.velocity.x = 0; // Stop X movement at boundary
    }
    
    // Check Z boundary and zero velocity if hitting edge
    if (this.position.z <= -BOUNDARY || this.position.z >= BOUNDARY) {
      this.position.z = Math.max(-BOUNDARY, Math.min(BOUNDARY, this.position.z));
      this.velocity.z = 0; // Stop Z movement at boundary
    }

    // Update cube position (only X and Z, Y is controlled by mouth in coordinator)
    cube.position.x = this.position.x;
    cube.position.z = this.position.z;
    
    // Update Pac-Man's facing direction
    cube.rotation.y = this.pacmanRotationY;
  }

  updateCameraFollow(camera, controls) {
    const CAMERA_FOLLOW_SPEED = 0.05;
    const CAMERA_HEIGHT = 5;
    const CAMERA_DISTANCE = 8;
    
    const rotatedDistance = CAMERA_DISTANCE;
    const targetCameraX = this.position.x + Math.sin(this.cameraRotationY) * rotatedDistance;
    const targetCameraY = CAMERA_HEIGHT;
    const targetCameraZ = this.position.z + Math.cos(this.cameraRotationY) * rotatedDistance;
    
    camera.position.x += (targetCameraX - camera.position.x) * CAMERA_FOLLOW_SPEED;
    camera.position.y += (targetCameraY - camera.position.y) * CAMERA_FOLLOW_SPEED;
    camera.position.z += (targetCameraZ - camera.position.z) * CAMERA_FOLLOW_SPEED;
    
    const targetLookX = this.position.x;
    const targetLookY = 1; // Look at cube center
    const targetLookZ = this.position.z;
    
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
      case 'turn':
        this.turnSensitivity = value;
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
  constructor(ground, scene, createObstaclesFn, removeObstaclesFn, movementController = null, bombs = []) {
    this.ground = ground;
    this.scene = scene;
    this.createObstacles = createObstaclesFn;
    this.removeObstacles = removeObstaclesFn;
    this.movementController = movementController;
    this.bombs = bombs;
    this.obstacles = [];
    this.colors = [
      0xa3dc9a, // rgb(163, 220, 154) - Forest
      0xdee791, // rgb(222, 231, 145) - Desert
      0xfff9bd, // rgb(255, 249, 189) - Beach
      0xffd6ba  // rgb(255, 214, 186) - Sunset
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
    
    // Remove old obstacles and create new ones for the new terrain
    this.removeObstacles(this.scene, this.obstacles);
    this.obstacles = this.createObstacles(this.scene, this.currentColorIndex);
    
    // Update MovementController's obstacle reference
    if (this.movementController) {
      this.movementController.setObstacles(this.obstacles);
    }
    
    // Reposition remaining bombs
    this.repositionBombs();
    
    console.log(`Plane color changed to: #${newColor.toString(16).padStart(6, '0')}`);
    console.log(`Terrain switched to type ${this.currentColorIndex}`);
  }
  
  repositionBombs() {
    // Remove existing bombs and create new ones based on terrain
    this.bombs.forEach(bomb => {
      this.scene.remove(bomb);
      bomb.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    this.bombs.length = 0;
    
    // Import createBombs dynamically or store reference
    // For now, we'll manually recreate bombs
    const bombCount = this.currentColorIndex === 1 ? 15 : 5; // Desert has 15 bombs
    const bombGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const bombMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x000000,
      shininess: 50
    });
    const fuseGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
    const fuseMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513,
      shininess: 30
    });
    
    for (let i = 0; i < bombCount; i++) {
      const bombGroup = new THREE.Group();
      const bomb = new THREE.Mesh(bombGeometry, bombMaterial.clone());
      bombGroup.add(bomb);
      const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial.clone());
      fuse.position.y = 0.25;
      bombGroup.add(fuse);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 3 + Math.random() * 6;
      bombGroup.position.x = Math.cos(angle) * distance;
      bombGroup.position.y = 0.2;
      bombGroup.position.z = Math.sin(angle) * distance;
      
      bombGroup.userData.collected = false;
      bombGroup.castShadow = true;
      
      this.scene.add(bombGroup);
      this.bombs.push(bombGroup);
    }
  }
  
  setObstacles(obstacles) {
    this.obstacles = obstacles;
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
      top: 480px;
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

export function mouthToPacmanJaw(mouthData) {
  // mouthData.smoothed ranges from 1.0 (closed) to 3.0 (wide open)
  // Map this to jaw angle in radians
  const MIN_JAW_ANGLE = 0;  // Fully closed
  const MAX_JAW_ANGLE = Math.PI / 2.2;  // Wider open (~82 degrees)
  
  // Normalize mouth opening (1.0 to 3.0) to (0.0 to 1.0)
  const normalized = Math.min(1.0, Math.max(0, (mouthData.smoothed - 1.0) / 2.0));
  
  // Map to jaw angle with slight baseline to make it more natural
  const baselineOpening = 0.05; // Very slight opening at rest
  const clampedMouth = Math.max(0, normalized - 0.02); // Much lower threshold for easier triggering
  const jawAngle = baselineOpening + (clampedMouth * (MAX_JAW_ANGLE - baselineOpening));
  
  return jawAngle;
}

export function mouthToCubeHeight(mouthData) {
  // Keep this for compatibility - not used for Pac-Man but doesn't hurt
  const cubeHeight = 0.5 + (mouthData.smoothed - 1.0) * 2.0;
  return Math.max(0.5, cubeHeight);
}
