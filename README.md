# Face Tracking 3D Cube Controller

A modular face tracking system that uses your webcam and facial expressions to control 3D objects in real-time using MediaPipe and Three.js.

![Face Tracking Demo](https://img.shields.io/badge/MediaPipe-Face%20Mesh-blue) ![Three.js](https://img.shields.io/badge/Three.js-3D%20Graphics-green) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-yellow)

## Features

- **Head Pose Tracking** - Control rotation with head movements (turn, tilt, roll)
- **Mouth Detection** - Scale objects by opening your mouth
- **Blink Detection** - Trigger visual effects with eye blinks
- **Eyebrow Recognition** - Toggle wireframe mode by raising eyebrows
- **Smile/Frown Detection** - Display emoji overlays based on expressions
- **Auto-Calibration** - Establishes neutral baseline on startup
- **Modular Architecture** - Reusable detector modules for multiple examples

## Three Interactive Examples

### 1. Rotation Example (`example_rotation/`)
- **Head movements** rotate a colorful cube
- **Mouth opening** scales the cube size
- **Eyebrow raise** toggles wireframe mode + "WOW!" text
- **Blinking** spawns random colored circles
- **Smiling/Frowning** displays emoji overlays

### 2. Movement Example (`example_movement/`)
- **Head movements** control first-person walking
- **Mouth opening** makes you jump
- **Turn head** to change direction
- **Tilt head** to move forward/backward
- **Camera follows** the cube smoothly

### 3. Pac-Man Game (`example_pacman/`)
- **Head tilt** to move forward/backward
- **Head roll** to strafe left/right and rotate Pac-Man
- **Open mouth** to collect stars (10 points total)
- **Avoid ghosts** - 3 lives with visual damage feedback
- **Avoid bombs** - Lose points on collision with explosion effects
- **Blink** to switch terrains with different challenges:
  - **Forest (Green)**: 1 ghost, 5 bombs, standard obstacles (trees)
  - **Desert (Yellow)**: 0 ghosts, 15 bombs (bomb terrain!), cacti obstacles
  - **Beach (Light Yellow)**: 1 ghost, 5 bombs, rock obstacles
  - **Sunset (Purple)**: 3 ghosts (ghost terrain!), 5 bombs, pillar obstacles
- **Dynamic gameplay**: Pac-Man grows with score, ghosts patrol specific terrains
- **Win condition**: Collect all stars with positive score
- **Game over**: Lose all lives or finish with 0 score

## Quick Start

### Prerequisites
- Modern web browser (Chrome, Edge, or Firefox recommended)
- Webcam
- Internet connection (for CDN libraries)

### Running the Project

1. **Clone or download** this repository
2. **Start a local server** (required for ES6 modules):

   **Option A: Using Python**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Option B: Using Node.js**
   ```bash
   npx http-server -p 8000
   ```

   **Option C: Using VS Code**
   - Install "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

3. **Open in browser**:
   - Rotation Example: `http://localhost:8000/example_rotation/`
   - Movement Example: `http://localhost:8000/example_movement/`
   - Pac-Man Game: `http://localhost:8000/example_pacman/`

4. **Allow camera access** when prompted

5. **Wait for calibration** (30 frames, ~1 second)
   - Keep your face neutral and centered during calibration

6. **Start interacting!** Move your head, open your mouth, blink, raise eyebrows

## Project Structure

```
TensorflowFaceModel/
│
├── lib/                              # Core library
│   └── MediaPipeFaceTracking.js      # MediaPipe wrapper
│
├── modules/                          # Shared detector modules
│   └── detectorModules/
│       ├── headPoseDetection.js      # Head rotation tracking
│       ├── mouthDetection.js         # Mouth opening detection
│       ├── blinkDetection.js         # Eye blink detection
│       ├── eyebrowDetection.js       # Eyebrow raise detection
│       ├── smileFrownDetection.js    # Expression detection
│       └── calibration.js            # Baseline calibration system
│
├── example_rotation/                 # Rotation control example
│   ├── index.html
│   ├── sketch-modular.js             # Main entry point
│   ├── faceTrackingCoordinator.js    # Orchestrates detectors
│   ├── dataMapping.js                # Maps detections to actions
│   └── sceneObjects.js               # Three.js scene setup
│
├── example_movement/                 # Movement control example
│   ├── index.html
│   ├── sketch-movement.js
│   ├── faceTrackingCoordinator.js
│   ├── dataMapping.js                # MovementController class
│   ├── sceneObjects.js
│   └── sceneSetup.js
│
├── example_pacman/                   # Pac-Man game example
│   ├── index.html
│   ├── sketch-pacman.js              # Main game entry point
│   ├── faceTrackingCoordinator.js    # Game state coordination
│   ├── dataMapping.js                # MovementController + GroundColorManager
│   ├── sceneObjects.js               # Pac-Man, ghosts, stars, bombs, obstacles
│   └── sceneSetup.js                 # Three.js scene configuration
│
├── Models/                           # 3D model assets
│   ├── ghost.glb                     # Ghost model for Pac-Man game
│   ├── pac-man_ghost_blinky.glb
│   └── pacman_ghost_inky.glb
│
├── Legacy/                           # Original monolithic version
│   ├── index.html
│   └── sketch.js
│
├── architecture-diagram.md           # Technical UML diagrams
└── README.md                         # This file
```

## How It Works

### Detection Pipeline

1. **Camera Feed** → Your webcam captures video
2. **MediaPipe Face Mesh** → Detects 468 facial landmarks
3. **Detector Modules** → Extract features:
   - Head pose (turn, tilt, roll angles)
   - Mouth opening ratio
   - Eye aspect ratios (for blinks)
   - Eyebrow position
   - Smile/frown intensity
4. **Calibration System** → Establishes neutral baseline
5. **Data Mapping** → Converts detections to scene actions
6. **Scene Updates** → Animates 3D objects in real-time

### Key Technologies

- **[MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh.html)** - Real-time face landmark detection
- **[Three.js](https://threejs.org/)** - 3D graphics rendering
- **[GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)** - 3D model loading (.glb format)
- **ES6 Modules** - Clean, modular JavaScript architecture

## Game Mechanics (Pac-Man Example)

### Controls
- **Head Tilt (Forward/Back)**: Move Pac-Man forward/backward
- **Head Roll (Left/Right)**: Strafe and rotate Pac-Man (0° to 180°)
- **Head Turn**: Rotate camera view
- **Mouth Open**: Collect stars (must have mouth open!)
- **Blink**: Switch between 4 different terrains

### Collectibles & Hazards
- **Stars (Yellow)** 🌟: +1 point each, must collect with open mouth
- **Bombs (Black)** 💣: -2 points, explosion effect on collision
- **Ghosts** 👻: -1 life per collision, flash red damage effect

### Terrain System
Each terrain has unique characteristics:
- **Different colors** and visual themes
- **Different obstacles**: Trees (forest), cacti (desert), rocks (beach), pillars (sunset)
- **Variable bomb counts**: Desert has 15 bombs, others have 5
- **Different ghost counts**: Sunset has 3 ghosts, forest/beach have 1, desert has 0
- **Consistent obstacle positions** per terrain (uses seeded randomization)

### Gameplay Features
- **Lives System**: Start with 3 hearts ❤️
- **Size Scaling**: Pac-Man grows bigger with higher score
- **Collision Detection**: Can't pass through obstacles, slides along edges
- **Boundaries**: Invisible walls keep Pac-Man on the plane
- **Visual Effects**: Sparkle bursts for stars, explosions for bombs, flash for ghost hits
- **Win/Lose**: Win by collecting all stars with score > 0, lose by running out of lives or finishing with 0 score

## Customization

### Adjusting Sensitivity

Edit the constants in `dataMapping.js`:

```javascript
// Rotation example
const HEAD_ROTATION_MULTIPLIER = Math.PI * 4;  // Increase for more sensitivity
const MAX_MOUTH_SCALE = 3.0;                   // Max cube size
const MIN_MOUTH_SCALE = 0.3;                   // Min cube size

// Movement example
const BASE_MOVEMENT_SPEED = 0.1;               // Walking speed
const JUMP_FORCE = 0.3;                        // Jump height
```

### Adding New Detections

1. Create detector in `modules/detectorModules/`
2. Import in `faceTrackingCoordinator.js`
3. Call detector in `onFaceDetected()`
4. Map detection to action in `dataMapping.js`

### Creating New Examples

1. Copy `example_rotation/` folder
2. Modify `dataMapping.js` with custom mappings
3. Update `sceneObjects.js` for different 3D objects
4. Keep using the same detector modules!

## Troubleshooting

### Camera not working
- Check browser permissions (allow camera access)
- Try a different browser (Chrome recommended)
- Make sure no other app is using the camera

### Face mesh not appearing
- Ensure good lighting
- Keep face centered in camera view
- Wait for MediaPipe libraries to load

### Jittery/unstable tracking
- Improve lighting conditions
- Reduce camera shake
- Recalibrate by refreshing the page
- Check that face is fully visible

### Module loading errors
- Must use a local server (not `file://` protocol)
- Check browser console for specific errors
- Ensure internet connection for CDN libraries

## Technical Details

### Smoothing & Filtering

- **Mouth Detection**: Sustained change detection filters out spikes
- **Blink Detection**: 150ms cooldown prevents double-triggers
- **Eyebrow Detection**: Symmetry checking filters head tilts
- **Calibration**: Median of 30 samples for stable baseline

### Performance

- Runs at ~30-60 FPS on modern hardware
- Real-time face tracking with minimal latency
- Optimized for single face detection

## Contributing

Feel free to:
- Add new detector modules
- Create new examples
- Improve smoothing algorithms
- Enhance visual effects
- Fix bugs or improve performance

## License

This project is open source and available for educational and personal use.

## Acknowledgments

- **MediaPipe** by Google - Face landmark detection
- **Three.js** - 3D graphics library
- **Original sketch.js** - Foundation for modular refactoring

## Questions?

Check out:
- `architecture-diagram.md` for detailed UML diagrams
- Code comments in each module
- MediaPipe documentation: https://google.github.io/mediapipe/
- Three.js documentation: https://threejs.org/docs/

---

**Built with face tracking and 3D graphics**
