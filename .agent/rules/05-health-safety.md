# Rule 05: Fitness Health, Safety & Medical Standards

## 1. Non-Medical Disclaimer & Platform Boundary
- LookFit is an automated software application for posture awareness, mobility, and bodyweight fitness. It is **not** a licensed medical provider, physical therapist, or clinical diagnostic tool.
- The application must never claim to diagnose, treat, prevent, or cure any medical condition, spinal pathology, disc herniation, or musculoskeletal injury.
- Prominently display the medical disclaimer during onboarding and in settings:
  > *"LookFit provides general exercise, mobility, and posture routines and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a physician or physical therapist before starting any new fitness program, especially if you have chronic pain or pre-existing conditions."*
- **Pre-existing Spinal & Neck Conditions**: Users with diagnosed cervical or lumbar pathologies, disc injuries, or chronic pain must be explicitly directed to consult a qualified healthcare professional before performing spinal mobility or flexion/extension movements.

## 2. Absolute Prohibition on Height & Growth Claims
- **Strict Prohibition**: Never state, imply, or suggest that any exercise, stretch, decompression posture, or movement routine can increase adult bone height or reopen closed growth plates.
- **No Guaranteed Height Restoration**: Do not promise "1–2 cm of height restoration".
- **Scientifically Accurate Posture Description**:
  - Explain that posture awareness and spinal decompression exercises may help an individual stand more upright and reduce postural slouching.
  - Clearly state that measured standing height changes are highly variable, individual, and not guaranteed.
  - Permitted descriptions: *"improves upright postural alignment"*, *"decompresses the spine to relieve stiffness"*, *"strengthens postural muscles of the upper back"*, *"enhances standing posture"*.
  - Prohibited descriptions: *"grow taller"*, *"gain 1–2 cm height"*, *"reopen growth plates"*, *"height increase workout"*.

## 3. Sharp Pain vs. Stretching Tension Rules
- Exercise instructions and player screens must clearly distinguish between muscle tension and pain:
  - **Mild stretching tension** in muscle bellies is acceptable and expected during mobility work.
  - **Sharp pain, joint pinching, nerve tingling, or numbness** is never acceptable.
- Instruct users clearly: *"Stop immediately if you experience sharp pain, pinching, dizziness, or numbness."*

## 4. Inversion and Hanging Restrictions
- **Non-Default Restriction**: Hanging from pull-up bars and inversion table exercises must **never** be included in default morning or evening routines.
- If hanging or inversion movements are ever supported in advanced catalog filters, they must:
  - Remain strictly optional.
  - Carry prominent cautionary warnings regarding shoulder impingement and cardiovascular contraindications.
  - Be trivial for users to disable or exclude.

## 5. Conservative Progression & Overload Boundaries
- Progression is allowed only when a user consistently completes prescriptions with good form and without discomfort over multiple consecutive sessions.
- **Single Variable Adjustments**: Adjust only one parameter at a time (e.g. increase repetitions by 1, or duration by 5 seconds). Never simultaneously increase sets, repetitions, and difficulty.
- **No Extreme Regimens**: Do not prescribe aggressive caloric deficits, extreme exhaustion protocols, or maximal-effort failure tests.
- **Discomfort & Pain Handling**: If a user reports pain, joint discomfort, or excessive strain, progression must halt immediately, and the exercise must be flagged for review or regression.

## 6. Limitation Adherence & Substitution Rules
- Saved user limitations (e.g. knee pain, shoulder impingement, wrist discomfort) must be strictly respected by the planner.
- Contradicted movement categories or target areas must be completely excluded from generation.
- **Never Silently Substitute**: If the planner cannot assemble a safe, complete session within the user's constraints, it must return a typed error (`NO_SAFE_PLAN`) explaining why, rather than silently substituting a contraindicated exercise.
- Every exercise in the catalog and workout player must include explicit instructions, beginner modifications, and dedicated safety notes.
