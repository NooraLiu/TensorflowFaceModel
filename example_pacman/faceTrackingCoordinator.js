// =============================================================================
// FACE TRACKING COORDINATOR - PAC-MAN VARIANT
// Processes face landmarks and coordinates all detections for Pac-Man control
// =============================================================================

import * as THREE from 'three';
import { mouthToPacmanJaw } from './dataMapping.js';

// Listen for ghost collision events to update Pac-Man size
document.addEventListener('updatePacmanSize', (event) => {
  const pacman = event.detail.pacman || window.pacmanRef;
  const score = event.detail.score;
  if (pacman) {
    updatePacmanSize(pacman, score);
  }
});

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
    pacman,
    camera,
    controls,
    stars,
    bombs,
    scene,
    ghosts
  } = systems;
  
  // Store pacman reference globally for event listener
  window.pacmanRef = pacman;

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
      
      // Keep Pac-Man with very slight opening during calibration
      const baselineJawAngle = 0.05; // Very slight opening
      pacman.upperJaw.rotation.z = -baselineJawAngle;
      pacman.lowerJaw.rotation.z = baselineJawAngle;
      if (pacman.upperJawInner) {
        pacman.upperJawInner.rotation.z = -baselineJawAngle;
      }
      if (pacman.lowerJawInner) {
        pacman.lowerJawInner.rotation.z = baselineJawAngle;
      }
      
      // Initialize detectors with baselines when calibration completes
      if (calibration.isCalibrated) {
        const headPoseBaselines = calibration.getHeadPoseBaselines();
        eyebrowDetector.setBaselines(calibration.eyebrowBaseline, headPoseBaselines);
        smileFrownDetector.setBaselines(headPoseBaselines);
        updateCalibrationStatus(100, true);
        console.log('All detectors calibrated!');
        console.log('Pac-Man position:', pacman.group.position.x, pacman.group.position.y, pacman.group.position.z);
        console.log('Camera position:', camera.position.x, camera.position.y, camera.position.z);
      }
      
      return;
    }
    
    // STEP 2: DETECT EYEBROW RAISE (simple boolean output)
    const eyebrowRaised = eyebrowDetector.detectRaise(landmarks, headPose);
    
    // STEP 3: MAP (convert detection data to movement and jaw control)
    const headMovement = calibration.getHeadMovement(headPose.turn, headPose.tilt, headPose.roll);
    const jawAngle = mouthToPacmanJaw(mouthData);
    
    // STEP 4: APPLY (update Pac-Man movement, jaw, and camera)
    movementController.updateMovement(headMovement, pacman.group);
    movementController.updateCameraFollow(camera, controls);
    
    // Update Pac-Man jaw opening (rotate both jaws in opposite directions)
    pacman.upperJaw.rotation.z = -jawAngle;
    pacman.lowerJaw.rotation.z = jawAngle;
    
    // Also rotate the inner jaw meshes
    if (pacman.upperJawInner) {
      pacman.upperJawInner.rotation.z = -jawAngle;
    }
    if (pacman.lowerJawInner) {
      pacman.lowerJawInner.rotation.z = jawAngle;
    }
    
    // Keep Pac-Man upright on X and Z axes
    // (Y rotation is controlled by movement controller via head roll)
    pacman.group.rotation.x = 0;
    pacman.group.rotation.z = 0;
    
    // Check for star collection
    checkStarCollision(pacman, stars, jawAngle, scene);
    
    // Check for bomb collision
    checkBombCollision(pacman, bombs, scene);
    
    // Debug logging (first frame after calibration)
    if (Math.random() < 0.01) { // Log 1% of frames
      console.log('Pac-Man pos:', pacman.group.position.x.toFixed(2), pacman.group.position.y.toFixed(2), pacman.group.position.z.toFixed(2));
      console.log('Jaw angle:', (jawAngle * 180 / Math.PI).toFixed(1), 'degrees');
      console.log('Movement pos:', movementController.position.x.toFixed(2), movementController.position.z.toFixed(2));
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

function checkStarCollision(pacman, stars, jawAngle, scene) {
  const MIN_JAW_OPEN = 0.3; // Minimum jaw angle (in radians) to collect stars
  const COLLECTION_DISTANCE = 0.8; // Distance within which stars can be collected
  
  // Only collect if mouth is open enough
  if (jawAngle < MIN_JAW_OPEN) return;
  
  const pacmanPos = pacman.group.position;
  
  stars.forEach(star => {
    if (star.userData.collected) return;
    
    // Calculate distance between Pac-Man and star
    const dx = pacmanPos.x - star.position.x;
    const dz = pacmanPos.z - star.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < COLLECTION_DISTANCE) {
      star.userData.collected = true;
      
      // Create sparkle effect before removing
      createSparkleEffect(star.position, scene);
      
      // Animate star collection (scale up and spin, then disappear)
      const startTime = Date.now();
      const animateStar = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 400, 1); // 400ms animation
        
        // Scale up then down
        const scale = 1 + Math.sin(progress * Math.PI) * 0.5;
        star.scale.setScalar(scale);
        
        // Spin faster and faster
        star.rotation.y += progress * 0.5;
        star.rotation.x += progress * 0.3;
        
        // Move upward
        star.position.y = 0.3 + progress * 0.5;
        
        // Fade out in the last 30% of animation
        if (progress > 0.7) {
          const fadeProgress = (progress - 0.7) / 0.3;
          star.material.opacity = 1 - fadeProgress;
          star.material.transparent = true;
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateStar);
        } else {
          star.visible = false;
        }
      };
      animateStar();
      
      // Update score
      const scoreDiv = document.getElementById('score');
      if (scoreDiv) {
        const currentScore = parseInt(scoreDiv.textContent.split(': ')[1] || '0');
        const newScore = currentScore + 1;
        scoreDiv.textContent = `Score: ${newScore}`;
        
        // Make Pac-Man grow with score
        updatePacmanSize(pacman, newScore);
      }
      
      // Check if all stars collected
      checkWinCondition(stars);
      
      console.log('Star collected!');
    }
  });
}

