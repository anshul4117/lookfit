"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PrebuiltRoutineDetail } from "@/server/queries/routines";
import { adoptPrebuiltRoutineAction } from "@/server/actions/routines";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Sun,
  Moon,
  Clock,
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit3,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";

interface PrebuiltRoutinesViewProps {
  routines: PrebuiltRoutineDetail[];
  activeRoutineTypes?: ("morning" | "evening")[];
  initialSessionType?: "morning" | "evening";
}

export function PrebuiltRoutinesView({
  routines,
  activeRoutineTypes = [],
  initialSessionType,
}: PrebuiltRoutinesViewProps) {
  const router = useRouter();
  const [adoptingType, setAdoptingType] = React.useState<"morning" | "evening" | null>(null);
  const [adoptedTypes, setAdoptedTypes] = React.useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const defaultExpanded = initialSessionType
    ? `prebuilt-${initialSessionType}`
    : "prebuilt-morning";
  const [expandedRoutine, setExpandedRoutine] = React.useState<string | null>(defaultExpanded);
  const [expandedExerciseSlug, setExpandedExerciseSlug] = React.useState<string | null>(null);

  const handleAdopt = async (sessionType: "morning" | "evening", routineName: string) => {
    if (adoptingType) return;
    setAdoptingType(sessionType);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await adoptPrebuiltRoutineAction({ session_type: sessionType });

      if (!result.success) {
        setErrorMessage(result.error.message || "Failed to adopt pre-built routine.");
        setAdoptingType(null);
        return;
      }

      setAdoptedTypes((prev) => new Set(prev).add(sessionType));
      setSuccessMessage(
        `"${routineName}" has been saved to your Workout Plan as Version ${result.data.version}.`
      );
      setAdoptingType(null);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected error occurred while saving the routine.");
      setAdoptingType(null);
    }
  };

  const morningRoutine = routines.find((r) => r.session_type === "morning");
  const eveningRoutine = routines.find((r) => r.session_type === "evening");

  const orderedRoutines = React.useMemo(() => {
    if (initialSessionType === "evening") {
      return [eveningRoutine, morningRoutine].filter(Boolean) as PrebuiltRoutineDetail[];
    }
    return [morningRoutine, eveningRoutine].filter(Boolean) as PrebuiltRoutineDetail[];
  }, [initialSessionType, morningRoutine, eveningRoutine]);

  return (
    <div className="space-y-8" id="prebuilt-routines-review">
      {/* Introduction Hero Card */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
              <span>Recommended Starting Workout Plan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Calibrated Daily Routines for First-Time Setup
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We have pre-configured two balanced routines: a dynamic <strong>Morning Activation</strong> to build upright posture and functional lean strength, and a restorative <strong>Evening Recovery</strong> to decompress your spine and improve flexibility.
            </p>
            <p className="text-xs text-slate-500">
              Inspect exercises, durations, and instructions below. Routines are <strong>not saved</strong> and workouts <strong>do not start</strong> until you explicitly choose to adopt or customize them.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs text-slate-700 shadow-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>100% Equipment-Free Home Workouts</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs text-slate-700 shadow-xs">
              <Clock className="h-4 w-4 text-sky-600 shrink-0" aria-hidden="true" />
              <span>15–30 Min Calibrated Durations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Feedback */}
      {errorMessage && (
        <div
          role="alert"
          id="prebuilt-adopt-error"
          className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-900"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          id="prebuilt-adopt-success"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
          <Link
            href="/routines"
            className="text-emerald-700 underline hover:text-emerald-900 text-xs font-bold"
          >
            View Active Routines
          </Link>
        </div>
      )}

      {/* Routine Cards Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {orderedRoutines.map((routine) => {
          const isMorning = routine.session_type === "morning";
          const isExpanded = expandedRoutine === routine.id;
          const isAdopting = adoptingType === routine.session_type;
          const isAdopted = adoptedTypes.has(routine.session_type);
          const hasActiveRoutine = activeRoutineTypes.includes(routine.session_type);

          return (
            <Card
              key={routine.id}
              id={`prebuilt-card-${routine.session_type}`}
              className={`rounded-2xl border flex flex-col justify-between shadow-sm transition-all ${
                isMorning
                  ? "border-amber-200/80 bg-gradient-to-b from-amber-50/20 to-white"
                  : "border-sky-200/80 bg-gradient-to-b from-sky-50/20 to-white"
              }`}
            >
              <CardHeader className="space-y-3 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      isMorning
                        ? "bg-amber-100 text-amber-900"
                        : "bg-sky-100 text-sky-900"
                    }`}
                  >
                    {isMorning ? (
                      <Sun className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    ) : (
                      <Moon className="h-4 w-4 text-sky-600" aria-hidden="true" />
                    )}
                    <span className="capitalize">{routine.session_type} Plan</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {hasActiveRoutine && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                        Active Routine Exists
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                      Pre-built Template
                    </span>
                  </div>
                </div>

                <div>
                  <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
                    {routine.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {routine.description}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>~{routine.estimated_minutes} minutes</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Dumbbell className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>{routine.exercises.length} calibrated exercises</span>
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Target Focus: </span>
                  <span>{routine.focus}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pb-4">
                {/* Expand / Collapse Exercise List Header */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Exercise Sequence ({routine.exercises.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRoutine(isExpanded ? null : routine.id)
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 focus-visible:outline-none"
                    aria-expanded={isExpanded}
                  >
                    <span>{isExpanded ? "Collapse List" : "Inspect Exercises"}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Exercises List */}
                {isExpanded && (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {routine.exercises.map((ex, index) => {
                      const isExerciseDetailOpen = expandedExerciseSlug === `${routine.id}-${ex.slug}`;
                      return (
                        <div
                          key={`${routine.id}-${ex.slug}`}
                          className="rounded-xl border border-slate-200/90 bg-white p-3 text-xs space-y-2 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                                {index + 1}
                              </span>
                              <div>
                                <h4 className="font-bold text-slate-900 leading-tight">
                                  {ex.name}
                                </h4>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                  <span className="capitalize">{ex.category}</span>
                                  <span>•</span>
                                  <span className="capitalize">{ex.difficulty}</span>
                                  <span>•</span>
                                  <span className="font-medium text-slate-700">
                                    {ex.prescribed_sets} {ex.prescribed_sets === 1 ? "set" : "sets"} ×{" "}
                                    {ex.prescribed_reps
                                      ? `${ex.prescribed_reps} reps`
                                      : `${ex.prescribed_duration_seconds}s`}
                                  </span>
                                  <span>•</span>
                                  <span>{ex.rest_seconds}s rest</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedExerciseSlug(
                                  isExerciseDetailOpen ? null : `${routine.id}-${ex.slug}`
                                )
                              }
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline shrink-0 mt-0.5"
                            >
                              {isExerciseDetailOpen ? "Hide" : "Instructions"}
                            </button>
                          </div>

                          {/* Alternative Movement notice without hardcoded wall/doorway suffix */}
                          {ex.alternative_name && (
                            <div className="rounded-md bg-amber-50/70 border border-amber-200/50 px-2 py-1 text-[11px] text-amber-900">
                              <span className="font-semibold">Alternative: </span>
                              <span>{ex.alternative_name}</span>
                            </div>
                          )}

                          {/* Exercise Instructions & Safety */}
                          {isExerciseDetailOpen && (
                            <div className="border-t border-slate-100 pt-2 space-y-2 text-[11px] text-slate-600">
                              {ex.instructions.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-semibold text-slate-800">Technique:</span>
                                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                                    {ex.instructions.map((step, sIdx) => (
                                      <li key={sIdx}>{step}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              {ex.safety_notes && (
                                <p className="text-amber-800 bg-amber-50 p-2 rounded border border-amber-200/60">
                                  <strong>Safety Cue:</strong> {ex.safety_notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href={`/routines/new?template=${routine.session_type}`}
                  className="w-full sm:w-auto"
                >
                  <Button
                    id={`customize-prebuilt-${routine.session_type}-button`}
                    variant={hasActiveRoutine ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Customize in Editor</span>
                  </Button>
                </Link>

                {hasActiveRoutine ? (
                  <Button
                    id={`adopt-prebuilt-${routine.session_type}-button`}
                    variant="outline"
                    size="sm"
                    disabled
                    className="w-full sm:w-auto text-xs font-semibold text-slate-500 cursor-not-allowed gap-1.5"
                    title="An active routine of this type already exists. Customize the template in the editor to make changes without overwriting your routine."
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>Active Routine Exists</span>
                  </Button>
                ) : (
                  <Button
                    id={`adopt-prebuilt-${routine.session_type}-button`}
                    size="sm"
                    disabled={isAdopting}
                    onClick={() => handleAdopt(routine.session_type, routine.name)}
                    className={`w-full sm:w-auto text-xs font-bold gap-1.5 ${
                      isMorning
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-sky-600 hover:bg-sky-700 text-white"
                    }`}
                  >
                    {isAdopting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        <span>Saving Routine...</span>
                      </>
                    ) : isAdopted ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Adopt This Routine</span>
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Postural & Health Safety Notice */}
      <div
        id="prebuilt-routines-safety-notice"
        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600 space-y-2"
      >
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Info className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
          <span>Posture, Mobility &amp; Safety Guidelines</span>
        </div>
        <p className="leading-relaxed">
          LookFit is engineered for posture correction, spinal mobility, core stability, and functional bodyweight strength. Improvements in posture and spinal decompression can enhance upright stance, but measured bone height is naturally variable and adult height increase cannot be guaranteed.
        </p>
        <p className="leading-relaxed">
          <strong>Listen to your body:</strong> Mild stretching tension and muscular effort are normal, but stop immediately if you feel sharp pain or numbness. Consult a physician or physical therapist before starting if you have pre-existing spinal, joint, or neck conditions.
        </p>
      </div>
    </div>
  );
}
