// =============================================================================
// FACE DETECTORS LIBRARY
// Centralized access to all face detection modules
// Import this single file to get all detectors
// =============================================================================

import { MouthDetector } from '../modules/detectorModules/mouthDetection.js';
import { BlinkDetector } from '../modules/detectorModules/blinkDetection.js';
import { HeadPoseDetector } from '../modules/detectorModules/headPoseDetection.js';
import { EyebrowDetector } from '../modules/detectorModules/eyebrowDetection.js';
import { SmileFrownDetector } from '../modules/detectorModules/smileFrownDetection.js';
import { CalibrationSystem } from '../modules/detectorModules/calibration.js';

// Re-export for individual imports (if needed)
export { MouthDetector, BlinkDetector, HeadPoseDetector, EyebrowDetector, SmileFrownDetector, CalibrationSystem };

/**
 * Main FaceDetectors class - contains all detector instances
 * Use this for a unified interface to all face detection
 */
export class FaceDetectors {
  constructor() {
    // Create all detector instances
    this.mouth = new MouthDetector();
    this.blink = new BlinkDetector();
    this.headPose = new HeadPoseDetector();
    this.eyebrow = new EyebrowDetector();
    this.smileFrown = new SmileFrownDetector();
    this.calibration = new CalibrationSystem();
  }

  /**
   * Calibrate all detectors with a sample
   * @param {Array} landmarks - MediaPipe face landmarks
   */
  addCalibrationSample(landmarks) {
    const eyebrowDistance = this.eyebrow.calculateEyebrowDistance(landmarks);
    const headPose = this.headPose.detectPose(landmarks);
    
    this.calibration.addSample(
      eyebrowDistance,
      headPose.turn,
      headPose.tilt,
      headPose.roll
    );

    // Initialize detectors when calibration completes
    if (this.calibration.isCalibrated) {
      const headPoseBaselines = this.calibration.getHeadPoseBaselines();
      this.eyebrow.setBaselines(this.calibration.eyebrowBaseline, headPoseBaselines);
      this.smileFrown.setBaselines(headPoseBaselines);
    }
  }

  /**
   * Check if calibration is complete
   * @returns {boolean}
   */
  isCalibrated() {
    return this.calibration.isCalibrated;
  }

  /**
   * Get calibration progress percentage
   * @returns {number} Progress from 0 to 100
   */
  getCalibrationProgress() {
    return this.calibration.getProgress();
  }

  /**
   * Detect all face features at once
   * @param {Array} landmarks - MediaPipe face landmarks
   * @returns {Object} All detection results
   */
  detectAll(landmarks) {
    const headPose = this.headPose.detectPose(landmarks);
    const mouth = this.mouth.getMouthData(landmarks);
    const blink = this.blink.detectBlink(landmarks);
    const eyebrowRaised = this.eyebrow.detectRaise(landmarks, headPose);
    const expression = this.smileFrown.detectExpression(landmarks, headPose);

    return {
      headPose,
      mouth,
      blink,
      eyebrowRaised,
      expression
    };
  }

  /**
   * Set eyebrow detection sensitivity
   * @param {number} threshold - Raise threshold (default: 0.01)
   * @param {number} headTolerance - Head pose tolerance (default: 0.05)
   */
  setEyebrowSensitivity(threshold, headTolerance) {
    if (threshold !== undefined) this.eyebrow.setSensitivity(threshold);
    if (headTolerance !== undefined) this.eyebrow.setHeadPoseTolerance(headTolerance);
  }

  /**
   * Set smile/frown detection sensitivity
   * @param {number} headTolerance - Head pose tolerance (default: 0.05)
   */
  setSmileFrownSensitivity(headTolerance) {
    if (headTolerance !== undefined) this.smileFrown.setHeadPoseTolerance(headTolerance);
  }
}

/**
 * Legacy factory function for backward compatibility
 * @returns {Object} Object containing all detector instances
 */
export function createDetectors() {
  const detectors = new FaceDetectors();
  return {
    mouth: detectors.mouth,
    blink: detectors.blink,
    headPose: detectors.headPose,
    eyebrow: detectors.eyebrow,
    smileFrown: detectors.smileFrown,
    calibration: detectors.calibration
  };
}

/**
 * Detector metadata for documentation and debugging
 */
export const DETECTOR_INFO = {
  mouth: {
    class: 'MouthDetector',
    method: 'getMouthData(landmarks)',
    output: { raw: 'number', smoothed: 'number', normalized: 'number' },
    description: 'Detects mouth opening ratio with smoothing'
  },
  blink: {
    class: 'BlinkDetector',
    method: 'detectBlink(landmarks)',
    output: { 
      detected: 'boolean', 
      leftRatio: 'number', 
      rightRatio: 'number',
      leftBlink: 'boolean',
      rightBlink: 'boolean'
    },
    description: 'Detects eye blinks with edge detection'
  },
  headPose: {
    class: 'HeadPoseDetector',
    method: 'detectPose(landmarks)',
    output: { turn: 'number', tilt: 'number', roll: 'number' },
    description: 'Detects head rotation on all three axes'
  },
  eyebrow: {
    class: 'EyebrowDetector',
    method: 'detectRaise(landmarks, headPose)',
    output: 'boolean',
    description: 'Detects eyebrow raises (requires head near calibration pose)',
    sensitivity: {
      raiseThreshold: { default: 0.01, range: '0.005-0.02' },
      headPoseTolerance: { default: 0.05, range: '0.03-0.1' }
    }
  },
  smileFrown: {
    class: 'SmileFrownDetector',
    method: 'detectExpression(landmarks, headPose)',
    output: { 
      smile: { detected: 'boolean', intensity: 'number', elevation: 'number' },
      frown: { detected: 'boolean', intensity: 'number', elevation: 'number' },
      isSymmetrical: 'boolean'
    },
    description: 'Detects smiles and frowns (requires head near calibration pose)',
    sensitivity: {
      smileThreshold: { default: 0.015, range: '0.01-0.03' },
      frownThreshold: { default: -0.01, range: '-0.02 to -0.005' },
      headPoseTolerance: { default: 0.05, range: '0.03-0.1' }
    }
  },
  calibration: {
    class: 'CalibrationSystem',
    methods: [
      'addSample(eyebrowRatio, headTurn, headTilt, headRoll)',
      'getProgress()',
      'getHeadMovement(currentTurn, currentTilt, currentRoll)',
      'shouldToggleWireframe(currentEyebrowRatio)',
      'getHeadPoseBaselines()'
    ],
    description: 'Handles baseline calibration for all detectors',
    properties: {
      isCalibrated: 'boolean',
      eyebrowBaseline: 'number',
      headTurnBaseline: 'number',
      headTiltBaseline: 'number',
      headRollBaseline: 'number'
    }
  }
};
