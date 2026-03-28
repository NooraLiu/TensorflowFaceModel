// =============================================================================
// THREE.JS SCENE SETUP MODULE - EXPERIMENT VARIANT
// Fixed-target, fixed-distance camera orbit shared by both experiment conditions
// =============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const CAMERA_CONSTRAINTS = {
  target: new THREE.Vector3(0, 0.5, 0),
  distance: 20,
  azimuthMinDeg: -180,
  azimuthMaxDeg: 180,
  elevationMinDeg: 0,
  elevationMaxDeg: 90,
  initialAzimuthDeg: 18,
  initialElevationDeg: 35
};

export function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe7efe7);
  scene.fog = new THREE.Fog(0xe7efe7, 28, 58);
  return scene;
}

export function setupCamera() {
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  applyOrbitToCamera(
    camera,
    CAMERA_CONSTRAINTS.initialAzimuthDeg,
    CAMERA_CONSTRAINTS.initialElevationDeg,
    CAMERA_CONSTRAINTS.target,
    CAMERA_CONSTRAINTS.distance
  );

  return camera;
}

export function setupRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

export function setupControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.mouseButtons.LEFT = THREE.MOUSE.NONE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.NONE;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.target.copy(CAMERA_CONSTRAINTS.target);
  controls.minDistance = CAMERA_CONSTRAINTS.distance;
  controls.maxDistance = CAMERA_CONSTRAINTS.distance;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.minPolarAngle = THREE.MathUtils.degToRad(90 - CAMERA_CONSTRAINTS.elevationMaxDeg);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(90 - CAMERA_CONSTRAINTS.elevationMinDeg);
  controls.update();
  return controls;
}

export function setupLighting(scene) {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc2cfb5, 0.95);
  scene.add(hemiLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
  directionalLight.position.set(8, 14, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.left = -16;
  directionalLight.shadow.camera.right = 16;
  directionalLight.shadow.camera.top = 16;
  directionalLight.shadow.camera.bottom = -16;
  scene.add(directionalLight);

  return { hemiLight, directionalLight };
}

export function applyOrbitToCamera(camera, azimuthDeg, elevationDeg, target, distance) {
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
  const elevation = THREE.MathUtils.degToRad(elevationDeg);
  const horizontalDistance = Math.cos(elevation) * distance;

  camera.position.set(
    target.x + Math.sin(azimuth) * horizontalDistance,
    target.y + Math.sin(elevation) * distance,
    target.z + Math.cos(azimuth) * horizontalDistance
  );
  camera.lookAt(target);
}

export function getCameraOrbitDegrees(camera, target) {
  const offset = new THREE.Vector3().subVectors(camera.position, target);
  const distance = offset.length();
  const azimuth = THREE.MathUtils.radToDeg(Math.atan2(offset.x, offset.z));
  const elevation = THREE.MathUtils.radToDeg(Math.asin(offset.y / distance));

  return {
    azimuthDeg: azimuth,
    elevationDeg: elevation,
    distance
  };
}

export function handleWindowResize(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
