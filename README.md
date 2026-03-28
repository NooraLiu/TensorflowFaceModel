Research Proposal: Multimodal Head-Movement and Mouse-Based Camera Control for 3D Scene Arrangement
1. Elevator Pitch
What? I want to study the effectiveness and learnability of a multimodal interaction system that combines real-time head movements for camera navigation with traditional mouse input for 3D object manipulation, through a photo replication task where participants match a reference image by adjusting both the camera viewpoint and the object's position in a 3D scene.
Why? Because 3D designers often experience frustration when trying to find optimal viewing angles while simultaneously arranging objects, and I want to determine if head-based camera control is more intuitive and efficient than the traditional modal mouse setup.
So What? This study aims to optimize the 3D working pipeline for designers, improve ergonomic health by reducing strain from repetitive mouse movements, and provide new avenues for assistive technology and creative gaming.
2. Introduction and Motivation
Manipulating rigid objects within a 3D environment is a fundamental yet complex task in human-computer interaction, requiring the simultaneous control of six degrees of freedom (DOFs): three for translation and three for rotation. Traditional 3D pipelines in software like Unity or Blender often provide a sequential workflow, where the users must toggle between manipulation and viewpoint adjustment. While simultaneous control is technically possible, it often requires clutching, modifier keys, or mode switching. Previous research indicates that while the mouse remains a highly reliable and efficient baseline for precise 3D positioning in seated environments, it is limited by its 2D nature, which often prevents simultaneous translation along all three axes without specific mapping constraints.
The primary motivation for this project is to address the ergonomic and efficiency gap created by this "monolithic" control paradigm. Repetitive object manipulation using only manual inputs can lead to significant arm and wrist fatigue. By contrast, incorporating head movement offers a low-intensity, intuitive modality that maps directly to everyday human behaviors like nodding or turning to observe one's surroundings. Research by Oh, Park, and Park (2019) suggests that utilizing multimodal input—combining touch or mouse interaction with head movements—causes less physical fatigue than relying on a single modality. Furthermore, Liu et al. (2024) demonstrated that head-based manipulation methods can significantly improve usability and reduce task load by providing a "Head Manipulation Space" (HMS) that allows for natural observation without requiring the hands to leave the primary input device.
Beyond professional design efficiency, this research is motivated by accessibility and health concerns. Many individuals with limited mobility or motor impairments cannot effectively use traditional mode-based mouse interaction, making hands-free camera control a vital avenue for assistive technology. For users with conditions like cerebral palsy or ALS, systems like the Camera Mouse (Betke et al., 2002) have already proven that facial feature tracking can provide effective computer access. Research into "camera mice" has shown that 3D head poses can be mapped to screen coordinates or cursor movement in various ways, such as direct, joystick, or differential modes, with the joystick mode being particularly effective for navigation because it aligns with a user's habits . Tu, Tao, and Huang (2007) demonstrated that rigid head motions (rotation and translation) can robustly navigate a cursor in 2D environments, providing a viable hands-free alternative for individuals with disabilities .Additionally, for the general population of researchers and designers who spend long hours at workstations, using head movements to control the camera may help alleviate chronic neck pain by encouraging more dynamic posture compared to a static seated position.
Furthermore, Hashemian et al. (2020) introduced the "HeadJoystick," an interface where the user’s head acts as a controller handle to guide virtual movement . Their findings suggest that leaning-based or head-based interfaces can significantly reduce cognitive load and mitigate visually induced motion sickness (VIMS) compared to standard handheld controllers because they provide vestibular cues that are better aligned with visual motion. Since HeadJoystick demonstrated reduced VIMS in VR, it is worth testing whether similar embodied benefits transfer to desktop 3D environments. By applying these "embodied" interaction principles to the specific professional task of 3D scene arrangement, this research seeks to determine if "leaning into" a scene via head-based camera control can outperform traditional mode-based mouse interaction modifiers in both designer performance and subjective comfort.
Finally, the democratization of browser-based computer vision through frameworks like MediaPipe enables real-time, high-fidelity tracking (30–60 FPS) using only a standard webcam, removing the need for expensive, specialized hardware. This study seeks to leverage these technical advancements to determine if a hybrid paradigm—using the head for viewpoint control and the mouse for manipulation—can outperform the traditional mode-based mouse interaction setup in both efficiency and ease of learning.
3. Research Questions
RQ1: Does using head movement for camera control lead to significant differences in task efficiency (completion time) and accuracy (object position error, camera pose error) compared to traditional mode-based mouse camera control during 3D photo replication tasks?
RQ2: Does head-based camera control lead to faster learning and greater perceived ease of use for novice users compared to traditional mode-based mouse camera control in 3D environments?
4. Hypotheses
H1 (Main Effect of Control Method): Participants will complete 3D photo replication tasks faster and more accurately when using head movement for camera control compared to mode-based mouse camera control, because head-based camera adjustment allows the viewpoint to be tuned simultaneously with mouse-based object placement, reducing the need for mode switching.
H2 (Interaction Effect - Learnability): Novice users will show a greater performance improvement with head-based camera control compared to experienced users, as indicated by a significant Control Method × Experience Level interaction. Specifically, the performance gap between novices and experienced users will be smaller in the Head+Mouse condition than in the Mode-Based Mouse condition.
H3 (Learning Curve): Participants will exhibit a steeper learning curve (faster improvement across trials) when using head-based camera control compared to mode-based mouse camera control, as indicated by a significant Control Method × Trial Number interaction in the mixed-effects model.
H4 (Perceived Workload): Participants will report lower perceived workload (NASA-TLX) and higher ease of use ratings when using head-based camera control compared to mode-based mouse camera control.
5. Expected Benefits and Contributions
This research will contribute to the field of Human-Computer Interaction (HCI) by providing empirical evidence for the effectiveness of multimodal head-based control in professional creative tools. The expected benefits include:
Ergonomic Insights: Understanding if head-based interaction reduces the physical load and "task fatigue" compared to static seated mouse use.
Accessibility: Demonstrating a practical framework for hands-free camera navigation for users with physical disabilities.
Workflow Optimization: Providing designers with a more fluid, intuitive metaphor for "leaning into" a scene to observe it from different angles.
6. Methods
6.1 Participants
We will recruit 16 participants from the university population, divided into two equal groups based on prior experience with 3D software (e.g., Unity, Blender):
- Novice Group (n=8): Participants with less than 10 hours of experience in 3D modeling software.
- Experienced Group (n=8): Participants with more than 50 hours of experience in 3D modeling software.
- Exclusion: Participants with 10–50 hours of experience will be excluded to ensure clear group separation.
This grouping will allow us to analyze how expertise influences the adoption of head-based control.
Sample Size Justification: Based on prior HCI studies comparing input modalities (e.g., Hashemian et al., 2020; Liu et al., 2024), we expect a large effect size (Cohen's d ≈ 0.8–1.0) for the main effect of control method. A power analysis using G*Power for a within-subjects ANOVA with α = .05, power = .80, and d = 0.8 indicates a minimum of 15 participants. With 16 participants (8 per group), we have adequate power for detecting the primary within-subjects effect, though power for the between-subjects interaction may be limited. This is acknowledged as a limitation.
6.2 Stimuli/Apparatus
The experimental setup will include a standard PC running a custom 3D environment.
Both conditions share the following fixed camera constraints to ensure fairness:
- Camera distance is fixed (zoom disabled). Scroll-wheel input is ignored in both conditions.
- Pan is disabled in both conditions. The camera look-at target is fixed at the scene center for the entire trial.
- Camera orbit is constrained to the same angular bounds in both conditions: azimuth full 360° (unrestricted yaw), elevation 0°–90°.
- Object movement uses identical raycasting drag in both conditions: left mouse drag translates the cube along the Y=0 ground plane.

Control Condition (Mouse-only): Right mouse drag → orbit camera (within the shared angular bounds above); Left mouse drag → move object along the ground plane.
Experimental Condition (Head+Mouse): Head yaw → orbit camera horizontally (full 360° yaw); Head pitch → orbit camera vertically (within 0°–90°); Left mouse drag → move object along the ground plane (identical to control condition).
Software: The system will use the Face Mesh model to calculate Euler angles (yaw, pitch, roll) from facial landmarks.
Reference Stimuli: Each trial displays a reference photo pre-rendered from a randomly sampled ground-truth configuration. Camera azimuth and elevation are sampled uniformly within the shared navigation bounds (azimuth: full 360° yaw, elevation: 0°–90°); camera distance is fixed at the same value used during the live trial. The object is placed at a random position on the ground plane within the scene bounds. All ground-truth parameters (camera azimuth, camera elevation, object position) are stored in client-side session state to enable error calculation at submission time. Reference photos are generated once per session and reused across both control conditions to ensure identical difficulty.
6.3 Experimental Design
The study will use a 2 × 2 mixed-design factorial experiment:
Independent Variables (IVs):
- Control Method (within-subjects): Head-Movement + Mouse vs. Mode-Based Mouse Interaction.
- Experience Level (between-subjects): Novice (<10 hours in 3D software) vs. Experienced (>50 hours).
Dependent Variables (DVs):
- Task Completion Time (seconds): Measured from trial start to SPACEBAR confirmation.
- Object Position Error (cm): Euclidean distance between the submitted object position and the ground-truth object position from the reference configuration, calculated as √((x₁−x₂)² + (y₁−y₂)² + (z₁−z₂)²) in world units (1 unit = 1 cm).
- Camera Pose Error (degrees): Angular difference between the submitted camera orientation and the ground-truth camera orientation used to generate the reference photo, calculated using quaternion distance: θ = 2 × arccos(|q₁ · q₂|), converted to degrees.
- Perceived Workload (Interval): Measured using the NASA-TLX questionnaire across six dimensions: mental, physical, temporal, performance, effort, and frustration.
Experimental Structure:
- Trials per Condition: 12 trials per control method (24 total trials per participant).
- Scene Types: 6 trials in empty scenes, 6 trials in cluttered scenes per condition (balanced but not analyzed as a primary IV).
- Trial Duration: Maximum 90 seconds per trial; trials exceeding this limit are marked as incomplete. For completion time analysis, timed-out trials are assigned 90 seconds. For accuracy analysis (object position error, camera pose error), timed-out trials use the participant's object and camera state at the moment of timeout.
- Session Duration: Approximately 45–50 minutes total (including calibration, training, tasks, breaks, and questionnaires).
- Breaks: 2-minute mandatory break between conditions; optional 30-second breaks every 4 trials.
Counterbalancing and Randomization:
- Condition order will be counterbalanced: half of participants in each experience group will complete Head+Mouse first, while the other half will complete Mode-Based Mouse first (AB/BA design).
- Within each condition, trial order (scene type and object type) will be randomized for each participant.
- Reference photos are generated from randomly sampled configurations within the valid scene bounds (see Section 6.2). A single set of 12 reference configurations is generated per scene type (12 clean, 12 cluttered); the same reference photos are presented in both control conditions to ensure comparable difficulty.
Scene Complexity (Controlled Variable):
Scene complexity (empty vs. cluttered) is balanced across trials to ensure ecological validity but is treated as a controlled variable rather than a primary independent variable. An exploratory secondary analysis may examine whether scene complexity moderates the effect of control method.
Outlier and Data Exclusion Criteria:
- In the Head+Mouse condition, trials with tracking loss exceeding 3 consecutive seconds will be flagged and excluded from accuracy analyses (but included in completion time analyses as failures).
- Completion times beyond 3 standard deviations from the participant's mean will be winsorized to the 3 SD boundary.
- Participants with >25% excluded trials in any condition will be replaced.
6.4 Procedure
1. Introduction (5 min): Participants receive an overview of the study and sign the informed consent form.
2. Pre-Study Questionnaire (3 min): 3D software experience (hours)
3. Calibration (<1 min): A 30-frame (~1 second) calibration period to establish a personalized "neutral" head baseline. Participants are instructed to look directly at the center of the screen in a comfortable posture.
4. Training Phase (4 min per condition, 8 min total):
- 2 practice trials per control method with on-screen guidance.
- Participants must successfully complete both practice trials before proceeding.
- Training order matches experimental condition order.
5. Experimental Trials (5–10 min per condition, ~15–20 min total):
Task Instructions (read to participants): "You will see a reference photo of a 3D scene shown at the top of the screen. Your goal is to replicate that photo as closely as possible by moving the object using the mouse and adjusting the camera angle using your input method. When you are satisfied with your match, press the SPACEBAR to capture your view and submit. You have up to 90 seconds per trial. Work as quickly and accurately as you can."
- 12 trials per condition (6 empty scenes, 6 cluttered scenes, randomized).
- 2-minute mandatory break between conditions.
6. Post-Condition Questionnaires (5 min per condition):
- NASA-TLX (workload)
- Custom usability questionnaire (7-point Likert scale) on comfort, intuitiveness, and preference.
7. Debrief (5 min): Semi-structured interview about preferences, difficulties, and suggestions.
6.5 Data Analysis
Normality and Transformation:
We will use the Shapiro-Wilk test to assess data normality for each DV. If normality is violated, we will apply an Aligned Rank Transform (ART) before conducting parametric analyses (Wobbrock et al., 2011).
Primary Analysis (H1 - Efficiency and Accuracy):
A 2 × 2 mixed-design ANOVA will be conducted for each DV (task completion time, object position error, camera pose error) with:
- Control Method (within-subjects): Head+Mouse vs. Mode-Based Mouse
- Experience Level (between-subjects): Novice vs. Experienced
We will examine main effects of each factor and the Control Method × Experience Level interaction. Post-hoc pairwise comparisons will use Bonferroni correction (α = .05).
Interaction Analysis (H2 - Experience × Control Method):
The Control Method × Experience Level interaction from the 2 × 2 mixed-design ANOVA will test H2. A significant interaction, followed by simple effects analysis, will reveal whether novices benefit disproportionately from head-based control compared to experienced users.
Learning Curve Analysis (H3):
To operationalize learnability, we will fit a linear mixed-effects model (LMM) predicting task completion time as a function of:
- Trial Number (1–12, continuous, within-condition)
- Control Method (categorical)
- Experience Level (categorical)
- Control Method × Trial Number interaction
- Experience Level × Trial Number interaction
- Three-way interaction (Control Method × Experience Level × Trial Number)
- Random intercepts and slopes for participants
The key coefficient of interest is the Control Method × Trial Number interaction, which quantifies the difference in learning rate (slope) between conditions. A significantly steeper negative slope for Head+Mouse would support H3.
Additionally, we will compare early-trial performance (Trials 1–3) vs. late-trial performance (Trials 10–12) using paired t-tests within each condition to assess performance improvement magnitude.
Subjective Measures (H4 - Perceived Workload and Ease of Use):
NASA-TLX subscales and overall workload will be analyzed using Wilcoxon signed-rank tests (within-subjects) and Mann-Whitney U tests (between-subjects) to test H4. The custom usability questionnaire (comfort, intuitiveness, preference) will be analyzed similarly to assess perceived ease of use as specified in RQ2. 
Effect Sizes:
We will report partial η² for ANOVA effects and Cohen's d for pairwise comparisons.
6.6 Critical Reflection
A strength of this approach is the use of MediaPipe, which provides robust, real-time tracking (30–60 FPS) without specialized hardware. However, a potential weakness is "occlusion handling"—tracking may fail if the user turns their head more than 60 degrees. Additionally, "head jitter" could impact precision compared to the stable spatial reference of a desk when using a mouse.
7. Feasibility
The project is highly feasible within the semester timeline. A working prototype of the Unity/MediaPipe interface has already been developed for the project pitch. Access to webcams and standard computing labs is readily available.
8. Ethical Concerns
Prior to the experiment, participants will receive an informed consent form describing the study’s purpose (evaluating different camera control techniques in a 3D environment), the tasks they will perform, and the approximate duration of the session. Participants will be informed that the study will collect performance data such as task completion time, placement accuracy, and responses to usability questionnaires.
Participation will be voluntary, and participants may withdraw at any time without penalty. No personally identifiable information will be stored with the collected data, and all results will be reported in aggregate form. Participants will provide written or digital consent before the experiment begins.
Potential concerns include motion sickness or "simulator sickness" from camera movement tied to head motion.
9. Personal Motivation
I am personally interested in this topic because I find the traditional 3D design pipeline taxing and slow. I want to explore how we can make creative tools more "human-centric" by leveraging natural body motions that are already part of our daily communication and observation habits.
10. Limitations
This study has several limitations that should be acknowledged:
- Statistical Power: With 16 participants (8 per group), we have adequate power for the primary within-subjects effect (Control Method), but limited power to detect the between-subjects interaction (Control Method × Experience Level). Null results for H2 should be interpreted cautiously.
- Generalizability: Participants are university students, which may not fully represent professional 3D designers. Additionally, the controlled laboratory task (photo replication with a bounded ground plane and fixed camera distance) simplifies real-world 3D design workflows.
- Head Tracking Constraints: MediaPipe face tracking may fail with extreme head rotations (>60°), occlusion (e.g., hands covering face), or poor lighting conditions, potentially introducing exclusions specific to the Head+Mouse condition.
- Learning Effects: Despite counterbalancing, skills learned in the first condition may partially transfer to the second, potentially attenuating differences between conditions.
- Ecological Validity: The 90-second trial limit and discrete placement tasks differ from the continuous, open-ended nature of professional 3D work.
11. References
Abbaszadegan, M., Yaghoubi, S., & MacKenzie, I. S. (2018). TrackMaze: A comparison of head-tracking, eye-tracking, and tilt as input methods for mobile games. In M. Kurosu (Ed.), Human-Computer Interaction (HCI 2018) (pp. 393–405). Springer.
Bazarevsky, V., Kartynnik, Y., Vakunov, A., Raveendran, K., & Grundmann, M. (2019). BlazeFace: Sub-millisecond neural face detection on mobile GPUs. arXiv preprint arXiv:1907.05047.
Betke, M., Gips, J., & Fleming, P. (2002). The Camera Mouse: Visual tracking of body features to provide computer access for people with severe disabilities. IEEE Transactions on Neural Systems and Rehabilitation Engineering, 10(1), 1-10.
Hashemian, A. M., Lotfaliei, M., Adhikari, A., Kruijff, E., & Riecke, B. E. (2020). HeadJoystick: Improving flying in VR using a novel leaning-based interface. IEEE Transactions on Visualization and Computer Graphics.
Kartynnik, Y., Ablavatski, A., Grishchenko, I., & Grundmann, M. (2019). Real-time facial surface geometry from monocular video on mobile GPUs. arXiv preprint arXiv:1907.06724.
Liu, X., Wang, L., Ke, W., & Im, S. K. (2024). Object manipulation based on the head manipulation space in VR. International Journal of Human-Computer Studies, 192, 103346.
Oh, J. Y., Park, J. H., & Park, J. M. (2019). Virtual object manipulation by combining touch and head interactions for mobile augmented reality. Applied Sciences, 9(14), 2933.
Sun, J., Stuerzlinger, W., & Riecke, B. E. (2018). Comparing input methods and cursors for 3D positioning with head-mounted displays. In SAP '18: Proceedings of the 15th ACM Symposium on Applied Perception (pp. 1-8). ACM.
Tu, J., Tao, H., & Huang, T. (2007). Face as mouse through visual face tracking. Computer Vision and Image Understanding, 108(1-2), 35-40.
Wobbrock, J. O., Findlater, L., Gergle, D., & Higgins, J. J. (2011). The aligned rank transform for nonparametric factorial analyses using only ANOVA procedures. In Proceedings of the SIGCHI Conference on Human Factors in Computing Systems (pp. 143–146). ACM.


