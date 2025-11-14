// =============================================================================
// MOUTH DETECTION MODULE
// Detects mouth opening and provides raw/smoothed data
// Does NOT control cube scaling - that's handled by the coordinator
// =============================================================================

const MOUTH_HISTORY_SIZE = 8;
const MOUTH_CHANGE_THRESHOLD = 0.4;

export class MouthDetector {
  constructor() {
    this.mouthOpenHistory = [];
    this.lastSmoothedMouthValue = 1.0;
  }

  /**
   * Calculates raw mouth opening ratio from landmarks
   * @param {Array} landmarks - MediaPipe face landmarks
   * @returns {number} Raw mouth opening value (scaled and capped like original)
   */
  calculateMouthRatio(landmarks) {
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const lipCornerLeft = landmarks[61];
    const lipCornerRight = landmarks[291];

    if (!upperLip || !lowerLip || !lipCornerLeft || !lipCornerRight) {
      return 0;
    }

    const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
    const mouthWidth = Math.abs(lipCornerRight.x - lipCornerLeft.x);
    
    // Apply original scaling: divide by (width * 0.3) and cap at 3.0
    const mouthRatio = Math.min(mouthHeight / (mouthWidth * 0.3), 3.0);
    
    return mouthRatio;
  }

  /**
   * Applies smoothing to prevent jittery values and filters out abrupt changes
   * @returns {number} Smoothed mouth opening value
   */
  smoothMouthOpening(rawMouthValue) {
    // Add current value to history
    this.mouthOpenHistory.push(rawMouthValue);
    
    // Limit history size
    if (this.mouthOpenHistory.length > MOUTH_HISTORY_SIZE) {
      this.mouthOpenHistory.shift();
    }
    
    // Check for abrupt changes
    const changeFromLast = Math.abs(rawMouthValue - this.lastSmoothedMouthValue);
    
    // If change is too abrupt, check if it's sustained across multiple frames
    if (changeFromLast > MOUTH_CHANGE_THRESHOLD && this.mouthOpenHistory.length >= 3) {
      // Check if the last 3 values are consistently in the new direction
      const recent = this.mouthOpenHistory.slice(-3);
      const isConsistent = recent.every(val => 
        Math.abs(val - rawMouthValue) < MOUTH_CHANGE_THRESHOLD * 0.5
      );
      
      if (!isConsistent) {
        // Change is not sustained, use a dampened value
        const dampingFactor = 0.1; // How much to blend towards new value
        return this.lastSmoothedMouthValue + (rawMouthValue - this.lastSmoothedMouthValue) * dampingFactor;
      }
    }
    
    // Calculate moving average for sustained changes or small changes
    const average = this.mouthOpenHistory.reduce((sum, val) => sum + val, 0) / this.mouthOpenHistory.length;
    
    // Apply gentle smoothing even for valid changes
    const smoothingFactor = 0.7; // How much weight to give to current average
    const smoothedValue = this.lastSmoothedMouthValue * (1 - smoothingFactor) + average * smoothingFactor;
    
    // Update last smoothed value
    this.lastSmoothedMouthValue = smoothedValue;
    
    return smoothedValue;
  }

  /**
   * Gets mouth opening data - both raw and smoothed
   * @param {Array} landmarks - MediaPipe face landmarks
   * @returns {Object} { raw, smoothed, normalized }
   */
  getMouthData(landmarks) {
    const rawRatio = this.calculateMouthRatio(landmarks);
    const smoothedRatio = this.smoothMouthOpening(rawRatio);
    
    return {
      raw: rawRatio,              // Raw mouth height/width ratio
      smoothed: smoothedRatio,    // Smoothed ratio
      normalized: smoothedRatio   // Normalized for general use
    };
  }
}
