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
  SURVEY_BREAK: 'survey-break',
  READY_FOR_REAL: 'ready-for-real'
};

// Update these URLs before running the experiment.
const SURVEY_URLS = {
  'mouse-only': 'survey-mouse.html',
  'head-mouse': 'survey-head.html',
  final: 'survey-final.html'
};

const TASK_MODES = {
  HIDDEN_SEARCH: 'structure-build',
  PHOTO_MATCH: 'photo-match'
};

const RUN_CONFIG = {
  timeLimitMs: 90000,
  countdownSeconds: 3
};

const OCCLUDED_PLACEMENT_CONFIG = {
  goalRadius: 0.55,
  minStartDistance: 5.2
};

const STRUCTURE_BUILD_CONFIG = {
  blockCount: 5,
  gridSize: 1.1,
  startScatterRadius: 5.4,
  referenceAzimuthDeg: 0,
  referenceElevationDeg: 12,
  referenceSecondaryAzimuthDeg: 90,
  referenceSecondaryElevationDeg: 12
};

const STRUCTURE_BLOCK_COLORS = [0xd97473, 0x8ec7d9, 0xf0d49d, 0x8f85c9, 0x7dcfb6];
const STRUCTURE_BLOCK_HEIGHTS = [0.8, 1.1, 1.45, 1.9, 0.6];

const STRUCTURE_TEMPLATES = [
  // Template 1: 2 front, 3 back (grid units: x,z in multiples of 1.1)
  [
    { x:  0, y: 0, z:  1 },  // front-center (hides back-center)
    { x:  1, y: 0, z:  1 },  // front-right
    { x: -1, y: 0, z:  0 },  // mid-left
    { x:  1, y: 0, z: -1 },  // back-far-right
    { x: -1, y: 0, z: -1 }   // back-far-left
  ],
  // Template 2: varied front-mid, 1 far back (hidden)
  [
    { x:  0, y: 0, z:  1 },  // front-center
    { x:  1, y: 0, z:  0 },  // mid-right
    { x: -1, y: 0, z:  1 },  // front-left
    { x:  0, y: 0, z:  0 },  // mid-center
    { x:  2, y: 0, z: -1 }   // back-far (hidden by others)
  ],
  // Template 3: 1 tall front apex, 4 back scattered
  [
    { x:  0, y: 0, z:  1 },  // front-apex (occludes back-center)
    { x:  1, y: 0, z: -1 },  // back-right
    { x: -1, y: 0, z: -1 },  // back-left
    { x:  2, y: 0, z:  0 },  // mid-far-right
    { x: -2, y: 0, z:  0 }   // mid-far-left
  ],
  // Template 4: 3 front layer, 2 back layer (varied x for side-view depth)
  [
    { x:  0, y: 0, z:  1 },  // front-center
    { x:  1, y: 0, z:  1 },  // front-right
    { x: -2, y: 0, z:  0 },  // mid-far-left
    { x:  2, y: 0, z:  0 },  // mid-far-right
    { x:  0, y: 0, z: -1 }   // back-center (hidden by front-center)
  ]
];

const HEAD_ORBIT_CONFIG = {
  mappingSmoothing: 0.085,
  mappingSmoothingCenter: 0.045,
  responseExponent: 1.5,
  // Yaw (left/right): comfortable range ±0.8
  yawMaxInput: 0.8,
  // Pitch (up/down): comfortable range ±0.05
  pitchMaxInput: 0.05,
  smoothing: 0.075,
  microSmoothing: 0.025,
  jitterThreshold: 0.02
};

const HEAD_RANGE_LOCK_BUFFER = {
  yawFactor: 0.75,
  pitchFactor: 0.75,
  minYaw: 0.01,
  minPitch: 0.002
};

let detectors = createDetectors();

const appState = {
  stage: STAGES.MOUSE_INSTRUCTIONS,
  taskMode: TASK_MODES.HIDDEN_SEARCH,
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
    headOrbitCenterAzimuthDeg: CAMERA_CONSTRAINTS.initialAzimuthDeg,
    headOrbitCenterElevationDeg: CAMERA_CONSTRAINTS.initialElevationDeg,
    peakTurnObserved: 0,
    peakTiltObserved: 0,
    rangeLocked: false,
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
    repositionCounts: [0, 0, 0, 0, 0],
    practiceSceneType: null,
    targetByCondition: {
      'mouse-only': null,
      'head-mouse': null
    },
    lastResultByCondition: {
      'mouse-only': null,
      'head-mouse': null
    },
    realTask: {
      active: false,
      completed: false,
      totalTrialsPerCondition: 12,
      startCondition: 'mouse-only',
      currentCondition: 'mouse-only',
      conditionOrder: ['mouse-only', 'head-mouse'],
      currentConditionOrderIndex: 0,
      currentTrialIndex: 0,
      headCalibrationCompleted: false,
      trialPairs: [],
      submittedResults: [],
      pendingSurveyCondition: null
    },
    hiddenSearch: {
      activeMeshes: [],
      foundCount: 0,
      totalCount: 0,
      goalPosition: null,
      goalRadius: OCCLUDED_PLACEMENT_CONFIG.goalRadius,
      selectedBlockIndex: 0
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
const buildCubes = [cube];
for (let index = 1; index < STRUCTURE_BUILD_CONFIG.blockCount; index += 1) {
  const extraCube = createCube();
  extraCube.visible = false;
  scene.add(extraCube);
  buildCubes.push(extraCube);
}
buildCubes.forEach((mesh, index) => {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    material.color.setHex(STRUCTURE_BLOCK_COLORS[index % STRUCTURE_BLOCK_COLORS.length]);
  });
});
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

const goalAreaMarker = new THREE.Mesh(
  new THREE.RingGeometry(
    OCCLUDED_PLACEMENT_CONFIG.goalRadius - 0.08,
    OCCLUDED_PLACEMENT_CONFIG.goalRadius + 0.14,
    56
  ),
  new THREE.MeshBasicMaterial({ color: 0x45db7d, side: THREE.DoubleSide, transparent: true, opacity: 0.68 })
);
goalAreaMarker.rotation.x = -Math.PI / 2;
goalAreaMarker.position.y = 0.025;
goalAreaMarker.visible = false;
scene.add(goalAreaMarker);

const tempTargetCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

const conditionSelect = document.getElementById('condition-select');
const sceneSelect = document.getElementById('scene-select');
const stageButton = document.getElementById('stage-button');
const lockRangeButton = document.getElementById('lock-range-button');
const proceedButton = document.getElementById('proceed-button');
const retryPracticeButton = document.getElementById('retry-practice-button');
const recalibrateButton = document.getElementById('recalibrate-button');
const skipPracticeButton = document.getElementById('skip-practice-button');
const surveyLinkButton = document.getElementById('survey-link-button');
const finalSurveyLinkButton = document.getElementById('final-survey-link-button');
const skipRealTaskButton = document.getElementById('skip-real-task-button');

const conditionReadout = document.getElementById('condition-readout');
const sceneReadout = document.getElementById('scene-readout');
const azimuthReadout = document.getElementById('azimuth-readout');
const elevationReadout = document.getElementById('elevation-readout');
const phaseReadout = document.getElementById('phase-readout');
const trialReadout = document.getElementById('trial-readout');
const timerReadout = document.getElementById('timer-readout');
const trialCounter = document.getElementById('trial-counter');
const positionErrorReadout = document.getElementById('position-error-readout');
const cameraErrorReadout = document.getElementById('camera-error-readout');

const instructionStage = document.getElementById('instruction-stage');
const instructionTitle = document.getElementById('instruction-title');
const instructions = document.getElementById('instruction-body');
const instructionPanel = document.getElementById('instruction-panel');
const referencePanel = document.getElementById('reference-panel');
const centerStatus = document.getElementById('center-status');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');
const referenceCanvas = document.getElementById('reference-canvas');
const referenceCtx = referenceCanvas.getContext('2d');
const referenceCanvasSecondary = document.getElementById('reference-canvas-secondary');
const referenceCtxSecondary = referenceCanvasSecondary.getContext('2d');

