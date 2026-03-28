// =============================================================================
// GUIDED PRACTICE FLOW - PHOTO REPLICATION
// Mouse practice -> head+mouse practice -> ready for real tasks
// =============================================================================

import * as THREE from 'three';

import {
  applyOrbitToCamera,
  CAMERA_CONSTRAINTS,
  getCameraOrbitDegrees,
  handleWindowResize,
  setupCamera,
  setupControls,
  setupLighting,
  setupRenderer,
  setupScene
} from './sceneSetup.js';

import {
  SCENE_BOUNDS,
  applySceneVariant,
  clampPointToSceneBounds,
  createClutterGroup,
  createCube,
  createGround,
  createPlacementFrame,
  createReferenceAnchors
} from './sceneObjects.js';

import { MediaPipeFaceTracking } from '../lib/faceTrackingSystem.js';
import { createDetectors } from '../lib/faceDetectors.js';

const STAGES = {
  MOUSE_INSTRUCTIONS: 'mouse-instructions',
  MOUSE_COUNTDOWN: 'mouse-countdown',
  MOUSE_RUNNING: 'mouse-running',
  MOUSE_RESULT: 'mouse-result',
  HEAD_INSTRUCTIONS: 'head-instructions',
  HEAD_COUNTDOWN: 'head-countdown',
  HEAD_RUNNING: 'head-running',
  HEAD_RESULT: 'head-result',
  READY_FOR_REAL: 'ready-for-real'
};

const RUN_CONFIG = {
  timeLimitMs: 90000,
  countdownSeconds: 3
};

const HEAD_ORBIT_CONFIG = {
  yawSensitivityDegPerFrame: 6.4,
  pitchSensitivityDegPerFrame: 5.2,
  deadzone: 0.03,
  maxInput: 0.28,
  smoothing: 0.18,
  responseExponent: 1.6
};

let detectors = createDetectors();

const appState = {
  stage: STAGES.MOUSE_INSTRUCTIONS,
  condition: 'mouse-only',
  sceneType: 'clean',
  draggingCube: false,
  orbit: {
    azimuthDeg: CAMERA_CONSTRAINTS.initialAzimuthDeg,
    elevationDeg: CAMERA_CONSTRAINTS.initialElevationDeg
  },
  tracking: {
    calibrated: false,
    calibrationStarted: false,
    progress: 0,
    faceDetected: false,
    calibrationDelayUntilMs: 0,
    headMovement: { turn: 0, tilt: 0, roll: 0 },
    filteredHeadMovement: { turn: 0, tilt: 0, roll: 0 }
  },
  round: {
    running: false,
    activeStartMs: 0,
    remainingMs: RUN_CONFIG.timeLimitMs,
    countdownActive: false,
    countdownValue: RUN_CONFIG.countdownSeconds,
    countdownDeadlineMs: 0,
    practiceSceneType: null,
    targetByCondition: {
      'mouse-only': null,
      'head-mouse': null
    },
    lastResultByCondition: {
      'mouse-only': null,
      'head-mouse': null
    }
  }
};

const scene = setupScene();
const camera = setupCamera();
const renderer = setupRenderer();
const controls = setupControls(camera, renderer);
setupLighting(scene);

renderer.domElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

const ground = createGround(scene);
createPlacementFrame(scene);
createReferenceAnchors(scene);
const cube = createCube();
scene.add(cube);
const clutterGroup = createClutterGroup(scene);
applySceneVariant(scene, ground, clutterGroup, appState.sceneType);

const targetMarker = new THREE.Mesh(
  new THREE.RingGeometry(0.42, 0.62, 42),
  new THREE.MeshBasicMaterial({ color: 0xffea00, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
);
targetMarker.rotation.x = -Math.PI / 2;
targetMarker.position.y = 0.03;
targetMarker.visible = false;
scene.add(targetMarker);

const targetAngleArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.06, 0), 2.2, 0xffe55c, 0.35, 0.25);
const userAngleArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.06, 0), 2.2, 0x68d3ff, 0.35, 0.25);
targetAngleArrow.visible = false;
userAngleArrow.visible = false;
scene.add(targetAngleArrow);
scene.add(userAngleArrow);

const tempTargetCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

const conditionSelect = document.getElementById('condition-select');
const sceneSelect = document.getElementById('scene-select');
const stageButton = document.getElementById('stage-button');
const resetCameraButton = document.getElementById('reset-camera-button');
const proceedButton = document.getElementById('proceed-button');
const retryPracticeButton = document.getElementById('retry-practice-button');
const recalibrateButton = document.getElementById('recalibrate-button');

const conditionReadout = document.getElementById('condition-readout');
const sceneReadout = document.getElementById('scene-readout');
const azimuthReadout = document.getElementById('azimuth-readout');
const elevationReadout = document.getElementById('elevation-readout');
const phaseReadout = document.getElementById('phase-readout');
const trialReadout = document.getElementById('trial-readout');
const timerReadout = document.getElementById('timer-readout');
const positionErrorReadout = document.getElementById('position-error-readout');
const cameraErrorReadout = document.getElementById('camera-error-readout');

