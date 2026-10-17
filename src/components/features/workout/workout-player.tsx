"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Award,
  Flame,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { completeWorkoutAction } from "@/server/actions/workouts";
import type { WorkoutSessionDetail } from "@/server/services/workout-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export interface WorkoutExerciseItem {
  id: string;
  name: string;
  category: string;
  position: number;
  prescribedSets: number;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  restSeconds: number;
  instructions: string[];
  safetyNotes: string;
  beginnerModification?: string;
}

export interface WorkoutSessionData {
  id: string;
  routineName: string;
  sessionType: "morning" | "evening";
  estimatedMinutes: number;
  exercises: WorkoutExerciseItem[];
}

const DEFAULT_MORNING_WORKOUT: WorkoutSessionData = {
  id: "morning-session",
  routineName: "Morning Activation Routine: Strength & Abs",
  sessionType: "morning",
  estimatedMinutes: 25,
  exercises: [
    {
      id: "ex-1",
      name: "Cat-Cow Stretch",
      category: "mobility",
      position: 1,
      prescribedSets: 1,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 20,
      instructions: [
        "Start on hands and knees with wrists under shoulders and knees under hips.",
        "Inhale: drop your belly, lift your chest, and look forward (Cow).",
        "Exhale: round your spine towards the ceiling and tuck your chin (Cat).",
        "Move fluidly with your breath across 10 controlled repetitions.",
      ],
      safetyNotes: "Move gently without forcing spinal range. Stop if sharp pinching occurs.",
      beginnerModification: "Perform seated in a sturdy chair with hands on knees if kneeling is uncomfortable.",
    },
    {
      id: "ex-2",
      name: "Wall Angels",
      category: "posture_spine",
      position: 2,
      prescribedSets: 2,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 30,
      instructions: [
        "Stand with head, upper back, and sacrum flat against the wall, feet slightly forward.",
        "Place arms against the wall in a W shape, elbows and wrists touching.",
        "Slowly glide arms upward into a Y shape while keeping contact with wall.",
        "Lower back to start with control. Repeat for 10 reps.",
      ],
      safetyNotes: "Do not excessively arch the lower back. Step feet further out if shoulders are tight.",
      beginnerModification: "Perform arms-only on a floor mat if wall contact is difficult.",
    },
    {
      id: "ex-3",
      name: "Bird-Dog",
      category: "core",
      position: 3,
      prescribedSets: 3,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 30,
      instructions: [
        "Begin on all fours with a neutral, flat spine.",
        "Simultaneously reach your right arm forward and left leg straight back.",
        "Hold for 2 seconds at full extension without rotating your pelvis.",
        "Return slowly to start and alternate sides for 10 reps per side.",
      ],
      safetyNotes: "Keep your lower back stable. Avoid sagging or arching the lumbar spine.",
      beginnerModification: "Extend only the leg first while keeping both hands firmly on the mat.",
    },
    {
      id: "ex-4",
      name: "Standard Push-Up",
      category: "push",
      position: 4,
      prescribedSets: 3,
      prescribedReps: 12,
      prescribedDurationSeconds: null,
      restSeconds: 45,
      instructions: [
        "Position hands slightly wider than shoulder-width, body aligned straight from head to heels.",
        "Lower chest under control until elbows bend to 45 degrees.",
        "Keep core braced and hips level without sagging.",
        "Press powerfully back to straight arms.",
      ],
      safetyNotes: "Do not let lower back sag. Stop if wrist or shoulder pain occurs.",
      beginnerModification: "Perform knee push-ups or place hands elevated on a bench or wall.",
    },
    {
      id: "ex-5",
      name: "Bodyweight Squat",
      category: "legs",
      position: 5,
      prescribedSets: 3,
      prescribedReps: 15,
      prescribedDurationSeconds: null,
      restSeconds: 45,
      instructions: [
        "Stand tall with feet shoulder-width apart and toes turned slightly out.",
        "Hinge hips back and bend knees, lowering thighs parallel to floor.",
        "Keep chest upright and knees tracking over middle toes.",
        "Drive through whole foot to return to standing tall with glute activation.",
      ],
      safetyNotes: "Do not let knees collapse inward. Keep heels firmly planted.",
      beginnerModification: "Squat down to a chair or bench until comfortable with full depth.",
    },
    {
      id: "ex-6",
      name: "Forearm Plank",
      category: "core",
      position: 6,
      prescribedSets: 3,
      prescribedReps: null,
      prescribedDurationSeconds: 35,
      restSeconds: 30,
      instructions: [
        "Place forearms on floor with elbows under shoulders.",
        "Extend legs back, forming a rigid straight line from head to heels.",
        "Engage abdominals and squeeze glutes lightly.",
        "Breathe steadily throughout the hold.",
      ],
      safetyNotes: "Stop before hips sag into the lower back. Lower knees for a modified plank.",
      beginnerModification: "Perform knee plank holding for 20 seconds.",
    },
    {
      id: "ex-7",
      name: "Prone W Raise",
      category: "pull",
      position: 7,
      prescribedSets: 2,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 30,
      instructions: [
        "Lie face down with elbows bent in a W shape beside shoulders.",
        "Gently lift hands and elbows 1 to 2 inches off floor by pinching shoulder blades down and together.",
        "Hold 2 seconds, lower slowly. Complete 10 reps.",
      ],
      safetyNotes: "Keep neck relaxed and forehead down; do not arch lower back.",
      beginnerModification: "Rest arms flat between each repetition.",
    },
    {
      id: "ex-8",
      name: "Diaphragmatic Deep Breathing",
      category: "posture_spine",
      position: 8,
      prescribedSets: 1,
      prescribedReps: null,
      prescribedDurationSeconds: 120,
      restSeconds: 0,
      instructions: [
        "Sit or lie comfortably with one hand on chest and one on belly.",
        "Inhale deeply through nose for 4 seconds, feeling belly expand.",
        "Exhale slowly through mouth for 6 seconds, releasing tension.",
      ],
      safetyNotes: "Breathe gently and rhythmically without hyperventilating.",
      beginnerModification: "Close eyes and focus on slow, regular diaphragmatic pacing.",
    },
  ],
};

