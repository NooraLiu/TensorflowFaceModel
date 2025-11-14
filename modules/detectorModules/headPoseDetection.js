// =============================================================================
// HEAD POSE DETECTION MODULE
// Detects head turn, tilt, and roll from facial landmarks
// =============================================================================

export class HeadPoseDetector {
  constructor() {
    // No state needed for head pose detection
  }

  /**
   * Calculate head pose from landmarks
   * @param {Array} landmarks - MediaPipe face landmarks
   * @returns {Object} {turn, tilt, roll} - Head rotation values
   */
  detectPose(landmarks) {
    const nose = landmarks[1];
    const left = landmarks[234];
    const right = landmarks[454];
    const leftEyeInner = landmarks[33];
    const rightEyeInner = landmarks[362];

    if (!nose || !left || !right || !leftEyeInner || !rightEyeInner) {
      return { turn: 0, tilt: 0, roll: 0 };
    }

    // Head turn (left/right rotation)
    const leftRelativeToNose = left.x - nose.x;
    const rightRelativeToNose = right.x - nose.x;
    const headTurn = (rightRelativeToNose + leftRelativeToNose) / 2;

    // Head tilt (up/down rotation)
    const leftVerticalToNose = left.y - nose.y;
    const rightVerticalToNose = right.y - nose.y;
    const headTilt = (leftVerticalToNose + rightVerticalToNose) / 2;

    // Head roll (side tilt)
    const eyeDeltaX = rightEyeInner.x - leftEyeInner.x;
    const eyeDeltaY = rightEyeInner.y - leftEyeInner.y;
    const headRoll = Math.atan2(eyeDeltaY, eyeDeltaX);

    return {
      turn: headTurn,
      tilt: headTilt,
      roll: headRoll
    };
  }
}

// Legacy function for backward compatibility (can be removed later)
export function calculateHeadPose(landmarks) {
  const detector = new HeadPoseDetector();
  return detector.detectPose(landmarks);
}

/**
 * Calculates eyebrow distance from eye lower lid (for eyebrow raise detection)
 * Note: This function is deprecated - use EyebrowDetector.calculateEyebrowDistance() instead
 * @param {Array} landmarks - MediaPipe face landmarks
 * @returns {number} Average eyebrow-to-lower-lid distance
 */
export function calculateEyebrowRatio(landmarks) {
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