const instructionStage = document.getElementById('instruction-stage');
const instructionTitle = document.getElementById('instruction-title');
const instructions = document.getElementById('instruction-body');
const instructionPanel = document.getElementById('instruction-panel');
const centerStatus = document.getElementById('center-status');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');
const referenceCanvas = document.getElementById('reference-canvas');
const referenceCtx = referenceCanvas.getContext('2d');

const dragState = {
  isDragging: false,
  pointerId: null,
  offset: new THREE.Vector3(),
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  dragPoint: new THREE.Vector3()
};

function showError(message) {
  console.error(message);
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function updateStatus(message, isError = false) {
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? '#ffb4b4' : '#d9f27f';
  }

  if (centerStatus) {
    centerStatus.textContent = message;
    centerStatus.style.color = isError ? '#ffb4b4' : '#d9f27f';
  }
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function normalizeAngleDeg(angleDeg) {
  return THREE.MathUtils.euclideanModulo(angleDeg + 180, 360) - 180;
}

function clampDot(value) {
  return Math.max(0, Math.min(1, value));
}

function formatConditionLabel(condition) {
  return condition === 'head-mouse' ? 'Head + Mouse' : 'Mouse-only';
}

function formatSceneLabel(sceneType) {
  return sceneType === 'clustered' ? 'Clustered' : 'Clean';
}

function formatTimeSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

function getRandomCubePosition() {
  return clampPointToSceneBounds({
    x: randomInRange(SCENE_BOUNDS.minX, SCENE_BOUNDS.maxX),
    z: randomInRange(SCENE_BOUNDS.minZ, SCENE_BOUNDS.maxZ)
  });
}

function getCurrentTarget() {
  return appState.round.targetByCondition[appState.condition];
}

function resetRoundState() {
  appState.round.running = false;
  appState.round.remainingMs = RUN_CONFIG.timeLimitMs;
  appState.round.countdownActive = false;
  appState.round.countdownValue = RUN_CONFIG.countdownSeconds;
}

function angularDifferenceDeg(aDeg, bDeg) {
  return Math.abs(normalizeAngleDeg(aDeg - bDeg));
}

function isTargetTooSimilar(candidate, other) {
  if (!candidate || !other) {
    return false;
  }

  const dx = candidate.cubePosition.x - other.cubePosition.x;
  const dz = candidate.cubePosition.z - other.cubePosition.z;
  const cubeDistance = Math.hypot(dx, dz);
  const azimuthDifference = angularDifferenceDeg(candidate.azimuthDeg, other.azimuthDeg);
  const elevationDifference = Math.abs(candidate.elevationDeg - other.elevationDeg);

  return cubeDistance < 1.0 && azimuthDifference < 20 && elevationDifference < 10;
}

function clearComparisonMarkers() {
  targetMarker.visible = false;
  targetAngleArrow.visible = false;
  userAngleArrow.visible = false;
}

function syncOrbitStateFromCamera() {
  const orbit = getCameraOrbitDegrees(camera, CAMERA_CONSTRAINTS.target);
  appState.orbit.azimuthDeg = normalizeAngleDeg(orbit.azimuthDeg);
  appState.orbit.elevationDeg = THREE.MathUtils.clamp(
    orbit.elevationDeg,
    CAMERA_CONSTRAINTS.elevationMinDeg,
    CAMERA_CONSTRAINTS.elevationMaxDeg
  );
}

function applyOrbitStateToCamera() {
  applyOrbitToCamera(
    camera,
    appState.orbit.azimuthDeg,
    appState.orbit.elevationDeg,
    CAMERA_CONSTRAINTS.target,
    CAMERA_CONSTRAINTS.distance
  );
  controls.target.copy(CAMERA_CONSTRAINTS.target);
}

function resetCameraOrbit() {
  appState.orbit.azimuthDeg = CAMERA_CONSTRAINTS.initialAzimuthDeg;
  appState.orbit.elevationDeg = CAMERA_CONSTRAINTS.initialElevationDeg;
  applyOrbitStateToCamera();
  controls.update();
}

function shapeHeadInput(value) {
  const absValue = Math.abs(value);

  if (absValue <= HEAD_ORBIT_CONFIG.deadzone) {
    return 0;
  }

  const clamped = Math.min(absValue, HEAD_ORBIT_CONFIG.maxInput);
  const normalized = (clamped - HEAD_ORBIT_CONFIG.deadzone) / (HEAD_ORBIT_CONFIG.maxInput - HEAD_ORBIT_CONFIG.deadzone);
  const curved = Math.pow(normalized, HEAD_ORBIT_CONFIG.responseExponent);
  return Math.sign(value) * curved;
}

function applyHeadDrivenOrbit() {
  if (appState.condition !== 'head-mouse') {
    return;
  }

  if (!appState.tracking.calibrated || !appState.tracking.faceDetected) {
    return;
  }

  const yawInput = shapeHeadInput(appState.tracking.filteredHeadMovement.turn);
  const pitchInput = shapeHeadInput(appState.tracking.filteredHeadMovement.tilt);

  appState.orbit.azimuthDeg = normalizeAngleDeg(
    appState.orbit.azimuthDeg - (yawInput * HEAD_ORBIT_CONFIG.yawSensitivityDegPerFrame)
  );

  appState.orbit.elevationDeg = THREE.MathUtils.clamp(
    appState.orbit.elevationDeg - (pitchInput * HEAD_ORBIT_CONFIG.pitchSensitivityDegPerFrame),
    CAMERA_CONSTRAINTS.elevationMinDeg,
    CAMERA_CONSTRAINTS.elevationMaxDeg
  );

  applyOrbitStateToCamera();
}

function setCanvasCursor(cursor) {
  renderer.domElement.style.cursor = cursor;
}

function updatePointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  dragState.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  dragState.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getGroundIntersection(event) {
  updatePointerFromEvent(event);
  dragState.raycaster.setFromCamera(dragState.pointer, camera);
  return dragState.raycaster.ray.intersectPlane(dragState.dragPlane, dragState.dragPoint);
}

function updateCubePositionFromDrag(event) {
  const intersection = getGroundIntersection(event);
  if (!intersection) {
    return false;
  }

  const nextPosition = clampPointToSceneBounds({
    x: intersection.x + dragState.offset.x,
    z: intersection.z + dragState.offset.z
  });

  cube.position.x = nextPosition.x;
  cube.position.z = nextPosition.z;
  return true;
}

function updateHoverState(event) {
  if (dragState.isDragging) {
    setCanvasCursor('grabbing');
    return;
  }

  updatePointerFromEvent(event);
  dragState.raycaster.setFromCamera(dragState.pointer, camera);
  const intersections = dragState.raycaster.intersectObject(cube, false);
  setCanvasCursor(intersections.length > 0 ? 'grab' : 'default');
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  updatePointerFromEvent(event);
  dragState.raycaster.setFromCamera(dragState.pointer, camera);
  const intersections = dragState.raycaster.intersectObject(cube, false);

  if (intersections.length === 0) {
    return;
  }

  const intersection = getGroundIntersection(event);
  if (!intersection) {
    return;
  }

  event.preventDefault();
  dragState.isDragging = true;
  dragState.pointerId = event.pointerId;
  dragState.offset.set(cube.position.x - intersection.x, 0, cube.position.z - intersection.z);
  appState.draggingCube = true;
  renderer.domElement.setPointerCapture(event.pointerId);
  controls.enabled = false;
  setCanvasCursor('grabbing');
}

function stopDragging(pointerId) {
  if (!dragState.isDragging || dragState.pointerId !== pointerId) {
    return;
  }

  dragState.isDragging = false;
  dragState.pointerId = null;
  appState.draggingCube = false;
  applyControlMode();
  setCanvasCursor('default');
}

function handlePointerMove(event) {
  if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
    updateHoverState(event);
    return;
  }

  event.preventDefault();
  updateCubePositionFromDrag(event);
  setCanvasCursor('grabbing');
}

