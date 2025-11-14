// =============================================================================
// CALIBRATION MODULE
// Handles baseline calibration for eyebrow, head turn, tilt, and roll
// =============================================================================

const CALIBRATION_SAMPLES = 30;
const EYEBROW_WIREFRAME_MULTIPLIER = 50;  // Multiplier for converting eyebrow raise to intensity

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
    
    // Configurable thresholds
    this.wireframeThreshold = 0.91;
  }

  addSample(eyebrowRatio, headTurn, headTilt, headRoll) {
    this.eyebrowReadings.push(eyebrowRatio);
    this.headTurnReadings.push(headTurn);
    this.headTiltReadings.push(headTilt);
    this.headRollReadings.push(headRoll);
    
    if (this.eyebrowReadings.length >= CALIBRATION_SAMPLES) {
      this.calculateBaselines();
      this.isCalibrated = true;
    }
  }

  calculateBaselines() {
    // Sort arrays to find median
    this.eyebrowReadings.sort((a, b) => a - b);
    this.headTurnReadings.sort((a, b) => a - b);
    this.headTiltReadings.sort((a, b) => a - b);
    this.headRollReadings.sort((a, b) => a - b);
    
    // Use median for baseline
    const midIndex = Math.floor(this.eyebrowReadings.length / 2);
    this.eyebrowBaseline = this.eyebrowReadings[midIndex];
    this.headTurnBaseline = this.headTurnReadings[midIndex];
    this.headTiltBaseline = this.headTiltReadings[midIndex];
    this.headRollBaseline = this.headRollReadings[midIndex];
  }

  getProgress() {
    return Math.round((this.eyebrowReadings.length / CALIBRATION_SAMPLES) * 100);
  }

  getHeadMovement(currentTurn, currentTilt, currentRoll) {
    if (!this.isCalibrated) {
      return { turn: 0, tilt: 0, roll: 0 };
    }
    
    // Return raw relative differences - let each example apply their own multipliers
    return {
      turn: currentTurn - this.headTurnBaseline,
      tilt: currentTilt - this.headTiltBaseline,
      roll: currentRoll - this.headRollBaseline
    };
  }

  shouldToggleWireframe(currentEyebrowRatio) {
    if (!this.isCalibrated) return false;
    
    const distanceIncrease = currentEyebrowRatio - this.eyebrowBaseline;
    const intensity = Math.max(0, Math.min(distanceIncrease * EYEBROW_WIREFRAME_MULTIPLIER, 1.0));
    return intensity > this.wireframeThreshold;
  }

  /**
   * Get head pose baselines for eyebrow detector
   * @returns {Object} {turn, tilt, roll} baseline values
   */
  getHeadPoseBaselines() {
    return {
      turn: this.headTurnBaseline,
      tilt: this.headTiltBaseline,
      roll: this.headRollBaseline
    };
  }
}