const DEFAULT_EVENING_WORKOUT: WorkoutSessionData = {
  id: "evening-session",
  routineName: "Evening Mobility, Posture & Recovery Routine",
  sessionType: "evening",
  estimatedMinutes: 20,
  exercises: [
    {
      id: "ex-e1",
      name: "Child's Pose",
      category: "stretching",
      position: 1,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 60,
      restSeconds: 20,
      instructions: [
        "Kneel on the floor with big toes touching and knees wide apart.",
        "Sit hips back onto heels and extend arms forward on the floor.",
        "Rest forehead on mat and breathe deeply into your lower back.",
      ],
      safetyNotes: "If knees hurt, place a folded towel behind your knees.",
      beginnerModification: "Place a yoga block or pillow under your forehead for support.",
    },
    {
      id: "ex-e2",
      name: "Seated Spinal Twist",
      category: "mobility",
      position: 2,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 45,
      restSeconds: 20,
      instructions: [
        "Sit tall with legs extended or crossed.",
        "Place right hand behind hip and left hand on right knee.",
        "Inhale to lengthen spine; exhale to rotate gently through ribs.",
        "Hold, then switch sides.",
      ],
      safetyNotes: "Rotate from the mid-back, not by violently twisting the neck.",
      beginnerModification: "Sit on a cushion or folded blanket to relieve hip tightness.",
    },
    {
      id: "ex-e3",
      name: "Doorway Chest Stretch",
      category: "posture_spine",
      position: 3,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 40,
      restSeconds: 20,
      instructions: [
        "Stand in an open doorway with elbows bent at 90 degrees on doorframe.",
        "Step one foot forward until you feel a gentle opening across your chest.",
        "Hold tall posture and breathe slowly.",
      ],
      safetyNotes: "Never force past comfortable tension. Keep shoulders relaxed.",
      beginnerModification: "Stretch one arm at a time to reduce shoulder tension.",
    },
    {
      id: "ex-e4",
      name: "Hamstring Stretch",
      category: "stretching",
      position: 4,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 40,
      restSeconds: 20,
      instructions: [
        "Sit tall on the edge of a chair or floor with one leg extended straight, heel grounded.",
        "Hinge forward gently from the hips with a flat back until a mild stretch is felt.",
        "Breathe deeply for 40 seconds, then switch sides.",
      ],
      safetyNotes: "Do not round through the lumbar spine. Stop if sharp nerve tension occurs.",
      beginnerModification: "Keep a slight bend in the knee if hamstrings are very tight.",
    },
    {
      id: "ex-e5",
      name: "Glute Bridge Hold",
      category: "core",
      position: 5,
      prescribedSets: 2,
      prescribedReps: 12,
      prescribedDurationSeconds: null,
      restSeconds: 30,
      instructions: [
        "Lie on your back with knees bent and feet flat hip-width apart.",
        "Drive through heels to lift hips until thighs and torso align.",
        "Squeeze glutes and brace abdominals at the top for 2 seconds.",
        "Lower under control to start.",
      ],
      safetyNotes: "Avoid hyperextending your lumbar spine; lift using glutes and hamstrings.",
      beginnerModification: "Perform smaller pulses with a 1-second hold.",
    },
    {
      id: "ex-e6",
      name: "Sphinx Pose",
      category: "posture_spine",
      position: 6,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 45,
      restSeconds: 20,
      instructions: [
        "Lie on stomach with elbows under shoulders and forearms parallel.",
        "Gently press forearms into mat to broaden collarbones and lift upper chest.",
        "Keep glutes and lower back relaxed; breathe slowly.",
      ],
      safetyNotes: "Keep neck neutral; avoid tilting head too far back.",
      beginnerModification: "Slide elbows slightly forward if tension develops in lower back.",
    },
    {
      id: "ex-e7",
      name: "Diaphragmatic Deep Breathing",
      category: "posture_spine",
      position: 7,
      prescribedSets: 1,
      prescribedReps: null,
      prescribedDurationSeconds: 120,
      restSeconds: 0,
      instructions: [
        "Lie comfortably on back with eyes closed and hands resting on abdomen.",
        "Take slow, rhythmic breaths down into the diaphragm for 2 full minutes.",
      ],
      safetyNotes: "Breathe gently and settle into total muscular relaxation.",
      beginnerModification: "Place a small pillow under your head or knees.",
    },
  ],
};