function handlePointerUp(event) {
  if (renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }

  stopDragging(event.pointerId);
  updateHoverState(event);
}

function initializeObjectDrag() {
  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerup', handlePointerUp);
  renderer.domElement.addEventListener('pointercancel', handlePointerUp);
  renderer.domElement.addEventListener('lostpointercapture', (event) => {
    stopDragging(event.pointerId);
  });
  renderer.domElement.addEventListener('pointerleave', (event) => {
    if (!dragState.isDragging) {
      setCanvasCursor('default');
      return;
    }

    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      return;
    }

    stopDragging(event.pointerId);
  });
}

function drawReferenceFromTarget(target, footerText) {
  const savedCubePosition = cube.position.clone();
  const savedSceneType = appState.sceneType;
  const savedAzimuth = appState.orbit.azimuthDeg;
  const savedElevation = appState.orbit.elevationDeg;

  appState.sceneType = target.sceneType;
  applySceneVariant(scene, ground, clutterGroup, appState.sceneType);

  cube.position.set(target.cubePosition.x, 0.5, target.cubePosition.z);
  appState.orbit.azimuthDeg = target.azimuthDeg;
  appState.orbit.elevationDeg = target.elevationDeg;
  applyOrbitStateToCamera();

  renderer.render(scene, camera);
  referenceCtx.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
  referenceCtx.drawImage(renderer.domElement, 0, 0, referenceCanvas.width, referenceCanvas.height);

  referenceCtx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  referenceCtx.fillRect(0, referenceCanvas.height - 36, referenceCanvas.width, 36);
  referenceCtx.fillStyle = '#f1f4ee';
  referenceCtx.font = '14px Segoe UI';
  referenceCtx.fillText(footerText, 12, referenceCanvas.height - 12);

  appState.sceneType = savedSceneType;
  applySceneVariant(scene, ground, clutterGroup, appState.sceneType);
  cube.position.copy(savedCubePosition);

  appState.orbit.azimuthDeg = savedAzimuth;
  appState.orbit.elevationDeg = savedElevation;
  applyOrbitStateToCamera();
}