function createSparkleEffect(position, scene) {
  // Create sparkle particles in a burst
  const particleCount = 15;
  const particles = [];
  
  for (let i = 0; i < particleCount; i++) {
    const geometry = new THREE.SphereGeometry(0.04, 4, 4);
    const material = new THREE.MeshBasicMaterial({ 
      color: Math.random() > 0.3 ? 0xffff00 : 0xffffff, // Yellow or white sparkles
      transparent: true
    });
    const particle = new THREE.Mesh(geometry, material);
    
    particle.position.set(
      position.x,
      position.y,
      position.z
    );
    
    // Random velocity in all directions
    const angle = (i / particleCount) * Math.PI * 2;
    const speed = 0.1 + Math.random() * 0.1;
    const velocity = {
      x: Math.cos(angle) * speed,
      y: Math.random() * 0.15,
      z: Math.sin(angle) * speed
    };
    
    particle.userData.velocity = velocity;
    particle.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.3
    };
    
    particles.push(particle);
    scene.add(particle);
  }
  
  // Animate sparkles
  const startTime = Date.now();
  const animateSparkle = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / 600, 1); // 600ms animation
    
    particles.forEach(particle => {
      // Update position
      particle.position.x += particle.userData.velocity.x;
      particle.position.y += particle.userData.velocity.y;
      particle.position.z += particle.userData.velocity.z;
      
      // Slow down
      particle.userData.velocity.x *= 0.95;
      particle.userData.velocity.y *= 0.95;
      particle.userData.velocity.z *= 0.95;
      
      // Spin
      particle.rotation.x += particle.userData.rotationSpeed.x;
      particle.rotation.y += particle.userData.rotationSpeed.y;
      particle.rotation.z += particle.userData.rotationSpeed.z;
      
      // Fade out and shrink
      particle.material.opacity = 1 - progress;
      particle.scale.setScalar(1 - progress * 0.5);
      
      if (progress >= 1 && particle.parent) {
        scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
      }
    });
    
    if (progress < 1) {
      requestAnimationFrame(animateSparkle);
    }
  };
  animateSparkle();
}

