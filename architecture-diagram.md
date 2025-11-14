# Face Tracking System - UML Architecture

## Class Diagram

```mermaid
classDiagram
    %% Detector Modules
    class HeadPoseDetector {
        +detectPose(landmarks) HeadPose
    }
    
    class MouthDetector {
        -mouthOpenHistory: Array
        -lastSmoothedMouthValue: number
        +calculateMouthRatio(landmarks) number
        +smoothMouthOpening(rawValue) number
        +getMouthData(landmarks) MouthData
    }
    
    class BlinkDetector {
        -lastBlinkState: Object
        -lastBlinkTime: number
        +calculateEyeRatio(landmarks, eyePoints) number
        +detectBlink(landmarks) BlinkData
    }
    
    class EyebrowDetector {
        -eyebrowBaseline: number
        -headPoseBaselines: Object
        +setBaselines(eyebrowBaseline, headPoseBaselines)
        +calculateEyebrowDistance(landmarks) number
        +detectRaise(landmarks, headPose) boolean
    }
    
    class SmileFrownDetector {
        -headPoseBaselines: Object
        +setBaselines(headPoseBaselines)
        +detectExpression(landmarks, headPose) ExpressionData
    }
    
    class CalibrationSystem {
        -samples: Array
        -isCalibrated: boolean
        -eyebrowBaseline: number
        -headPoseBaselines: Object
        +addSample(eyebrow, turn, tilt, roll)
        +getProgress() number
        +getHeadPoseBaselines() Object
        +getHeadMovement(turn, tilt, roll) HeadMovement
        +shouldToggleWireframe(eyebrowDistance) boolean
    }
    
    %% Core Classes
    class MediaPipeFaceTracking {
        -faceMesh: FaceMesh
        -camera: Camera
        -onResultsCallback: Function
        +initialize(videoElement, canvasElement, onResults)
        +processResults(results, ctx, canvas)
    }
    
    class FaceTrackingCoordinator {
        -headPoseDetector: HeadPoseDetector
        -mouthDetector: MouthDetector
        -blinkDetector: BlinkDetector
        -eyebrowDetector: EyebrowDetector
        -smileFrownDetector: SmileFrownDetector
        -calibration: CalibrationSystem
        +onFaceDetected(results)
    }
    
    %% Data Mapping (Rotation Example)
    class RotationDataMapping {
        <<module>>
        +mouthToCubeScale(mouthData) number
        +headPoseToCubeRotation(headMovement) Rotation
        +eyebrowToWireframe(intensity) boolean
    }
    
    class BlinkEffectManager {
        -scene: Scene
        -circles: Array
        +onBlinkDetected(blinkData)
        +createCircle() Circle
        +updateCircles()
    }
    
    class EyebrowEffectManager {
        -lastWowTime: number
        +onEyebrowRaise(detected)
        +createWowText()
    }
    
    class SmileFrownEffectManager {
        -lastSmileTime: number
        -lastFrownTime: number
        +onExpressionDetected(expressionData)
        +createSmileyFace()
        +createFrownFace()
    }
    
    %% Movement Example Classes
    class MovementController {
        -position: Vector3
        -velocity: Vector3
        -cameraOffset: Vector3
        +updateMovement(headMovement, mouthData)
        +applyCameraFollow(camera)
    }
    
    class MovementDataMapping {
        <<module>>
        +applyHeadMovementToVelocity(controller, headMovement)
        +applyMouthToJump(controller, mouthData)
    }
    
    %% Scene Objects
    class SceneObjects {
        <<module>>
        +createCube() Mesh
        +createScene() Scene
        +createCamera() Camera
        +createRenderer() Renderer
    }
    
    %% Data Types
    class HeadPose {
        +turn: number
        +tilt: number
        +roll: number
    }
    
    class MouthData {
        +raw: number
        +smoothed: number
        +normalized: number
    }
    
    class BlinkData {
        +detected: boolean
        +leftRatio: number
        +rightRatio: number
    }
    
    class ExpressionData {
        +smile: Object
        +frown: Object
        +isSymmetrical: boolean
    }
    
    class HeadMovement {
        +turn: number
        +tilt: number
        +roll: number
    }
    
    %% Relationships - Rotation Example
    FaceTrackingCoordinator --> MediaPipeFaceTracking: uses
    FaceTrackingCoordinator --> HeadPoseDetector: uses
    FaceTrackingCoordinator --> MouthDetector: uses
    FaceTrackingCoordinator --> BlinkDetector: uses
    FaceTrackingCoordinator --> EyebrowDetector: uses
    FaceTrackingCoordinator --> SmileFrownDetector: uses
    FaceTrackingCoordinator --> CalibrationSystem: uses
    FaceTrackingCoordinator --> RotationDataMapping: uses
    
    RotationDataMapping --> BlinkEffectManager: creates
    RotationDataMapping --> EyebrowEffectManager: creates
    RotationDataMapping --> SmileFrownEffectManager: creates
    
    HeadPoseDetector ..> HeadPose: returns
    MouthDetector ..> MouthData: returns
    BlinkDetector ..> BlinkData: returns
    SmileFrownDetector ..> ExpressionData: returns
    CalibrationSystem ..> HeadMovement: returns
    
    %% Movement Example relationships
    MovementController --> MovementDataMapping: uses
    MovementDataMapping --> HeadMovement: consumes
    MovementDataMapping --> MouthData: consumes
```

