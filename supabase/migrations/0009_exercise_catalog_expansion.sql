-- =========================================================
-- Migration 0009: Exercise Catalog Expansion & Routine Tag Corrections
-- =========================================================
-- Purpose: Support LookFit's Lean Physique, Defined Abs, Functional Strength,
-- Posture, and Spinal Mobility training goals with:
-- 1. Routine tag corrections: allow core & postural stability in both morning & evening.
-- 2. New equipment-free core/abs exercises (Hollow Body Hold, Bicycle Crunch, Lying Leg Raise).
-- 3. New equipment-free upper-back/postural exercises (Prone Y Raise, Doorframe Isometric Row).

-- 1. Update routine_tags on key core exercises to allow morning & evening scheduling
update public.exercises
set routine_tags = array['both']::text[]
where slug in ('forearm-plank', 'dead-bug', 'side-plank');

-- 2. Insert new equipment-free exercises with idempotent conflict resolution
insert into public.exercises (
  slug, name, description, category, target_areas, goal_tags, routine_tags,
  difficulty, equipment, instructions, safety_notes,
  default_sets, default_reps, default_duration_seconds, default_rest_seconds
)
values
(
  'hollow-body-hold',
  'Hollow Body Hold',
  'Isometric core hold building deep abdominal compression and pelvic stability.',
  'core',
  array['abdominals', 'core', 'hip_flexors'],
  array['strength', 'posture'],
  array['both']::text[],
  'intermediate',
  array[]::text[],
  array[
    'Lie supine on your back with legs straight and arms extended overhead by ears.',
    'Press lumbar spine firmly into the mat, eliminating any gap between lower back and floor.',
    'Simultaneously lift shoulder blades and straight legs 2 to 4 inches off the floor.',
    'Hold the hollow body position while breathing steadily for 20 to 30 seconds.'
  ],
  'Stop immediately if lower back arches off the mat. Beginners: bend knees to 90 degrees or tuck arms by hips to shorten the lever arm.',
  3, null, 25, 30
),
(
  'bicycle-crunch',
  'Bicycle Crunch',
  'Dynamic rotational abdominal movement targeting rectus abdominis and internal/external obliques.',
  'core',
  array['abdominals', 'obliques', 'core'],
  array['strength', 'general_fitness'],
  array['both']::text[],
  'intermediate',
  array[]::text[],
  array[
    'Lie on your back with fingertips lightly supporting head and knees bent at 90 degrees.',
    'Elevate shoulder blades slightly off the mat without pulling on the neck.',
    'Extend right leg straight while rotating torso to bring right elbow toward left knee.',
    'Switch sides smoothly in a controlled pedal motion for 12 reps per side.'
  ],
  'Do not pull or yank on the neck with hands. Initiate rotation through the ribcage and obliques. Stop if sharp spinal or neck discomfort occurs.',
  3, 12, null, 30
),
(
  'lying-leg-raises',
  'Lying Leg Raise',
  'Controlled lower abdominal and hip flexor strengthening with strict pelvic floor bracing.',
  'core',
  array['abdominals', 'hip_flexors', 'core'],
  array['strength', 'posture'],
  array['both']::text[],
  'intermediate',
  array[]::text[],
  array[
    'Lie supine with arms flat at sides and palms pressing lightly into the mat.',
    'Press lower back firmly into the floor and brace core.',
    'With legs together and straight, raise them smoothly until hips reach roughly 90 degrees.',
    'Lower legs slowly under control, stopping just before lower back loses contact with floor. Complete 10 reps.'
  ],
  'Do not let the lumbar spine arch away from the floor during lowering. Beginners: bend knees to perform reverse crunches instead. Stop for lower-back strain.',
  3, 10, null, 30
),
(
  'prone-y-raise',
  'Prone Y Raise',
  'Target the lower trapezius and mid-back stabilizers to counterbalance forward-slumped posture.',
  'pull',
  array['upper_back', 'shoulders', 'spine'],
  array['strength', 'posture'],
  array['both']::text[],
  'beginner',
  array[]::text[],
  array[
    'Lie face down with forehead resting on a small folded towel and arms extended in a 30-degree Y overhead with thumbs pointing up.',
    'Draw shoulder blades gently down and back away from ears.',
    'Lift arms 2 to 3 inches off the mat by engaging the lower trapezius.',
    'Hold for 2 seconds at the top, then lower smoothly with control. Complete 10 reps.'
  ],
  'Keep neck relaxed and forehead grounded; do not arch lumbar spine to lift arms. Stop if shoulder pinching occurs.',
  2, 10, null, 30
),
(
  'doorframe-isometric-row',
  'Doorframe Isometric Row',
  'Isometric upper-back and rhomboid activation using doorway resistance for upright posture.',
  'pull',
  array['upper_back', 'rhomboids', 'biceps', 'shoulders'],
  array['strength', 'posture'],
  array['both']::text[],
  'beginner',
  array[]::text[],
  array[
    'Stand facing a sturdy doorframe with feet shoulder-width apart.',
    'Grip both sides of the doorframe firmly with hands at chest height.',
    'Lean back slightly with straight spine and pull chest smoothly toward frame, maintaining a strong isometric contraction for 20 seconds.',
    'Breathe steadily while squeezing shoulder blades together.'
  ],
  'Ensure a secure grip and stable stance. Do not jerk back. Stop if sharp wrist, elbow, or shoulder discomfort occurs.',
  3, null, 20, 30
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  target_areas = excluded.target_areas,
  goal_tags = excluded.goal_tags,
  routine_tags = excluded.routine_tags,
  difficulty = excluded.difficulty,
  equipment = excluded.equipment,
  instructions = excluded.instructions,
  safety_notes = excluded.safety_notes,
  default_sets = excluded.default_sets,
  default_reps = excluded.default_reps,
  default_duration_seconds = excluded.default_duration_seconds,
  default_rest_seconds = excluded.default_rest_seconds;