const dragState = {
  isDragging: false,
  pointerId: null,
  activeMesh: null,
  offset: new THREE.Vector3(),
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  dragPoint: new THREE.Vector3(),
  startX: 0,
  startZ: 0
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

function formatConditionLabel(condition) {
  return condition === 'head-mouse' ? 'Head + Mouse' : 'Mouse-only';
}

function formatSceneLabel(sceneType) {
  return sceneType === 'clustered' ? 'Clustered' : 'Clean';
}

function formatTimeSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

function clampDot(value) {
  return Math.max(0, Math.min(1, value));
}

function getCurrentTarget() {
  return appState.round.targetByCondition[appState.condition];
}

function getActiveUserCubes() {
  return isHiddenSearchMode() ? buildCubes : [cube];
}

function setCubeHighlight(mesh, isSelected) {
  if (!mesh.userData.baseScaleX) {
    mesh.userData.baseScaleX = mesh.scale.x;
  }
  if (!mesh.userData.baseScaleZ) {
    mesh.userData.baseScaleZ = mesh.scale.z;
  }

  const scaleFactor = isSelected ? 1.08 : 1.0;
  mesh.scale.x = mesh.userData.baseScaleX * scaleFactor;
  mesh.scale.z = mesh.userData.baseScaleZ * scaleFactor;
}

function selectBuildCube(mesh) {
  buildCubes.forEach((candidate, index) => {
    const selected = candidate === mesh;
    setCubeHighlight(candidate, selected && isHiddenSearchMode());
    if (selected) {
      appState.round.hiddenSearch.selectedBlockIndex = index;
    }
  });
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomInRange(0, i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function getBuildBlockHeight(index) {
  return STRUCTURE_BLOCK_HEIGHTS[index % STRUCTURE_BLOCK_HEIGHTS.length];
}

function getBuildBlockY(index) {
  return getBuildBlockHeight(index) / 2;
}

function applyBuildCubeIdentity(mesh, blockIndex, colorIndex = blockIndex) {
  const normalizedColorIndex = colorIndex % STRUCTURE_BLOCK_COLORS.length;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    material.color.setHex(STRUCTURE_BLOCK_COLORS[normalizedColorIndex]);
  });

  mesh.scale.y = getBuildBlockHeight(blockIndex);
  mesh.position.y = getBuildBlockY(blockIndex);
  mesh.userData.blockIndex = blockIndex;
  mesh.userData.colorIndex = normalizedColorIndex;
}

function getBuildCenter(target = getCurrentTarget()) {
  return target?.cubePosition || { x: 0, z: 0 };
}

function roundToGrid(value, origin) {
  return origin + Math.round((value - origin) / STRUCTURE_BUILD_CONFIG.gridSize) * STRUCTURE_BUILD_CONFIG.gridSize;
}

function snapStructurePosition(position, center) {
  return clampPointToSceneBounds({
    x: roundToGrid(position.x, center.x),
    z: roundToGrid(position.z, center.z)
  });
}

function getStructureBlockWorldPosition(block, center) {
  return {
    x: center.x + block.x * STRUCTURE_BUILD_CONFIG.gridSize,
    y: getBuildBlockY(block.blockIndex ?? 0),
    z: center.z + block.z * STRUCTURE_BUILD_CONFIG.gridSize
  };
}

function rotateStructureBlock(block, quarterTurns) {
  const normalizedTurns = ((quarterTurns % 4) + 4) % 4;
  let x = block.x;
  let z = block.z;
  for (let step = 0; step < normalizedTurns; step += 1) {
    const nextX = -z;
    const nextZ = x;
    x = nextX;
    z = nextZ;
  }
  return { x, y: 0, z, blockIndex: block.blockIndex, colorIndex: block.colorIndex };
}

function hasFrontCompleteOcclusionForBlocks(blocks, center) {
  if (!blocks || blocks.length < 2) {
    return false;
  }

  applyOrbitToCamera(
    tempTargetCamera,
    STRUCTURE_BUILD_CONFIG.referenceAzimuthDeg,
    STRUCTURE_BUILD_CONFIG.referenceElevationDeg,
    CAMERA_CONSTRAINTS.target,
    CAMERA_CONSTRAINTS.distance
  );
  tempTargetCamera.updateProjectionMatrix();
  tempTargetCamera.updateMatrixWorld(true);

  const projectedBlocks = blocks.map((block) => {
    const blockIndex = block.blockIndex ?? 0;
    const world = getStructureBlockWorldPosition(block, center);
    const halfWidth = 0.5;
    const halfDepth = 0.5;
    const height = getBuildBlockHeight(blockIndex);

    const corners = [
      new THREE.Vector3(world.x - halfWidth, 0, world.z - halfDepth),
      new THREE.Vector3(world.x + halfWidth, 0, world.z - halfDepth),
      new THREE.Vector3(world.x - halfWidth, 0, world.z + halfDepth),
      new THREE.Vector3(world.x + halfWidth, 0, world.z + halfDepth),
      new THREE.Vector3(world.x - halfWidth, height, world.z - halfDepth),
      new THREE.Vector3(world.x + halfWidth, height, world.z - halfDepth),
      new THREE.Vector3(world.x - halfWidth, height, world.z + halfDepth),
      new THREE.Vector3(world.x + halfWidth, height, world.z + halfDepth)
    ];

    const ndcCorners = corners.map((corner) => corner.clone().project(tempTargetCamera));
    const rect = {
      minX: Math.min(...ndcCorners.map((p) => p.x)),
      maxX: Math.max(...ndcCorners.map((p) => p.x)),
      minY: Math.min(...ndcCorners.map((p) => p.y)),
      maxY: Math.max(...ndcCorners.map((p) => p.y))
    };

    const centerCameraSpace = new THREE.Vector3(world.x, height * 0.5, world.z).applyMatrix4(tempTargetCamera.matrixWorldInverse);
    return {
      blockIndex,
      cameraDepth: centerCameraSpace.z,
      rect,
      area: Math.max(0, rect.maxX - rect.minX) * Math.max(0, rect.maxY - rect.minY)
    };
  });

  const containmentMargin = 0.012;
  const minVisibleArea = 0.00035;
  const minDepthGap = 0.7;

  for (let i = 0; i < projectedBlocks.length; i += 1) {
    for (let j = i + 1; j < projectedBlocks.length; j += 1) {
      const first = projectedBlocks[i];
      const second = projectedBlocks[j];
      const front = first.cameraDepth > second.cameraDepth ? first : second;
      const back = front === first ? second : first;

      if ((front.cameraDepth - back.cameraDepth) < minDepthGap) {
        continue;
      }

      if (back.area < minVisibleArea || front.area < minVisibleArea) {
        continue;
      }

      const fullyContained =
        back.rect.minX >= front.rect.minX + containmentMargin &&
        back.rect.maxX <= front.rect.maxX - containmentMargin &&
        back.rect.minY >= front.rect.minY + containmentMargin &&
        back.rect.maxY <= front.rect.maxY - containmentMargin;

      if (fullyContained) {
        return true;
      }
    }
  }

  return false;
}

function allBlocksVisibleFromFrontView(blocks) {
  if (!blocks || blocks.length === 0) {
    return true;
  }

  const hideHeightMargin = 0.05;
  // If every block fails to find a front blocker, all are visible.
  return !blocks.some((back, i) => {
    const backHeight = getBuildBlockHeight(back.blockIndex ?? 0);
    return blocks.some((front, j) =>
      i !== j &&
      front.x === back.x &&
      front.z > back.z &&
      getBuildBlockHeight(front.blockIndex ?? 0) >= backHeight + hideHeightMargin
    );
  });
}

function validateTargetPixelsCoverageFront(blocks, center) {
  // Render front view and sample pixels to verify occlusion.
  // Each block has a unique color; count pixels per color.
  // If all 5 colors have ≥10 pixels, all blocks are visible (invalid).
  
  if (!blocks || blocks.length < 5) {
    return false;
  }

  try {
    // Save current state
    const savedState = buildCubes.map((mesh) => ({
      position: mesh.position.clone(),
      visible: mesh.visible,
      scaleY: mesh.scale.y,
      blockIndex: mesh.userData.blockIndex || 0,
      colorIndex: mesh.userData.colorIndex ?? (mesh.userData.blockIndex || 0)
    }));
    const savedSceneType = appState.sceneType;
    const savedAzimuth = appState.orbit.azimuthDeg;
    const savedElevation = appState.orbit.elevationDeg;

    // Temporarily set up for front view render
    clearPlacementOccluders();
    appState.sceneType = 'clean';
    applySceneVariant(scene, ground, clutterGroup, appState.sceneType);
    layoutBuildCubesForTarget({ blocks, blockStartIndex: 0, cubePosition: center });
    goalAreaMarker.visible = false;

    // Render from front view
    appState.orbit.azimuthDeg = STRUCTURE_BUILD_CONFIG.referenceAzimuthDeg;
    appState.orbit.elevationDeg = STRUCTURE_BUILD_CONFIG.referenceElevationDeg;
    applyOrbitStateToCamera();
    renderer.render(scene, camera);

    // Get WebGL context and read pixels
    const gl = renderer.getContext();
    if (!gl) {
      console.warn('Failed to get WebGL context in pixel validation');
      return true;
    }

    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

    // Count pixels for each block color
    const colorCounts = [0, 0, 0, 0, 0];
    const colorTolerance = 20; // Allow variance for anti-aliasing and lighting

    for (let i = 0; i < 5; i += 1) {
      const hexColor = STRUCTURE_BLOCK_COLORS[i];
      const expectedR = (hexColor >> 16) & 0xff;
      const expectedG = (hexColor >> 8) & 0xff;
      const expectedB = hexColor & 0xff;

      for (let j = 0; j < pixelData.length; j += 4) {
        const pr = pixelData[j];
        const pg = pixelData[j + 1];
        const pb = pixelData[j + 2];
        const pa = pixelData[j + 3];

        if (pa < 200) {
          // Skip mostly transparent pixels
          continue;
        }

        const dr = Math.abs(pr - expectedR);
        const dg = Math.abs(pg - expectedG);
        const db = Math.abs(pb - expectedB);

        if (dr <= colorTolerance && dg <= colorTolerance && db <= colorTolerance) {
          colorCounts[i] += 1;
        }
      }
    }

    // Restore state
    appState.orbit.azimuthDeg = savedAzimuth;
    appState.orbit.elevationDeg = savedElevation;
    appState.sceneType = savedSceneType;
    applyOrbitStateToCamera();
    applySceneVariant(scene, ground, clutterGroup, appState.sceneType);
    
    savedState.forEach((saved, idx) => {
      if (buildCubes[idx]) {
        buildCubes[idx].position.copy(saved.position);
        buildCubes[idx].visible = saved.visible;
        buildCubes[idx].scale.y = saved.scaleY;
        buildCubes[idx].userData.blockIndex = saved.blockIndex;
        buildCubes[idx].userData.colorIndex = saved.colorIndex;
      }
    });

    // Check if all 5 colors exceed threshold (all blocks visible = invalid)
    const minPixelsVisible = 10;
    const colorsWithPixels = colorCounts.filter((count) => count >= minPixelsVisible);
    const allFiveColorsVisible = colorsWithPixels.length === 5;

    // Debug logging
    if (false) { // Set to true to debug
      console.log('Pixel counts per color:', colorCounts);
      console.log('Colors visible (≥10px):', colorsWithPixels.length, '/ 5');
      console.log('Target valid (occlusion present):', !allFiveColorsVisible);
    }

    // Return true (valid) if NOT all 5 colors visible, false (invalid) if all 5 visible
    return !allFiveColorsVisible;
  } catch (error) {
    console.error('Pixel validation error:', error);
    return true; // Default to valid if validation fails
  }
}

function blocksEqual(a, b) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  const aKeys = a.map((block) => `${block.blockIndex}|${block.colorIndex ?? block.blockIndex}|${block.x}|${block.z}`).sort();
  const bKeys = b.map((block) => `${block.blockIndex}|${block.colorIndex ?? block.blockIndex}|${block.x}|${block.z}`).sort();
  return aKeys.every((key, index) => key === bKeys[index]);
}

