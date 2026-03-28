Research Proposal: Multimodal Head-Movement and Mouse-Based Camera Control for 3D Structure Reconstruction
1. Elevator Pitch
What? I want to study the effectiveness and learnability of a multimodal interaction system that combines real-time head movements for camera navigation with traditional mouse input for 3D object manipulation, through a structure reconstruction task where participants recreate a multi-block 3D arrangement shown in two reference photos by placing colored blocks at the correct positions in the scene.
Why? Because 3D designers often experience frustration when trying to find optimal viewing angles while simultaneously arranging objects, and I want to determine if head-based camera control is more intuitive and efficient than the traditional modal mouse setup.
So What? This study aims to optimize the 3D working pipeline for designers, improve ergonomic health by reducing strain from repetitive mouse movements, and provide new avenues for assistive technology and creative gaming.
2. Introduction and Motivation
Manipulating rigid objects within a 3D environment is a fundamental yet complex task in human-computer interaction, requiring the simultaneous control of six degrees of freedom (DOFs): three for translation and three for rotation. Traditional 3D pipelines in software like Unity or Blender often provide a sequential workflow, where the users must toggle between manipulation and viewpoint adjustment. While simultaneous control is technically possible, it often requires clutching, modifier keys, or mode switching. Previous research indicates that while the mouse remains a highly reliable and efficient baseline for precise 3D positioning in seated environments, it is limited by its 2D nature, which often prevents simultaneous translation along all three axes without specific mapping constraints.
The primary motivation for this project is to address the ergonomic and efficiency gap created by this "monolithic" control paradigm. Repetitive object manipulation using only manual inputs can lead to significant arm and wrist fatigue. By contrast, incorporating head movement offers a low-intensity, intuitive modality that maps directly to everyday human behaviors like nodding or turning to observe one's surroundings. Research by Oh, Park, and Park (2019) suggests that utilizing multimodal input—combining touch or mouse interaction with head movements—causes less physical fatigue than relying on a single modality. Furthermore, Liu et al. (2024) demonstrated that head-based manipulation methods can significantly improve usability and reduce task load by providing a "Head Manipulation Space" (HMS) that allows for natural observation without requiring the hands to leave the primary input device.
Beyond professional design efficiency, this research is motivated by accessibility and health concerns. Many individuals with limited mobility or motor impairments cannot effectively use traditional mode-based mouse interaction, making hands-free camera control a vital avenue for assistive technology. For users with conditions like cerebral palsy or ALS, systems like the Camera Mouse (Betke et al., 2002) have already proven that facial feature tracking can provide effective computer access. Research into "camera mice" has shown that 3D head poses can be mapped to screen coordinates or cursor movement in various ways, such as direct, joystick, or differential modes, with the joystick mode being particularly effective for navigation because it aligns with a user's habits . Tu, Tao, and Huang (2007) demonstrated that rigid head motions (rotation and translation) can robustly navigate a cursor in 2D environments, providing a viable hands-free alternative for individuals with disabilities .Additionally, for the general population of researchers and designers who spend long hours at workstations, using head movements to control the camera may help alleviate chronic neck pain by encouraging more dynamic posture compared to a static seated position.
Furthermore, Hashemian et al. (2020) introduced the "HeadJoystick," an interface where the user’s head acts as a controller handle to guide virtual movement . Their findings suggest that leaning-based or head-based interfaces can significantly reduce cognitive load and mitigate visually induced motion sickness (VIMS) compared to standard handheld controllers because they provide vestibular cues that are better aligned with visual motion. Since HeadJoystick demonstrated reduced VIMS in VR, it is worth testing whether similar embodied benefits transfer to desktop 3D environments. By applying these "embodied" interaction principles to the specific professional task of 3D scene arrangement, this research seeks to determine if "leaning into" a scene via head-based camera control can outperform traditional mode-based mouse interaction modifiers in both designer performance and subjective comfort.
Finally, the democratization of browser-based computer vision through frameworks like MediaPipe enables real-time, high-fidelity tracking (30–60 FPS) using only a standard webcam, removing the need for expensive, specialized hardware. This study seeks to leverage these technical advancements to determine if a hybrid paradigm—using the head for viewpoint control and the mouse for manipulation—can outperform the traditional mode-based mouse interaction setup in both efficiency and ease of learning.
3. Research Questions
RQ1: Does using head movement for camera control lead to significant differences in task efficiency (completion time) and accuracy (structure reconstruction error) compared to traditional mode-based mouse camera control during 3D structure reconstruction tasks?
RQ2: Does head-based camera control lead to faster learning and greater perceived ease of use for novice users compared to traditional mode-based mouse camera control in 3D environments?
4. Hypotheses
H1 (Main Effect of Control Method): Participants will complete 3D structure reconstruction tasks faster and more accurately when using head movement for camera control compared to mode-based mouse camera control, because head-based camera adjustment allows the viewpoint to be freely inspected simultaneously with mouse-based block placement, reducing the need for mode switching.
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
The experimental setup will include a standard PC running a custom browser-based 3D environment.