function drawCameraComparisonOverlay(targetOrbit, userOrbit) {
  const cx = referenceCanvas.width - 88;
  const cy = 86;
  const radius = 52;

  const toRad = (deg) => THREE.MathUtils.degToRad(deg - 90);

  referenceCtx.save();
  referenceCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  referenceCtx.fillRect(cx - 78, cy - 66, 156, 132);

  referenceCtx.strokeStyle = 'rgba(220, 230, 220, 0.35)';
  referenceCtx.lineWidth = 1;
  referenceCtx.beginPath();
  referenceCtx.arc(cx, cy, radius, 0, Math.PI * 2);
  referenceCtx.stroke();

  const drawRay = (deg, color) => {
    const angle = toRad(deg);
    referenceCtx.strokeStyle = color;
    referenceCtx.lineWidth = 3;
    referenceCtx.beginPath();
    referenceCtx.moveTo(cx, cy);
    referenceCtx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    referenceCtx.stroke();
  };

  drawRay(targetOrbit.azimuthDeg, '#ffe55c');
  drawRay(userOrbit.azimuthDeg, '#68d3ff');

  referenceCtx.fillStyle = '#ffe55c';
  referenceCtx.font = '12px Segoe UI';
  referenceCtx.fillText('Target', cx - 64, cy + 58);

  referenceCtx.fillStyle = '#68d3ff';
  referenceCtx.fillText('You', cx + 12, cy + 58);

  referenceCtx.restore();
}

function showTargetMarkers(target, userOrbit) {
  targetMarker.position.set(target.cubePosition.x, 0.03, target.cubePosition.z);
  targetMarker.visible = true;

  const targetDir = new THREE.Vector3(
    Math.sin(THREE.MathUtils.degToRad(target.azimuthDeg)),
    0,
    Math.cos(THREE.MathUtils.degToRad(target.azimuthDeg))
  );

  const userDir = new THREE.Vector3(
    Math.sin(THREE.MathUtils.degToRad(userOrbit.azimuthDeg)),
    0,
    Math.cos(THREE.MathUtils.degToRad(userOrbit.azimuthDeg))
  );

  const origin = new THREE.Vector3(target.cubePosition.x, 0.06, target.cubePosition.z);

  targetAngleArrow.position.copy(origin);
  targetAngleArrow.setDirection(targetDir.normalize());
  targetAngleArrow.visible = true;

  userAngleArrow.position.copy(origin);
  userAngleArrow.setDirection(userDir.normalize());
  userAngleArrow.visible = true;
}

function createTargetForCondition(condition, sceneTypeOverride = null, avoidTarget = null) {
  const sceneType = sceneTypeOverride || (randomInRange(0, 1) < 0.5 ? 'clean' : 'clustered');
  let candidate = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    candidate = {
      condition,
      sceneType,
      cubePosition: getRandomCubePosition(),
      azimuthDeg: randomInRange(-180, 180),
      elevationDeg: randomInRange(CAMERA_CONSTRAINTS.elevationMinDeg, CAMERA_CONSTRAINTS.elevationMaxDeg)
    };

    if (!isTargetTooSimilar(candidate, avoidTarget)) {
      break;
    }
  }

  appState.round.targetByCondition[condition] = candidate;
  return candidate;
}

function applyTargetSceneForCurrentCondition() {
  const target = getCurrentTarget();
  if (!target) {
    return;
  }

  appState.sceneType = target.sceneType;
  sceneSelect.value = appState.sceneType;
  applySceneVariant(scene, ground, clutterGroup, appState.sceneType);

  drawReferenceFromTarget(target, `${formatConditionLabel(appState.condition)} practice target`);
}

function applyControlMode() {
  const mouseOnly = appState.condition === 'mouse-only';
  controls.enabled = mouseOnly && !dragState.isDragging;
  syncOrbitStateFromCamera();
}

function setPracticeStartPose() {
  const randomStart = getRandomCubePosition();
  cube.position.set(randomStart.x, 0.5, randomStart.z);
  resetCameraOrbit();
  clearComparisonMarkers();
}

function setStage(nextStage) {
  appState.stage = nextStage;
  resetRoundState();

  if (
    nextStage === STAGES.MOUSE_INSTRUCTIONS ||
    nextStage === STAGES.MOUSE_COUNTDOWN ||
    nextStage === STAGES.MOUSE_RUNNING ||
    nextStage === STAGES.MOUSE_RESULT
  ) {
    appState.condition = 'mouse-only';
    conditionSelect.value = 'mouse-only';
  } else {
    appState.condition = 'head-mouse';
    conditionSelect.value = 'head-mouse';
  }

  if (nextStage === STAGES.HEAD_INSTRUCTIONS) {
    resetHeadCalibration(false);
  }

  applyControlMode();
  refreshUiState();
}