function updatePacmanSize(pacman, score) {
  // Base scale is 1.0, grows by 0.05 per point
  // Max scale of 2.0 at 20 points
  const baseScale = 1.0;
  const scalePerPoint = 0.05;
  const maxScale = 2.0;
  
  const newScale = Math.min(baseScale + (score * scalePerPoint), maxScale);
  
  // Smoothly animate to new scale
  const currentScale = pacman.group.scale.x;
  const startTime = Date.now();
  
  const animateScale = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / 300, 1); // 300ms animation
    
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const scale = currentScale + (newScale - currentScale) * easeProgress;
    
    pacman.group.scale.setScalar(scale);
    
    // Keep Pac-Man above the plane as it grows
    // Base height is 0.5, adjust proportionally with scale
    pacman.group.position.y = 0.5 * scale;
    
    if (progress < 1) {
      requestAnimationFrame(animateScale);
    }
  };
  
  animateScale();
}

function checkBombCollision(pacman, bombs, scene) {
  const COLLECTION_DISTANCE = 0.8; // Distance within which bombs trigger
  
  const pacmanPos = pacman.group.position;
  
  bombs.forEach(bomb => {
    if (bomb.userData.collected) return;
    
    // Calculate distance between Pac-Man and bomb
    const dx = pacmanPos.x - bomb.position.x;
    const dz = pacmanPos.z - bomb.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < COLLECTION_DISTANCE) {
      bomb.userData.collected = true;
      
      // Create explosion effect
      createExplosion(bomb.position, scene);
      
      // Hide the bomb
      bomb.visible = false;
      
      // Update score (decrease by 2)
      const scoreDiv = document.getElementById('score');
      if (scoreDiv) {
        const currentScore = parseInt(scoreDiv.textContent.split(': ')[1] || '0');
        const newScore = Math.max(0, currentScore - 2);
        scoreDiv.textContent = `Score: ${newScore}`;
        
        // Make Pac-Man shrink when hit by bomb
        updatePacmanSize(pacman, newScore);
      }
      
      console.log('Bomb hit! -2 points');
    }
  });
}

function createExplosion(position, scene) {
  // Create explosion particles
  const particleCount = 20;
  const particles = [];
  
  for (let i = 0; i < particleCount; i++) {
    const geometry = new THREE.SphereGeometry(0.05, 4, 4);
    const material = new THREE.MeshBasicMaterial({ 
      color: Math.random() > 0.5 ? 0xff6600 : 0xffaa00 // Orange/yellow
    });
    const particle = new THREE.Mesh(geometry, material);
    
    particle.position.set(
      position.x,
      position.y,
      position.z
    );
    
    // Random velocity
    const velocity = {
      x: (Math.random() - 0.5) * 0.2,
      y: Math.random() * 0.2,
      z: (Math.random() - 0.5) * 0.2
    };
    
    particle.userData.velocity = velocity;
    particles.push(particle);
    scene.add(particle);
  }
  
  // Animate explosion
  const startTime = Date.now();
  const animateExplosion = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / 500, 1); // 500ms animation
    
    particles.forEach(particle => {
      // Update position
      particle.position.x += particle.userData.velocity.x;
      particle.position.y += particle.userData.velocity.y;
      particle.position.z += particle.userData.velocity.z;
      
      // Apply gravity
      particle.userData.velocity.y -= 0.01;
      
      // Fade out
      particle.material.opacity = 1 - progress;
      particle.material.transparent = true;
      
      if (progress >= 1 && particle.parent) {
        scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
      }
    });
    
    if (progress < 1) {
      requestAnimationFrame(animateExplosion);
    }
  };
  animateExplosion();
}

function checkWinCondition(stars) {
  // Check if all stars have been collected
  const allCollected = stars.every(star => star.userData.collected);
  
  if (allCollected) {
    const scoreDiv = document.getElementById('score');
    const currentScore = parseInt(scoreDiv.textContent.split(': ')[1] || '0');
    
    // If score is 0 or negative, show game over instead
    if (currentScore <= 0) {
      const gameOverDiv = document.getElementById('game-over');
      const finalScoreSpan = document.getElementById('final-score');
      
      if (gameOverDiv && finalScoreSpan) {
        finalScoreSpan.textContent = currentScore;
        gameOverDiv.style.display = 'block';
      }
      console.log('GAME OVER - Score: 0');
    } else {
      const youWinDiv = document.getElementById('you-win');
      const winFinalScoreSpan = document.getElementById('win-final-score');
      
      if (youWinDiv && winFinalScoreSpan && scoreDiv) {
        winFinalScoreSpan.textContent = currentScore;
        youWinDiv.style.display = 'block';
      }
      
      console.log('YOU WIN! All stars collected!');
    }
  }
}