Both conditions share the following fixed camera constraints to ensure fairness:
- Camera distance is fixed (zoom disabled). Scroll-wheel input is ignored in both conditions.
- Pan is disabled in both conditions. The camera look-at target is fixed at the scene center for the entire trial.
- Camera orbit is constrained to the same angular bounds in both conditions: azimuth ±180° (full yaw), elevation 0°–90°.
- Block movement uses identical raycasting drag in both conditions: left mouse drag translates a block along the Y=0 ground plane.

Control Condition (Mouse-only): Right mouse drag → orbit camera (within the shared angular bounds above); Left mouse drag → move selected block along the ground plane.
Experimental Condition (Head+Mouse): Head yaw → orbit camera horizontally; Head pitch → orbit camera vertically (within shared bounds); Left mouse drag → move selected block along the ground plane (identical to control condition). Clicking a block selects it for movement.
Software: The system uses the MediaPipe Face Mesh model to calculate Euler angles (yaw, pitch, roll) from facial landmarks streamed in real time at 30–60 FPS via standard webcam.

Reference Stimuli: Each trial presents two reference photos of the target structure — a fixed front view (azimuth 0°, elevation 24°) and a side view (azimuth ±90°, randomly assigned left or right per trial, elevation 24°). The structure consists of five colored blocks with individually fixed heights (0.6, 0.8, 1.1, 1.45, and 1.9 units) placed on a 1.1-unit grid. Block color and height assignments are randomized independently for each trial, as is the specific layout template and its rotation. The front reference is generated subject to a constraint that at least one block must be completely occluded (fully hidden behind a taller block) from the front viewpoint, ensuring the side view provides necessary additional spatial information. The scene is always uncluttered to isolate structure reconstruction difficulty from visual search demands. All ground-truth block positions are stored in session state to compute reconstruction error at submission time.
6.3 Experimental Design
The study will use a 2 × 2 mixed-design factorial experiment:
Independent Variables (IVs):
- Control Method (within-subjects): Head-Movement + Mouse vs. Mode-Based Mouse Interaction.
- Experience Level (between-subjects): Novice (<10 hours in 3D software) vs. Experienced (>50 hours).
Dependent Variables (DVs):
- Task Completion Time (seconds): Measured from trial start to submission for completed trials. Timed-out trials are assigned the maximum of 90 seconds.
- Trial Completion Rate: Proportion of trials in which the participant successfully placed all five blocks within the time limit. Since blocks snap to a fixed grid, placement is binary — a block is either on its correct cell or not. Completion rate therefore captures accuracy for trials where the time limit was a binding constraint.
- Blocks Correctly Placed at Timeout (Secondary): For timed-out trials only, the number of blocks (0–5) on their correct grid cell at the moment of timeout. This provides a finer accuracy signal for incomplete trials.
- Number of Block Repositions: Total number of times each block was moved (picked up and re-placed) before final submission, summed across all five blocks. Higher repositions may indicate spatial uncertainty about the structure; head-based camera control is hypothesized to reduce this by making multi-angle inspection easier.
- Perceived Workload (Interval): Measured using the NASA-TLX questionnaire across six dimensions: mental, physical, temporal, performance, effort, and frustration.
Experimental Structure:
- Trials per Condition: 12 trials per control method (24 total trials per participant).
- Trial Duration: Maximum 90 seconds per trial; trials completing the full structure before the timer automatically submit. Timed-out trials are marked as incomplete. For completion time analysis, timed-out trials are assigned 90 seconds. For accuracy analysis, timed-out trials use the participant's block placement state at the moment of timeout.
- Session Duration: Approximately 45–50 minutes total (including calibration, training, tasks, breaks, and questionnaires).
- Breaks: 2-minute mandatory break between conditions; optional 30-second breaks every 4 trials.
Counterbalancing and Randomization:
- Condition order will be counterbalanced: half of participants in each experience group will complete Head+Mouse first, while the other half will complete Mode-Based Mouse first (AB/BA design).
- Within each condition, trial order will be randomized for each participant.
- Reference structure configurations (template shape, rotation, block height and color assignments, side-view direction) are independently randomized per trial for each participant. The same configuration is presented in both control conditions for a given trial index to ensure comparable difficulty.
Outlier and Data Exclusion Criteria:
- In the Head+Mouse condition, trials with tracking loss exceeding 3 consecutive seconds will be flagged and excluded from accuracy analyses (but included in completion time analyses as failures).
- Completion times beyond 3 standard deviations from the participant's mean will be winsorized to the 3 SD boundary.
- Participants with >25% excluded trials in any condition will be replaced.
6.4 Procedure
1. Introduction (5 min): Participants receive an overview of the study and sign the informed consent form.
2. Pre-Study Questionnaire (3 min): 3D software experience (hours).
3. Calibration — Phase 1 (<1 min): A ~30-frame (~1 second) calibration period to establish a personalized "neutral" head baseline. Participants are instructed to look directly at the center of the screen in a comfortable, natural posture and remain still.
4. Calibration — Phase 2: Head Movement Range (<2 min): Participants move their head comfortably left/right and up/down to define their personal movement range. When the range feels comfortable and representative, they click "Lock Range." A 75% buffer is applied to the peak observed values so that users can reach the full camera orbit range without reproducing their absolute peak movement on every trial.
5. Training Phase (4 min per condition, 8 min total):
- 2 practice trials per control method with on-screen guidance and reference photos shown throughout.
- Training order matches experimental condition order.
6. Experimental Trials (5–10 min per condition, ~15–20 min total):
Task Instructions (read to participants): "You will see two reference photos of a 3D block structure — a front view and a side view. Your goal is to recreate that structure as accurately as possible by arranging the five colored blocks using the mouse. You can change your viewing angle to inspect the scene. When you are satisfied with your arrangement, press SPACE to submit. You have up to 90 seconds per trial. Work as quickly and accurately as you can."
- 12 trials per condition, randomized.
- 2-minute mandatory break between conditions.
7. Post-Condition Questionnaires (5 min per condition):
- NASA-TLX (workload)
- Custom usability questionnaire (7-point Likert scale) on comfort, intuitiveness, and preference.
8. Debrief (5 min): Semi-structured interview about preferences, difficulties, and suggestions.
6.5 Data Analysis
Normality and Transformation:
We will use the Shapiro-Wilk test to assess data normality for each DV. If normality is violated, we will apply an Aligned Rank Transform (ART) before conducting parametric analyses (Wobbrock et al., 2011).
Primary Analysis (H1 - Efficiency and Accuracy):
A 2 × 2 mixed-design ANOVA will be conducted for each DV (task completion time, trial completion rate, number of block repositions) with:
- Control Method (within-subjects): Head+Mouse vs. Mode-Based Mouse
- Experience Level (between-subjects): Novice vs. Experienced
Trial completion rate (a proportion) will be analyzed using a generalized linear mixed model (GLMM) with a binomial link if the distribution is heavily skewed. We will examine main effects of each factor and the Control Method × Experience Level interaction. Post-hoc pairwise comparisons will use Bonferroni correction (α = .05).
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
The project is highly feasible within the semester timeline. A working browser-based prototype of the structure reconstruction experiment has been developed, featuring real-time MediaPipe face tracking, dual reference photo rendering with guaranteed occlusion, a two-phase head calibration flow, and automated structure-match detection. Access to webcams and standard computing labs is readily available.
8. Ethical Concerns
Prior to the experiment, participants will receive an informed consent form describing the study’s purpose (evaluating different camera control techniques in a 3D environment), the tasks they will perform, and the approximate duration of the session. Participants will be informed that the study will collect performance data such as task completion time, placement accuracy, and responses to usability questionnaires.
Participation will be voluntary, and participants may withdraw at any time without penalty. No personally identifiable information will be stored with the collected data, and all results will be reported in aggregate form. Participants will provide written or digital consent before the experiment begins.
Potential concerns include motion sickness or "simulator sickness" from camera movement tied to head motion.
9. Personal Motivation
I am personally interested in this topic because I find the traditional 3D design pipeline taxing and slow. I want to explore how we can make creative tools more "human-centric" by leveraging natural body motions that are already part of our daily communication and observation habits.
10. Limitations
This study has several limitations that should be acknowledged:
- Statistical Power: With 16 participants (8 per group), we have adequate power for the primary within-subjects effect (Control Method), but limited power to detect the between-subjects interaction (Control Method × Experience Level). Null results for H2 should be interpreted cautiously.
- Generalizability: Participants are university students, which may not fully represent professional 3D designers. Additionally, the controlled laboratory task (structure reconstruction with fixed block heights and a bounded ground plane) simplifies real-world 3D design workflows.
- Head Tracking Constraints: MediaPipe face tracking may fail with extreme head rotations (>60°), occlusion (e.g., hands covering face), or poor lighting conditions, potentially introducing exclusions specific to the Head+Mouse condition.
- Learning Effects: Despite counterbalancing, skills learned in the first condition may partially transfer to the second, potentially attenuating differences between conditions.
- Ecological Validity: The 90-second trial limit and discrete block placement tasks differ from the continuous, open-ended nature of professional 3D work.
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