function createStructureTargetForCondition(condition, avoidTarget = null) {
  const center = { x: 0, z: 0 };
  let selectedBlocks = null;
  const sideSign = randomInRange(0, 1) < 0.5 ? -1 : 1;
  const sideAzimuthDeg = sideSign * Math.abs(STRUCTURE_BUILD_CONFIG.referenceSecondaryAzimuthDeg);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const templateIndex = Math.floor(randomInRange(0, STRUCTURE_TEMPLATES.length));
    const rotation = Math.floor(randomInRange(0, 4));
    const heightIndices = shuffleArray([0, 1, 2, 3, 4]);
    const colorIndices = shuffleArray([0, 1, 2, 3, 4]);
    const candidateBlocks = STRUCTURE_TEMPLATES[templateIndex].map((block, index) =>
      rotateStructureBlock({ ...block, blockIndex: heightIndices[index], colorIndex: colorIndices[index] }, rotation)
    );

    if (!hasFrontCompleteOcclusionForBlocks(candidateBlocks, center)) {
      continue;
    }

    if (allBlocksVisibleFromFrontView(candidateBlocks)) {
      continue;
    }

    // NEW: Verify by pixel sampling that at least one block color is not heavily visible
    if (!validateTargetPixelsCoverageFront(candidateBlocks, center)) {
      continue;
    }

    if (avoidTarget?.blocks && blocksEqual(avoidTarget.blocks, candidateBlocks)) {
      continue;
    }

    selectedBlocks = candidateBlocks;
    break;
  }

  if (!selectedBlocks) {
    const fallbackTemplate = STRUCTURE_TEMPLATES[0];
    const fallbackHeightIndices = shuffleArray([0, 1, 2, 3, 4]);
    const fallbackColorIndices = shuffleArray([0, 1, 2, 3, 4]);
    selectedBlocks = fallbackTemplate.map((block, index) => ({
      ...block,
      y: 0,
      blockIndex: fallbackHeightIndices[index],
      colorIndex: fallbackColorIndices[index]
    }));
  }

  const candidate = {
    condition,
    sceneType: 'clean',
    cubePosition: center,
    azimuthDeg: STRUCTURE_BUILD_CONFIG.referenceAzimuthDeg,
    elevationDeg: STRUCTURE_BUILD_CONFIG.referenceElevationDeg,
    secondaryAzimuthDeg: sideAzimuthDeg,
    secondaryElevationDeg: STRUCTURE_BUILD_CONFIG.referenceSecondaryElevationDeg,
    blocks: selectedBlocks
  };

  appState.round.targetByCondition[condition] = candidate;
  return candidate;
}

function layoutBuildCubesForTarget(target) {
  if (!target?.blocks) {
    return;
  }

  const center = getBuildCenter(target);
  buildCubes.forEach((mesh, index) => {
    if (index >= target.blocks.length) {
      mesh.visible = false;
      return;
    }

    const block = target.blocks[index];
    const blockIndex = block.blockIndex ?? index;
    const colorIndex = block.colorIndex ?? blockIndex;
    const blockPosition = getStructureBlockWorldPosition(block, center);
    mesh.position.set(blockPosition.x, blockPosition.y, blockPosition.z);
    applyBuildCubeIdentity(mesh, blockIndex, colorIndex);
    mesh.visible = true;
  });
}

function scatterBuildCubesForPlay(target) {
  const center = getBuildCenter(target);
  buildCubes.forEach((mesh, index) => {
    const targetBlock = target?.blocks?.[index];
    const blockIndex = targetBlock?.blockIndex ?? index;
    const colorIndex = targetBlock?.colorIndex ?? blockIndex;
    let angle = (index / buildCubes.length) * Math.PI * 2 + randomInRange(-0.22, 0.22);
    let radius = randomInRange(STRUCTURE_BUILD_CONFIG.startScatterRadius - 0.9, STRUCTURE_BUILD_CONFIG.startScatterRadius + 0.8);
    let position = clampPointToSceneBounds({
      x: center.x + Math.cos(angle) * radius,
      z: center.z + Math.sin(angle) * radius
    });

    position = snapStructurePosition(position, center);
    mesh.position.set(position.x, getBuildBlockY(blockIndex), position.z);
    applyBuildCubeIdentity(mesh, blockIndex, colorIndex);
    mesh.position.y = getBuildBlockY(blockIndex);
    mesh.visible = true;
  });

  selectBuildCube(buildCubes[0]);
}

function getBuildProgress() {
  const target = getCurrentTarget();
  if (!target?.blocks) {
    return { matched: 0, total: 0 };
  }

  const center = getBuildCenter(target);
  const targetKeys = target.blocks.map((block) => {
    const world = getStructureBlockWorldPosition(block, center);
    return `${block.blockIndex}|${world.x.toFixed(2)}|${world.z.toFixed(2)}`;
  });

  const remaining = new Map();
  targetKeys.forEach((key) => {
    remaining.set(key, (remaining.get(key) || 0) + 1);
  });

  let matched = 0;
  buildCubes.forEach((mesh) => {
    if (!mesh.visible) {
      return;
    }

    const blockKey = `${mesh.userData.blockIndex || 0}|${mesh.position.x.toFixed(2)}|${mesh.position.z.toFixed(2)}`;
    const count = remaining.get(blockKey) || 0;
    if (count > 0) {
      matched += 1;
      remaining.set(blockKey, count - 1);
    }
  });

  return { matched, total: target.blocks.length };
}

function getRandomCubePosition() {
  return clampPointToSceneBounds({
    x: randomInRange(SCENE_BOUNDS.minX, SCENE_BOUNDS.maxX),
    z: randomInRange(SCENE_BOUNDS.minZ, SCENE_BOUNDS.maxZ)
  });
}

function clearHiddenSearchMeshes() {
  clearPlacementOccluders();
  appState.round.hiddenSearch.foundCount = 0;
  appState.round.hiddenSearch.totalCount = 0;
  appState.round.hiddenSearch.goalPosition = null;
  goalAreaMarker.visible = false;
}

function clearPlacementOccluders() {
  appState.round.hiddenSearch.activeMeshes.forEach((mesh) => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  appState.round.hiddenSearch.activeMeshes = [];
}

function isHiddenSearchMode() {
  return appState.taskMode === TASK_MODES.HIDDEN_SEARCH;
}

function createPlacementTargetForCondition(condition, avoidTarget = null) {
  let candidate = null;
  let fallback = null;

  for (let attempt = 0; attempt < 140; attempt += 1) {
    const next = {
      condition,
      sceneType: 'clustered',
      cubePosition: getRandomCubePosition(),
      azimuthDeg: CAMERA_CONSTRAINTS.initialAzimuthDeg,
      elevationDeg: CAMERA_CONSTRAINTS.initialElevationDeg
    };

    if (isTargetTooSimilar(next, avoidTarget)) {
      continue;
    }

    if (!fallback) {
      fallback = next;
    }

    if (isGoalHardOccluded(next.cubePosition) && hasReachableHeadViewToGoal(next.cubePosition)) {
      candidate = next;
      break;
    }
  }

  if (!candidate) {
    candidate = fallback || {
      condition,
      sceneType: 'clustered',
      cubePosition: getRandomCubePosition(),
      azimuthDeg: CAMERA_CONSTRAINTS.initialAzimuthDeg,
      elevationDeg: CAMERA_CONSTRAINTS.initialElevationDeg
    };
  }

  appState.round.targetByCondition[condition] = candidate;
  return candidate;
}

function getInitialCameraPosition() {
  return getCameraPositionForOrbit(
    CAMERA_CONSTRAINTS.initialAzimuthDeg,
    CAMERA_CONSTRAINTS.initialElevationDeg
  );
}

function getCameraPositionForOrbit(azimuthDeg, elevationDeg) {
  const azimuth = THREE.MathUtils.degToRad(CAMERA_CONSTRAINTS.initialAzimuthDeg);
  const elevation = THREE.MathUtils.degToRad(CAMERA_CONSTRAINTS.initialElevationDeg);
  const horizontalDistance = Math.cos(elevation) * CAMERA_CONSTRAINTS.distance;

  const azimuthUsed = THREE.MathUtils.degToRad(azimuthDeg);
  const elevationUsed = THREE.MathUtils.degToRad(elevationDeg);
  const horizontalDistanceUsed = Math.cos(elevationUsed) * CAMERA_CONSTRAINTS.distance;

  return new THREE.Vector3(
    CAMERA_CONSTRAINTS.target.x + Math.sin(azimuthUsed) * horizontalDistanceUsed,
    CAMERA_CONSTRAINTS.target.y + Math.sin(elevationUsed) * CAMERA_CONSTRAINTS.distance,
    CAMERA_CONSTRAINTS.target.z + Math.cos(azimuthUsed) * horizontalDistanceUsed
  );
}

function isGoalVisibleFromCamera(goalPosition, cameraPos) {
  const goalPoint = new THREE.Vector3(goalPosition.x, 0.14, goalPosition.z);
  const rayDirection = new THREE.Vector3().subVectors(goalPoint, cameraPos);
  const goalDistance = rayDirection.length();

  if (goalDistance <= 0.001) {
    return true;
  }

  const raycaster = new THREE.Raycaster(
    cameraPos,
    rayDirection.normalize(),
    0,
    Math.max(0.05, goalDistance - 0.1)
  );

  const blockers = clutterGroup.children.concat(appState.round.hiddenSearch.activeMeshes);
  const hits = raycaster.intersectObjects(blockers, false);
  return hits.length === 0;
}

function isGoalOccludedFromView(goalPosition, cameraPos) {
  return !isGoalVisibleFromCamera(goalPosition, cameraPos);
}

function isGoalHardOccluded(goalPosition) {
  const start = getInitialCameraPosition();
  const toCenter = new THREE.Vector3(CAMERA_CONSTRAINTS.target.x, 0, CAMERA_CONSTRAINTS.target.z)
    .sub(new THREE.Vector3(start.x, 0, start.z));
  const side = new THREE.Vector3(-toCenter.z, 0, toCenter.x).normalize();

  const viewPositions = [
    start,
    new THREE.Vector3(start.x + side.x * 2.2, start.y, start.z + side.z * 2.2),
    new THREE.Vector3(start.x - side.x * 2.2, start.y, start.z - side.z * 2.2)
  ];

  let occludedViews = 0;
  viewPositions.forEach((viewPos) => {
    if (isGoalOccludedFromView(goalPosition, viewPos)) {
      occludedViews += 1;
    }
  });

  return occludedViews >= 2;
}

function hasReachableHeadViewToGoal(goalPosition) {
  const azimuthStep = 8;
  const elevationStep = 7;
  const azimuthMin = CAMERA_CONSTRAINTS.azimuthMinDeg;
  const azimuthMax = CAMERA_CONSTRAINTS.azimuthMaxDeg;
  const elevationMin = Math.max(CAMERA_CONSTRAINTS.elevationMinDeg + 6, 6);
  const elevationMax = Math.min(CAMERA_CONSTRAINTS.elevationMaxDeg - 6, 80);

  for (let elevationDeg = elevationMin; elevationDeg <= elevationMax; elevationDeg += elevationStep) {
    for (let azimuthDeg = azimuthMin; azimuthDeg <= azimuthMax; azimuthDeg += azimuthStep) {
      const cameraPos = getCameraPositionForOrbit(azimuthDeg, elevationDeg);
      if (isGoalVisibleFromCamera(goalPosition, cameraPos)) {
        return true;
      }
    }
  }

  return false;
}

function createPlacementOccludersForGoal(goalPosition) {
  if (!goalPosition) {
    clearPlacementOccluders();
    return;
  }

  const makeBlock = (x, z, colorMin = 0x68605a, colorMax = 0x7f766d) => {
    const clamped = clampPointToSceneBounds({ x, z });
    const shade = Math.floor(randomInRange(colorMin, colorMax));
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: shade, roughness: 0.9, metalness: 0.02 })
    );
    block.position.set(clamped.x, randomInRange(1.0, 2.0), clamped.z);
    block.scale.set(randomInRange(1.3, 2.7), randomInRange(2.7, 4.8), randomInRange(1.0, 2.2));
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    appState.round.hiddenSearch.activeMeshes.push(block);
  };

  const start = getInitialCameraPosition();
  const start2 = new THREE.Vector3(start.x, 0, start.z);
  const goal2 = new THREE.Vector3(goalPosition.x, 0, goalPosition.z);
  const toGoal = new THREE.Vector3().subVectors(goal2, start2);
  const travel = Math.max(0.001, toGoal.length());
  const forward = toGoal.normalize();
  const side = new THREE.Vector3(-forward.z, 0, forward.x);

  for (let layoutAttempt = 0; layoutAttempt < 16; layoutAttempt += 1) {
    clearPlacementOccluders();

    const midCount = Math.max(4, 8 - Math.floor(layoutAttempt / 4));
    const nearSlots = 8;

    for (let i = 0; i < midCount; i += 1) {
      const t = 0.25 + i * (0.55 / Math.max(1, midCount - 1)) + randomInRange(-0.03, 0.03);
      const lateral = randomInRange(-1.25, 1.25);
      const base = new THREE.Vector3().copy(start2).addScaledVector(forward, travel * t).addScaledVector(side, lateral);
      makeBlock(base.x, base.z);
    }

    const gapA = Math.floor(randomInRange(0, nearSlots));
    const gapB = (gapA + 1 + Math.floor(randomInRange(0, 2))) % nearSlots;
    for (let i = 0; i < nearSlots; i += 1) {
      if (i === gapA || i === gapB) {
        continue;
      }
      const angle = (i / nearSlots) * Math.PI * 2 + randomInRange(-0.12, 0.12);
      const radius = randomInRange(1.0, 1.55);
      makeBlock(
        goalPosition.x + Math.cos(angle) * radius,
        goalPosition.z + Math.sin(angle) * radius,
        0x625a54,
        0x766c62
      );
    }

    if (hasReachableHeadViewToGoal(goalPosition)) {
      return;
    }
  }

  // Fallback: keep it hard but always solvable.
  clearPlacementOccluders();
  for (let i = 0; i < 5; i += 1) {
    const t = 0.3 + i * 0.11;
    const lateral = randomInRange(-0.95, 0.95);
    const base = new THREE.Vector3().copy(start2).addScaledVector(forward, travel * t).addScaledVector(side, lateral);
    makeBlock(base.x, base.z);
  }
}

