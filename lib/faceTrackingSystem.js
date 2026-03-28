// =============================================================================
// MEDIAPIPE FACE TRACKING CLASS
// Unified class for MediaPipe setup and face mesh visualization
// =============================================================================

export class MediaPipeFaceTracking {
  constructor(options = {}) {
    // Configuration
    this.config = {
      maxNumFaces: options.maxNumFaces || 1,
      refineLandmarks: options.refineLandmarks !== false,
      minDetectionConfidence: options.minDetectionConfidence || 0.5,
      minTrackingConfidence: options.minTrackingConfidence || 0.5,
      cameraWidth: options.cameraWidth || 640,
      cameraHeight: options.cameraHeight || 480,
      drawMesh: options.drawMesh !== false,
      showVideo: options.showVideo !== false
    };

    // MediaPipe components
    this.faceMesh = null;
    this.cameraUtils = null;
    this.videoElement = null;
    this.meshCanvas = null;
    this.meshCtx = null;

    // Callbacks
    this.onResultsCallback = null;
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  initialize(onResultsCallback) {
    // Check if MediaPipe libraries are loaded
    if (typeof FaceMesh === 'undefined' || typeof Camera === 'undefined') {
      throw new Error('MediaPipe libraries not loaded. Check internet connection.');
    }

    // Get HTML elements
    this.videoElement = document.getElementById('video');
    this.meshCanvas = document.getElementById('mesh-canvas');

    if (!this.videoElement || !this.meshCanvas) {
      throw new Error('Video element or mesh canvas not found in HTML');
    }

    this.meshCtx = this.meshCanvas.getContext('2d');
    this.onResultsCallback = onResultsCallback;

    // Create FaceMesh
    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    this.faceMesh.setOptions({
      maxNumFaces: this.config.maxNumFaces,
      refineLandmarks: this.config.refineLandmarks,
      minDetectionConfidence: this.config.minDetectionConfidence,
      minTrackingConfidence: this.config.minTrackingConfidence
    });

    // Set up results callback
    this.faceMesh.onResults((results) => {
      this.processResults(results);
    });

    // Create Camera
    this.cameraUtils = new Camera(this.videoElement, {
      onFrame: async () => {
        try {
          await this.faceMesh.send({ image: this.videoElement });
        } catch (error) {
          console.error('Error sending frame to FaceMesh:', error);
        }
      },
      width: this.config.cameraWidth,
      height: this.config.cameraHeight
    });

    // Start camera
    this.cameraUtils.start().catch((error) => {
      const msg = `Camera error: ${error.message}. Allow camera access and refresh.`;
      console.error(msg);
      const errorDiv = document.getElementById('error');
      if (errorDiv) {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
      }
      const centerStatus = document.getElementById('center-status');
      if (centerStatus) {
        centerStatus.textContent = msg;
        centerStatus.style.color = '#ffb4b4';
      }
    });

    // Apply video visibility
    this.setVideoVisibility(this.config.showVideo);
  }

  // =============================================================================
  // RESULTS PROCESSING
  // =============================================================================

  processResults(results) {
    // Clear canvas
    this.meshCtx.clearRect(0, 0, this.meshCanvas.width, this.meshCanvas.height);

    // Draw face mesh if enabled
    if (this.config.drawMesh && results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      this.drawFaceMesh(landmarks);
    }

    // Call user callback
    if (this.onResultsCallback) {
      this.onResultsCallback(results, this.meshCtx, this.meshCanvas);
    }
  }

  // =============================================================================
  // FACE MESH DRAWING
  // =============================================================================

  drawFaceMesh(landmarks) {
    const ctx = this.meshCtx;
    const width = this.meshCanvas.width;
    const height = this.meshCanvas.height;

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#FF0000';

    // Draw all landmarks as points
    for (let i = 0; i < landmarks.length; i++) {
      const x = landmarks[i].x * width;
      const y = landmarks[i].y * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw face contour
    const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 
                      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 
                      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
    
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1;
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
    const lips = [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318, 78, 95, 
                  88, 178, 87, 14, 317, 402, 318, 324, 308, 375, 321, 308, 324, 318, 61];
    
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
    this.drawTrackingPoints(landmarks, width, height);
  }

  drawTrackingPoints(landmarks, width, height) {
    const ctx = this.meshCtx;

    // Head tracking points (yellow)
    ctx.fillStyle = '#FFFF00';
    const headTrackingPoints = [1, 234, 454];
    headTrackingPoints.forEach(pointIndex => {
      const point = landmarks[pointIndex];
      if (point) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Mouth tracking points (magenta)
    ctx.fillStyle = '#FF00FF';
    const mouthTrackingPoints = [13, 14, 61, 291];
    mouthTrackingPoints.forEach(pointIndex => {
      const point = landmarks[pointIndex];
      if (point) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Eyebrow tracking points (green-cyan)
    ctx.fillStyle = '#00FF88';
    const eyebrowTrackingPoints = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 
                                   300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
    eyebrowTrackingPoints.forEach(pointIndex => {
      const point = landmarks[pointIndex];
      if (point) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  enableMeshDrawing() {
    this.config.drawMesh = true;
  }

  disableMeshDrawing() {
    this.config.drawMesh = false;
  }

  showVideo() {
    this.setVideoVisibility(true);
  }

  hideVideo() {
    this.setVideoVisibility(false);
  }

  setVideoVisibility(visible) {
    if (this.videoElement) {
      this.videoElement.style.display = visible ? 'block' : 'none';
    }
    this.config.showVideo = visible;
  }

  setMeshCanvasVisibility(visible) {
    if (this.meshCanvas) {
      this.meshCanvas.style.display = visible ? 'block' : 'none';
    }
  }

  setConfidenceThresholds(detection, tracking) {
    if (this.faceMesh) {
      this.faceMesh.setOptions({
        minDetectionConfidence: detection,
        minTrackingConfidence: tracking
      });
    }
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================

  dispose() {
    if (this.cameraUtils) {
      this.cameraUtils.stop();
    }
  }
}