function startCountdown(toRunningStage) {
  appState.round.countdownActive = true;
  appState.round.countdownValue = RUN_CONFIG.countdownSeconds;
  appState.round.countdownDeadlineMs = performance.now() + 1000;

  if (toRunningStage === STAGES.MOUSE_RUNNING) {
    appState.stage = STAGES.MOUSE_COUNTDOWN;
  } else {
    appState.stage = STAGES.HEAD_COUNTDOWN;
  }

  refreshUiState();
}

function beginRunningStage() {
  const target = getCurrentTarget();
  if (!target) {
    return;
  }

  appState.round.running = true;
  appState.round.activeStartMs = performance.now();
  appState.round.remainingMs = RUN_CONFIG.timeLimitMs;

  appState.stage = appState.condition === 'mouse-only' ? STAGES.MOUSE_RUNNING : STAGES.HEAD_RUNNING;
  refreshUiState();
  updateStatus('Round running. Match the photo and press SPACE to submit.');
}

function handleCountdownTick() {
  if (!appState.round.countdownActive) {
    return;
  }

  const now = performance.now();
  if (now < appState.round.countdownDeadlineMs) {
    return;
  }

  appState.round.countdownValue -= 1;

  if (appState.round.countdownValue <= 0) {
    appState.round.countdownActive = false;
    beginRunningStage();
    return;
  }

  appState.round.countdownDeadlineMs = now + 1000;
}

function getCurrentRoundTimerMs() {
  if (!appState.round.running) {
    return appState.round.remainingMs;
  }

  const elapsed = performance.now() - appState.round.activeStartMs;
  return Math.max(0, RUN_CONFIG.timeLimitMs - elapsed);
}

function submitRunningRound(reason = 'space') {
  if (!appState.round.running) {
    return;
  }

  const target = getCurrentTarget();
  if (!target) {
    return;
  }

  const elapsedMs = Math.min(
    RUN_CONFIG.timeLimitMs,
    Math.max(0, performance.now() - appState.round.activeStartMs)
  );

  const positionTarget = new THREE.Vector3(target.cubePosition.x, 0.5, target.cubePosition.z);
  const positionActual = new THREE.Vector3(cube.position.x, cube.position.y, cube.position.z);
  const positionError = positionActual.distanceTo(positionTarget);

  applyOrbitToCamera(
    tempTargetCamera,
    target.azimuthDeg,
    target.elevationDeg,
    CAMERA_CONSTRAINTS.target,
    CAMERA_CONSTRAINTS.distance
  );

  const dot = clampDot(Math.abs(camera.quaternion.dot(tempTargetCamera.quaternion)));
  const cameraErrorDeg = THREE.MathUtils.radToDeg(2 * Math.acos(dot));

  const userOrbit = {
    azimuthDeg: appState.orbit.azimuthDeg,
    elevationDeg: appState.orbit.elevationDeg
  };

  appState.round.lastResultByCondition[appState.condition] = {
    reason,
    elapsedMs,
    positionError,
    cameraErrorDeg,
    userOrbit,
    targetOrbit: {
      azimuthDeg: target.azimuthDeg,
      elevationDeg: target.elevationDeg
    }
  };

  appState.round.running = false;
  appState.round.remainingMs = Math.max(0, RUN_CONFIG.timeLimitMs - elapsedMs);

  showTargetMarkers(target, userOrbit);
  drawReferenceFromTarget(target, `${formatConditionLabel(appState.condition)} target (compare with your result)`);
  drawCameraComparisonOverlay(target, userOrbit);

  updateStatus(
    `Submitted (${reason}). Time ${formatTimeSeconds(elapsedMs)}, position error ${positionError.toFixed(2)}, camera error ${cameraErrorDeg.toFixed(1)} deg.`
  );

  if (appState.condition === 'mouse-only') {
    setStage(STAGES.MOUSE_RESULT);
  } else {
    setStage(STAGES.HEAD_RESULT);
  }
}

function resetHeadCalibration(startImmediately = true) {
  detectors = createDetectors();
  appState.tracking.calibrated = false;
  appState.tracking.calibrationStarted = startImmediately;
  appState.tracking.progress = 0;
  appState.tracking.headMovement = { turn: 0, tilt: 0, roll: 0 };
  appState.tracking.filteredHeadMovement = { turn: 0, tilt: 0, roll: 0 };
  appState.tracking.calibrationDelayUntilMs = startImmediately ? performance.now() + 2000 : 0;

  if (startImmediately) {
    updateStatus('Please keep your head centered and steady while calibrating.');
  } else {
    updateStatus('Read instructions, then click Start Calibration.');
  }
}