function updatePlacementGoalMarker(goalPosition) {
  if (!goalPosition) {
    goalAreaMarker.visible = false;
    return;
  }

  goalAreaMarker.position.set(goalPosition.x, 0.025, goalPosition.z);
  goalAreaMarker.visible = true;
}

function isCubeInsidePlacementGoal() {
  const goalPosition = appState.round.hiddenSearch.goalPosition;
  if (!goalPosition) {
    return false;
  }

  const dx = cube.position.x - goalPosition.x;
  const dz = cube.position.z - goalPosition.z;
  return Math.hypot(dx, dz) <= appState.round.hiddenSearch.goalRadius;
}

function resetRoundState() {
  appState.round.running = false;
  appState.round.remainingMs = RUN_CONFIG.timeLimitMs;
  appState.round.countdownActive = false;
  appState.round.countdownValue = RUN_CONFIG.countdownSeconds;
  appState.round.repositionCounts = [0, 0, 0, 0, 0];
  clearHiddenSearchMeshes();
}

function cloneTargetForCondition(target, condition) {
  if (!target) {
    return null;
  }

  return {
    ...target,
    condition,
    cubePosition: target.cubePosition ? { ...target.cubePosition } : null,
    blocks: target.blocks ? target.blocks.map((block) => ({ ...block })) : undefined
  };
}

function createRealTrialPair() {
  if (isHiddenSearchMode()) {
    const baseTarget = createStructureTargetForCondition('mouse-only');
    const mouseTarget = cloneTargetForCondition(baseTarget, 'mouse-only');
    const headTarget = cloneTargetForCondition(baseTarget, 'head-mouse');
    return {
      'mouse-only': mouseTarget,
      'head-mouse': headTarget
    };
  }

  const baseTarget = createTargetForCondition('mouse-only', randomInRange(0, 1) < 0.5 ? 'clean' : 'clustered');
  const mouseTarget = cloneTargetForCondition(baseTarget, 'mouse-only');
  const headTarget = cloneTargetForCondition(baseTarget, 'head-mouse');
  return {
    'mouse-only': mouseTarget,
    'head-mouse': headTarget
  };
}

function ensureRealTrialPair(trialIndex) {
  while (appState.round.realTask.trialPairs.length <= trialIndex) {
    appState.round.realTask.trialPairs.push(createRealTrialPair());
  }
  return appState.round.realTask.trialPairs[trialIndex];
}

function loadRealTaskTargetsForCurrentTrial() {
  const trialIndex = appState.round.realTask.currentTrialIndex;
  const pair = ensureRealTrialPair(trialIndex);
  appState.round.targetByCondition['mouse-only'] = cloneTargetForCondition(pair['mouse-only'], 'mouse-only');
  appState.round.targetByCondition['head-mouse'] = cloneTargetForCondition(pair['head-mouse'], 'head-mouse');
}

function setConditionInstructionStage(condition, showInstructions = true) {
  if (condition === 'mouse-only') {
    setStage(STAGES.MOUSE_INSTRUCTIONS);
    if (appState.round.realTask.active && !showInstructions) {
      clearComparisonMarkers();
      setPracticeStartPose();
      startCountdown(STAGES.MOUSE_RUNNING);
    }
  } else {
    setStage(STAGES.HEAD_INSTRUCTIONS);
  }
}

function beginRealTaskFlow() {
  const roll = Math.random();
  const startCondition = roll < 0.5 ? 'mouse-only' : 'head-mouse';
  console.log(`[beginRealTaskFlow] roll=${roll.toFixed(4)}, startCondition=${startCondition}`);
  appState.round.realTask.active = true;
  appState.round.realTask.completed = false;
  appState.round.realTask.startCondition = startCondition;
  appState.round.realTask.currentCondition = startCondition;
  appState.round.realTask.conditionOrder = startCondition === 'mouse-only'
    ? ['mouse-only', 'head-mouse']
    : ['head-mouse', 'mouse-only'];
  appState.round.realTask.currentConditionOrderIndex = 0;
  appState.round.realTask.currentTrialIndex = 0;
  appState.round.realTask.headCalibrationCompleted = false;
  appState.round.realTask.trialPairs = [];
  appState.round.realTask.submittedResults = [];

  loadRealTaskTargetsForCurrentTrial();
  setConditionInstructionStage(startCondition);
  applyTargetSceneForCurrentCondition();
  updateStatus(`Real tasks started. ${formatConditionLabel(startCondition)} begins first.`);
}