export function WorkoutPlayer({
  sessionId,
  initialSession,
}: {
  sessionId: string;
  initialSession?: WorkoutSessionDetail | null;
}) {
  const router = useRouter();

  // Load authoritative session snapshots if provided; fallback to demo fixtures
  const session: WorkoutSessionData = React.useMemo(() => {
    if (initialSession) {
      const exercises: WorkoutExerciseItem[] = (
        initialSession.session_exercises || []
      ).map((se) => ({
        id: se.id,
        name: se.exercise_name_snapshot,
        category: se.category_snapshot,
        position: se.position,
        prescribedSets: se.prescribed_sets || 1,
        prescribedReps: se.prescribed_reps,
        prescribedDurationSeconds: se.prescribed_duration_seconds,
        restSeconds: se.rest_seconds,
        instructions: se.instructions_snapshot || [],
        safetyNotes:
          se.safety_notes_snapshot ||
          "Move gently without forcing spinal range. Stop if sharp pinching occurs.",
        beginnerModification:
          "Perform with reduced range of motion or support yourself with a sturdy surface.",
      }));

      return {
        id: initialSession.id,
        routineName: initialSession.routine_name_snapshot,
        sessionType: initialSession.session_type,
        estimatedMinutes:
          Math.round(
            exercises.reduce(
              (acc, e) =>
                acc + (e.prescribedDurationSeconds || 30) + e.restSeconds,
              0
            ) / 60
          ) || 20,
        exercises,
      };
    }

    if (sessionId === "evening-session") return DEFAULT_EVENING_WORKOUT;
    return DEFAULT_MORNING_WORKOUT;
  }, [sessionId, initialSession]);

  // State
  const [currentExerciseIndex, setCurrentExerciseIndex] = React.useState(0);
  const [currentSet, setCurrentSet] = React.useState(1);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isResting, setIsResting] = React.useState(false);
  const [timerSeconds, setTimerSeconds] = React.useState(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = React.useState(0);
  const [showModifications, setShowModifications] = React.useState(false);
  const [showExitDialog, setShowExitDialog] = React.useState(false);
  const [showCompleteModal, setShowCompleteModal] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [finishError, setFinishError] = React.useState<string | null>(null);

  const currentExercise = session.exercises[currentExerciseIndex];
  const isTimedHold = currentExercise.prescribedDurationSeconds !== null;
  const targetHoldSeconds = currentExercise.prescribedDurationSeconds || 30;

  // Initialize exercise timer when switching exercises or resting
  React.useEffect(() => {
    if (isResting) {
      setTimerSeconds(currentExercise.restSeconds);
    } else if (isTimedHold) {
      setTimerSeconds(targetHoldSeconds);
    } else {
      setTimerSeconds(0);
    }
  }, [currentExerciseIndex, currentSet, isResting, isTimedHold, currentExercise.restSeconds, targetHoldSeconds]);

  const handleSetComplete = React.useCallback(() => {
    if (currentSet < currentExercise.prescribedSets) {
      // Move to rest between sets
      setIsResting(true);
      setCurrentSet((prev) => prev + 1);
    } else {
      // Completed all sets of this exercise
      if (currentExerciseIndex < session.exercises.length - 1) {
        setIsResting(true);
        setCurrentExerciseIndex((prev) => prev + 1);
        setCurrentSet(1);
      } else {
        // Completed workout!
        setIsPlaying(false);
        setShowCompleteModal(true);
      }
    }
  }, [currentExerciseIndex, currentExercise.prescribedSets, currentSet, session.exercises.length]);

  // Main active timer tick
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && !showExitDialog && !showCompleteModal) {
      interval = setInterval(() => {
        setTotalElapsedSeconds((prev) => prev + 1);

        if (isResting) {
          setTimerSeconds((prev) => {
            if (prev <= 1) {
              // Rest finished, move to next set or exercise
              setIsResting(false);
              return isTimedHold ? targetHoldSeconds : 0;
            }
            return prev - 1;
          });
        } else if (isTimedHold) {
          setTimerSeconds((prev) => {
            if (prev <= 1) {
              handleSetComplete();
              return 0;
            }
            return prev - 1;
          });
        } else {
          // Rep-based stopwatch
          setTimerSeconds((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isResting, isTimedHold, showExitDialog, showCompleteModal, targetHoldSeconds, handleSetComplete]);

  const handleSkipRest = () => {
    setIsResting(false);
    setTimerSeconds(isTimedHold ? targetHoldSeconds : 0);
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < session.exercises.length - 1) {
      setIsResting(false);
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);
    } else {
      setIsPlaying(false);
      setShowCompleteModal(true);
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setIsResting(false);
      setCurrentExerciseIndex((prev) => prev - 1);
      setCurrentSet(1);
    }
  };

  const handleFinish = async () => {
    if (!initialSession) {
      router.push("/dashboard");
      return;
    }

    setIsFinishing(true);
    setFinishError(null);

    const payload = {
      session_id: initialSession.id,
      duration_seconds: totalElapsedSeconds,
      results: session.exercises.map((ex) => ({
        session_exercise_id: ex.id,
        completed: true,
        completed_sets: ex.prescribedSets,
        completed_reps: ex.prescribedReps ?? undefined,
        actual_duration_seconds: ex.prescribedDurationSeconds ?? undefined,
      })),
    };

    const res = await completeWorkoutAction(payload);
    if (!res.success) {
      setFinishError(res.error.message);
      setIsFinishing(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercentage = Math.round(
    ((currentExerciseIndex + (currentSet - 1) / currentExercise.prescribedSets) /
      session.exercises.length) *
      100
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Already Finalized Notice */}
      {initialSession?.status === "completed" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <strong className="block text-emerald-950 font-semibold">
                Workout Session Finalized
              </strong>
              <span>
                This session is completed and logged in your calendar history. Historical session snapshots are strictly immutable.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 font-medium"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-200/90 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-slate-500"
            onClick={() => setShowExitDialog(true)}
            aria-label="Quit workout session"
          >
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {session.routineName}
            </h1>
            <p className="text-xs text-slate-500">
              Exercise {currentExerciseIndex + 1} of {session.exercises.length} • {progressPercentage}% Complete
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{formatTime(totalElapsedSeconds)}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-slate-500"
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-label={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(5, progressPercentage)}%` }}
        />
      </div>

      {/* Rest State Banner */}
      {isResting && (
        <Card className="border-emerald-300 bg-emerald-50/70 shadow-sm animate-pulse">
          <CardContent className="p-6 text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <Clock className="h-3.5 w-3.5" />
              Rest Interval
            </span>
            <div className="text-4xl font-black text-emerald-950 font-mono">
              00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
            </div>
            <p className="text-xs text-emerald-800">
              Catch your breath and prepare for Set {currentSet} of {currentExercise.name}.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-xs border-emerald-400 text-emerald-900 hover:bg-emerald-100 h-9"
                onClick={handleSkipRest}
              >
                <SkipForward className="h-3.5 w-3.5" />
                <span>Skip Rest Interval</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Active Exercise Card */}
      {!isResting && (
        <Card className="border-slate-200/90 shadow-md bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    {currentExercise.category.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-400">
                    Set {currentSet} of {currentExercise.prescribedSets}
                  </span>
                </div>
                <CardTitle className="text-2xl font-black text-slate-900">
                  {currentExercise.name}
                </CardTitle>
              </div>

              {/* Prescribed Target Badge */}
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Target:</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {isTimedHold
                    ? `${currentExercise.prescribedDurationSeconds}s Hold`
                    : currentExercise.prescribedReps != null
                    ? `${currentExercise.prescribedReps} Reps`
                    : "Active Set"}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Interactive Timer / Rep Area */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 p-8 text-center">
              <div className="text-5xl font-black text-slate-900 tracking-tight font-mono mb-2">
                {formatTime(timerSeconds)}
              </div>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-5">
                {isTimedHold ? "Hold Countdown" : "Active Set Elapsed"}
              </span>

              {/* Player Controls */}
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className={`min-w-[140px] gap-2 h-12 text-sm font-bold shadow-sm ${
                    isPlaying
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                  onClick={() => setIsPlaying((prev) => !prev)}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>{timerSeconds === 0 ? "Start" : "Resume"}</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2 text-xs font-semibold text-slate-700"
                  onClick={handleSetComplete}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Complete Set</span>
                </Button>
              </div>
            </div>

            {/* Step-by-step Setup Instructions */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Setup &amp; Movement Cues
              </h3>
              <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {currentExercise.instructions.map((step, idx) => (
                  <li key={idx} className="pl-1">
                    <span className="text-slate-800">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Beginner Modifications Toggle */}
            {currentExercise.beginnerModification && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-900">
                      Beginner Modification Available
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-2"
                    onClick={() => setShowModifications((prev) => !prev)}
                  >
                    {showModifications ? "Hide Regression" : "Show Regression"}
                  </Button>
                </div>
                {showModifications && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-2">
                    {currentExercise.beginnerModification}
                  </p>
                )}
              </div>
            )}

            {/* Prominent Sharp Pain Stopping Safety Warning (Subtle Rose Pattern) */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-rose-950 block">Safety Protocol:</span>
                <span className="text-slate-700">
                  Stop immediately if you feel sharp pain, pinching, or numbness.
                  Mild stretch tension is expected, but pain is an immediate stop signal.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Footer Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-10 px-4 min-h-[44px]"
          disabled={currentExerciseIndex === 0}
          onClick={handlePreviousExercise}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous Exercise</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-10 px-4 min-h-[44px]"
          onClick={handleNextExercise}
        >
          <span>
            {currentExerciseIndex === session.exercises.length - 1
              ? "Finish Workout"
              : "Skip / Next"}
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Exit Confirmation Dialog Modal */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full bg-white shadow-2xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Pause or Quit Workout?</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                You have completed {currentExerciseIndex} of {session.exercises.length} exercises.
                Your session progress is saved in your local session history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <Button
                className="w-full bg-primary text-primary-foreground min-h-[44px]"
                onClick={() => {
                  setShowExitDialog(false);
                  setIsPlaying(true);
                }}
              >
                Resume Workout
              </Button>
              <Button
                variant="outline"
                className="w-full text-slate-700 min-h-[44px]"
                onClick={() => router.push("/dashboard")}
              >
                Save &amp; Return to Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/10 min-h-[44px]"
                onClick={() => router.push("/dashboard")}
              >
                Discard &amp; Exit Session
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Workout Summary Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full bg-white shadow-2xl border-emerald-300">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto rounded-full bg-emerald-100 p-3 text-emerald-600 mb-2 w-fit">
                <Award className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-black text-slate-900">
                Session Completed!
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Outstanding consistency! Your spinal mobility and posture activation are logged.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Time</span>
                  <p className="text-lg font-black text-slate-800">{formatTime(totalElapsedSeconds)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Exercises</span>
                  <p className="text-lg font-black text-slate-800">{session.exercises.length} Done</p>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50/60 p-3 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Great Effort:</strong> Consistent posture &amp; mobility training builds enduring spinal alignment.
                </span>
              </div>

              {finishError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
                >
                  {finishError}
                </div>
              )}

              <Button
                id="finish-session-button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-[44px] gap-2"
                onClick={handleFinish}
                disabled={isFinishing}
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Logging Workout Session...</span>
                  </>
                ) : (
                  <span>Back to Dashboard</span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
