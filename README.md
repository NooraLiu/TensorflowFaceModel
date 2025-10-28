# Face-Controlled 3D Movement Application

# Face-Controlled 3D Applications

Two real-time face tracking applications that allow you to control 3D objects using facial expressions and head movements. Built with MediaPipe Face Mesh, Three.js, and advanced facial landmark detection.

## Applications Overview

### **Application 1: Basic Face Tracking (`index.html` + `sketch.js`)**
A foundational face tracking application for learning and experimentation.

### **Application 2: Advanced Movement Control (`movement.html` + `sketch-movement.js`)**
A comprehensive face-controlled 3D movement system with advanced features and UI controls.

---

## Application 1: Basic Face Tracking

### **Functions & Controls**
- **Head Turn**: Rotate cube left/right by turning your head
- **Head Tilt**: Tilt cube forward/backward by tilting your head
- **Head Roll**: Roll cube by tilting your head sideways
- **Mouth Opening**: Scale cube size by opening/closing your mouth
- **Eyebrow Raise**: Switch cube between solid colors and wireframe mode
- **Blink Detection**: Spawn random colored circles that fade out over time

### **Key Features**
- **Automatic Calibration**: 30-sample baseline calibration for stable tracking
- **Visual Face Mesh**: Real-time visualization of detected facial landmarks
- **Blink Circles**: Animated circles that appear and fade when you blink
- **Smooth Mouth Detection**: Filtered mouth opening to prevent jittering

### **Code Variables**
```javascript
const BLINK_THRESHOLD = 0.25;         // Eye aspect ratio for blink detection
const BLINK_COOLDOWN = 150;           // Milliseconds between blink detections
const CALIBRATION_SAMPLES = 30;       // Samples for baseline calibration
const MOUTH_HISTORY_SIZE = 8;         // Frames for mouth smoothing
const MOUTH_CHANGE_THRESHOLD = 0.4;   // Maximum mouth change per frame
```

---

## Application 2: Advanced Movement Control

### **Functions & Controls**

### **Head Movement Controls**
- **Forward/Backward Movement**: Tilt your head forward or backward to move the cube
- **Left/Right Movement**: Roll your head left or right to move the cube sideways
- **Camera Rotation**: Turn your head left or right to rotate the camera view

### **Facial Expression Controls**
- **Eyebrow Raise**: Raise your eyebrows to trigger upward movement or special actions
- **Smile Detection**: Smile to generate a visual curve that follows your mouth shape
- **Blink Detection**: Blink to change the ground plane color randomly

### **Movement Modes**
- **Camera-Relative Movement**: Movement directions are relative to where the camera is looking (default)
- **World Space Movement**: Movement directions are fixed to world coordinates

### **Visual Feedback**
- **Smile Curve**: Real-time 2D visualization of your smile on the left side of the screen
- **Blink Circles**: Colored circles appear when you blink
- **Dynamic Ground Plane**: Changes color every time you blink

## Adjustable Variables & Controls

### **UI Sliders (Real-time Adjustment)**

#### **Movement Sensitivity**
- **Forward/Back Sensitivity**: `0.0 - 2.0x` (default: 0.3x)
  - Controls how responsive forward/backward head tilt movement is
  - Higher = more sensitive to small head movements

- **Left/Right Sensitivity**: `0.0 - 1.0x` (default: 0.10x)
  - Controls how responsive left/right head roll movement is
  - Lower values recommended due to natural head roll sensitivity

- **Camera Sensitivity**: Auto-adjusts based on movement mode
  - **Camera-Relative Mode**: `2.0x` (default for responsive camera control)
  - **World Space Mode**: `1.5x` (default for precise control)
  - Range: `0.0 - 5.0x`

#### **Toggle Switches**
- **Camera-Relative Movement**: On/Off (default: On)
  - On: Movement directions relative to camera orientation
  - Off: Movement directions fixed to world coordinates

- **Invert Camera Controls**: On/Off (default: Off)
  - Reverses left/right camera turning direction

### **Code-Level Variables (Advanced Users)**

#### **Movement & Sensitivity**
```javascript
let movementSensitivity = 0.3;     // Forward/backward sensitivity
let rollSensitivity = 0.10;        // Left/right sensitivity  
let cameraSensitivity = 2.0;       // Camera rotation sensitivity
const BASE_MOVEMENT_SPEED = 0.05;  // Base movement multiplier
const CAMERA_ROTATION_SPEED = 2.0; // Camera rotation speed
```

#### **Detection Thresholds**
```javascript
const BLINK_THRESHOLD = 0.3;           // Eye aspect ratio for blink detection
const BLINK_COOLDOWN = 100;            // Milliseconds between blink detections
const MOVEMENT_THRESHOLD = 0.015;      // Head movement threshold
const TURN_THRESHOLD = 0.08;           // Head turn threshold
const ROLL_THRESHOLD = 0.02;           // Head roll threshold
const THRESHOLD_SMOOTHING = 3.0;       // Smoothing factor for thresholds
```

