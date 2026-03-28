// =============================================================================
// SCENE OBJECTS MODULE - EXPERIMENT VARIANT
// Creates the shared experiment scene with clean and clustered variants
// =============================================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export const SCENE_BOUNDS = {
  minX: -6.2,
  maxX: 6.2,
  minZ: -6.2,
  maxZ: 6.2
};

export function createGround(scene) {
  const groundGeometry = new THREE.PlaneGeometry(22, 22);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9ccb0,
    roughness: 0.92,
    metalness: 0.05
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(22, 22, 0x6c7d65, 0x9eb195);
  grid.position.y = 0.01;
  scene.add(grid);

  return ground;
}

export function createPlacementFrame(scene) {
  const width = SCENE_BOUNDS.maxX - SCENE_BOUNDS.minX;
  const depth = SCENE_BOUNDS.maxZ - SCENE_BOUNDS.minZ;
  const frameGeometry = new THREE.PlaneGeometry(width, depth);
  const frameMaterial = new THREE.MeshBasicMaterial({
    color: 0x45624b,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide
  });

  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.rotation.x = -Math.PI / 2;
  frame.position.y = 0.015;
  scene.add(frame);

  const outlinePoints = [
    new THREE.Vector3(SCENE_BOUNDS.minX, 0.03, SCENE_BOUNDS.minZ),
    new THREE.Vector3(SCENE_BOUNDS.maxX, 0.03, SCENE_BOUNDS.minZ),
    new THREE.Vector3(SCENE_BOUNDS.maxX, 0.03, SCENE_BOUNDS.maxZ),
    new THREE.Vector3(SCENE_BOUNDS.minX, 0.03, SCENE_BOUNDS.maxZ),
    new THREE.Vector3(SCENE_BOUNDS.minX, 0.03, SCENE_BOUNDS.minZ)
  ];

  const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outline = new THREE.Line(outlineGeometry, new THREE.LineBasicMaterial({ color: 0x45624b }));
  scene.add(outline);

  return { frame, outline };
}

export function createCube() {
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xd97473, roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0xf0d49d, roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0x8ec7d9, roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0x8f85c9, roughness: 0.45 }),
    new THREE.MeshStandardMaterial({ color: 0xf0c9c6, roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0xe5a26b, roughness: 0.35 })
  ];

  const cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
  cube.position.set(0, 0.5, 0);
  cube.castShadow = true;
  cube.name = 'experiment-cube';
  return cube;
}