function refreshUiState() {
  const currentOrbit = getCameraOrbitDegrees(camera, controls.target);

  const hideInstructionPanel =
    appState.stage === STAGES.MOUSE_RUNNING ||
    appState.stage === STAGES.HEAD_RUNNING;

  instructionPanel.style.display = hideInstructionPanel ? 'none' : 'block';

  conditionReadout.textContent = formatConditionLabel(appState.condition);
  sceneReadout.textContent = formatSceneLabel(appState.sceneType);
  azimuthReadout.textContent = `${normalizeAngleDeg(currentOrbit.azimuthDeg).toFixed(1)} deg`;
  elevationReadout.textContent = `${currentOrbit.elevationDeg.toFixed(1)} deg`;
  phaseReadout.textContent = 'Practice';

  const lastResult = appState.round.lastResultByCondition[appState.condition];
  positionErrorReadout.textContent = lastResult ? `${lastResult.positionError.toFixed(2)}` : '-';
  cameraErrorReadout.textContent = lastResult ? `${lastResult.cameraErrorDeg.toFixed(1)} deg` : '-';
  timerReadout.textContent = appState.round.countdownActive
    ? `${appState.round.countdownValue}`
    : formatTimeSeconds(getCurrentRoundTimerMs());

  conditionSelect.disabled = true;
  sceneSelect.disabled = true;
  recalibrateButton.style.display = appState.condition === 'head-mouse' ? 'block' : 'none';

  stageButton.style.display = 'block';
  retryPracticeButton.style.display = 'none';
  proceedButton.style.display = 'none';

  if (appState.stage === STAGES.MOUSE_INSTRUCTIONS) {
    instructionStage.textContent = 'Guided Practice';
    instructionTitle.textContent = 'Mouse Practice';
    trialReadout.textContent = 'Mouse Practice';
    instructions.textContent = 'Mouse mode rules: right-drag orbits camera, left-drag moves cube. Click I Understand to start 3-2-1 countdown.';
    stageButton.textContent = 'I Understand';
    stageButton.disabled = false;
    return;
  }

  if (appState.stage === STAGES.MOUSE_COUNTDOWN) {
    instructionStage.textContent = 'Guided Practice';
    instructionTitle.textContent = 'Mouse Practice';
    trialReadout.textContent = 'Mouse Practice';
    instructions.textContent = 'Get ready. Timer starts after countdown.';
    stageButton.textContent = 'Countdown...';
    stageButton.disabled = true;
    return;
  }

  if (appState.stage === STAGES.MOUSE_RUNNING) {
    instructionStage.textContent = 'Guided Practice';
    instructionTitle.textContent = 'Mouse Practice';
    trialReadout.textContent = 'Mouse Practice';
    instructions.textContent = 'Mouse practice running. Match target and press SPACE to submit.';
    stageButton.textContent = 'Running...';
    stageButton.disabled = true;
    return;
  }

  if (appState.stage === STAGES.MOUSE_RESULT) {
    instructionStage.textContent = 'Practice Result';
    instructionTitle.textContent = 'Mouse Result';
    trialReadout.textContent = 'Mouse Result';
    instructions.textContent = 'Result shown. Yellow ring/arrow mark target cube and camera azimuth. Retry or Continue.';
    stageButton.style.display = 'none';
    retryPracticeButton.style.display = 'block';
    retryPracticeButton.textContent = 'Retry';
    retryPracticeButton.disabled = false;
    proceedButton.style.display = 'block';
    proceedButton.textContent = 'Continue';
    proceedButton.disabled = false;
    return;
  }

  if (appState.stage === STAGES.HEAD_INSTRUCTIONS) {
    instructionStage.textContent = 'Guided Practice';
    instructionTitle.textContent = 'Head + Mouse Practice';
    trialReadout.textContent = 'Head Practice';
    if (!appState.tracking.calibrationStarted && !appState.tracking.calibrated) {
      instructions.textContent = 'Head+Mouse rules: move head to orbit camera, left-drag moves cube. Read this first, then click Start Calibration while keeping your head centered.';
      stageButton.textContent = 'Start Calibration';
      stageButton.disabled = false;
      return;
    }

    if (appState.tracking.calibrationStarted && !appState.tracking.calibrated) {
      instructions.textContent = 'Calibrating now. Keep your head centered and steady until calibration completes.';
      stageButton.textContent = 'Calibrating...';
      stageButton.disabled = true;
      return;
    }

    instructions.textContent = 'Calibration complete. Click Start Practice to begin countdown, then match the photo and press SPACE to submit.';
    stageButton.textContent = 'Start Practice';
    stageButton.disabled = false;
    return;
  }

  if (appState.stage === STAGES.HEAD_COUNTDOWN) {
    instructionStage.textContent = 'Guided Practice';
    instructionTitle.textContent = 'Head + Mouse Practice';
    trialReadout.textContent = 'Head Practice';
    instructions.textContent = 'Get ready. Keep your head steady and start after countdown.';
    stageButton.textContent = 'Countdown...';
    stageButton.disabled = true;
    return;
  }

  if (appState.stage === STAGES.HEAD_RUNNING) {
    instructionStage.textContent = 'Guided Practice';
    instructionTitle.textContent = 'Head + Mouse Practice';
    trialReadout.textContent = 'Head Practice';
    instructions.textContent = 'Head practice running. Match target and press SPACE to submit.';
    stageButton.textContent = 'Running...';
    stageButton.disabled = true;
    return;
  }

  if (appState.stage === STAGES.HEAD_RESULT) {
    instructionStage.textContent = 'Practice Result';
    instructionTitle.textContent = 'Head + Mouse Result';
    trialReadout.textContent = 'Head Result';
    instructions.textContent = 'Result shown. Retry this head practice or continue to real tasks flow.';
    stageButton.style.display = 'none';
    retryPracticeButton.style.display = 'block';
    retryPracticeButton.textContent = 'Retry';
    retryPracticeButton.disabled = false;
    proceedButton.style.display = 'block';
    proceedButton.textContent = 'Continue To Real Tasks';
    proceedButton.disabled = false;
    return;
  }

  instructionStage.textContent = 'Practice Complete';
  instructionTitle.textContent = 'Ready For Real Tasks';
  trialReadout.textContent = 'Practice Complete';
  instructions.textContent = 'Guided practice complete. Real task flow can be added next.';
  stageButton.style.display = 'none';
  retryPracticeButton.style.display = 'none';
  proceedButton.style.display = 'none';
}

