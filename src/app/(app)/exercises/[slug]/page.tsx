import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExerciseBySlugQuery } from "@/server/queries/exercises";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  ROUTINE_TAG_LABELS,
  type ExerciseCategory,
  type FitnessLevel,
  type RoutineTag,
} from "@/lib/validation/exercise-filters";
import { ExerciseMediaPreview } from "@/components/features/exercises/exercise-media-preview";
import {
  ArrowLeft,
  Clock,
  Repeat,
  ShieldAlert,
  Lightbulb,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface ExerciseDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ExerciseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getExerciseBySlugQuery(slug);

  if (!result.success || !result.data) {
    return {
      title: "Exercise Not Found — LookFit",
    };
  }

  return {
    title: `${result.data.name} — LookFit Exercise Library`,
    description: result.data.description,
  };
}

export default async function ExerciseDetailPage({
  params,
}: ExerciseDetailPageProps) {
  const { slug } = await params;
  const result = await getExerciseBySlugQuery(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const exercise = result.data;
  const categoryLabel =
    CATEGORY_LABELS[exercise.category as ExerciseCategory] || exercise.category;
  const difficultyLabel =
    DIFFICULTY_LABELS[exercise.difficulty as FitnessLevel] || exercise.difficulty;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back navigation */}
      <div>
        <Link
          id="exercise-back-link"
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Exercise Library</span>
        </Link>
      </div>

      {/* Header section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {categoryLabel}
          </span>

          {exercise.routine_tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            >
              {tag === "morning" && <Sun className="h-3.5 w-3.5" aria-hidden="true" />}
              {tag === "evening" && <Moon className="h-3.5 w-3.5" aria-hidden="true" />}
              {tag === "both" && <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{ROUTINE_TAG_LABELS[tag as RoutineTag] || tag}</span>
            </span>
          ))}

          <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {difficultyLabel}
          </span>
        </div>

        <h1
          id="exercise-detail-title"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          {exercise.name}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 max-w-3xl">
          {exercise.description}
        </p>
      </div>

      {/* Media Demonstration Hero */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <ExerciseMediaPreview
          mediaUrl={exercise.media_url}
          name={exercise.name}
          category={exercise.category as ExerciseCategory}
          className="h-56 sm:h-72 w-full"
        />
      </div>

      {/* Prescription & Metric Overview Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Prescription
          </span>
          <p className="mt-1 font-bold text-slate-900">
            {exercise.default_duration_seconds ? (
              <span className="inline-flex items-center gap-1 text-sm sm:text-base">
                <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                {exercise.default_duration_seconds}s hold
              </span>
            ) : exercise.default_reps ? (
              <span className="inline-flex items-center gap-1 text-sm sm:text-base">
                <Repeat className="h-4 w-4 text-primary" aria-hidden="true" />
                {exercise.default_reps} reps
              </span>
            ) : (
              <span className="text-sm">Bodyweight</span>
            )}
          </p>
          <span className="text-[11px] text-slate-500">
            {exercise.default_sets ? `${exercise.default_sets} sets recommended` : "Continuous flow"}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Rest Interval
          </span>
          <p className="mt-1 text-sm sm:text-base font-bold text-slate-900">
            {exercise.default_rest_seconds} seconds
          </p>
          <span className="text-[11px] text-slate-500">Between sets</span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Equipment
          </span>
          <p className="mt-1 text-sm sm:text-base font-bold text-slate-900">
            {exercise.equipment && exercise.equipment.length > 0
              ? exercise.equipment.join(", ")
              : "None (Equipment-free)"}
          </p>
          <span className="text-[11px] text-slate-500">Mat optional</span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Target Focus
          </span>
          <p className="mt-1 text-xs sm:text-sm font-bold text-slate-900 capitalize truncate">
            {exercise.target_areas.slice(0, 2).map((a) => a.replace(/_/g, " ")).join(", ")}
          </p>
          <span className="text-[11px] text-slate-500">
            {exercise.target_areas.length} targeted zones
          </span>
        </div>
      </div>

      {/* Target Areas Details */}
      {exercise.target_areas && exercise.target_areas.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Targeted Muscle Groups & Joints
          </h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {exercise.target_areas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 capitalize"
              >
                <CheckCircle2 className="h-3 w-3 text-primary" aria-hidden="true" />
                <span>{area.replace(/_/g, " ")}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instructions list */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Step-by-Step Instructions
        </h2>

        <ol
          id="exercise-instructions-list"
          className="space-y-3"
          aria-label="Execution steps"
        >
          {exercise.instructions && exercise.instructions.length > 0 ? (
            exercise.instructions.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs sm:text-sm leading-relaxed text-slate-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white font-bold text-slate-800 shadow-xs ring-1 ring-slate-200 text-xs">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))
          ) : (
            <li className="text-xs text-slate-500">
              Maintain a neutral spine and controlled breathing throughout execution.
            </li>
          )}
        </ol>
      </div>

      {/* Beginner Modifications Card */}
      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
              Form Focus & Beginner Regressions
            </h3>
            <p className="text-xs leading-relaxed text-sky-800">
              Move slowly and intentionally. Prioritize clean spinal alignment over range of motion.
              If an exercise feels challenging, reduce the hold duration or perform fewer repetitions
              with strict form.
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Health & Safety Alert Box */}
      <div
        id="exercise-safety-alert"
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-xs text-rose-950 shadow-xs space-y-3"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-600" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
            Safety Notes & Pain Stopping Guidance
          </h3>
        </div>

        {/* Exercise-specific safety note */}
        {exercise.safety_notes && (
          <div className="rounded-xl border border-rose-200/80 bg-white/80 p-3.5 text-xs leading-relaxed font-medium text-rose-900">
            {exercise.safety_notes}
          </div>
        )}

        {/* Standard Medical Rules */}
        <ul className="space-y-1.5 text-[11px] leading-relaxed text-rose-800 list-disc list-inside">
          <li>
            <strong>Sharp Pain Stop Rule:</strong> Mild stretching tension is normal; sharp pain, joint pinching, numbness, or dizziness requires immediate cessation.
          </li>
          <li>
            <strong>Spinal Health:</strong> Users with pre-existing neck, disc, or spinal conditions should consult a qualified healthcare professional before attempting this movement.
          </li>
          <li>
            <strong>Posture Reality:</strong> Exercises improve postural awareness, upper-back alignment, and spinal mobility; they do not increase adult bone height or guarantee height change.
          </li>
        </ul>
      </div>
    </div>
  );
}
