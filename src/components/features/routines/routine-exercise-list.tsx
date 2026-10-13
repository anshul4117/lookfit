import * as React from "react";
import Link from "next/link";
import type { RoutineExerciseDetail } from "@/server/queries/routines";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { RotateCcw, ShieldAlert, Sparkles } from "lucide-react";

interface RoutineExerciseListProps {
  exercises: RoutineExerciseDetail[];
}

export function RoutineExerciseList({ exercises }: RoutineExerciseListProps) {
  if (exercises.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No prescribed exercises in this routine.
      </div>
    );
  }

  return (
    <div className="space-y-4" id="routine-exercises-container">
      {exercises.map((item) => {
        const ex = item.exercise;
        const targetString = item.prescribed_reps != null
          ? `${item.prescribed_sets ? `${item.prescribed_sets} × ` : ""}${item.prescribed_reps} reps`
          : item.prescribed_duration_seconds != null
          ? `${item.prescribed_sets ? `${item.prescribed_sets} × ` : ""}${item.prescribed_duration_seconds}s hold`
          : "Target as prescribed";

        return (
          <Card
            key={item.id}
            id={`routine-exercise-item-${item.position}`}
            className="overflow-hidden border-slate-200/90 transition-all hover:border-slate-300"
          >
            <CardHeader className="p-4 sm:p-5 bg-slate-50/50 border-b border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Position Badge */}
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white shadow-sm"
                    aria-label={`Position ${item.position}`}
                  >
                    {item.position}
                  </span>

                  <div>
                    <h3 className="font-bold text-slate-900 sm:text-base">
                      {ex ? (
                        <Link
                          href={`/exercises/${ex.slug}`}
                          className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        >
                          {ex.name}
                        </Link>
                      ) : (
                        "Custom Exercise Prescription"
                      )}
                    </h3>
                    {ex && (
                      <span className="inline-block text-xs text-slate-400 capitalize">
                        {ex.category.replace("_", " & ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Prescription Targets */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                    <Sparkles className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                    <span>{targetString}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    <RotateCcw className="h-3 w-3 text-slate-400" aria-hidden="true" />
                    <span>{item.rest_seconds}s rest</span>
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3 text-xs sm:text-sm text-slate-600">
              {/* Instructions */}
              {ex?.instructions && ex.instructions.length > 0 && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700">Instructions:</span>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-600 pl-1">
                    {ex.instructions.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Safety Notes */}
              {ex?.safety_notes && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50/70 p-2.5 text-xs text-amber-900 border border-amber-200/60">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="font-bold text-amber-950">Safety Note: </span>
                    <span>{ex.safety_notes}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
