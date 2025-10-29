// =============================================================================
// FACE TRACKING LIBRARY - UPDATED VERSION
// =============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =============================================================================
// CALIBRATION SYSTEM CLASS
// =============================================================================

export class CalibrationSystem {
  constructor() {
    this.eyebrowBaseline = null;
    this.eyebrowReadings = [];
    this.headTurnBaseline = null;
    this.headTiltBaseline = null;
    this.headRollBaseline = null;
    this.headTurnReadings = [];
    this.headTiltReadings = [];
    this.headRollReadings = [];
    this.isCalibrated = false;
    this.CALIBRATION_SAMPLES = 30;
  }

  addSample(eyebrowRatio, headTurn, headTilt, headRoll) {
    this.eyebrowReadings.push(eyebrowRatio);
    this.headTurnReadings.push(headTurn);
    this.headTiltReadings.push(headTilt);
    this.headRollReadings.push(headRoll);
    
    if (this.eyebrowReadings.length >= this.CALIBRATION_SAMPLES) {
      this.calculateBaselines();
      this.isCalibrated = true;
    }
  }

  calculateBaselines() {
    this.eyebrowReadings.sort((a, b) => a - b);
    this.headTurnReadings.sort((a, b) => a - b);
    this.headTiltReadings.sort((a, b) => a - b);
    this.headRollReadings.sort((a, b) => a - b);
    
    this.eyebrowBaseline = this.eyebrowReadings[Math.floor(this.eyebrowReadings.length / 2)];
    this.headTurnBaseline = this.headTurnReadings[Math.floor(this.headTurnReadings.length / 2)];
    this.headTiltBaseline = this.headTiltReadings[Math.floor(this.headTiltReadings.length / 2)];
    this.headRollBaseline = this.headRollReadings[Math.floor(this.headRollReadings.length / 2)];
  }

  getProgress() {
    return Math.round((this.eyebrowReadings.length / this.CALIBRATION_SAMPLES) * 100);
  }

  getEyebrowRaise(currentRatio) {
    if (!this.isCalibrated) return 0;
    return currentRatio - this.eyebrowBaseline;
  }

  getHeadMovement(currentTurn, currentTilt, currentRoll) {
    if (!this.isCalibrated) return { turn: 0, tilt: 0, roll: 0 };
    
    return {
      turn: currentTurn - this.headTurnBaseline,
      tilt: currentTilt - this.headTiltBaseline,
      roll: currentRoll - this.headRollBaseline
    };
  }

  reset() {
    this.eyebrowBaseline = null;
    this.eyebrowReadings = [];
    this.headTurnBaseline = null;
    this.headTiltBaseline = null;
    this.headRollBaseline = null;
    this.headTurnReadings = [];
    this.headTiltReadings = [];
    this.headRollReadings = [];
    this.isCalibrated = false;
  }
}

// =============================================================================
// GESTURE DETECTOR CLASS
// =============================================================================

export class GestureDetector {
  constructor(calibrationSystem) {
    this.calibration = calibrationSystem;
    this.lastBlinkState = { left: false, right: false };
    this.lastBlinkTime = 0;
    this.BLINK_THRESHOLD = 0.3;
    this.BLINK_COOLDOWN = 100;
    this.EYEBROW_THRESHOLD = 1.75;
    this.HEAD_POSE_CONSTRAINT = 0.05;
    this.SMILE_THRESHOLD = 0.02;
    
    // History tracking
    this.leftEyebrowRatioHistory = [];
    this.rightEyebrowRatioHistory = [];
    this.avgEyebrowRatioHistory = [];
    this.smileHistory = [];
    this.EYEBROW_HISTORY_SIZE = 10;
    this.SMILE_HISTORY_SIZE = 5;
  }

  detectBlink(landmarks) {
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];
    const leftEyeLeft = landmarks[33];
    const leftEyeRight = landmarks[133];
    const rightEyeLeft = landmarks[362];
    const rightEyeRight = landmarks[263];

    const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
    const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
    const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
    const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
    
    const leftEyeRatio = leftEyeHeight / leftEyeWidth;
    const rightEyeRatio = rightEyeHeight / rightEyeWidth;
    
    const leftBlink = leftEyeRatio < this.BLINK_THRESHOLD;
    const rightBlink = rightEyeRatio < this.BLINK_THRESHOLD;
    
    const bothEyesBlink = leftBlink && rightBlink;
    const strongSingleBlink = (leftEyeRatio < this.BLINK_THRESHOLD * 0.8) || (rightEyeRatio < this.BLINK_THRESHOLD * 0.8);
    const anyBlinkDetected = bothEyesBlink || strongSingleBlink;
    
