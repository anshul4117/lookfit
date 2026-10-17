import * as React from "react";
import type { Metadata } from "next";
import { getExercisesQuery } from "@/server/queries/exercises";
import { parseExerciseFilters } from "@/lib/validation/exercise-filters";
import { ExerciseFiltersBar } from "@/components/features/exercises/exercise-filters-bar";
import { ExerciseCard } from "@/components/features/exercises/exercise-card";
import { AlertCircle, Compass, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Exercise Library — LookFit",
  description:
    "Curated equipment-free exercise catalog for posture awareness, spinal mobility, and functional strength.",
};

interface ExercisesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ExercisesPage({ searchParams }: ExercisesPageProps) {
  const rawParams = await searchParams;
  const filters = parseExerciseFilters(rawParams);

  const result = await getExercisesQuery(filters);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>Curated Movement Catalog</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Exercise Library
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Search and explore equipment-free routines focused on upper-back alignment,
          thoracic mobility, and core stabilization.
        </p>
      </div>

      {/* Interactive Filters Bar */}
      <ExerciseFiltersBar />

      {/* Results Section */}
      {!result.success ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-900"
        >
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>Error loading exercises</span>
          </div>
          <p className="mt-1 text-xs text-rose-700">{result.error.message}</p>
        </div>
      ) : result.data.length === 0 ? (
        <div
          id="exercise-empty-state"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">
            No matching exercises found
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Try adjusting your search terms, changing the category, or resetting your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span id="exercise-results-count" className="font-semibold text-slate-700">
              {result.data.length} {result.data.length === 1 ? "movement" : "movements"} available
            </span>
            <span className="text-[11px] text-slate-400">
              Read-only exercise library
            </span>
          </div>

          <div
            id="exercise-grid"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {result.data.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>
        </div>
      )}

      {/* Health & Safety Reminder Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <p className="leading-relaxed">
          <strong className="font-semibold text-slate-800">Exercise Safety:</strong> Mild stretching tension is normal; sharp pain or joint pinching requires immediate cessation. If you have pre-existing spinal or disc conditions, consult a healthcare provider. Exercises support healthy posture and upright stance; they do not increase adult bone height.
        </p>
      </div>
    </div>
  );
}