#### **Facial Expression Detection**
```javascript
const EYEBROW_THRESHOLD = 1.75;        // Eyebrow raise detection sensitivity
const EYEBROW_HISTORY_SIZE = 10;       // History buffer for eyebrow tracking
const HEAD_POSE_CONSTRAINT = 0.05;     // Head pose limit for expression detection (radians)
const SMILE_THRESHOLD = 0.02;          // Smile detection sensitivity
```

#### **Acceleration Curves**
```javascript
// In applyAccelerationCurve() - Forward/Backward movement
Math.pow(absMovement, 1.2)             // Power: 1.2 (gentle acceleration)

// In applyRollAccelerationCurve() - Left/Right movement  
Math.pow(absMovement, 1.1)             // Power: 1.1 (very gentle acceleration)

// In applyTurnAccelerationCurve() - Camera rotation
Math.pow(absMovement, 1.3)             // Power: 1.3 (moderate acceleration)
```

#### **Visual Settings**
```javascript
const CUBE_FOLLOW_DISTANCE = 5;        // Camera distance from cube
const CUBE_HEIGHT_OFFSET = 2;          // Camera height above cube
let cameraRelativeMovement = true;     // Movement mode
let invertCameraControls = false;      // Camera control direction
```

#### **Physics & Damping**
```javascript
// Velocity damping (applied each frame)
cubeVelocity.x *= 0.95;                // X-axis damping
cubeVelocity.y *= 0.90;                // Y-axis damping (more damping)
cubeVelocity.z *= 0.95;                // Z-axis damping
```

## Getting Started

### **Application 1: Basic Face Tracking**
1. **Open** `index.html` in a modern web browser
2. **Allow camera access** when prompted
3. **Wait for calibration** (30 samples, progress shown on screen)
4. **Start experimenting** with head movements and facial expressions

### **Application 2: Advanced Movement Control**
1. **Open** `movement.html` in a modern web browser
2. **Allow camera access** when prompted
3. **Position your face** in the camera view
4. **Calibrate** by looking straight ahead (this sets your neutral position)
5. **Adjust sensitivity sliders** to match your movement style
6. **Start moving** your head and making expressions to control the 3D scene

### **Switching Between Applications**
- From Basic → Advanced: Click "Switch to Movement Control" button
- From Advanced → Basic: Use browser navigation or bookmark `index.html`

## Tips for Best Performance

### **Both Applications**
- **Camera Setup**: Ensure good lighting and clear view of your face
- **Browser Compatibility**: Use modern browsers (Chrome, Firefox, Edge recommended)
- **Stable Position**: Keep your head reasonably centered in the camera view

### **Basic Face Tracking**
- **Calibration**: Stay still and look straight ahead during the 30-sample calibration
- **Natural Expressions**: Make clear, deliberate facial expressions for best detection
- **Mouth Control**: Open your mouth gradually for smooth cube scaling

### **Advanced Movement Control**
- Keep movements smooth and deliberate
- Small movements = precise control, large movements = accelerated motion
- The acceleration curves make small adjustments easy and large movements responsive

### **Expression Detection**
- Keep your head within ~3° of the calibration pose for reliable expression detection
- Expressions work best when looking straight ahead
- Blink normally - the improved detection catches most natural blinks

### **Camera Control**
- Use camera-relative mode for intuitive navigation
- Switch to world space mode for precise positioning tasks
- Adjust sensitivity sliders to match your movement style

## Technical Features

- **Real-time face mesh detection** with 468 facial landmarks
- **Dual application architecture** for different use cases and skill levels
- **Automatic calibration systems** for both basic and advanced applications
- **Non-linear acceleration curves** for natural movement feel (advanced app)
- **Head pose constraints** for reliable expression detection (advanced app)
- **Intelligent filtering** to reduce noise and false triggers
- **Dual coordinate systems** for different control preferences (advanced app)
- **Visual feedback systems** for enhanced user experience
- **Smooth animation systems** and blink circle effects

## Customization

### **Basic Face Tracking** (`sketch.js`)
Modify variables like `BLINK_THRESHOLD`, `CALIBRATION_SAMPLES`, and facial landmark indices to customize detection sensitivity and behavior.

### **Advanced Movement Control** (`sketch-movement.js`)
You can modify colors, thresholds, acceleration curves, and behaviors by editing the variables listed above. The application is designed to be easily customizable for different users and use cases.

## File Structure

```
TensorflowFaceModel/
├── index.html              # Basic face tracking application
├── sketch.js               # Basic face tracking logic
├── movement.html           # Advanced movement control application  
├── sketch-movement.js      # Advanced movement control logic
└── README.md              # This documentation
```

---

**Enjoy controlling your 3D world with just your face!**