## Component Diagram

```mermaid
graph TB
    subgraph "External Dependencies"
        MP[MediaPipe FaceMesh]
        THREE[Three.js]
    end
    
    subgraph "Core Library (lib/)"
        MFT[MediaPipeFaceTracking]
    end
    
    subgraph "Detector Modules (modules/detectorModules/)"
        HPD[HeadPoseDetector]
        MD[MouthDetector]
        BD[BlinkDetector]
        ED[EyebrowDetector]
        SFD[SmileFrownDetector]
        CAL[CalibrationSystem]
    end
    
    subgraph "Example: Rotation (example_rotation/)"
        FTC1[FaceTrackingCoordinator]
        DM1[DataMapping]
        SO1[SceneObjects]
        SM1[sketch-modular.js]
        HTML1[index.html]
    end
    
    subgraph "Example: Movement (example_movement/)"
        FTC2[FaceTrackingCoordinator]
        DM2[DataMapping<br/>MovementController]
        SO2[SceneObjects]
        SM2[sketch-modular.js]
        HTML2[index.html]
    end
    
    MP --> MFT
    THREE --> SO1
    THREE --> SO2
    
    MFT --> FTC1
    MFT --> FTC2
    
    HPD --> FTC1
    MD --> FTC1
    BD --> FTC1
    ED --> FTC1
    SFD --> FTC1
    CAL --> FTC1
    
    HPD --> FTC2
    MD --> FTC2
    BD --> FTC2
    ED --> FTC2
    SFD --> FTC2
    CAL --> FTC2
    
    FTC1 --> DM1
    FTC1 --> SO1
    SM1 --> FTC1
    HTML1 --> SM1
    
    FTC2 --> DM2
    FTC2 --> SO2
    SM2 --> FTC2
    HTML2 --> SM2
    
    style MP fill:#e1f5ff
    style THREE fill:#e1f5ff
    style MFT fill:#fff4e1
    style HPD fill:#e8f5e9
    style MD fill:#e8f5e9
    style BD fill:#e8f5e9
    style ED fill:#e8f5e9
    style SFD fill:#e8f5e9
    style CAL fill:#e8f5e9
```

## Sequence Diagram - Face Detection Flow

```mermaid
sequenceDiagram
    participant HTML as index.html
    participant Sketch as sketch-modular.js
    participant MP as MediaPipeFaceTracking
    participant Coord as FaceTrackingCoordinator
    participant Detectors as Detector Modules
    participant Calib as CalibrationSystem
    participant Mapping as DataMapping
    participant Scene as Three.js Scene
    
    HTML->>Sketch: Load & Initialize
    Sketch->>MP: initialize(video, canvas, onResults)
    Sketch->>Coord: Setup coordinator with detectors
    Sketch->>Scene: Create cube, camera, renderer
    
    loop Every Frame
        MP->>MP: Process video frame
        MP->>Coord: onFaceDetected(results)
        
        alt Calibration Phase
            Coord->>Detectors: detectPose(landmarks)
            Detectors-->>Coord: headPose
            Coord->>Detectors: calculateEyebrowDistance(landmarks)
            Detectors-->>Coord: eyebrowDistance
            Coord->>Calib: addSample(eyebrow, turn, tilt, roll)
            Calib-->>Coord: progress/isCalibrated
            Coord->>Scene: Keep cube neutral
        else Normal Operation
            Coord->>Detectors: detectPose(landmarks)
            Detectors-->>Coord: headPose
            Coord->>Detectors: getMouthData(landmarks)
            Detectors-->>Coord: mouthData
            Coord->>Detectors: detectBlink(landmarks)
            Detectors-->>Coord: blinkData
            Coord->>Detectors: detectExpression(landmarks, headPose)
            Detectors-->>Coord: expressionData
            Coord->>Detectors: detectRaise(landmarks, headPose)
            Detectors-->>Coord: eyebrowRaised
            
            Coord->>Calib: getHeadMovement(turn, tilt, roll)
            Calib-->>Coord: headMovement (relative to baseline)
            
            Coord->>Mapping: headPoseToCubeRotation(headMovement)
            Mapping-->>Coord: rotation
            Coord->>Mapping: mouthToCubeScale(mouthData)
            Mapping-->>Coord: scale
            Coord->>Mapping: eyebrowToWireframe(intensity)
            Mapping-->>Coord: wireframeOn
            
            Coord->>Scene: Update cube rotation/scale/wireframe
            Coord->>Mapping: onBlinkDetected(blinkData)
            Mapping->>Scene: Create circle effects
            Coord->>Mapping: onEyebrowRaise(eyebrowRaised)
            Mapping->>HTML: Create WOW text overlay
            Coord->>Mapping: onExpressionDetected(expressionData)
            Mapping->>HTML: Create emoji overlay
        end
    end
```

