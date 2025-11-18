// =============================================================================
// SCENE OBJECTS MODULE - PAC-MAN VARIANT
// Creates 3D objects for the Pac-Man demo scene
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createGround(scene) {
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xa3dc9a // Soft green from color set
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}

export function createPacman() {
  const pacmanGroup = new THREE.Group();
  
  // Pac-Man yellow color
  const pacmanColor = 0xffff00;
  
  // Create upper jaw (top half-sphere)
  const upperJawGeometry = new THREE.SphereGeometry(
    0.5,  // radius
    32,   // width segments
    32,   // height segments
    0,    // phiStart
    Math.PI * 2,  // phiLength (full circle)
    0,    // thetaStart (from top)
    Math.PI / 2   // thetaLength (half sphere - top half)
  );
  
  // Outer yellow material
  const outerMaterial = new THREE.MeshPhongMaterial({ 
    color: pacmanColor,
    shininess: 30,
    side: THREE.FrontSide  // Only render outside
  });
  
  // Inner pink material
  const innerMaterial = new THREE.MeshPhongMaterial({
    color: 0xff69b4,  // Pink color
    shininess: 30,
    side: THREE.BackSide  // Only render inside
  });
  
  // Create two meshes for upper jaw - one for outside, one for inside
  const upperJawOuter = new THREE.Mesh(upperJawGeometry, outerMaterial);
  upperJawOuter.castShadow = true;
  
  const upperJawInner = new THREE.Mesh(upperJawGeometry.clone(), innerMaterial);
  
  // Create lower jaw (bottom half-sphere)
  const lowerJawGeometry = new THREE.SphereGeometry(
    0.5,  // radius
    32,   // width segments
    32,   // height segments
    0,    // phiStart
    Math.PI * 2,  // phiLength (full circle)
    Math.PI / 2,  // thetaStart (from middle)
    Math.PI / 2   // thetaLength (half sphere - bottom half)
  );
  
  // Create two meshes for lower jaw - one for outside, one for inside
  const lowerJawOuter = new THREE.Mesh(lowerJawGeometry, outerMaterial.clone());
  lowerJawOuter.castShadow = true;
  
  const lowerJawInner = new THREE.Mesh(lowerJawGeometry.clone(), innerMaterial.clone());
  
  // Create eyes
  const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
  const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.15, 0.2, 0.4);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(-0.15, 0.2, -0.4);
  
  // Add all parts to the group
  pacmanGroup.add(upperJawOuter);
  pacmanGroup.add(upperJawInner);
  pacmanGroup.add(lowerJawOuter);
  pacmanGroup.add(lowerJawInner);
  pacmanGroup.add(leftEye);
  pacmanGroup.add(rightEye);
  
  // Position and rotate the group
  pacmanGroup.position.set(0, 0.5, 0);
  pacmanGroup.rotation.y = Math.PI / 2; // Rotate +90 degrees (right) so mouth faces the camera
  pacmanGroup.castShadow = true;
  
  // Return the group and individual jaw parts for animation
  return {
    group: pacmanGroup,
    upperJaw: upperJawOuter,
    lowerJaw: lowerJawOuter,
    upperJawInner: upperJawInner,
    lowerJawInner: lowerJawInner,
    leftEye: leftEye,
    rightEye: rightEye
  };
}

export function createStars(scene, count = 10) {
  const stars = [];
  const starGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  const starMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.5,
    shininess: 100
  });
  
  for (let i = 0; i < count; i++) {
    const star = new THREE.Mesh(starGeometry, starMaterial.clone());
    
    // Random position on the plane (avoid center where Pac-Man starts)
    const angle = Math.random() * Math.PI * 2;
    const distance = 3 + Math.random() * 6; // Between 3 and 9 units from center
    star.position.x = Math.cos(angle) * distance;
    star.position.y = 0.3; // Slightly above ground
    star.position.z = Math.sin(angle) * distance;
    
    star.userData.collected = false;
    star.castShadow = true;
    
    scene.add(star);
    stars.push(star);
  }
  
  return stars;
}

