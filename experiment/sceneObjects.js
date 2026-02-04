// =============================================================================
// SCENE OBJECTS MODULE - MOVEMENT VARIANT
// Creates 3D objects for the movement demo scene
// =============================================================================

import * as THREE from 'three';

export function createGround(scene) {
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xa3dc9a // rgb(163, 220, 154) - first color in cycling palette
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}

export function createCube() {
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterials = [
    new THREE.MeshPhongMaterial({ color: 0xff8f8f }), // Right face - Light Pink rgb(255, 143, 143)
    new THREE.MeshPhongMaterial({ color: 0xfff1cb }), // Left face - Light Yellow rgb(255, 241, 203)
    new THREE.MeshPhongMaterial({ color: 0xc2e2fa }), // Top face - Light Blue rgb(194, 226, 250)
    new THREE.MeshPhongMaterial({ color: 0xb7a3e3 }), // Bottom face - Light Purple rgb(183, 163, 227)
    new THREE.MeshPhongMaterial({ color: 0xf5d2d2 }), // Front face - Pale Pink rgb(245, 210, 210)
    new THREE.MeshPhongMaterial({ color: 0xffc7a7 })  // Back face - Light Orange rgb(255, 199, 167)
  ];
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
  cube.position.set(0, 0.5, 0);
  cube.castShadow = true;
  return cube;
}