    const wasOpen = !this.lastBlinkState.left && !this.lastBlinkState.right;
    const nowClosed = anyBlinkDetected;
    const currentTime = Date.now();
    
    let blinkDetected = false;
    if (nowClosed && wasOpen && (currentTime - this.lastBlinkTime) > this.BLINK_COOLDOWN) {
      blinkDetected = true;
      this.lastBlinkTime = currentTime;
    }
    
    this.lastBlinkState.left = leftBlink;
    this.lastBlinkState.right = rightBlink;
    
    return { 
      detected: blinkDetected, 
      leftRatio: leftEyeRatio.toFixed(3), 
      rightRatio: rightEyeRatio.toFixed(3) 
    };
  }

  detectEyebrowRaise(landmarks, headPose) {
    if (!this.calibration.isCalibrated) return { detected: false, intensity: 0 };
    
    // Check head pose constraint
    const headTurnDiff = Math.abs(headPose.turn - this.calibration.headTurnBaseline);
    const headTiltDiff = Math.abs(headPose.tilt - this.calibration.headTiltBaseline);
    
    if (headTurnDiff > this.HEAD_POSE_CONSTRAINT || headTiltDiff > this.HEAD_POSE_CONSTRAINT) {
      return { detected: false, intensity: 0 };
    }
    
    const leftEyebrowBottom = landmarks[55];
    const rightEyebrowBottom = landmarks[285];
    const leftEyeLowerLid = landmarks[145];
    const rightEyeLowerLid = landmarks[374];
    
    const leftEyebrowDistance = Math.abs(leftEyebrowBottom.y - leftEyeLowerLid.y);
    const rightEyebrowDistance = Math.abs(rightEyebrowBottom.y - rightEyeLowerLid.y);
    const avgEyebrowDistance = (leftEyebrowDistance + rightEyebrowDistance) / 2;
    
    this.updateEyebrowHistory(leftEyebrowDistance, rightEyebrowDistance, avgEyebrowDistance);
    
    if (this.avgEyebrowRatioHistory.length < 3) return { detected: false, intensity: 0 };
    
    const baseline = this.calibration.eyebrowBaseline || 0.05;
    const currentRatio = avgEyebrowDistance;
    const eyebrowRaiseAmount = currentRatio - baseline;
    const intensity = Math.max(0, Math.min(eyebrowRaiseAmount / (baseline * this.EYEBROW_THRESHOLD), 1.0));
    
    return { 
      detected: eyebrowRaiseAmount > this.EYEBROW_THRESHOLD * baseline, 
      intensity: intensity 
    };
  }

  detectSmile(landmarks) {
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    
    const mouthWidth = Math.abs(rightCorner.x - leftCorner.x);
    const mouthHeight = Math.abs(upperLip.y - lowerLip.y);
    
    const leftCornerElevation = (leftCorner.y - upperLip.y) / mouthWidth;
    const rightCornerElevation = (rightCorner.y - upperLip.y) / mouthWidth;
    const avgCornerElevation = (leftCornerElevation + rightCornerElevation) / 2;
    
    this.updateSmileHistory(avgCornerElevation);
    
    if (this.smileHistory.length < 3) return { isSmiling: false, intensity: 0 };
    
    const avgElevation = this.smileHistory.reduce((sum, val) => sum + val, 0) / this.smileHistory.length;
    const isSmiling = avgElevation < -this.SMILE_THRESHOLD;
    const intensity = Math.abs(Math.min(avgElevation + this.SMILE_THRESHOLD, 0)) * 50;
    
    return { 
      isSmiling, 
      intensity: Math.min(intensity, 1.0),
      elevation: avgCornerElevation 
    };
  }

  updateEyebrowHistory(leftRatio, rightRatio, avgRatio) {
    this.leftEyebrowRatioHistory.push(leftRatio);
    this.rightEyebrowRatioHistory.push(rightRatio);
    this.avgEyebrowRatioHistory.push(avgRatio);
    
    if (this.leftEyebrowRatioHistory.length > this.EYEBROW_HISTORY_SIZE) {
      this.leftEyebrowRatioHistory.shift();
      this.rightEyebrowRatioHistory.shift();
      this.avgEyebrowRatioHistory.shift();
    }
  }

  updateSmileHistory(cornerElevation) {
    this.smileHistory.push(cornerElevation);
    if (this.smileHistory.length > this.SMILE_HISTORY_SIZE) {
      this.smileHistory.shift();
    }
  }

  detectGestures(landmarks) {
    // Calculate basic ratios and poses
    const eyebrowRatio = this.calculateEyebrowRatio(landmarks);
    const mouthRatio = this.calculateMouthRatio(landmarks);
    const headPose = this.calculateHeadPose(landmarks);

    // Detect specific gestures
    const blinkState = this.detectBlink(landmarks);
    const smileState = this.detectSmile(landmarks);

    // Calculate EAR for additional blink info
    const leftEAR = this.calculateEAR(landmarks, [33, 7, 163, 144, 145, 153]);
    const rightEAR = this.calculateEAR(landmarks, [362, 382, 381, 380, 374, 373]);
    const avgEAR = (leftEAR + rightEAR) / 2;

    return {
      eyebrowRatio,
      mouthRatio,
      headPose,
      blink: blinkState,
      smile: smileState,
      ear: avgEAR
    };
  }

  calculateEAR(landmarks, indices) {
    const [p1, p2, p3, p4, p5, p6] = indices.map(i => landmarks[i]);
    
    const vertical1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
    const vertical2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
    const horizontal = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));
    
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  calculateEyebrowRatio(landmarks) {
    const leftEyebrow = landmarks[70];
    const rightEyebrow = landmarks[300];
    const noseTip = landmarks[1];
    
    const leftDistance = Math.sqrt(
      Math.pow(leftEyebrow.x - noseTip.x, 2) + Math.pow(leftEyebrow.y - noseTip.y, 2)
    );
    const rightDistance = Math.sqrt(
      Math.pow(rightEyebrow.x - noseTip.x, 2) + Math.pow(rightEyebrow.y - noseTip.y, 2)
    );
    
    return (leftDistance + rightDistance) / 2;
  }

  calculateMouthRatio(landmarks) {
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];
    
    const mouthHeight = Math.sqrt(
      Math.pow(upperLip.x - lowerLip.x, 2) + Math.pow(upperLip.y - lowerLip.y, 2)
    );
    const mouthWidth = Math.sqrt(
      Math.pow(leftCorner.x - rightCorner.x, 2) + Math.pow(leftCorner.y - rightCorner.y, 2)
    );
    
    return mouthHeight / mouthWidth;
  }

  calculateHeadPose(landmarks) {
    const noseTip = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[362];
    const chin = landmarks[175];
    
    // Simple head turn estimation based on nose position relative to eyes
    const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
    const headTurn = noseTip.x - eyeCenter.x;
    
    // Head tilt estimation based on nose-chin line
    const headTilt = noseTip.y - chin.y;
    
    // Head roll estimation based on eye level
    const headRoll = leftEye.y - rightEye.y;
    
    return { turn: headTurn, tilt: headTilt, roll: headRoll };
  }
}