function advanceRealTaskFlow() {
  const realTask = appState.round.realTask;
  if (!realTask.active || realTask.completed) {
    return;
  }

  realTask.currentTrialIndex += 1;
  if (realTask.currentTrialIndex < realTask.totalTrialsPerCondition) {
    loadRealTaskTargetsForCurrentTrial();
    setConditionInstructionStage(realTask.currentCondition, false);
    applyTargetSceneForCurrentCondition();
    return;
  }

  if (realTask.currentConditionOrderIndex === 0) {
    realTask.pendingSurveyCondition = realTask.conditionOrder[0];
    setStage(STAGES.SURVEY_BREAK);
    updateStatus(`${formatConditionLabel(realTask.conditionOrder[0])} complete. Please fill in the survey before continuing.`);
    return;
  }

  realTask.active = false;
  realTask.completed = true;
  realTask.pendingSurveyCondition = realTask.conditionOrder[1];
  setStage(STAGES.SURVEY_BREAK);
  updateStatus('All trials complete. Please fill in the final survey.');
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

function drawHiddenModeReference() {
  const target = getCurrentTarget();
  if (!target?.blocks) {
    return;
  }

  const savedState = buildCubes.map((mesh) => ({
    position: mesh.position.clone(),
    visible: mesh.visible,
    scaleY: mesh.scale.y,
    blockIndex: mesh.userData.blockIndex || 0,
    colorIndex: mesh.userData.colorIndex ?? (mesh.userData.blockIndex || 0)
  }));
  const savedSceneType = appState.sceneType;
  const savedAzimuth = appState.orbit.azimuthDeg;
  const savedElevation = appState.orbit.elevationDeg;

  clearPlacementOccluders();
  appState.sceneType = 'clean';
  applySceneVariant(scene, ground, clutterGroup, appState.sceneType);
  layoutBuildCubesForTarget(target);
  goalAreaMarker.visible = false;

  const renderReferenceView = (ctx, canvas, azimuthDeg, elevationDeg, label) => {
    appState.orbit.azimuthDeg = azimuthDeg;
    appState.orbit.elevationDeg = elevationDeg;
    applyOrbitStateToCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderer.render(scene, camera);

    const sourceWidth = renderer.domElement.width;
    const sourceHeight = renderer.domElement.height;
    const aspect = canvas.width / canvas.height;
    const projected = [];

    target.blocks.forEach((block) => {
      const world = getStructureBlockWorldPosition(block, getBuildCenter(target));
      const blockHeight = getBuildBlockHeight(block.blockIndex || 0);
      const points = [
        new THREE.Vector3(world.x, 0.02, world.z),
        new THREE.Vector3(world.x, blockHeight + 0.06, world.z)
      ];

      points.forEach((point) => {
        const ndc = point.project(camera);
        projected.push({
          x: (ndc.x * 0.5 + 0.5) * sourceWidth,
          y: (1 - (ndc.y * 0.5 + 0.5)) * sourceHeight
        });
      });
    });

    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (projected.length > 0) {
      const minX = Math.min(...projected.map((p) => p.x));
      const maxX = Math.max(...projected.map((p) => p.x));
      const minY = Math.min(...projected.map((p) => p.y));
      const maxY = Math.max(...projected.map((p) => p.y));

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const zoomPadding = 120;
      sw = Math.max(220, maxX - minX + zoomPadding * 2);
      sh = Math.max(180, maxY - minY + zoomPadding * 2);

      if (sw / sh > aspect) {
        sh = sw / aspect;
      } else {
        sw = sh * aspect;
      }

      sw = Math.min(sw, sourceWidth);
      sh = Math.min(sh, sourceHeight);
      sx = THREE.MathUtils.clamp(cx - sw / 2, 0, sourceWidth - sw);
      sy = THREE.MathUtils.clamp(cy - sh / 2, 0, sourceHeight - sh);
    }

    ctx.drawImage(renderer.domElement, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.fillStyle = '#f1f4ee';
    ctx.font = '14px Segoe UI';
    ctx.fillText(label, 12, canvas.height - 12);
  };

  renderReferenceView(
    referenceCtx,
    referenceCanvas,
    target.azimuthDeg,
    target.elevationDeg,
    `${formatConditionLabel(appState.condition)} reference A`
  );
  renderReferenceView(
    referenceCtxSecondary,
    referenceCanvasSecondary,
    target.secondaryAzimuthDeg ?? STRUCTURE_BUILD_CONFIG.referenceSecondaryAzimuthDeg,
    target.secondaryElevationDeg ?? STRUCTURE_BUILD_CONFIG.referenceSecondaryElevationDeg,
    `${formatConditionLabel(appState.condition)} reference B`
  );

  buildCubes.forEach((mesh, index) => {
    const saved = savedState[index];
    applyBuildCubeIdentity(mesh, saved.blockIndex, saved.colorIndex);
    mesh.position.copy(saved.position);
    mesh.visible = saved.visible;
    mesh.scale.y = saved.scaleY;
    setCubeHighlight(mesh, index === appState.round.hiddenSearch.selectedBlockIndex && isHiddenSearchMode());
  });

  appState.sceneType = savedSceneType;
  applySceneVariant(scene, ground, clutterGroup, appState.sceneType);
  appState.orbit.azimuthDeg = savedAzimuth;
  appState.orbit.elevationDeg = savedElevation;
  applyOrbitStateToCamera();
  updatePlacementGoalMarker(appState.round.hiddenSearch.goalPosition);
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

function clampOrbitToConstraints(azimuthDeg, elevationDeg) {
  return {
    azimuthDeg: THREE.MathUtils.clamp(
      azimuthDeg,
      CAMERA_CONSTRAINTS.azimuthMinDeg,
      CAMERA_CONSTRAINTS.azimuthMaxDeg
    ),
    elevationDeg: THREE.MathUtils.clamp(
      elevationDeg,
      CAMERA_CONSTRAINTS.elevationMinDeg,
      CAMERA_CONSTRAINTS.elevationMaxDeg
    )
  };
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



function shapeHeadInput(value, maxInput) {
  const absValue = Math.abs(value);
  const clamped = Math.min(absValue, maxInput);
  const normalized = maxInput > 0 ? (clamped / maxInput) : 0;
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

  const yawInput = shapeHeadInput(
    appState.tracking.filteredHeadMovement.turn,
    HEAD_ORBIT_CONFIG.yawMaxInput
  );
  const pitchInput = shapeHeadInput(
    appState.tracking.filteredHeadMovement.tilt,
    HEAD_ORBIT_CONFIG.pitchMaxInput
  );

  const azimuthHalfRange = (CAMERA_CONSTRAINTS.azimuthMaxDeg - CAMERA_CONSTRAINTS.azimuthMinDeg) / 2;
  const elevationHalfRange = (CAMERA_CONSTRAINTS.elevationMaxDeg - CAMERA_CONSTRAINTS.elevationMinDeg) / 2;

  const targetAzimuthDeg = THREE.MathUtils.clamp(
    appState.tracking.headOrbitCenterAzimuthDeg - (yawInput * azimuthHalfRange),
    CAMERA_CONSTRAINTS.azimuthMinDeg,
    CAMERA_CONSTRAINTS.azimuthMaxDeg
  );

  const targetElevationDeg = THREE.MathUtils.clamp(
    appState.tracking.headOrbitCenterElevationDeg - (pitchInput * elevationHalfRange),
    CAMERA_CONSTRAINTS.elevationMinDeg,
    CAMERA_CONSTRAINTS.elevationMaxDeg
  );

  const centerMagnitude = Math.max(Math.abs(yawInput), Math.abs(pitchInput));
  const responseMix = Math.pow(centerMagnitude, 0.75);
  const orbitSmoothing = THREE.MathUtils.lerp(
    HEAD_ORBIT_CONFIG.mappingSmoothingCenter,
    HEAD_ORBIT_CONFIG.mappingSmoothing,
    responseMix
  );

  appState.orbit.azimuthDeg = THREE.MathUtils.lerp(
    appState.orbit.azimuthDeg,
    targetAzimuthDeg,
    orbitSmoothing
  );

  appState.orbit.elevationDeg = THREE.MathUtils.lerp(
    appState.orbit.elevationDeg,
    targetElevationDeg,
    orbitSmoothing
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

  const draggedMesh = dragState.activeMesh || cube;

  if (isHiddenSearchMode()) {
    const snapped = snapStructurePosition({
      x: intersection.x + dragState.offset.x,
      z: intersection.z + dragState.offset.z
    }, getBuildCenter());

    draggedMesh.position.x = snapped.x;
    draggedMesh.position.z = snapped.z;
    draggedMesh.position.y = getBuildBlockY(draggedMesh.userData.blockIndex || 0);
    return true;
  }

  const nextPosition = clampPointToSceneBounds({
    x: intersection.x + dragState.offset.x,
    z: intersection.z + dragState.offset.z
  });

  draggedMesh.position.x = nextPosition.x;
  draggedMesh.position.z = nextPosition.z;
  return true;
}

function updateHoverState(event) {
  if (dragState.isDragging) {
    setCanvasCursor('grabbing');
    return;
  }

  updatePointerFromEvent(event);
  dragState.raycaster.setFromCamera(dragState.pointer, camera);
  const intersections = dragState.raycaster.intersectObjects(getActiveUserCubes().filter((mesh) => mesh.visible), false);
  setCanvasCursor(intersections.length > 0 ? 'grab' : 'default');
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  updatePointerFromEvent(event);
  dragState.raycaster.setFromCamera(dragState.pointer, camera);
  const intersections = dragState.raycaster.intersectObjects(getActiveUserCubes().filter((mesh) => mesh.visible), false);

  if (intersections.length === 0) {
    return;
  }

  dragState.activeMesh = intersections[0].object;
  if (isHiddenSearchMode()) {
    selectBuildCube(dragState.activeMesh);
  }

  const intersection = getGroundIntersection(event);
  if (!intersection) {
    return;
  }

  event.preventDefault();
  dragState.isDragging = true;
  dragState.pointerId = event.pointerId;
  dragState.offset.set(dragState.activeMesh.position.x - intersection.x, 0, dragState.activeMesh.position.z - intersection.z);
  dragState.startX = dragState.activeMesh.position.x;
  dragState.startZ = dragState.activeMesh.position.z;
  appState.draggingCube = true;
  renderer.domElement.setPointerCapture(event.pointerId);
  controls.enabled = false;
  setCanvasCursor('grabbing');
}

function stopDragging(pointerId) {
  if (!dragState.isDragging || dragState.pointerId !== pointerId) {
    return;
  }

  const movedMesh = dragState.activeMesh;
  dragState.isDragging = false;
  dragState.pointerId = null;
  dragState.activeMesh = null;
  appState.draggingCube = false;

  if (
    appState.round.realTask.active &&
    appState.round.running &&
    movedMesh &&
    (Math.abs(movedMesh.position.x - dragState.startX) > 0.01 ||
      Math.abs(movedMesh.position.z - dragState.startZ) > 0.01)
  ) {
    const idx = movedMesh.userData.blockIndex ?? 0;
    appState.round.repositionCounts[idx] = (appState.round.repositionCounts[idx] || 0) + 1;
  }

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
  const targetOrbit = clampOrbitToConstraints(target.azimuthDeg, target.elevationDeg);

  appState.sceneType = target.sceneType;
  applySceneVariant(scene, ground, clutterGroup, appState.sceneType);

  cube.position.set(target.cubePosition.x, 0.5, target.cubePosition.z);
  appState.orbit.azimuthDeg = targetOrbit.azimuthDeg;
  appState.orbit.elevationDeg = targetOrbit.elevationDeg;
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
      azimuthDeg: randomInRange(CAMERA_CONSTRAINTS.azimuthMinDeg, CAMERA_CONSTRAINTS.azimuthMaxDeg),
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
  if (isHiddenSearchMode()) {
    appState.sceneType = 'clean';
    sceneSelect.value = appState.sceneType;
    applySceneVariant(scene, ground, clutterGroup, appState.sceneType);
    clearComparisonMarkers();
    buildCubes.forEach((mesh) => {
      mesh.visible = true;
    });
    drawHiddenModeReference();
    return;
  }

  buildCubes.forEach((mesh, index) => {
    mesh.visible = index === 0;
    setCubeHighlight(mesh, false);
  });

  const target = getCurrentTarget();
  if (!target) {
    return;
  }

  appState.sceneType = target.sceneType;
  sceneSelect.value = appState.sceneType;
  applySceneVariant(scene, ground, clutterGroup, appState.sceneType);

  drawReferenceFromTarget(target, `${formatConditionLabel(appState.condition)} practice target`);
}

function setupPracticeForTaskMode() {
  appState.round.practiceSceneType = randomInRange(0, 1) < 0.5 ? 'clean' : 'clustered';
  clearComparisonMarkers();
  clearHiddenSearchMeshes();

  if (isHiddenSearchMode()) {
    appState.round.practiceSceneType = 'clean';
    const mouseTarget = createStructureTargetForCondition('mouse-only');
    createStructureTargetForCondition('head-mouse', mouseTarget);
    appState.sceneType = 'clean';
    sceneSelect.value = appState.sceneType;
    applySceneVariant(scene, ground, clutterGroup, appState.sceneType);
    drawHiddenModeReference();
    return;
  }

  const mouseTarget = createTargetForCondition('mouse-only', appState.round.practiceSceneType);
  createTargetForCondition('head-mouse', appState.round.practiceSceneType, mouseTarget);
  applyTargetSceneForCurrentCondition();
}

function applyControlMode() {
  const mouseOnly = appState.condition === 'mouse-only';
  controls.enabled = mouseOnly && !dragState.isDragging;
  syncOrbitStateFromCamera();
}

function setPracticeStartPose() {
  if (isHiddenSearchMode()) {
    scatterBuildCubesForPlay(getCurrentTarget());
    const target = getCurrentTarget();
    if (target) {
      appState.orbit.azimuthDeg = target.azimuthDeg;
      appState.orbit.elevationDeg = target.elevationDeg;
      applyOrbitStateToCamera();
      controls.update();
    } else {
      appState.orbit.azimuthDeg = CAMERA_CONSTRAINTS.initialAzimuthDeg;
      appState.orbit.elevationDeg = CAMERA_CONSTRAINTS.initialElevationDeg;
      applyOrbitStateToCamera();
      controls.update();
    }
    clearComparisonMarkers();
    return;
  }

  let randomStart = getRandomCubePosition();
  cube.position.set(randomStart.x, 0.5, randomStart.z);
  appState.orbit.azimuthDeg = CAMERA_CONSTRAINTS.initialAzimuthDeg;
  appState.orbit.elevationDeg = CAMERA_CONSTRAINTS.initialElevationDeg;
  applyOrbitStateToCamera();
  controls.update();
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
    const requiresOneTimeRealTaskCalibration =
      appState.round.realTask.active &&
      !appState.round.realTask.headCalibrationCompleted;

    const shouldKeepExistingCalibration =
      !requiresOneTimeRealTaskCalibration &&
      appState.round.realTask.active &&
      appState.tracking.calibrated &&
      appState.tracking.rangeLocked;

    if (!shouldKeepExistingCalibration) {
      resetHeadCalibration(false);
    }

    if (isHiddenSearchMode()) {
      const target = getCurrentTarget();
      if (target) {
        appState.orbit.azimuthDeg = target.azimuthDeg;
        appState.orbit.elevationDeg = target.elevationDeg;
        applyOrbitStateToCamera();
        controls.update();
      }
    }
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
  if (!isHiddenSearchMode()) {
    const target = getCurrentTarget();
    if (!target) {
      return;
    }
  } else {
    appState.round.hiddenSearch.goalPosition = null;
    goalAreaMarker.visible = false;
    clearPlacementOccluders();
    selectBuildCube(buildCubes[0]);
  }

  appState.round.running = true;
  appState.round.activeStartMs = performance.now();
  appState.round.remainingMs = RUN_CONFIG.timeLimitMs;

  appState.stage = appState.condition === 'mouse-only' ? STAGES.MOUSE_RUNNING : STAGES.HEAD_RUNNING;
  refreshUiState();
  if (isHiddenSearchMode()) {
    updateStatus('Round running. Build the reference structure. Drag the four fixed-height blocks to match the two reference views.');
  } else {
    updateStatus('Round running. Match the photo and press SPACE to submit.');
  }
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

  if (isHiddenSearchMode()) {
    const elapsedMs = Math.min(
      RUN_CONFIG.timeLimitMs,
      Math.max(0, performance.now() - appState.round.activeStartMs)
    );
    const progress = getBuildProgress();
    const placementError = progress.total - progress.matched;

    appState.round.lastResultByCondition[appState.condition] = {
      reason,
      elapsedMs,
      hiddenFoundCount: progress.matched,
      hiddenTotalCount: progress.total,
      positionError: placementError,
      cameraErrorDeg: 0
    };

    if (appState.round.realTask.active) {
      appState.round.realTask.submittedResults.push({
        participantId: sessionStorage.getItem('participantId') || null,
        mode: appState.taskMode,
        stage: appState.stage,
        condition: appState.condition,
        trialIndex: appState.round.realTask.currentTrialIndex,
        reason,
        elapsedMs,
        hiddenFoundCount: progress.matched,
        hiddenTotalCount: progress.total,
        positionError: placementError,
        repositionCounts: [...appState.round.repositionCounts],
        totalRepositions: appState.round.repositionCounts.reduce((s, c) => s + c, 0)
      });
    }

    appState.round.running = false;
    appState.round.remainingMs = Math.max(0, RUN_CONFIG.timeLimitMs - elapsedMs);
    clearComparisonMarkers();
    clearHiddenSearchMeshes();

    updateStatus(
      `Submitted (${reason}). Matched ${progress.matched}/${progress.total} blocks in ${formatTimeSeconds(elapsedMs)}.`
    );

    if (appState.condition === 'mouse-only') {
      setStage(STAGES.MOUSE_RESULT);
    } else {
      setStage(STAGES.HEAD_RESULT);
    }
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
  const clampedTargetOrbit = clampOrbitToConstraints(target.azimuthDeg, target.elevationDeg);

  const positionTarget = new THREE.Vector3(target.cubePosition.x, 0.5, target.cubePosition.z);
  const positionActual = new THREE.Vector3(cube.position.x, cube.position.y, cube.position.z);
  const positionError = positionActual.distanceTo(positionTarget);

  applyOrbitToCamera(
    tempTargetCamera,
    clampedTargetOrbit.azimuthDeg,
    clampedTargetOrbit.elevationDeg,
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
      azimuthDeg: clampedTargetOrbit.azimuthDeg,
      elevationDeg: clampedTargetOrbit.elevationDeg
    }
  };

  if (appState.round.realTask.active) {
    appState.round.realTask.submittedResults.push({
      participantId: sessionStorage.getItem('participantId') || null,
      mode: appState.taskMode,
      stage: appState.stage,
      condition: appState.condition,
      trialIndex: appState.round.realTask.currentTrialIndex,
      reason,
      elapsedMs,
      positionError,
      cameraErrorDeg,
      repositionCounts: [...appState.round.repositionCounts],
      totalRepositions: appState.round.repositionCounts.reduce((s, c) => s + c, 0)
    });
  }

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
  appState.tracking.peakTurnObserved = 0;
  appState.tracking.peakTiltObserved = 0;
  appState.tracking.rangeLocked = false;
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
  const hiddenMode = isHiddenSearchMode();

  const hideInstructionPanel =
    appState.stage === STAGES.MOUSE_RUNNING ||
    appState.stage === STAGES.HEAD_RUNNING;

  instructionPanel.style.display = hideInstructionPanel ? 'none' : 'block';
  referencePanel.style.display = 'block';

  conditionReadout.textContent = formatConditionLabel(appState.condition);
  sceneReadout.textContent = formatSceneLabel(appState.sceneType);
  azimuthReadout.textContent = `${normalizeAngleDeg(currentOrbit.azimuthDeg).toFixed(1)} deg`;
  elevationReadout.textContent = `${currentOrbit.elevationDeg.toFixed(1)} deg`;
  phaseReadout.textContent = appState.round.realTask.active
    ? 'Real Task'
    : (appState.round.realTask.completed ? 'Complete' : 'Practice');

  const lastResult = appState.round.lastResultByCondition[appState.condition];
  if (hiddenMode) {
    const progress = getBuildProgress();
    if (progress.total > 0) {
      positionErrorReadout.textContent = `${progress.matched}/${progress.total}`;
    } else if (lastResult && Number.isFinite(lastResult.hiddenFoundCount) && Number.isFinite(lastResult.hiddenTotalCount)) {
      positionErrorReadout.textContent = `${lastResult.hiddenFoundCount}/${lastResult.hiddenTotalCount}`;
    } else {
      positionErrorReadout.textContent = '-';
    }
    cameraErrorReadout.textContent = `Block ${appState.round.hiddenSearch.selectedBlockIndex + 1}`;
  } else {
    positionErrorReadout.textContent = lastResult ? `${lastResult.positionError.toFixed(2)}` : '-';
    cameraErrorReadout.textContent = lastResult ? `${lastResult.cameraErrorDeg.toFixed(1)} deg` : '-';
  }
  timerReadout.textContent = appState.round.countdownActive
    ? `${appState.round.countdownValue}`
    : formatTimeSeconds(getCurrentRoundTimerMs());

  conditionSelect.disabled = true;
  sceneSelect.disabled = true;
  recalibrateButton.style.display = appState.condition === 'head-mouse' ? 'block' : 'none';

  const isPracticeStage = !appState.round.realTask.active && appState.stage !== STAGES.READY_FOR_REAL;
  skipPracticeButton.style.display = isPracticeStage ? 'block' : 'none';

  const showSkipRealTaskButton =
    appState.round.realTask.active &&
    appState.stage !== STAGES.SURVEY_BREAK;
  skipRealTaskButton.style.display = showSkipRealTaskButton ? 'block' : 'none';

  if (appState.round.realTask.active && !appState.round.realTask.completed) {
    const t = appState.round.realTask.currentTrialIndex + 1;
    const total = appState.round.realTask.totalTrialsPerCondition;
    trialCounter.textContent = `Trial ${t} / ${total}`;
    trialCounter.style.display = 'block';
  } else {
    trialCounter.style.display = 'none';
  }

  stageButton.style.display = 'block';
  lockRangeButton.style.display = 'none';
  retryPracticeButton.style.display = 'none';
  surveyLinkButton.style.display = 'none';
  finalSurveyLinkButton.style.display = 'none';
  proceedButton.style.display = 'none';

  if (appState.stage === STAGES.MOUSE_INSTRUCTIONS) {
    instructionStage.textContent = appState.round.realTask.active ? 'Real Task' : 'Guided Practice';
    instructionTitle.textContent = appState.round.realTask.active ? 'Mouse Task' : 'Mouse Practice';
    trialReadout.textContent = appState.round.realTask.active
      ? `Mouse Trial ${appState.round.realTask.currentTrialIndex + 1}/${appState.round.realTask.totalTrialsPerCondition}`
      : 'Mouse Practice';
    instructions.textContent = hiddenMode
      ? 'Mouse mode: use the 4 colored blocks to recreate the shape shown in the two reference images. Right-drag orbits camera and left-drag moves blocks on the plane.'
      : 'Mouse mode rules: right-drag orbits camera, left-drag moves cube. Click I Understand to start 3-2-1 countdown.';
    stageButton.textContent = 'I Understand';
    stageButton.disabled = false;
    return;
  }

  if (appState.stage === STAGES.MOUSE_COUNTDOWN) {
    instructionStage.textContent = appState.round.realTask.active ? 'Real Task' : 'Guided Practice';
    instructionTitle.textContent = appState.round.realTask.active ? 'Mouse Task' : 'Mouse Practice';
    trialReadout.textContent = appState.round.realTask.active
      ? `Mouse Trial ${appState.round.realTask.currentTrialIndex + 1}/${appState.round.realTask.totalTrialsPerCondition}`
      : 'Mouse Practice';
    instructions.textContent = 'Get ready. Timer starts after countdown.';
    stageButton.textContent = 'Countdown...';
    stageButton.disabled = true;
    return;
  }

  if (appState.stage === STAGES.MOUSE_RUNNING) {
    instructionStage.textContent = appState.round.realTask.active ? 'Real Task' : 'Guided Practice';
    instructionTitle.textContent = appState.round.realTask.active ? 'Mouse Task' : 'Mouse Practice';
    trialReadout.textContent = appState.round.realTask.active
      ? `Mouse Trial ${appState.round.realTask.currentTrialIndex + 1}/${appState.round.realTask.totalTrialsPerCondition}`
      : 'Mouse Practice';
    instructions.textContent = hiddenMode
      ? 'Mouse practice running. Rebuild the reference shape with the 4 fixed-height colored blocks using the two reference views.'
      : 'Mouse practice running. Match target and press SPACE to submit.';
    stageButton.textContent = 'Running...';
    stageButton.disabled = true;
    return;
  }

  if (appState.stage === STAGES.MOUSE_RESULT) {
    instructionStage.textContent = appState.round.realTask.active ? 'Trial Result' : 'Practice Result';
    instructionTitle.textContent = appState.round.realTask.active ? 'Mouse Trial Result' : 'Mouse Result';
    trialReadout.textContent = appState.round.realTask.active
      ? `Mouse Trial ${appState.round.realTask.currentTrialIndex + 1}/${appState.round.realTask.totalTrialsPerCondition}`
      : 'Mouse Result';
    instructions.textContent = hiddenMode
      ? 'Result shown for structure build. Click Continue.'
      : 'Result shown. Yellow ring/arrow mark target cube and camera azimuth.';
    stageButton.style.display = 'none';
    if (!appState.round.realTask.active) {
      retryPracticeButton.style.display = 'block';
      retryPracticeButton.textContent = 'Retry';
      retryPracticeButton.disabled = false;
      instructions.textContent = hiddenMode
        ? 'Result shown for structure build. Retry or Continue.'
        : 'Result shown. Yellow ring/arrow mark target cube and camera azimuth. Retry or Continue.';
    }
    proceedButton.style.display = 'block';
    proceedButton.textContent = appState.round.realTask.active ? 'Next Trial' : 'Continue';
    proceedButton.disabled = false;
    return;
  }

  if (appState.stage === STAGES.HEAD_INSTRUCTIONS) {
    instructionTitle.textContent = 'Head + Mouse Practice';
    if (appState.round.realTask.active) {
      instructionTitle.textContent = 'Head + Mouse Task';
      trialReadout.textContent = `Head Trial ${appState.round.realTask.currentTrialIndex + 1}/${appState.round.realTask.totalTrialsPerCondition}`;
    } else {
      trialReadout.textContent = 'Head Practice';
    }
    if (!appState.tracking.calibrationStarted && !appState.tracking.calibrated) {
      instructionStage.textContent = 'Calibration';
      instructions.textContent = hiddenMode
        ? 'Head mode: use head movement to inspect the two reference views from different angles, then place the 4 fixed-height colored blocks to match them. Left-drag moves blocks on the plane. Read this first, then click Start Calibration.'
        : 'Head+Mouse rules: move head to orbit camera, left-drag moves cube. Read this first, then click Start Calibration while keeping your head centered.';
      stageButton.textContent = 'Start Calibration';
      stageButton.disabled = false;
      return;
    }

    if (appState.tracking.calibrationStarted && !appState.tracking.calibrated) {
      instructionStage.textContent = 'Calibrating...';
      instructions.textContent = 'Calibrating now. Keep your head centered and steady until calibration completes.';
      stageButton.textContent = 'Calibrating...';
      stageButton.disabled = true;
      return;
    }

    instructionStage.textContent = 'Calibration — Phase 2: Head Movement Range';
    if (!appState.tracking.rangeLocked) {
      instructions.textContent = appState.round.realTask.active
        ? 'Turn your head comfortably left/right and up/down to set your movement range. When it feels right, click Lock Range. If tracking becomes inaccurate later, use the Recalibrate button on the right.'
        : 'Turn your head comfortably left/right and up/down to set your movement range. When it feels right, click Lock Range.';
      lockRangeButton.style.display = 'block';
      lockRangeButton.disabled = false;
      stageButton.style.display = 'none';
    } else {
      const yawMax = HEAD_ORBIT_CONFIG.yawMaxInput.toFixed(3);
      const pitchMax = HEAD_ORBIT_CONFIG.pitchMaxInput.toFixed(3);
      instructions.textContent = appState.round.realTask.active
        ? `Range locked (yaw ±${yawMax}, pitch ±${pitchMax}). Click Start Task when ready. If tracking becomes inaccurate, use the Recalibrate button on the right.`
        : `Range locked (yaw ±${yawMax}, pitch ±${pitchMax}). Click Start Practice when ready.`;
      lockRangeButton.style.display = 'none';
      stageButton.style.display = 'block';
      stageButton.textContent = appState.round.realTask.active ? 'Start Task' : 'Start Practice';
      stageButton.disabled = false;
    }
    return;
  }

  if (appState.stage === STAGES.HEAD_COUNTDOWN) {
    instructionStage.textContent = appState.round.realTask.active ? 'Real Task' : 'Guided Practice';
    instructionTitle.textContent = appState.round.realTask.active ? 'Head + Mouse Task' : 'Head + Mouse Practice';
    trialReadout.textContent = appState.round.realTask.active
      ? `Head Trial ${appState.round.realTask.currentTrialIndex + 1}/${appState.round.realTask.totalTrialsPerCondition}`
      : 'Head Practice';
    instructions.textContent = 'Get ready. Keep your head steady and start after countdown.';
    stageButton.textContent = 'Countdown...';
    stageButton.disabled = true;
    return;
  }

  if (appState.stage === STAGES.HEAD_RUNNING) {
    instructionStage.textContent = appState.round.realTask.active ? 'Real Task' : 'Guided Practice';
    instructionTitle.textContent = appState.round.realTask.active ? 'Head + Mouse Task' : 'Head + Mouse Practice';
    trialReadout.textContent = appState.round.realTask.active
      ? `Head Trial ${appState.round.realTask.currentTrialIndex + 1}/${appState.round.realTask.totalTrialsPerCondition}`
      : 'Head Practice';
    instructions.textContent = hiddenMode
      ? 'Head practice running. Scan the two reference views with head movement, then arrange the 4 fixed-height colored blocks with the mouse.'
      : 'Head practice running. Match target and press SPACE to submit.';
    stageButton.textContent = 'Running...';
    stageButton.disabled = true;
    return;
  }

  if (appState.stage === STAGES.HEAD_RESULT) {
    instructionStage.textContent = appState.round.realTask.active ? 'Trial Result' : 'Practice Result';
    instructionTitle.textContent = appState.round.realTask.active ? 'Head + Mouse Trial Result' : 'Head + Mouse Result';
    trialReadout.textContent = appState.round.realTask.active
      ? `Head Trial ${appState.round.realTask.currentTrialIndex + 1}/${appState.round.realTask.totalTrialsPerCondition}`
      : 'Head Result';
    instructions.textContent = hiddenMode
      ? 'Result shown for structure build. Retry this head practice or continue to real tasks flow.'
      : 'Result shown. Retry this head practice or continue to real tasks flow.';
    stageButton.style.display = 'none';
    retryPracticeButton.style.display = 'block';
    retryPracticeButton.textContent = 'Retry';
    retryPracticeButton.disabled = false;
    proceedButton.style.display = 'block';
    proceedButton.textContent = appState.round.realTask.active ? 'Next Trial' : 'Continue To Real Tasks';
    proceedButton.disabled = false;
    return;
  }

  if (appState.stage === STAGES.SURVEY_BREAK) {
    const surveyCondition = appState.round.realTask.pendingSurveyCondition;
    const isFinal = appState.round.realTask.completed;
    const conditionLabel = formatConditionLabel(surveyCondition);
    instructionStage.textContent = isFinal ? 'Final Survey' : 'Mid-Experiment Survey';
    instructionTitle.textContent = `${conditionLabel} Survey`;
    trialReadout.textContent = isFinal ? 'All Trials Complete' : 'Condition Complete';
    instructions.textContent = isFinal
      ? `Please complete the survey for the ${conditionLabel} condition. Click "Open Survey" to open it in a new tab, then return here and click "I've Completed the Survey" to continue.`
      : `Please complete the survey for the ${conditionLabel} condition. Click "Open Survey" to open it in a new tab, then return here and click "I've Completed the Survey" to continue.`;
    stageButton.style.display = 'none';
    retryPracticeButton.style.display = 'none';
    const surveyUrl = SURVEY_URLS[surveyCondition] || '#';
    surveyLinkButton.href = surveyUrl;
    surveyLinkButton.style.display = 'inline-block';
    proceedButton.style.display = 'block';
    proceedButton.textContent = "I've Completed the Survey";
    proceedButton.disabled = false;
    return;
  }

  surveyLinkButton.style.display = 'none';
  instructionStage.textContent = appState.round.realTask.completed ? 'Complete' : 'Practice Complete';
  instructionTitle.textContent = appState.round.realTask.completed ? 'Real Tasks Complete' : 'Ready For Real Tasks';
  trialReadout.textContent = appState.round.realTask.completed ? 'All Trials Complete' : 'Practice Complete';
  instructions.textContent = appState.round.realTask.completed
    ? 'All real task trials are complete. Please complete the final survey, then end the session.'
    : 'Guided practice complete. Press Continue to start the real task flow.';
  stageButton.style.display = 'none';
  retryPracticeButton.style.display = 'none';
  if (!appState.round.realTask.completed) {
    proceedButton.style.display = 'block';
    proceedButton.textContent = 'Continue To Real Tasks';
    proceedButton.disabled = false;
  } else {
    finalSurveyLinkButton.href = SURVEY_URLS.final || '#';
    finalSurveyLinkButton.style.display = 'inline-block';
    proceedButton.style.display = 'none';
  }
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
        syncOrbitStateFromCamera();
        appState.tracking.headOrbitCenterAzimuthDeg = appState.orbit.azimuthDeg;
        appState.tracking.headOrbitCenterElevationDeg = appState.orbit.elevationDeg;
        updateStatus('Calibration done! Now turn your head fully left/right and up/down to set your range.');
      }
      return;
    }

    // Track live peaks for auto-range detection during HEAD_INSTRUCTIONS (until locked)
    if (appState.stage === STAGES.HEAD_INSTRUCTIONS && !appState.tracking.rangeLocked) {
      const absTurn = Math.abs(appState.tracking.filteredHeadMovement.turn);
      const absTilt = Math.abs(appState.tracking.filteredHeadMovement.tilt);
      if (absTurn > appState.tracking.peakTurnObserved) {
        appState.tracking.peakTurnObserved = absTurn;
      }
      if (absTilt > appState.tracking.peakTiltObserved) {
        appState.tracking.peakTiltObserved = absTilt;
      }
    }

    appState.tracking.headMovement = detectors.calibration.getHeadMovement(
      headPose.turn,
      headPose.tilt,
      headPose.roll
    );

    const baseSmooth = HEAD_ORBIT_CONFIG.smoothing;
    const microSmooth = HEAD_ORBIT_CONFIG.microSmoothing;
    const jitterThreshold = HEAD_ORBIT_CONFIG.jitterThreshold;

    const turnDelta = appState.tracking.headMovement.turn - appState.tracking.filteredHeadMovement.turn;
    const tiltDelta = appState.tracking.headMovement.tilt - appState.tracking.filteredHeadMovement.tilt;
    const rollDelta = appState.tracking.headMovement.roll - appState.tracking.filteredHeadMovement.roll;

    const blendTurn = THREE.MathUtils.clamp(Math.abs(turnDelta) / jitterThreshold, 0, 1);
    const blendTilt = THREE.MathUtils.clamp(Math.abs(tiltDelta) / jitterThreshold, 0, 1);
    const blendRoll = THREE.MathUtils.clamp(Math.abs(rollDelta) / jitterThreshold, 0, 1);

    const turnSmooth = THREE.MathUtils.lerp(microSmooth, baseSmooth, blendTurn * blendTurn);
    const tiltSmooth = THREE.MathUtils.lerp(microSmooth, baseSmooth, blendTilt * blendTilt);
    const rollSmooth = THREE.MathUtils.lerp(microSmooth, baseSmooth, blendRoll * blendRoll);

    appState.tracking.filteredHeadMovement.turn += turnDelta * turnSmooth;
    appState.tracking.filteredHeadMovement.tilt += tiltDelta * tiltSmooth;
    appState.tracking.filteredHeadMovement.roll += rollDelta * rollSmooth;

    const yaw = appState.tracking.filteredHeadMovement.turn;
    const pitch = appState.tracking.filteredHeadMovement.tilt;

    if (appState.stage === STAGES.HEAD_INSTRUCTIONS) {
      const peakY = appState.tracking.peakTurnObserved;
      const peakP = appState.tracking.peakTiltObserved;
      updateStatus(
        `Yaw ${yaw.toFixed(3)} (peak ${peakY.toFixed(3)})  |  Pitch ${pitch.toFixed(3)} (peak ${peakP.toFixed(3)})`
      );
    } else if (appState.stage === STAGES.HEAD_COUNTDOWN || appState.stage === STAGES.HEAD_RUNNING) {
      updateStatus(
        `Yaw ${yaw.toFixed(3)} / ±${HEAD_ORBIT_CONFIG.yawMaxInput.toFixed(3)}  |  Pitch ${pitch.toFixed(3)} / ±${HEAD_ORBIT_CONFIG.pitchMaxInput.toFixed(3)}`
      );
    }
  });
}

function tickRoundTimer() {
  if (!appState.round.running) {
    return;
  }

  if (isHiddenSearchMode()) {
    const progress = getBuildProgress();
    if (progress.total > 0 && progress.matched >= progress.total) {
      submitRunningRound('structure-complete');
      return;
    }
  }

  const elapsed = performance.now() - appState.round.activeStartMs;
  appState.round.remainingMs = Math.max(0, RUN_CONFIG.timeLimitMs - elapsed);

  if (appState.round.remainingMs <= 0) {
    submitRunningRound('timeout');
  }
}

function initializeUi() {

  skipPracticeButton.addEventListener('click', () => {
    if (!appState.round.realTask.active) {
      clearComparisonMarkers();
      setStage(STAGES.READY_FOR_REAL);
      updateStatus('Practice skipped. Ready to start real tasks.');
    }
  });

  skipRealTaskButton.addEventListener('click', () => {
    if (!appState.round.realTask.active || appState.stage === STAGES.SURVEY_BREAK) {
      return;
    }

    const realTask = appState.round.realTask;
    realTask.currentTrialIndex = realTask.totalTrialsPerCondition - 1;
    appState.round.running = false;
    appState.round.countdownActive = false;
    clearComparisonMarkers();
    advanceRealTaskFlow();
  });

  lockRangeButton.addEventListener('click', () => {
    if (appState.stage !== STAGES.HEAD_INSTRUCTIONS || !appState.tracking.calibrated) return;
    const yawObserved = Math.max(HEAD_RANGE_LOCK_BUFFER.minYaw, appState.tracking.peakTurnObserved);
    const pitchObserved = Math.max(HEAD_RANGE_LOCK_BUFFER.minPitch, appState.tracking.peakTiltObserved);

    // Apply a buffer so users can still reach full camera range without
    // needing to reproduce their absolute peak movement each time.
    HEAD_ORBIT_CONFIG.yawMaxInput = Math.max(
      HEAD_RANGE_LOCK_BUFFER.minYaw,
      yawObserved * HEAD_RANGE_LOCK_BUFFER.yawFactor
    );
    HEAD_ORBIT_CONFIG.pitchMaxInput = Math.max(
      HEAD_RANGE_LOCK_BUFFER.minPitch,
      pitchObserved * HEAD_RANGE_LOCK_BUFFER.pitchFactor
    );

    appState.tracking.rangeLocked = true;
    if (appState.round.realTask.active) {
      appState.round.realTask.headCalibrationCompleted = true;
    }
    refreshUiState();
  });

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

      if (!appState.tracking.rangeLocked) {
        updateStatus('Please lock your range first before starting practice.', true);
        return;
      }

      clearComparisonMarkers();
      setPracticeStartPose();
      startCountdown(STAGES.HEAD_RUNNING);
    }
  });

  retryPracticeButton.addEventListener('click', () => {
    if (appState.round.realTask.active) {
      clearComparisonMarkers();
      loadRealTaskTargetsForCurrentTrial();
      applyTargetSceneForCurrentCondition();
      setPracticeStartPose();
      startCountdown(appState.condition === 'mouse-only' ? STAGES.MOUSE_RUNNING : STAGES.HEAD_RUNNING);
      return;
    }

    if (appState.stage === STAGES.MOUSE_RESULT) {
      clearComparisonMarkers();
      if (isHiddenSearchMode()) {
        createStructureTargetForCondition(
          'mouse-only',
          appState.round.targetByCondition['head-mouse']
        );
      } else {
        createTargetForCondition(
          'mouse-only',
          appState.round.practiceSceneType,
          appState.round.targetByCondition['head-mouse']
        );
      }
      applyTargetSceneForCurrentCondition();
      setPracticeStartPose();
      startCountdown(STAGES.MOUSE_RUNNING);
      return;
    }

    if (appState.stage === STAGES.HEAD_RESULT) {
      clearComparisonMarkers();
      if (isHiddenSearchMode()) {
        createStructureTargetForCondition(
          'head-mouse',
          appState.round.targetByCondition['mouse-only']
        );
      } else {
        createTargetForCondition(
          'head-mouse',
          appState.round.practiceSceneType,
          appState.round.targetByCondition['mouse-only']
        );
      }
      setPracticeStartPose();
      setStage(STAGES.HEAD_INSTRUCTIONS);
      applyTargetSceneForCurrentCondition();
    }
  });

  proceedButton.addEventListener('click', () => {
    if (appState.stage === STAGES.SURVEY_BREAK) {
      const realTask = appState.round.realTask;
      if (realTask.completed) {
        setStage(STAGES.READY_FOR_REAL);
      } else {
        realTask.pendingSurveyCondition = null;
        realTask.currentConditionOrderIndex = 1;
        realTask.currentCondition = realTask.conditionOrder[1];
        realTask.currentTrialIndex = 0;
        loadRealTaskTargetsForCurrentTrial();
        setConditionInstructionStage(realTask.currentCondition);
        applyTargetSceneForCurrentCondition();
        updateStatus(`Switched condition. Continue with ${formatConditionLabel(realTask.currentCondition)}.`);
      }
      return;
    }

    if (appState.round.realTask.active) {
      clearComparisonMarkers();
      advanceRealTaskFlow();
      return;
    }

    if (appState.stage === STAGES.MOUSE_RESULT) {
      clearComparisonMarkers();
      if (!appState.round.targetByCondition['head-mouse']) {
        if (isHiddenSearchMode()) {
          createStructureTargetForCondition(
            'head-mouse',
            appState.round.targetByCondition['mouse-only']
          );
        } else {
          createTargetForCondition(
            'head-mouse',
            appState.round.practiceSceneType,
            appState.round.targetByCondition['mouse-only']
          );
        }
      }
      setStage(STAGES.HEAD_INSTRUCTIONS);
      // Apply scene/reference after switching condition so head target is used.
      applyTargetSceneForCurrentCondition();
      return;
    }

    if (appState.stage === STAGES.HEAD_RESULT) {
      clearComparisonMarkers();
      beginRealTaskFlow();
      return;
    }

    if (appState.stage === STAGES.READY_FOR_REAL) {
      beginRealTaskFlow();
      return;
    }

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

    appState.condition = 'mouse-only';
    setupPracticeForTaskMode();
    applyTargetSceneForCurrentCondition();

    initializeObjectDrag();
    initializeUi();
    appState.orbit.azimuthDeg = CAMERA_CONSTRAINTS.initialAzimuthDeg;
    appState.orbit.elevationDeg = CAMERA_CONSTRAINTS.initialElevationDeg;
    applyOrbitStateToCamera();
    controls.update();
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