export function createBombs(scene, count = 5, currentTerrain = 0) {
  const bombs = [];
  const bombGeometry = new THREE.SphereGeometry(0.2, 16, 16);
  const bombMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x000000,
    shininess: 50
  });
  
  // Create fuse geometry (small cylinder on top)
  const fuseGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
  const fuseMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x8B4513, // Brown fuse
    shininess: 30
  });
  
  // Terrain 1 (Desert) has many bombs (15), others have 5
  const bombCount = currentTerrain === 1 ? 15 : 5;
  
  for (let i = 0; i < bombCount; i++) {
    const bombGroup = new THREE.Group();
    
    // Create bomb body
    const bomb = new THREE.Mesh(bombGeometry, bombMaterial.clone());
    bombGroup.add(bomb);
    
    // Create fuse
    const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial.clone());
    fuse.position.y = 0.25; // On top of bomb
    bombGroup.add(fuse);
    
    // Random position on the plane (avoid center where Pac-Man starts)
    const angle = Math.random() * Math.PI * 2;
    const distance = 3 + Math.random() * 6; // Between 3 and 9 units from center
    bombGroup.position.x = Math.cos(angle) * distance;
    bombGroup.position.y = 0.2; // Slightly above ground
    bombGroup.position.z = Math.sin(angle) * distance;
    
    bombGroup.userData.collected = false;
    bombGroup.castShadow = true;
    
    scene.add(bombGroup);
    bombs.push(bombGroup);
  }
  
  return bombs;
}

export function loadGhosts(scene, count = 3, ghostModelPath = '../Models/ghost.glb') {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const ghosts = [];
    
    loader.load(
      ghostModelPath,
      (gltf) => {
        // Successfully loaded the ghost model
        const ghostModel = gltf.scene;
        
        // Assign ghosts to terrains: 1 in Forest (0), 0 in Desert (1), 1 in Beach (2), 3 in Sunset (3)
        const terrainAssignments = [0, 2, 3, 3, 3]; // 5 ghosts total
        
        // Create multiple ghost instances
        for (let i = 0; i < count; i++) {
          const ghost = ghostModel.clone();
          
          // Assign terrain
          const assignedTerrain = terrainAssignments[i % terrainAssignments.length];
          ghost.userData.terrain = assignedTerrain;
          
          // Random position on the plane (farther from center to avoid immediate collision)
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
          const distance = 6 + Math.random() * 3; // Between 6 and 9 units from center
          ghost.position.x = Math.cos(angle) * distance;
          ghost.position.y = 0; // On ground (adjust based on your model's pivot)
          ghost.position.z = Math.sin(angle) * distance;
          
          // Scale if needed (adjust based on your model size)
          ghost.scale.setScalar(0.02);
          
          // Add ghost movement data
          ghost.userData.velocity = {
            x: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
          };
          ghost.userData.active = true;
          ghost.userData.visibleInTerrain = assignedTerrain; // Only visible in assigned terrain
          ghost.visible = (assignedTerrain === 0); // Start visible if terrain 0 (will be false for terrain 3)
          
          ghost.castShadow = true;
          ghost.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
            }
          });
          
          scene.add(ghost);
          ghosts.push(ghost);
        }
        
        console.log(`Loaded ${count} ghosts`);
        resolve(ghosts);
      },
      (progress) => {
        // Loading progress
        console.log('Loading ghost model...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
      },
      (error) => {
        console.error('Error loading ghost model:', error);
        // Fallback: create simple ghost shapes
        const fallbackGhosts = createFallbackGhosts(scene, count);
        resolve(fallbackGhosts);
      }
    );
  });
}

