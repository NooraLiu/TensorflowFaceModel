// =============================================================================
// SCENE OBJECTS MODULE
// Creates and manages the cube and other 3D objects
// =============================================================================

import * as THREE from 'three';

// Default cube properties
const DEFAULT_CUBE_SIZE = 1.0;
const DEFAULT_CUBE_SCALE = 1.0;

export function createCube() {
  const geometry = new THREE.BoxGeometry(DEFAULT_CUBE_SIZE, DEFAULT_CUBE_SIZE, DEFAULT_CUBE_SIZE);
  
  // Create materials for each face with different colors
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0xff8f8f }), // Right face - Light Pink
    new THREE.MeshBasicMaterial({ color: 0xfff1cb }), // Left face - Light Yellow
    new THREE.MeshBasicMaterial({ color: 0xc2e2fa }), // Top face - Light Blue
    new THREE.MeshBasicMaterial({ color: 0xb7a3e3 }), // Bottom face - Light Purple
    new THREE.MeshBasicMaterial({ color: 0xf5d2d2 }), // Front face - Pale Pink
    new THREE.MeshBasicMaterial({ color: 0xffc7a7 })  // Back face - Light Orange
  ];
  
  const cube = new THREE.Mesh(geometry, materials);
  cube.scale.setScalar(DEFAULT_CUBE_SCALE);
  return cube;
}

export function getDefaultCubeScale() {
  return DEFAULT_CUBE_SCALE;
}

export function updateCubeRotation(cube, headMovement) {
  if (headMovement) {
    cube.rotation.y = headMovement.turn;
    cube.rotation.x = headMovement.tilt;
    cube.rotation.z = headMovement.roll;
  }
}

export function updateCubeScale(cube, scale) {
  cube.scale.setScalar(scale);
}

export function toggleCubeWireframe(cube, shouldShowWireframe) {
  cube.material.forEach(material => {
    material.wireframe = shouldShowWireframe;
  });
}
