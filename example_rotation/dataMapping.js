// =============================================================================
// DATA MAPPING MODULE
// Maps detection data to cube/scene actions
// This is where you configure HOW detected data affects the scene
// =============================================================================

import * as THREE from 'three';
import { getDefaultCubeScale } from './sceneObjects.js';

// =============================================================================
// MOUTH DATA TO CUBE SCALE MAPPING
// =============================================================================

const MAX_MOUTH_SCALE = 3.0;        // Maximum cube scale
const MIN_MOUTH_SCALE = 0.3;        // Minimum cube scale

/**
 * Converts mouth opening data to cube scale
 * @param {Object} mouthData - Data from MouthDetector.getMouthData()
 * @returns {number} Scale value for cube
 */
export function mouthToCubeScale(mouthData) {
  // Use smoothed value directly, just clamp between min and max
  return Math.max(MIN_MOUTH_SCALE, Math.min(mouthData.smoothed, MAX_MOUTH_SCALE));
}

// =============================================================================
// HEAD POSE TO CUBE ROTATION MAPPING
// =============================================================================

const HEAD_ROTATION_MULTIPLIER = Math.PI * 4;  // How much head movement affects rotation
const HEAD_ROLL_MULTIPLIER = 2;

/**
 * Converts head pose data to cube rotation
 * @param {Object} headMovement - Raw relative head movement from CalibrationSystem
 * @returns {Object} { x, y, z } rotation values
 */
export function headPoseToCubeRotation(headMovement) {
  return {
    x: headMovement.tilt * Math.PI * 4,  // Forward/back tilt
    y: headMovement.turn * Math.PI * 4,  // Left/right turn
    z: headMovement.roll * 2             // Side tilt
  };
}

// =============================================================================
// EYEBROW TO WIREFRAME MAPPING
// =============================================================================

const EYEBROW_WIREFRAME_THRESHOLD = 0.91;  // Intensity needed to trigger wireframe

/**
 * Determines if eyebrows are raised enough to toggle wireframe
 * @param {number} eyebrowIntensity - Intensity from 0 to 1
 * @returns {boolean} Should show wireframe
 */
export function eyebrowToWireframe(eyebrowIntensity) {
  return eyebrowIntensity > EYEBROW_WIREFRAME_THRESHOLD;
}

// =============================================================================
// BLINK EFFECT MAPPING
// =============================================================================

const CIRCLE_MAX_AGE = 180;
const CIRCLE_FADE_SPEED = 0.005;
const CIRCLE_SPAWN_RADIUS = 4.0;

export class BlinkEffectManager {
  constructor(scene) {
    this.scene = scene;
    this.circles = [];
  }

  /**
   * Creates a circle effect when a blink is detected
   * @param {Object} blinkData - {detected, leftRatio, rightRatio} from blinkDetection
   */
  onBlinkDetected(blinkData) {
    if (!blinkData || !blinkData.detected) return;
    
    const circle = this.createCircle();
    this.circles.push(circle);
  }

  createCircle() {
    const circle = {
      geometry: new THREE.CircleGeometry(0.1, 32),
      material: new THREE.MeshBasicMaterial({ 
        color: Math.random() * 0xffffff,
        transparent: true,
        opacity: 1.0
      }),
      position: {
        x: (Math.random() - 0.5) * CIRCLE_SPAWN_RADIUS,
        y: (Math.random() - 0.5) * CIRCLE_SPAWN_RADIUS,
        z: (Math.random() - 0.5) * 2
      },
      age: 0,
      maxAge: CIRCLE_MAX_AGE
    };
    
    circle.mesh = new THREE.Mesh(circle.geometry, circle.material);
    circle.mesh.position.set(circle.position.x, circle.position.y, circle.position.z);
    this.scene.add(circle.mesh);
    
    return circle;
  }

  updateCircles() {
    for (let i = this.circles.length - 1; i >= 0; i--) {
      const circle = this.circles[i];
      circle.age++;
      
      const fadeProgress = circle.age / circle.maxAge;
      circle.material.opacity = Math.max(0, 1 - fadeProgress);
      circle.mesh.position.y += CIRCLE_FADE_SPEED;
      
      if (circle.age >= circle.maxAge) {
        this.scene.remove(circle.mesh);
        circle.geometry.dispose();
        circle.material.dispose();
        this.circles.splice(i, 1);
      }
    }
  }
}

// =============================================================================
// SMILE/FROWN MAPPING (Example implementations)
// =============================================================================

/**
 * Maps smile intensity to cube color brightness
 * @param {Object} smileData - {detected, intensity} from SmileFrownDetector
 * @returns {number} Brightness multiplier (1.0 - 2.0)
 */
export function smileToBrightness(smileData) {
  if (!smileData || !smileData.detected) {
    return 1.0;
  }
  
  // Smile makes cube brighter
  return 1.0 + smileData.intensity;
}

