// =============================================================================
// EYEBROW DETECTION MODULE
// Pure eyebrow raise detection with configurable sensitivity
// Returns simple boolean: eyebrows raised or not
// =============================================================================

// Configuration constants
const EYEBROW_RAISE_THRESHOLD = 0.01;  // Minimum distance increase from baseline (lower = more sensitive)
const HEAD_POSE_TOLERANCE = 0.05;      // Maximum deviation from calibration pose (lower = stricter)

export class EyebrowDetector {
  constructor() {
    // Sensitivity settings (user-configurable)
    this.raiseThreshold = EYEBROW_RAISE_THRESHOLD;
    this.headPoseTolerance = HEAD_POSE_TOLERANCE;
    
    // Calibration data
    this.baseline = null;
    this.headTurnBaseline = null;
    this.headTiltBaseline = null;
    this.headRollBaseline = null;
    this.isCalibrated = false;
  }

  /**
   * Set calibration baselines (called by CalibrationSystem)
   * @param {number} eyebrowBaseline - Baseline eyebrow distance
   * @param {Object} headPoseBaseline - {turn, tilt, roll} baseline values
   */
  setBaselines(eyebrowBaseline, headPoseBaseline) {
    this.baseline = eyebrowBaseline;
    this.headTurnBaseline = headPoseBaseline.turn;
    this.headTiltBaseline = headPoseBaseline.tilt;
    this.headRollBaseline = headPoseBaseline.roll;
    this.isCalibrated = true;
  }

  /**
   * Calculate eyebrow distance from landmarks
   * @param {Array} landmarks - MediaPipe face landmarks
   * @returns {number} Average eyebrow-to-lower-lid distance
   */
  calculateEyebrowDistance(landmarks) {
    const leftEyebrowBottom = landmarks[55];
    const rightEyebrowBottom = landmarks[285];
    const leftEyeBottom = landmarks[145];
    const rightEyeBottom = landmarks[374];

    if (!leftEyebrowBottom || !rightEyebrowBottom || !leftEyeBottom || !rightEyeBottom) {
      return 0;
    }

    // Distance from eyebrow to eye lower lid
    const leftEyebrowDistance = Math.abs(leftEyebrowBottom.y - leftEyeBottom.y);
    const rightEyebrowDistance = Math.abs(rightEyebrowBottom.y - rightEyeBottom.y);
    
    return (leftEyebrowDistance + rightEyebrowDistance) / 2;
  }

  /**
   * Detect if eyebrows are raised
   * Uses absolute threshold with head pose constraint (same as sketch-movement.js)
   * @param {Array} landmarks - MediaPipe face landmarks
   * @param {Object} currentHeadPose - {turn, tilt, roll} current head pose values
   * @returns {boolean} True if eyebrows are raised
   */
  detectRaise(landmarks, currentHeadPose) {
    if (!this.isCalibrated) {
      return false;
    }

    // Check if head is near calibration pose
    const headTurnDiff = Math.abs(currentHeadPose.turn - this.headTurnBaseline);
    const headTiltDiff = Math.abs(currentHeadPose.tilt - this.headTiltBaseline);
    const headRollDiff = Math.abs(currentHeadPose.roll - this.headRollBaseline);
    
    const isHeadNearCalibrationPose = 
      headTurnDiff < this.headPoseTolerance && 
      headTiltDiff < this.headPoseTolerance && 
      headRollDiff < this.headPoseTolerance;
    
    // Head must be near calibration pose for detection
    if (!isHeadNearCalibrationPose) {
      return false;
    }

    // Calculate current eyebrow distance
    const currentDistance = this.calculateEyebrowDistance(landmarks);
    
    // Check if distance increased above threshold
    const distanceIncrease = currentDistance - this.baseline;
    return distanceIncrease > this.raiseThreshold;
  }

  /**
   * Set eyebrow raise sensitivity
   * @param {number} threshold - Absolute threshold value (default: 0.01, lower = more sensitive)
   */
  setSensitivity(threshold) {
    this.raiseThreshold = threshold;
    console.log(`Eyebrow raise sensitivity set to: ${threshold}`);
  }

  /**
   * Set head pose tolerance for eyebrow detection
   * @param {number} tolerance - Maximum deviation from calibration pose (default: 0.05, lower = stricter)
   */
  setHeadPoseTolerance(tolerance) {
    this.headPoseTolerance = tolerance;
    console.log(`Head pose tolerance set to: ${tolerance}`);
  }

  /**
   * Get current sensitivity settings
   * @returns {Object} {raiseThreshold, headPoseTolerance}
   */
  getSettings() {
    return {
      raiseThreshold: this.raiseThreshold,
      headPoseTolerance: this.headPoseTolerance
    };
  }
}