// =============================================================================
// MOVEMENT CONTROLLER CLASS
// =============================================================================

export class MovementController {
  constructor(config = {}) {
    this.position = { x: 0, y: 1, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.cameraRotationY = 0;
    
    // Sensitivity settings (with defaults)
    this.movementSensitivity = config.movementSensitivity || 0.3;
    this.rollSensitivity = config.rollSensitivity || 0.10;
    this.cameraSensitivity = config.cameraSensitivity || 2.0;
    
    // Movement constants
    this.BASE_MOVEMENT_SPEED = config.baseMovementSpeed || 0.05;
    this.CAMERA_ROTATION_SPEED = config.cameraRotationSpeed || 2.0;
    this.MOVEMENT_THRESHOLD = config.movementThreshold || 0.015;
    this.TURN_THRESHOLD = config.turnThreshold || 0.08;
    this.ROLL_THRESHOLD = config.rollThreshold || 0.02;
    this.THRESHOLD_SMOOTHING = config.thresholdSmoothing || 3.0;
    
    // Movement mode settings
    this.cameraRelativeMovement = config.cameraRelativeMovement !== undefined ? config.cameraRelativeMovement : true;
    this.invertCameraControls = config.invertCameraControls || false;
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

  applyAccelerationCurve(movement, power = 1.2) {
    const absMovement = Math.abs(movement);
    if (absMovement === 0) return 0;
    
    const accelerationFactor = Math.pow(absMovement, power);
    return Math.sign(movement) * accelerationFactor;
  }

  updateMovement(headMovement, targetObject) {
    const filteredHeadTurnAngle = this.applyTurnThreshold(headMovement.turn);
    const filteredHeadTiltMovement = this.applyMovementThreshold(headMovement.tilt);
    const filteredHeadRollMovement = this.applyRollThreshold(headMovement.roll);

    const acceleratedTiltMovement = this.applyAccelerationCurve(filteredHeadTiltMovement, 1.2);
    const acceleratedRollMovement = this.applyAccelerationCurve(filteredHeadRollMovement, 1.1);
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
    const filteredCameraInput = this.applyTurnThreshold(headMovement.turn);
    
    if (this.cameraRelativeMovement) {
      if (Math.abs(filteredCameraInput) > 0) {
        const acceleratedCameraInput = this.applyAccelerationCurve(filteredCameraInput, 1.3);
        const rotationDirection = this.invertCameraControls ? -1 : 1;
        this.cameraRotationY += acceleratedCameraInput * this.CAMERA_ROTATION_SPEED * this.cameraSensitivity * rotationDirection;
      }
    } else {
      const cameraRotation = (this.invertCameraControls ? -filteredCameraInput : filteredCameraInput) * this.cameraSensitivity;
      this.cameraRotationY = cameraRotation;
    }

    // Apply velocity damping
    this.velocity.x *= 0.95;
    this.velocity.y *= 0.90;
    this.velocity.z *= 0.95;

    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.position.z += this.velocity.z;

    // Ensure object doesn't go below ground
    this.position.y = Math.max(0.5, this.position.y);

    // Update target object position
    if (targetObject) {
      targetObject.position.set(this.position.x, this.position.y, this.position.z);
    }
  }

  updateCameraFollow(camera, followDistance = 5, heightOffset = 2) {
    const distance = followDistance;
    const rotatedDistance = distance;
    
    const targetCameraX = this.position.x + Math.sin(this.cameraRotationY) * rotatedDistance;
    const targetCameraY = this.position.y + heightOffset;
    const targetCameraZ = this.position.z + Math.cos(this.cameraRotationY) * rotatedDistance;
    
    camera.position.set(targetCameraX, targetCameraY, targetCameraZ);
    camera.lookAt(this.position.x, this.position.y, this.position.z);
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
}

// =============================================================================
// VISUAL EFFECTS CLASS
// =============================================================================

export class VisualEffects {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.ground = null;
    this.blinkCircles = [];
    this.wowTexts = [];
    this.config = config;
    this.setupGround();
  }

  setupGround() {
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: this.config.groundColor || 0x90EE90 
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  changePlaneColor() {
    const randomColor = Math.random() * 0xffffff;
    this.ground.material.color.setHex(randomColor);
    console.log(`Plane color changed to: #${randomColor.toString(16).padStart(6, '0')}`);
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

  updateBlinkCircles() {
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

  createWowText() {
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

  create2DSmileyFace() {
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

  create2DFrownFace() {
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
}

// =============================================================================
// MOUTH SMOOTHING UTILITY
// =============================================================================

export class MouthSmoother {
  constructor(historySize = 8, changeThreshold = 0.4) {
    this.mouthOpenHistory = [];
    this.MOUTH_HISTORY_SIZE = historySize;
    this.MOUTH_CHANGE_THRESHOLD = changeThreshold;
    this.lastSmoothedMouthValue = 1.0;
  }

  smoothMouthOpening(rawMouthValue) {
    this.mouthOpenHistory.push(rawMouthValue);
    
    if (this.mouthOpenHistory.length > this.MOUTH_HISTORY_SIZE) {
      this.mouthOpenHistory.shift();
    }
    
    const changeFromLast = Math.abs(rawMouthValue - this.lastSmoothedMouthValue);
    
    if (changeFromLast > this.MOUTH_CHANGE_THRESHOLD && this.mouthOpenHistory.length >= 3) {
      const recent = this.mouthOpenHistory.slice(-3);
      const isConsistent = recent.every(val => 
        Math.abs(val - rawMouthValue) < this.MOUTH_CHANGE_THRESHOLD * 0.5
      );
      
      if (!isConsistent) {
        const dampingFactor = 0.1;
        return this.lastSmoothedMouthValue + (rawMouthValue - this.lastSmoothedMouthValue) * dampingFactor;
      }
    }
    
    const average = this.mouthOpenHistory.reduce((sum, val) => sum + val, 0) / this.mouthOpenHistory.length;
    const smoothingFactor = 0.7;
    const smoothedValue = this.lastSmoothedMouthValue * (1 - smoothingFactor) + average * smoothingFactor;
    
    this.lastSmoothedMouthValue = smoothedValue;
    return smoothedValue;
  }
}

// =============================================================================
// SCENE SETUP CLASS
// =============================================================================

export class SceneSetup {
  constructor(config = {}) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.orbitControls = null;
    this.cube = null;
    this.ground = null;
    
    this.setupRenderer();
    this.setupScene(config);
    this.setupLighting(config.lighting);
    this.setupCamera(config.camera);
    this.setupControls(config.controls);
  }

  setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x111111);
    document.body.appendChild(this.renderer.domElement);
  }

  setupScene(config) {
    // Background
    this.scene.background = new THREE.Color(config.backgroundColor || 0x111111);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Create cube with pastel colors
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterials = [
      new THREE.MeshPhongMaterial({ color: 0xff8f8f }), // Right face - Light Pink rgb(255, 143, 143)
      new THREE.MeshPhongMaterial({ color: 0xfff1cb }), // Left face - Light Yellow rgb(255, 241, 203)
      new THREE.MeshPhongMaterial({ color: 0xc2e2fa }), // Top face - Light Blue rgb(194, 226, 250)
      new THREE.MeshPhongMaterial({ color: 0xb7a3e3 }), // Bottom face - Light Purple rgb(183, 163, 227)
      new THREE.MeshPhongMaterial({ color: 0xf5d2d2 }), // Front face - Pale Pink rgb(245, 210, 210)
      new THREE.MeshPhongMaterial({ color: 0xffc7a7 })  // Back face - Light Orange rgb(255, 199, 167)
    ];

    this.cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
    this.cube.position.y = 1;
    this.cube.castShadow = true;
    this.scene.add(this.cube);
  }

  setupLighting(lightingConfig = {}) {
    // Bright ambient light for proper color display
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  setupCamera(cameraConfig = {}) {
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, 0);
  }

  setupControls(controlsConfig = {}) {
    // Import OrbitControls dynamically
    import('three/addons/controls/OrbitControls.js').then(({ OrbitControls }) => {
      this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
      this.orbitControls.enableDamping = true;
      this.orbitControls.dampingFactor = 0.05;
      this.orbitControls.enableZoom = controlsConfig.enableZoom !== false;
      this.orbitControls.enablePan = controlsConfig.enablePan !== false;
      this.orbitControls.maxPolarAngle = Math.PI / 2;
    });
  }

  render() {
    if (this.orbitControls) this.orbitControls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// =============================================================================
// FACE TRACKING APPLICATION CLASS
// =============================================================================

export class FaceTrackingApp {
  constructor(config = {}) {
    this.config = config;
    this.sceneSetup = new SceneSetup(config.scene);
    this.calibration = new CalibrationSystem();
    this.gestureDetector = new GestureDetector(this.calibration);
    this.movementController = new MovementController(config.movement);
    this.visualEffects = new VisualEffects(this.sceneSetup.scene, { 
      ground: this.sceneSetup.ground,
      ...config.effects 
    });
    this.mouthSmoother = new MouthSmoother(config.mouthHistorySize, config.mouthChangeThreshold);
    
    this.faceMesh = null;
    this.isInitialized = false;
    this.lastEyebrowTime = 0;
    
    this.setupEventListeners();
  }

  async initialize() {
    try {
      await this.initializeMediaPipe();
      await this.initializeCamera();
      this.startRenderLoop();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Initialization failed:', error);
      return false;
    }
  }

  async initializeMediaPipe() {
    return new Promise((resolve, reject) => {
      this.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results) => this.onResults(results));
      
      setTimeout(resolve, 100); // Give MediaPipe time to initialize
    });
  }

  async initializeCamera() {
    const video = document.getElementById('video');
    if (!video) {
      throw new Error('Video element not found');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      video.srcObject = stream;
      
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play();
          this.startProcessingLoop(video);
          resolve();
        };
        video.onerror = reject;
      });
    } catch (error) {
      throw new Error(`Camera access failed: ${error.message}`);
    }
  }

  startProcessingLoop(video) {
    const processFrame = async () => {
      if (video.readyState === 4) {
        await this.faceMesh.send({ image: video });
      }
      requestAnimationFrame(processFrame);
    };
    processFrame();
  }

  onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      this.processLandmarks(landmarks);
      this.drawLandmarks(results);
    }
  }