function initializeHeadTracking() {
  const faceTrackingSystem = new MediaPipeFaceTracking({
    drawMesh: true,
    showVideo: true
  });

  faceTrackingSystem.initialize((results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      appState.tracking.faceDetected = false;

      if (appState.condition === 'head-mouse' && appState.stage !== STAGES.HEAD_RESULT && appState.stage !== STAGES.READY_FOR_REAL) {
        if (!appState.tracking.calibrated) {
          if (appState.stage === STAGES.HEAD_INSTRUCTIONS && !appState.tracking.calibrationStarted) {
            updateStatus('Read instructions, then click Start Calibration.');
          } else {
            updateStatus('Please keep your head centered and steady while calibrating.');
          }
        } else {
          updateStatus('Head orbit ready. No face detected.');
        }
      }
      return;
    }

    appState.tracking.faceDetected = true;

    if (appState.condition !== 'head-mouse') {
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const headPose = detectors.headPose.detectPose(landmarks);

    if (!detectors.calibration.isCalibrated) {
      if (!appState.tracking.calibrationStarted) {
        if (appState.stage === STAGES.HEAD_INSTRUCTIONS) {
          updateStatus('Read instructions, then click Start Calibration.');
        }
        return;
      }

      const now = performance.now();
      if (now < appState.tracking.calibrationDelayUntilMs) {
        const secondsRemaining = (appState.tracking.calibrationDelayUntilMs - now) / 1000;
        updateStatus(`Please keep your head centered and steady while calibrating. Starting in ${secondsRemaining.toFixed(1)}s.`);
        return;
      }

      const eyebrowDistance = detectors.eyebrow.calculateEyebrowDistance(landmarks);
      detectors.calibration.addSample(eyebrowDistance, headPose.turn, headPose.tilt, headPose.roll);
      appState.tracking.progress = detectors.calibration.getProgress();
      updateStatus(`Please keep your head centered and steady while calibrating. ${appState.tracking.progress}%`);

      if (detectors.calibration.isCalibrated) {
        const baselines = detectors.calibration.getHeadPoseBaselines();
        detectors.eyebrow.setBaselines(detectors.calibration.eyebrowBaseline, baselines);
        appState.tracking.calibrated = true;
        updateStatus('Calibration complete. Head orbit active.');
      }
      return;
    }

    appState.tracking.headMovement = detectors.calibration.getHeadMovement(
      headPose.turn,
      headPose.tilt,
      headPose.roll
    );

    const smooth = HEAD_ORBIT_CONFIG.smoothing;
    appState.tracking.filteredHeadMovement.turn += (appState.tracking.headMovement.turn - appState.tracking.filteredHeadMovement.turn) * smooth;
    appState.tracking.filteredHeadMovement.tilt += (appState.tracking.headMovement.tilt - appState.tracking.filteredHeadMovement.tilt) * smooth;
    appState.tracking.filteredHeadMovement.roll += (appState.tracking.headMovement.roll - appState.tracking.filteredHeadMovement.roll) * smooth;

    if (appState.stage === STAGES.HEAD_INSTRUCTIONS || appState.stage === STAGES.HEAD_COUNTDOWN) {
      updateStatus(
        `Head orbit ready. Yaw ${appState.tracking.filteredHeadMovement.turn.toFixed(3)}, Pitch ${appState.tracking.filteredHeadMovement.tilt.toFixed(3)}`
      );
    }
  });
}

