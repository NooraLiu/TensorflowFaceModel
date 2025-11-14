// =============================================================================
// FACE TRACKING COORDINATOR - MOVEMENT VARIANT
// Processes face landmarks and coordinates all detections for movement control
// =============================================================================

import { mouthToCubeHeight, mouthToCubeScale } from './dataMapping.js';

export function processFaceLandmarks(results, meshCtx, meshCanvas, systems, faceTrackingSystem) {
  const { 
    calibration, 
    mouthDetector, 
    blinkDetector,
    headPoseDetector,
    eyebrowDetector,
    smileFrownDetector,
    blinkEffectManager,
    groundColorManager,
    eyebrowEffectManager,
    smileFrownEffectManager,
    movementController,
    cube,
    camera,
    controls
  } = systems;

  // Note: Canvas is cleared by MediaPipeFaceTracking.processResults()
  
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    return;
  }
  
  try {
    const landmarks = results.multiFaceLandmarks[0];
    
    // STEP 1: DETECT (get raw data from detectors)
    const headPose = headPoseDetector.detectPose(landmarks);
    const mouthData = mouthDetector.getMouthData(landmarks);
    const blinkData = blinkDetector.detectBlink(landmarks);
    const expressionData = smileFrownDetector.detectExpression(landmarks, headPose);
    
    // Calibration phase
    if (!calibration.isCalibrated) {
      const eyebrowDistance = eyebrowDetector.calculateEyebrowDistance(landmarks);
      calibration.addSample(eyebrowDistance, headPose.turn, headPose.tilt, headPose.roll);
      updateCalibrationStatus(calibration.getProgress(), calibration.isCalibrated);
      
      // Keep cube visible during calibration
      cube.rotation.y = 0;
      cube.rotation.x = 0;
      cube.rotation.z = 0;
      
      // Initialize detectors with baselines when calibration completes
      if (calibration.isCalibrated) {
        const headPoseBaselines = calibration.getHeadPoseBaselines();
        eyebrowDetector.setBaselines(calibration.eyebrowBaseline, headPoseBaselines);
        smileFrownDetector.setBaselines(headPoseBaselines);
        updateCalibrationStatus(100, true);
        console.log('All detectors calibrated!');
        console.log('Cube position:', cube.position.x, cube.position.y, cube.position.z);
        console.log('Camera position:', camera.position.x, camera.position.y, camera.position.z);
      }
      
      return;
    }
    
    // STEP 2: DETECT EYEBROW RAISE (simple boolean output)
    const eyebrowRaised = eyebrowDetector.detectRaise(landmarks, headPose);
    
    // STEP 3: MAP (convert detection data to movement)
    const headMovement = calibration.getHeadMovement(headPose.turn, headPose.tilt, headPose.roll);
    const cubeHeight = mouthToCubeHeight(mouthData);
    const cubeScale = mouthToCubeScale(mouthData);
    
    // STEP 4: APPLY (update cube and camera)
    movementController.updateMovement(headMovement, cube);
    movementController.updateCameraFollow(camera, controls);
    
    // Update cube appearance
    cube.position.y = cubeHeight;
    cube.scale.setScalar(cubeScale);
    cube.rotation.y = 0;
    cube.rotation.x = 0;
    cube.rotation.z = 0;
    
    // Debug logging (first frame after calibration)
    if (Math.random() < 0.01) { // Log 1% of frames
      console.log('Cube pos:', cube.position.x.toFixed(2), cube.position.y.toFixed(2), cube.position.z.toFixed(2));
      console.log('Movement pos:', movementController.position.x.toFixed(2), movementController.position.z.toFixed(2));
      console.log('Camera pos:', camera.position.x.toFixed(2), camera.position.y.toFixed(2), camera.position.z.toFixed(2));
    }
    
    // STEP 5: TRIGGER EFFECTS (create visual effects from detections)
    blinkEffectManager.onBlinkDetected(blinkData);
    groundColorManager.onBlinkDetected(blinkData);
    eyebrowEffectManager.onEyebrowRaise(eyebrowRaised);
    smileFrownEffectManager.onExpressionDetected(expressionData);
    
    // Debug logging
    if (blinkData.detected) {
      console.log('Blink detected! L:', blinkData.leftRatio.toFixed(3), 'R:', blinkData.rightRatio.toFixed(3));
    }
    if (eyebrowRaised) {
      console.log('Eyebrows raised!');
    }
    if (expressionData.smile.detected) {
      console.log('Smile detected! Intensity:', expressionData.smile.intensity.toFixed(2));
    }
    if (expressionData.frown.detected) {
      console.log('Frown detected! Intensity:', expressionData.frown.intensity.toFixed(2));
    }
    
  } catch (error) {
    console.error('Error processing face landmarks:', error);
  }
}

function updateCalibrationStatus(progress, isCalibrated = false) {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    if (isCalibrated) {
      statusDiv.textContent = 'Calibrated!';
      statusDiv.style.color = '#00FF00';
    } else {
      statusDiv.textContent = `Calibrating face baseline... ${progress}%`;
      statusDiv.style.color = progress === 100 ? '#00FF00' : '#FFD700';
    }
  }
}