  processLandmarks(landmarks) {
    const gestures = this.gestureDetector.detectGestures(landmarks);
    
    // Calibration
    if (!this.calibration.isCalibrated) {
      this.calibration.addSample(
        gestures.eyebrowRatio,
        gestures.headPose.turn,
        gestures.headPose.tilt,
        gestures.headPose.roll
      );
      this.updateCalibrationStatus();
      return;
    }

    // Get calibrated movements
    const eyebrowRaise = this.calibration.getEyebrowRaise(gestures.eyebrowRatio);
    const headMovement = this.calibration.getHeadMovement(
      gestures.headPose.turn,
      gestures.headPose.tilt,
      gestures.headPose.roll
    );

    // Apply movements
    this.movementController.updatePosition(this.sceneSetup.cube, headMovement);
    this.movementController.updateCamera(this.sceneSetup.camera, this.sceneSetup.orbitControls);

    // Handle gestures
    this.handleGestures(gestures, eyebrowRaise);
  }

  handleGestures(gestures, eyebrowRaise) {
    // Mouth control for cube scaling
    const smoothedMouthValue = this.mouthSmoother.smoothMouthValue(gestures.mouthRatio);
    const mouthScale = 1 + smoothedMouthValue * 3;
    this.sceneSetup.cube.scale.setScalar(mouthScale);

    // Eyebrow control for plane color change
    if (eyebrowRaise > 0.003) {
      const currentTime = performance.now();
      if (currentTime - this.lastEyebrowTime > 1000) {
        this.visualEffects.changePlaneColor();
        this.lastEyebrowTime = currentTime;
      }
    }

    // Blink detection for spawning circles
    if (gestures.blink.isNewBlink) {
      this.visualEffects.spawnCircle();
    }

    // Update visual effects
    this.visualEffects.updateCircles();
  }