function tickRoundTimer() {
  if (!appState.round.running) {
    return;
  }

  const elapsed = performance.now() - appState.round.activeStartMs;
  appState.round.remainingMs = Math.max(0, RUN_CONFIG.timeLimitMs - elapsed);

  if (appState.round.remainingMs <= 0) {
    submitRunningRound('timeout');
  }
}

function initializeUi() {
  stageButton.addEventListener('click', () => {
    if (appState.stage === STAGES.MOUSE_INSTRUCTIONS) {
      clearComparisonMarkers();
      setPracticeStartPose();
      startCountdown(STAGES.MOUSE_RUNNING);
      return;
    }

    if (appState.stage === STAGES.HEAD_INSTRUCTIONS) {
      if (!appState.tracking.calibrationStarted && !appState.tracking.calibrated) {
        resetHeadCalibration(true);
        refreshUiState();
        return;
      }

      if (!appState.tracking.calibrated) {
        updateStatus('Calibration in progress. Please keep your head steady.', true);
        return;
      }

      clearComparisonMarkers();
      setPracticeStartPose();
      startCountdown(STAGES.HEAD_RUNNING);
    }
  });

  retryPracticeButton.addEventListener('click', () => {
    if (appState.stage === STAGES.MOUSE_RESULT) {
      clearComparisonMarkers();
      createTargetForCondition(
        'mouse-only',
        appState.round.practiceSceneType,
        appState.round.targetByCondition['head-mouse']
      );
      applyTargetSceneForCurrentCondition();
      setPracticeStartPose();
      startCountdown(STAGES.MOUSE_RUNNING);
      return;
    }

    if (appState.stage === STAGES.HEAD_RESULT) {
      clearComparisonMarkers();
      createTargetForCondition(
        'head-mouse',
        appState.round.practiceSceneType,
        appState.round.targetByCondition['mouse-only']
      );
      setPracticeStartPose();
      setStage(STAGES.HEAD_INSTRUCTIONS);
      applyTargetSceneForCurrentCondition();
    }
  });

  proceedButton.addEventListener('click', () => {
    if (appState.stage === STAGES.MOUSE_RESULT) {
      clearComparisonMarkers();
      if (!appState.round.targetByCondition['head-mouse']) {
        createTargetForCondition(
          'head-mouse',
          appState.round.practiceSceneType,
          appState.round.targetByCondition['mouse-only']
        );
      }
      setStage(STAGES.HEAD_INSTRUCTIONS);
      // Apply scene/reference after switching condition so head target is used.
      applyTargetSceneForCurrentCondition();
      return;
    }

    if (appState.stage === STAGES.HEAD_RESULT) {
      clearComparisonMarkers();
      setStage(STAGES.READY_FOR_REAL);
      updateStatus('Practice complete. We can implement real task flow next.');
    }
  });

  resetCameraButton.addEventListener('click', () => {
    resetCameraOrbit();
    refreshUiState();
    updateStatus('Camera orbit reset.');
  });

  recalibrateButton.addEventListener('click', () => {
    if (appState.condition !== 'head-mouse') {
      updateStatus('Recalibrate is only available in Head+Mouse mode.', true);
      return;
    }

    const restartHeadTask =
      appState.stage === STAGES.HEAD_COUNTDOWN ||
      appState.stage === STAGES.HEAD_RUNNING;

    resetHeadCalibration();
    clearComparisonMarkers();

    if (restartHeadTask) {
      setPracticeStartPose();
      setStage(STAGES.HEAD_INSTRUCTIONS);
      updateStatus('Recalibrated. Current head task restarted. Read instructions, then click Start Calibration.');
      return;
    }

    updateStatus('Recalibration started. Please keep your head centered and steady.');
  });

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space') {
      return;
    }

    event.preventDefault();

    if (appState.stage === STAGES.MOUSE_RUNNING || appState.stage === STAGES.HEAD_RUNNING) {
      submitRunningRound('space');
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (appState.condition === 'mouse-only') {
    controls.update();
    syncOrbitStateFromCamera();
  } else {
    applyHeadDrivenOrbit();
  }

  handleCountdownTick();
  tickRoundTimer();
  refreshUiState();
  renderer.render(scene, camera);
}

function initialize() {
  try {
    conditionSelect.disabled = true;
    sceneSelect.disabled = true;

    appState.round.practiceSceneType = randomInRange(0, 1) < 0.5 ? 'clean' : 'clustered';
    const mouseTarget = createTargetForCondition('mouse-only', appState.round.practiceSceneType);
    createTargetForCondition('head-mouse', appState.round.practiceSceneType, mouseTarget);

    appState.condition = 'mouse-only';
    applyTargetSceneForCurrentCondition();

    initializeObjectDrag();
    initializeUi();
    resetCameraOrbit();
    applyControlMode();
    setStage(STAGES.MOUSE_INSTRUCTIONS);

    initializeHeadTracking();
    animate();
  } catch (error) {
    showError(error.message);
    updateStatus(error.message, true);
  }
}

window.addEventListener('resize', () => {
  handleWindowResize(camera, renderer);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
