// =============================================================================
// SCENE OBJECTS MODULE - EXPERIMENT VARIANT
// Creates the shared experiment scene with clean and clustered variants
// =============================================================================

import * as THREE from 'three';

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
    { type: 'cylinder', color: 0x6a8f64, position: [-2.2, 1.2, -1.8], scale: [0.65, 2.4, 0.65] },
    { type: 'box', color: 0xb68b67, position: [2.0, 0.65, -2.1], scale: [1.6, 1.3, 1.2] },
    { type: 'cylinder', color: 0x5c7b55, position: [2.4, 1.5, 1.8], scale: [0.7, 3.0, 0.7] },
    { type: 'box', color: 0xc6b29a, position: [-1.8, 0.45, 2.4], scale: [2.2, 0.9, 1.4] },
    { type: 'box', color: 0x857a6d, position: [0.0, 0.45, 0.2], scale: [2.8, 0.9, 1.1] },
    { type: 'cylinder', color: 0x748f84, position: [-0.8, 1.1, -0.2], scale: [0.55, 2.2, 0.55] },
    { type: 'box', color: 0x8d7f6d, position: [1.1, 0.4, 0.9], scale: [1.6, 0.8, 1.0] },
    { type: 'cylinder', color: 0x6f8c83, position: [-1.3, 0.95, 1.0], scale: [0.45, 1.9, 0.45] }
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
    { base: 0x2f6f68, cap: 0x8edfd6 },
    { base: 0x3e6292, cap: 0x9dc5ff },
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