  drawLandmarks(results) {
    const meshCanvas = document.getElementById('mesh-canvas');
    if (!meshCanvas) return;

    const ctx = meshCanvas.getContext('2d');
    ctx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Draw key points
      ctx.fillStyle = '#00FF88';
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 1;

      // Draw some key facial landmarks
      const keyPoints = [33, 362, 1, 61, 291, 13, 14]; // Eyes, nose, mouth corners
      keyPoints.forEach(index => {
        const point = landmarks[index];
        const x = point.x * meshCanvas.width;
        const y = point.y * meshCanvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  }

  updateCalibrationStatus() {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      const progress = this.calibration.getProgress();
      statusDiv.textContent = `Calibrating... ${progress}%`;
      
      if (this.calibration.isCalibrated) {
        statusDiv.textContent = 'Calibration complete! Face tracking active.';
        statusDiv.style.color = '#00FF00';
      }
    }
  }

  startRenderLoop() {
    const animate = () => {
      this.sceneSetup.render();
      requestAnimationFrame(animate);
    };
    animate();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.sceneSetup.onWindowResize();
    });
  }

  // Public API methods
  setSensitivity(value) {
    this.movementController.sensitivity = value;
  }

  setRollSensitivity(value) {
    this.movementController.rollSensitivity = value;
  }

  setCameraSensitivity(value) {
    this.movementController.cameraSensitivity = value;
  }

  setCameraRelativeMovement(enabled) {
    this.movementController.cameraRelativeMovement = enabled;
  }

  setInvertCameraControls(enabled) {
    this.movementController.invertCameraControls = enabled;
  }
}

