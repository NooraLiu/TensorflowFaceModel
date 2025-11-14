// =============================================================================
// BLINK DETECTION MODULE
// Detects eye blinks from facial landmarks
// Does NOT create visual effects - that's handled separately
// =============================================================================

const BLINK_THRESHOLD = 0.3;  // Relaxed threshold for better detection
const BLINK_COOLDOWN = 80;   // Reduced cooldown for more responsive detection

export class BlinkDetector {
  constructor() {
    this.lastBlinkState = { left: false, right: false };
    this.lastBlinkTime = 0;
  }

  /**
   * Detects eye blinks from landmarks
   * @returns {Object} { detected, leftRatio, rightRatio, leftBlink, rightBlink }
   */
  detectBlink(landmarks) {
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];
    const leftEyeLeft = landmarks[33];
    const leftEyeRight = landmarks[133];
    const rightEyeLeft = landmarks[362];
    const rightEyeRight = landmarks[263];

    if (!leftEyeTop || !leftEyeBottom || !rightEyeTop || !rightEyeBottom ||
        !leftEyeLeft || !leftEyeRight || !rightEyeLeft || !rightEyeRight) {
      return { 
        detected: false, 
        leftRatio: 0, 
        rightRatio: 0,
        leftBlink: false,
        rightBlink: false
      };
    }

    const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
    const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
    const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
    const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
    
    const leftEyeRatio = leftEyeHeight / leftEyeWidth;
    const rightEyeRatio = rightEyeHeight / rightEyeWidth;
    
    const leftBlink = leftEyeRatio < BLINK_THRESHOLD;
    const rightBlink = rightEyeRatio < BLINK_THRESHOLD;
    const bothEyesBlink = leftBlink && rightBlink;
    
    // Edge detection: was open, now closed
    const wasOpen = !this.lastBlinkState.left && !this.lastBlinkState.right;
    const nowClosed = bothEyesBlink;
    const currentTime = Date.now();
    
    let blinkDetected = false;
    if (nowClosed && wasOpen && (currentTime - this.lastBlinkTime) > BLINK_COOLDOWN) {
      blinkDetected = true;
      this.lastBlinkTime = currentTime;
    }
    
    this.lastBlinkState.left = leftBlink;
    this.lastBlinkState.right = rightBlink;
    
    return {
      detected: blinkDetected,
      leftRatio: leftEyeRatio,
      rightRatio: rightEyeRatio,
      leftBlink: leftBlink,
      rightBlink: rightBlink
    };
  }
}