export function createClutterGroup(scene) {
  const clutterGroup = new THREE.Group();
  clutterGroup.name = 'clutter-group';

  const clutterSpecs = [
    { type: 'box', color: 0x8a7766, position: [-3.2, 0.7, -2.6], scale: [1.2, 1.4, 1.2] },
    { type: 'box', color: 0xb68b67, position: [-1.8, 0.65, -2.1], scale: [1.6, 1.3, 1.2] },
    { type: 'box', color: 0x7b8f73, position: [0.0, 0.8, -2.4], scale: [1.3, 1.6, 1.1] },
    { type: 'box', color: 0xa89a84, position: [2.0, 0.55, -2.2], scale: [1.4, 1.1, 1.5] },
    { type: 'box', color: 0x6d7f6f, position: [3.4, 0.9, -1.8], scale: [1.0, 1.8, 1.0] },
    { type: 'box', color: 0xc6b29a, position: [-2.8, 0.45, -0.8], scale: [1.8, 0.9, 1.4] },
    { type: 'box', color: 0x857a6d, position: [-1.0, 0.45, -0.1], scale: [2.0, 0.9, 1.1] },
    { type: 'box', color: 0x748f84, position: [1.1, 0.7, -0.2], scale: [1.1, 1.4, 1.0] },
    { type: 'box', color: 0x8d7f6d, position: [2.8, 0.5, 0.2], scale: [1.6, 1.0, 1.0] },
    { type: 'box', color: 0x6f8c83, position: [-3.0, 0.95, 1.0], scale: [1.0, 1.9, 1.0] },
    { type: 'box', color: 0x9f8c73, position: [-1.3, 0.95, 1.0], scale: [1.2, 1.9, 1.2] },
    { type: 'box', color: 0x6f7b88, position: [0.8, 0.5, 1.1], scale: [1.8, 1.0, 1.3] },
    { type: 'box', color: 0x8c7e70, position: [2.6, 0.8, 1.6], scale: [1.1, 1.6, 1.4] },
    { type: 'box', color: 0x768c72, position: [-2.4, 0.55, 2.6], scale: [1.7, 1.1, 1.2] },
    { type: 'box', color: 0xb39d86, position: [-0.2, 0.45, 2.3], scale: [2.4, 0.9, 1.2] },
    { type: 'box', color: 0x7b8b8f, position: [1.9, 0.85, 2.5], scale: [1.2, 1.7, 1.2] },
    { type: 'box', color: 0x8a7f74, position: [3.4, 0.6, 2.8], scale: [1.3, 1.2, 1.1] }
  ];

  for (const spec of clutterSpecs) {
    const geometry = spec.type === 'cylinder'
      ? new THREE.CylinderGeometry(0.5, 0.5, 1, 20)
      : new THREE.BoxGeometry(1, 1, 1);

    const material = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.85 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(spec.position[0], spec.position[1], spec.position[2]);
    mesh.scale.set(spec.scale[0], spec.scale[1], spec.scale[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    clutterGroup.add(mesh);
  }

  clutterGroup.visible = false;
  scene.add(clutterGroup);
  return clutterGroup;
}

export function createReferenceAnchors(scene) {
  const anchors = new THREE.Group();
  anchors.name = 'reference-anchors';

  const anchorColors = [
    { base: 0x8a4b4a, cap: 0xff9d9a },
    { base: 0x7a6634, cap: 0xf4da84 },
    { base: 0x4f7b40, cap: 0xaee58f },
    { base: 0x111111, cap: 0x2a2a2a },
    { base: 0xe8e8e8, cap: 0xffffff },
    { base: 0x5f4f9e, cap: 0xbcaeff },
    { base: 0x7a4b86, cap: 0xe1aef0 },
    { base: 0x8a5640, cap: 0xf0b58f }
  ];

  const anchorPositions = [
    [-5.0, 0.15, -5.0],
    [0.0, 0.15, -5.6],
    [5.0, 0.15, -5.0],
    [-5.6, 0.15, 0.0],
    [5.6, 0.15, 0.0],
    [-5.0, 0.15, 5.0],
    [0.0, 0.15, 5.6],
    [5.0, 0.15, 5.0]
  ];

  for (const [index, [x, y, z]] of anchorPositions.entries()) {
    const palette = anchorColors[index % anchorColors.length];

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: palette.base, roughness: 0.8 })
    );
    base.position.set(x, y, z);
    base.castShadow = true;
    base.receiveShadow = true;

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 18, 14),
      new THREE.MeshStandardMaterial({ color: palette.cap, roughness: 0.45, metalness: 0.05 })
    );
    cap.position.set(x, y + 0.23, z);
    cap.castShadow = true;

    anchors.add(base);
    anchors.add(cap);
  }

  scene.add(anchors);
  return anchors;
}

export function applySceneVariant(scene, ground, clutterGroup, variant) {
  if (variant === 'clustered') {
    scene.background.set(0xdfe5ea);
    scene.fog.color.set(0xdfe5ea);
    ground.material.color.set(0xb4c0b3);
    clutterGroup.visible = true;
    return;
  }

  scene.background.set(0xe7efe7);
  scene.fog.color.set(0xe7efe7);
  ground.material.color.set(0xb9ccb0);
  clutterGroup.visible = false;
}

export function clampPointToSceneBounds(point) {
  return {
    x: THREE.MathUtils.clamp(point.x, SCENE_BOUNDS.minX, SCENE_BOUNDS.maxX),
    z: THREE.MathUtils.clamp(point.z, SCENE_BOUNDS.minZ, SCENE_BOUNDS.maxZ)
  };
}