// =============================================================================
// CONVENIENCE FACTORY FUNCTIONS
// =============================================================================

export function createFaceTracker(config = {}) {
  const calibration = new CalibrationSystem();
  const gestures = new GestureDetector(calibration);
  const movement = new MovementController(config.movement);
  const effects = config.scene ? new VisualEffects(config.scene, config.effects) : null;
  const mouthSmoother = new MouthSmoother(config.mouthHistorySize, config.mouthChangeThreshold);

  return {
    calibration,
    gestures,
    movement,
    effects,
    mouthSmoother,
    
    // Convenience methods
    isCalibrated: () => calibration.isCalibrated,
    processLandmarks: (landmarks, targetObject, camera) => {
      // This would contain the main processing logic
      // Extracted from onResults function
    }
  };
}

export function createBasicFaceTracker(config = {}) {
  const defaultConfig = {
    scene: {
      backgroundColor: 0x87CEEB,
      lighting: { ambient: 0.8, directional: 0.6 }
    },
    movement: {
      sensitivity: 0.3,
      rollSensitivity: 0.10,
      cameraSensitivity: 1.0
    }
  };
  
  return new FaceTrackingApp({ ...defaultConfig, ...config });
}

export function createAdvancedFaceTracker(config = {}) {
  const defaultConfig = {
    scene: {
      backgroundColor: 0x111111,
      lighting: { ambient: 0.8, directional: 0.6 },
      controls: { enableZoom: true, enablePan: true }
    },
    movement: {
      sensitivity: 0.3,
      rollSensitivity: 0.10,
      cameraSensitivity: 1.0,
      cameraRelativeMovement: true,
      invertCameraControls: false
    },
    effects: {
      groundColor: 0x90EE90
    }
  };
  
  return new FaceTrackingApp({ ...defaultConfig, ...config });
}

