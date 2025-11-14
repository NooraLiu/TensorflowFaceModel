// =============================================================================
// SMILE/FROWN DETECTION MODULE
// Detects smiles and frowns from mouth corner positions
// Does NOT create visual effects - that's handled separately
// =============================================================================

const SMILE_THRESHOLD = 0.015;  // Threshold for detecting a smile (corner elevation) - lower = more sensitive
const FROWN_THRESHOLD = -0.01; // Threshold for detecting a frown (corner depression)
const SYMMETRY_THRESHOLD = 0.01; // Maximum difference between left/right corners
const HEAD_POSE_TOLERANCE = 0.05; // Maximum deviation from calibration pose

export class SmileFrownDetector {
  constructor() {
    this.smileHistory = [];
    this.SMILE_HISTORY_SIZE = 5;
    
    // Calibration data for head pose constraint
    this.headTurnBaseline = null;
    this.headTiltBaseline = null;
    this.headRollBaseline = null;
    this.isCalibrated = false;
    this.headPoseTolerance = HEAD_POSE_TOLERANCE;
  }

  /**
   * Set calibration baselines (called by CalibrationSystem)
   * @param {Object} headPoseBaseline - {turn, tilt, roll} baseline values
   */
  setBaselines(headPoseBaseline) {
    this.headTurnBaseline = headPoseBaseline.turn;
    this.headTiltBaseline = headPoseBaseline.tilt;
    this.headRollBaseline = headPoseBaseline.roll;
    this.isCalibrated = true;
  }

  /**
   * Detects smile and frown from facial landmarks
   * Only detects when head is near calibration pose (prevents false positives during movement)
   * @param {Array} landmarks - MediaPipe face landmarks
   * @param {Object} currentHeadPose - {turn, tilt, roll} current head pose values
   * @returns {Object} { smile: {detected, intensity, elevation}, frown: {detected, intensity, elevation}, isSymmetrical }
   */
  detectExpression(landmarks, currentHeadPose = null) {
    // Mouth corner and center landmarks
    const leftCorner = landmarks[61];   // Left mouth corner
    const rightCorner = landmarks[291]; // Right mouth corner
    const upperLip = landmarks[13];     // Upper lip center
    const lowerLip = landmarks[14];     // Lower lip center

    if (!leftCorner || !rightCorner || !upperLip || !lowerLip) {
      return {
        smile: { detected: false, intensity: 0, elevation: 0 },
        frown: { detected: false, intensity: 0, elevation: 0 },
        isSymmetrical: false
      };
    }

    // Check if head is near calibration pose (same as eyebrow detection)
    let isHeadNearCalibrationPose = true; // Default to true if not calibrated yet
    if (this.isCalibrated && currentHeadPose) {
      const headTurnDiff = Math.abs(currentHeadPose.turn - this.headTurnBaseline);
      const headTiltDiff = Math.abs(currentHeadPose.tilt - this.headTiltBaseline);
      const headRollDiff = Math.abs(currentHeadPose.roll - this.headRollBaseline);
      
      isHeadNearCalibrationPose = 
        headTurnDiff < this.headPoseTolerance && 
        headTiltDiff < this.headPoseTolerance && 
        headRollDiff < this.headPoseTolerance;
    }

    // Calculate mouth center
    const mouthCenterY = (upperLip.y + lowerLip.y) / 2;
    
    // Calculate corner elevation (positive = corners above center, negative = below)
    const leftCornerElevation = mouthCenterY - leftCorner.y;
    const rightCornerElevation = mouthCenterY - rightCorner.y;
    const avgCornerElevation = (leftCornerElevation + rightCornerElevation) / 2;
    
    // Check symmetry
    const isSymmetrical = Math.abs(leftCornerElevation - rightCornerElevation) < SYMMETRY_THRESHOLD;
    
    // Update history with smoothing
    this.updateSmileHistory(avgCornerElevation);
    
    if (this.smileHistory.length < 3) {
      return {
        smile: { detected: false, intensity: 0, elevation: avgCornerElevation },
        frown: { detected: false, intensity: 0, elevation: avgCornerElevation },
        isSymmetrical
      };
    }
    
    // Calculate average from history for stability
    const avgElevation = this.smileHistory.reduce((sum, val) => sum + val, 0) / this.smileHistory.length;
    
    // Only detect smile/frown when head is near calibration pose
    const smileDetected = isHeadNearCalibrationPose && avgElevation > SMILE_THRESHOLD && isSymmetrical;
    const smileIntensity = smileDetected ? Math.abs(Math.min(avgElevation - SMILE_THRESHOLD, 1)) : 0;
    
    const frownDetected = isHeadNearCalibrationPose && avgElevation < FROWN_THRESHOLD && isSymmetrical;
    const frownIntensity = frownDetected ? Math.abs(Math.max(avgElevation - FROWN_THRESHOLD, -1)) : 0;
    
    return {
      smile: {
        detected: smileDetected,
        intensity: Math.min(smileIntensity * 50, 1.0), // Scale intensity
        elevation: avgElevation
      },
      frown: {
        detected: frownDetected,
        intensity: Math.min(frownIntensity * 50, 1.0), // Scale intensity
        elevation: avgElevation
      },
      isSymmetrical
    };
  }

  updateSmileHistory(cornerElevation) {
    this.smileHistory.push(cornerElevation);
    if (this.smileHistory.length > this.SMILE_HISTORY_SIZE) {
      this.smileHistory.shift();
    }
  }

  /**
   * Get current corner elevation (for debugging)
   * @returns {number} Average from history
   */
  getCornerElevation() {
    if (this.smileHistory.length === 0) return 0;
    return this.smileHistory.reduce((sum, val) => sum + val, 0) / this.smileHistory.length;
  }

  /**
   * Set head pose tolerance for smile/frown detection
   * @param {number} tolerance - Maximum deviation from calibration pose (default: 0.05)
   */
  setHeadPoseTolerance(tolerance) {
    this.headPoseTolerance = tolerance;
    console.log(`Smile/Frown head pose tolerance set to: ${tolerance}`);
  }
}
