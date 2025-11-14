// =============================================================================
// FACE TRACKING COORDINATOR
// Processes face landmarks and coordinates all detections
// Uses dataMapping to convert detections to scene actions
// =============================================================================

import { HeadPoseDetector } from '../modules/detectorModules/headPoseDetection.js';
import { 
  mouthToCubeScale, 
  headPoseToCubeRotation, 
  eyebrowToWireframe 
} from './dataMapping.js';

export function processFaceLandmarks(results, meshCtx, meshCanvas, systems, faceTrackingSystem) {
  const { 
    calibration, 
    mouthDetector, 
    blinkDetector,
    headPoseDetector,
    eyebrowDetector,
    smileFrownDetector,
    blinkEffectManager, 
    eyebrowEffectManager,
    smileFrownEffectManager,
    cube 
  } = systems;

  // Note: Canvas is cleared by MediaPipeFaceTracking.processResults()
  
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    return;
  }
  
  try {
    const landmarks = results.multiFaceLandmarks[0];
    
    // Note: Face mesh is already drawn by MediaPipeFaceTracking.processResults()
    // No need to draw it again here
    
    // STEP 1: DETECT (get raw data from detectors)
    const headPose = headPoseDetector.detectPose(landmarks);
    const mouthData = mouthDetector.getMouthData(landmarks);
    const blinkData = blinkDetector.detectBlink(landmarks);
    const expressionData = smileFrownDetector.detectExpression(landmarks, headPose);  // Pass head pose for constraint
    
    // Calibration phase
    if (!calibration.isCalibrated) {
      const eyebrowDistance = eyebrowDetector.calculateEyebrowDistance(landmarks);
      calibration.addSample(eyebrowDistance, headPose.turn, headPose.tilt, headPose.roll);
      updateCalibrationStatus(calibration.getProgress(), calibration.isCalibrated);
      resetCubeToNeutral(cube);
      
      // Initialize detectors with baselines when calibration completes
      if (calibration.isCalibrated) {
        const headPoseBaselines = calibration.getHeadPoseBaselines();
        eyebrowDetector.setBaselines(calibration.eyebrowBaseline, headPoseBaselines);
        smileFrownDetector.setBaselines(headPoseBaselines);
        updateCalibrationStatus(100, true);  // Update status to show "Calibrated!"
        console.log('All detectors calibrated!');
      }
      
      return;
    }
    
    // STEP 2: DETECT EYEBROW RAISE (simple boolean output)
    const eyebrowRaised = eyebrowDetector.detectRaise(landmarks, headPose);
    const eyebrowDistance = eyebrowDetector.calculateEyebrowDistance(landmarks);
    
    // STEP 3: MAP (convert detection data to scene actions)
    const headMovement = calibration.getHeadMovement(headPose.turn, headPose.tilt, headPose.roll);
    const cubeRotation = headPoseToCubeRotation(headMovement);
    const cubeScale = mouthToCubeScale(mouthData);
    const wireframeOn = eyebrowToWireframe(calibration.shouldToggleWireframe(eyebrowDistance) ? 1 : 0);
    
    // STEP 4: APPLY (update scene with mapped values)
    cube.rotation.y = cubeRotation.y;
    cube.rotation.x = cubeRotation.x;
    cube.rotation.z = cubeRotation.z;
    cube.scale.setScalar(cubeScale);
    cube.material.forEach(material => {
      material.wireframe = wireframeOn;
    });
    
    // STEP 5: TRIGGER EFFECTS (create visual effects from detections)
    blinkEffectManager.onBlinkDetected(blinkData);
    eyebrowEffectManager.onEyebrowRaise(eyebrowRaised);  // Simple boolean input
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
  const statusDiv = document.getElementById('calibration-status');
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

function resetCubeToNeutral(cube) {
  cube.rotation.y = 0;
  cube.rotation.x = 0;
  cube.rotation.z = 0;
  cube.scale.setScalar(1);
  cube.material.forEach(material => {
    material.wireframe = false;
  });
}