// =============================================================================
// SIMPLE FACE DETECTION FACTORY
// =============================================================================

export class SimpleFaceDetector {
  constructor() {
    this.calibration = new CalibrationSystem();
    this.gestureDetector = new GestureDetector(this.calibration);
    this.mouthSmoother = new MouthSmoother();
    this.faceMesh = null;
    this.cameraUtils = null;
    this.onLandmarksCallback = null;
  }

  async initializeCamera(videoElementId = 'video', meshCanvasId = 'mesh-canvas') {
    // Check if MediaPipe libraries are loaded
    if (typeof FaceMesh === 'undefined' || typeof Camera === 'undefined') {
      throw new Error('MediaPipe libraries not loaded. Please check your internet connection.');
    }

    const videoElement = document.getElementById(videoElementId);
    const meshCanvas = document.getElementById(meshCanvasId);
    
    if (!videoElement || !meshCanvas) {
      throw new Error(`Video element (${videoElementId}) or mesh canvas (${meshCanvasId}) not found`);
    }

    // MediaPipe FaceMesh setup
    this.faceMesh = new FaceMesh({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }});
    
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results) => this.onResults(results, meshCanvas));

    // Start camera
    this.cameraUtils = new Camera(videoElement, {
      onFrame: async () => { 
        try {
          await this.faceMesh.send({image: videoElement}); 
        } catch (error) {
          console.error('Error sending frame to FaceMesh:', error);
        }
      },
      width: 640,
      height: 480
    });
    
    await this.cameraUtils.start();
    return this;
  }

  onResults(results, meshCanvas) {
    // Clear the canvas
    const meshCtx = meshCanvas.getContext('2d');
    meshCtx.clearRect(0, 0, meshCanvas.width, meshCanvas.height);
    
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    try {
      const landmarks = results.multiFaceLandmarks[0];

      // Draw face mesh (optional - can be disabled)
      if (this.shouldDrawMesh) {
        this.drawFaceMesh(meshCtx, landmarks, meshCanvas.width, meshCanvas.height);
      }

      // Process landmarks and call user callback
      if (this.onLandmarksCallback) {
        const processedData = this.processLandmarks(landmarks);
        this.onLandmarksCallback(processedData, landmarks);
      }
      
    } catch (error) {
      console.error('Error processing face landmarks:', error);
    }
  }

  processLandmarks(landmarks) {
    // Use library methods to get processed data
    const eyebrowRatio = this.gestureDetector.calculateEyebrowRatio(landmarks);
    const mouthRatio = this.gestureDetector.calculateMouthRatio(landmarks);
    const headPose = this.gestureDetector.calculateHeadPose(landmarks);
    const blinkResult = this.gestureDetector.detectBlink(landmarks);

    // Apply sketch.js style conversions
    const rawMouthOpen = Math.min(mouthRatio / 0.3, 3.0);
    const smoothedMouthOpen = this.mouthSmoother.smoothMouthOpening(rawMouthOpen);

    return {
      // Calibration status
      isCalibrated: this.calibration.isCalibrated,
      calibrationProgress: this.calibration.getProgress(),
      
      // Raw measurements
      eyebrowRatio,
      mouthRatio,
      headPose,
      
      // Processed data (sketch.js style)
      mouthOpenness: smoothedMouthOpen,
      blink: blinkResult,
      
      // Relative movements (only if calibrated)
      headMovement: this.calibration.isCalibrated ? {
        turn: (headPose.turn - this.calibration.headTurnBaseline) * Math.PI * 4,
        tilt: (headPose.tilt - this.calibration.headTiltBaseline) * Math.PI * 4,
        roll: (headPose.roll - this.calibration.headRollBaseline) * 2
      } : null,
      
      eyebrowRaise: this.calibration.isCalibrated ? {
        movement: this.calibration.eyebrowBaseline - eyebrowRatio,
        intensity: Math.max(0, Math.min((this.calibration.eyebrowBaseline - eyebrowRatio) * 50, 1.0)),
        shouldToggleWireframe: Math.max(0, Math.min((this.calibration.eyebrowBaseline - eyebrowRatio) * 50, 1.0)) > 0.91
      } : null
    };
  }

  // Calibration helper
  addCalibrationSample(landmarks) {
    if (!this.calibration.isCalibrated) {
      const eyebrowRatio = this.gestureDetector.calculateEyebrowRatio(landmarks);
      const headPose = this.gestureDetector.calculateHeadPose(landmarks);
      this.calibration.addSample(eyebrowRatio, headPose.turn, headPose.tilt, headPose.roll);
    }
  }

  // Set callback for when landmarks are processed
  onLandmarks(callback) {
    this.onLandmarksCallback = callback;
    return this;
  }

  // Enable/disable mesh drawing
  enableMeshDrawing(enabled = true) {
    this.shouldDrawMesh = enabled;
    return this;
  }

  drawFaceMesh(ctx, landmarks, width, height) {
    // Same comprehensive face mesh drawing as sketch.js
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
    [1, 234, 454].forEach(pointIndex => {
      const point = landmarks[pointIndex];
      if (point) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#FF00FF';
    [13, 14, 61, 291].forEach(pointIndex => {
      const point = landmarks[pointIndex];
      if (point) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#00FF88';
    [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 300, 293, 334, 296, 336, 285, 295, 282, 283, 276].forEach(pointIndex => {
      const point = landmarks[pointIndex];
      if (point) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }
}

// Factory function for simple face detection
export function createSimpleFaceDetector() {
  return new SimpleFaceDetector();
}

// =============================================================================
// SIMPLE SCENE MANAGER
// =============================================================================

export class SimpleSceneManager {
  constructor(config = {}) {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.cube = null;
    this.visualEffects = null;
    
    this.config = {
      backgroundColor: config.backgroundColor || 0x222222,
      cameraPosition: config.cameraPosition || { x: 0, y: 0, z: 2 },
      enableControls: config.enableControls !== false,
      cubeColors: config.cubeColors || [
        0xff8f8f, // Right face - Light Pink
        0xfff1cb, // Left face - Light Yellow  
        0xc2e2fa, // Top face - Light Blue
        0xb7a3e3, // Bottom face - Light Purple
        0xf5d2d2, // Front face - Pale Pink
        0xffc7a7  // Back face - Light Orange
      ],
      ...config
    };
    
    this.initializeThreeJS();
  }

  initializeThreeJS() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(
      this.config.cameraPosition.x,
      this.config.cameraPosition.y,
      this.config.cameraPosition.z
    );

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Controls setup
    if (this.config.enableControls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
    }

    // Create cube with custom colors
    this.createCube();

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    this.scene.add(light);

    // Initialize visual effects
    this.visualEffects = new VisualEffects(this.scene);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start animation loop
    this.animate();
  }

  createCube() {
    const geometry = new THREE.BoxGeometry();
    const materials = this.config.cubeColors.map(color => 
      new THREE.MeshBasicMaterial({ color })
    );

    this.cube = new THREE.Mesh(geometry, materials);
    this.scene.add(this.cube);
  }

  // Cube control methods (sketch.js style)
  setCubeRotation(x, y, z) {
    this.cube.rotation.set(x, y, z);
  }

  setCubeScale(scale) {
    this.cube.scale.setScalar(Math.max(0.3, scale));
  }

  setCubeWireframe(enabled) {
    this.cube.material.forEach(mat => {
      mat.wireframe = enabled;
    });
  }

  // Visual effects methods
  createBlinkCircle() {
    return this.visualEffects.createBlinkCircle();
  }

  updateBlinkCircles() {
    this.visualEffects.updateBlinkCircles();
  }

  // Movement style methods (sketch-movement.js style)
  addGroundPlane() {
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: this.config.groundColor || 0x90EE90 
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    return this.ground;
  }

  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
  }

  setCubePosition(x, y, z) {
    this.cube.position.set(x, y, z);
  }

  enableShadows() {
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.cube.castShadow = true;
    if (this.ground) {
      this.ground.receiveShadow = true;
    }
  }

  // Enhanced lighting for movement style
  setupMovementLighting() {
    // Clear existing lights
    this.scene.children = this.scene.children.filter(child => !(child instanceof THREE.Light));
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  // Animation loop
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update visual effects
    this.visualEffects.updateBlinkCircles();
    
    // Update controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Getters for accessing components
  getScene() { return this.scene; }
  getCamera() { return this.camera; }
  getRenderer() { return this.renderer; }
  getCube() { return this.cube; }
  getGround() { return this.ground; }
  getVisualEffects() { return this.visualEffects; }
}

// Factory function for simple scene manager
export function createSimpleScene(config = {}) {
  return new SimpleSceneManager(config);
}

export default {
  CalibrationSystem,
  GestureDetector,
  MovementController,
  VisualEffects,
  MouthSmoother,
  SceneSetup,
  FaceTrackingApp,
  SimpleFaceDetector,
  SimpleSceneManager,
  createFaceTracker,
  createBasicFaceTracker,
  createAdvancedFaceTracker,
  createSimpleFaceDetector,
  createSimpleScene
};