function createFallbackGhosts(scene, count) {
  // Create simple ghost shapes if GLB fails to load
  const ghosts = [];
  const terrainAssignments = [0, 2, 3, 3, 3]; // 1 in Forest, 0 in Desert, 1 in Beach, 3 in Sunset
  
  for (let i = 0; i < count; i++) {
    const ghostGroup = new THREE.Group();
    
    // Assign terrain
    const assignedTerrain = terrainAssignments[i % terrainAssignments.length];
    ghostGroup.userData.terrain = assignedTerrain;
    
    // Ghost body (rounded shape)
    const bodyGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: i === 0 ? 0xff0000 : i === 1 ? 0xff69b4 : 0x00ffff, // Red, pink, cyan
      shininess: 50
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    ghostGroup.add(body);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const pupilGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.35, 0.25);
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.1, 0.35, 0.29);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.35, 0.25);
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.1, 0.35, 0.29);
    
    ghostGroup.add(leftEye, leftPupil, rightEye, rightPupil);
    
    // Random position
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const distance = 6 + Math.random() * 3; // Between 6 and 9 units from center
    ghostGroup.position.x = Math.cos(angle) * distance;
    ghostGroup.position.y = 0;
    ghostGroup.position.z = Math.sin(angle) * distance;
    
    // Add movement data
    ghostGroup.userData.velocity = {
      x: (Math.random() - 0.5) * 0.02,
      z: (Math.random() - 0.5) * 0.02
    };
    ghostGroup.userData.active = true;
    ghostGroup.userData.visibleInTerrain = assignedTerrain;
    ghostGroup.visible = (assignedTerrain === 0); // Start visible if terrain 0
    
    ghostGroup.castShadow = true;
    scene.add(ghostGroup);
    ghosts.push(ghostGroup);
  }
  
  console.log(`Created ${count} fallback ghosts`);
  return ghosts;
}

export function createObstacles(scene, terrainType = 0) {
  const obstacles = [];
  
  // Define different terrain types
  const terrainConfigs = [
    // Terrain 0: Forest (green) - Trees
    {
      color: 0x8B4513,
      count: 8,
      size: { width: 0.3, height: 1.5, depth: 0.3 },
      shape: 'cylinder'
    },
    // Terrain 1: Desert (yellow-green) - Cacti
    {
      color: 0x228B22,
      count: 10,
      size: { width: 0.25, height: 1.0, depth: 0.25 },
      shape: 'cylinder'
    },
    // Terrain 2: Beach (light yellow) - Rocks
    {
      color: 0x808080,
      count: 12,
      size: { width: 0.6, height: 0.4, depth: 0.6 },
      shape: 'sphere'
    },
    // Terrain 3: Sunset (orange) - Pillars
    {
      color: 0xDDA0DD,
      count: 6,
      size: { width: 0.4, height: 2.0, depth: 0.4 },
      shape: 'box'
    }
  ];
  
  const config = terrainConfigs[terrainType];
  
  // Use seeded random positions for consistency
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  for (let i = 0; i < config.count; i++) {
    let geometry;
    if (config.shape === 'cylinder') {
      geometry = new THREE.CylinderGeometry(config.size.width, config.size.width, config.size.height, 8);
    } else if (config.shape === 'sphere') {
      geometry = new THREE.SphereGeometry(config.size.width, 8, 8);
    } else {
      geometry = new THREE.BoxGeometry(config.size.width, config.size.height, config.size.depth);
    }
    
    const material = new THREE.MeshPhongMaterial({ 
      color: config.color,
      shininess: 30
    });
    
    const obstacle = new THREE.Mesh(geometry, material);
    
    // Use consistent seeded positions for each terrain type
    const seed = terrainType * 1000 + i;
    const angle = seededRandom(seed * 2) * Math.PI * 2;
    const distance = 2 + seededRandom(seed * 3) * 6; // Between 2 and 8 units from center
    obstacle.position.x = Math.cos(angle) * distance;
    obstacle.position.y = config.size.height / 2; // Rest on ground
    obstacle.position.z = Math.sin(angle) * distance;
    
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    
    scene.add(obstacle);
    obstacles.push(obstacle);
  }
  
  return obstacles;
}

export function removeObstacles(scene, obstacles) {
  obstacles.forEach(obstacle => {
    scene.remove(obstacle);
    obstacle.geometry.dispose();
    obstacle.material.dispose();
  });
}