/**
 * Maps frown intensity to cube opacity
 * @param {Object} frownData - {detected, intensity} from SmileFrownDetector
 * @returns {number} Opacity value (0.3 - 1.0)
 */
export function frownToOpacity(frownData) {
  if (!frownData || !frownData.detected) {
    return 1.0;
  }
  
  // Frown makes cube more transparent
  return Math.max(0.3, 1.0 - (frownData.intensity * 0.7));
}

// =============================================================================
// EYEBROW RAISE EFFECT MANAGER
// =============================================================================

export class EyebrowEffectManager {
  constructor() {
    this.wowElements = [];
    this.lastWowTime = 0;
    this.WOW_COOLDOWN = 2000;
    this.styleAdded = false;
  }

  /**
   * Creates WOW text when eyebrow raise is detected
   * @param {boolean} detected - Whether eyebrow raise was detected
   */
  onEyebrowRaise(detected) {
    if (!detected) return;
    
    const currentTime = Date.now();
    if ((currentTime - this.lastWowTime) < this.WOW_COOLDOWN) return;
    
    this.createWowText();
    this.lastWowTime = currentTime;
  }

  createWowText() {
    this.ensureStylesAdded();
    
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
    
    document.body.appendChild(wowElement);
    
    setTimeout(() => {
      if (wowElement.parentNode) {
        wowElement.parentNode.removeChild(wowElement);
      }
    }, 2000);
  }

  ensureStylesAdded() {
    if (this.styleAdded) return;
    
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
    this.styleAdded = true;
  }
}

// =============================================================================
// SMILE/FROWN EFFECT MANAGER
// =============================================================================

export class SmileFrownEffectManager {
  constructor() {
    this.lastSmileTime = 0;
    this.lastFrownTime = 0;
    this.SMILE_COOLDOWN = 3000;
    this.FROWN_COOLDOWN = 3000;
    this.stylesAdded = false;
  }

  /**
   * Creates smiley face emoji when smile is detected
   * @param {Object} expressionData - Data from SmileFrownDetector
   */
  onExpressionDetected(expressionData) {
    if (!expressionData) return;
    
    const currentTime = Date.now();
    
    // Check smile
    if (expressionData.smile.detected && 
        expressionData.isSymmetrical && 
        (currentTime - this.lastSmileTime) > this.SMILE_COOLDOWN) {
      this.createSmileyFace();
      this.lastSmileTime = currentTime;
    }
    
    // Check frown
    if (expressionData.frown.detected && 
        expressionData.isSymmetrical && 
        (currentTime - this.lastFrownTime) > this.FROWN_COOLDOWN) {
      this.createFrownFace();
      this.lastFrownTime = currentTime;
    }
  }

  createSmileyFace() {
    this.ensureStylesAdded();
    
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
    
    document.body.appendChild(smileyElement);
    
    setTimeout(() => {
      if (smileyElement.parentNode) {
        smileyElement.parentNode.removeChild(smileyElement);
      }
    }, 3000);
  }

  createFrownFace() {
    this.ensureStylesAdded();
    
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
    
    document.body.appendChild(frownElement);
    
    setTimeout(() => {
      if (frownElement.parentNode) {
        frownElement.parentNode.removeChild(frownElement);
      }
    }, 3000);
  }

  ensureStylesAdded() {
    if (this.stylesAdded) return;
    
    const smileyStyle = document.createElement('style');
    smileyStyle.id = 'smiley-animation-style';
    smileyStyle.textContent = `
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
    document.head.appendChild(smileyStyle);
    
    const frownStyle = document.createElement('style');
    frownStyle.id = 'frown-animation-style';
    frownStyle.textContent = `
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
    document.head.appendChild(frownStyle);
    
    this.stylesAdded = true;
  }
}

// =============================================================================
// CONFIGURATION EXPORTS
// Allow external modification of mapping parameters
// =============================================================================

export const MappingConfig = {
  mouth: {
    maxScale: MAX_MOUTH_SCALE,
    minScale: MIN_MOUTH_SCALE,
    
    // Allow runtime modification
    setMaxScale(value) { MAX_MOUTH_SCALE = value; },
    setMinScale(value) { MIN_MOUTH_SCALE = value; }
  },
  
  head: {
    rotationMultiplier: HEAD_ROTATION_MULTIPLIER,
    rollMultiplier: HEAD_ROLL_MULTIPLIER
  },
  
  eyebrow: {
    wireframeThreshold: EYEBROW_WIREFRAME_THRESHOLD
  },
  
  blinkCircle: {
    maxAge: CIRCLE_MAX_AGE,
    fadeSpeed: CIRCLE_FADE_SPEED,
    spawnRadius: CIRCLE_SPAWN_RADIUS
  }
};