## Data Flow Diagram

```mermaid
graph LR
    subgraph Input
        CAM[Camera Feed]
    end
    
    subgraph Processing
        MP[MediaPipe<br/>Face Mesh]
        LAND[468 Face<br/>Landmarks]
    end
    
    subgraph Detection Layer
        HP[Head Pose]
        MOUTH[Mouth Opening]
        BLINK[Blink Detection]
        EYEBROW[Eyebrow Raise]
        EXPR[Smile/Frown]
    end
    
    subgraph Calibration
        CAL[Baseline<br/>Calibration]
        REL[Relative<br/>Movement]
    end
    
    subgraph Mapping Layer
        ROT[Cube Rotation]
        SCALE[Cube Scale]
        WIRE[Wireframe Toggle]
        FX[Visual Effects]
    end
    
    subgraph Output
        SCENE[3D Scene<br/>Updates]
        OVERLAY[HTML<br/>Overlays]
    end
    
    CAM --> MP
    MP --> LAND
    LAND --> HP
    LAND --> MOUTH
    LAND --> BLINK
    LAND --> EYEBROW
    LAND --> EXPR
    
    HP --> CAL
    EYEBROW --> CAL
    CAL --> REL
    
    REL --> ROT
    MOUTH --> SCALE
    EYEBROW --> WIRE
    BLINK --> FX
    EXPR --> FX
    
    ROT --> SCENE
    SCALE --> SCENE
    WIRE --> SCENE
    FX --> SCENE
    FX --> OVERLAY
    
    style CAM fill:#e1f5ff
    style LAND fill:#fff4e1
    style HP fill:#e8f5e9
    style MOUTH fill:#e8f5e9
    style BLINK fill:#e8f5e9
    style EYEBROW fill:#e8f5e9
    style EXPR fill:#e8f5e9
    style CAL fill:#ffe8f0
    style SCENE fill:#f3e5f5
    style OVERLAY fill:#f3e5f5
```

## File Structure

```
TensorflowFaceModel/
├── lib/
│   └── MediaPipeFaceTracking.js       # Wrapper for MediaPipe Face Mesh
│
├── modules/
│   └── detectorModules/
│       ├── headPoseDetection.js       # HeadPoseDetector class
│       ├── mouthDetection.js          # MouthDetector class
│       ├── blinkDetection.js          # BlinkDetector class
│       ├── eyebrowDetection.js        # EyebrowDetector class
│       ├── smileFrownDetection.js     # SmileFrownDetector class
│       └── calibration.js             # CalibrationSystem class
│
├── example_rotation/
│   ├── index.html                     # Main HTML page
│   ├── sketch-modular.js              # Entry point, scene setup
│   ├── faceTrackingCoordinator.js     # Coordinates all detectors
│   ├── dataMapping.js                 # Maps detections to cube actions
│   └── sceneObjects.js                # Three.js scene/cube creation
│
├── example_movement/
│   ├── index.html                     # Main HTML page
│   ├── sketch-modular.js              # Entry point, scene setup
│   ├── faceTrackingCoordinator.js     # Coordinates all detectors
│   ├── dataMapping.js                 # MovementController & mappings
│   └── sceneObjects.js                # Three.js scene/cube creation
│
└── Legacy/
    ├── index.html                     # Original monolithic version
    └── sketch.js                      # Original monolithic code
```

## Key Design Patterns

### 1. **Modular Architecture**
- Each detector is a self-contained class with clear responsibilities
- Shared detectors in `modules/detectorModules/`
- Example-specific logic in separate folders

### 2. **Separation of Concerns**
- **Detection**: Raw data extraction from landmarks
- **Calibration**: Baseline establishment and relative movement
- **Mapping**: Converting detections to scene actions
- **Coordination**: Orchestrating the pipeline

### 3. **Data Flow**
1. MediaPipe → Landmarks (468 points)
2. Detectors → Typed data objects (HeadPose, MouthData, etc.)
3. Calibration → Relative movement from baseline
4. Mapping → Scene-specific actions
5. Scene → Visual updates

### 4. **Reusability**
- Same detector modules used in both examples
- Different mapping strategies for rotation vs movement
- Easy to create new examples with different mappings

### 5. **Smoothing & Filtering**
- Mouth: Sustained change detection + moving average
- Blink: Cooldown timer + state transition detection
- Eyebrow: Symmetry checking + intensity thresholding
- Calibration: Median of multiple samples
