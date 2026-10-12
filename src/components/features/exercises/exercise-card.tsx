import * as React from "react";
import Link from "next/link";
import type { Tables } from "@/types/database";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  ROUTINE_TAG_LABELS,
  type ExerciseCategory,
  type FitnessLevel,
  type RoutineTag,
} from "@/lib/validation/exercise-filters";
import { ExerciseMediaPreview } from "./exercise-media-preview";
import { Clock, Repeat, Sun, Moon, Sparkles, ChevronRight } from "lucide-react";

type ExerciseRecord = Tables<"exercises">;

interface ExerciseCardProps {
  exercise: ExerciseRecord;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const categoryLabel =
    CATEGORY_LABELS[exercise.category as ExerciseCategory] || exercise.category;
  const difficultyLabel =
    DIFFICULTY_LABELS[exercise.difficulty as FitnessLevel] || exercise.difficulty;

  return (
    <article
      id={`exercise-card-${exercise.slug}`}
      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div>
        {/* Media / Visual Demonstration */}
        <ExerciseMediaPreview
          mediaUrl={exercise.media_url}
          name={exercise.name}
          category={exercise.category as ExerciseCategory}
          className="h-36 w-full"
        />

        {/* Metadata Badges */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {categoryLabel}
          </span>

          {exercise.routine_tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
            >
              {tag === "morning" && <Sun className="h-3 w-3" aria-hidden="true" />}
              {tag === "evening" && <Moon className="h-3 w-3" aria-hidden="true" />}
              {tag === "both" && <Sparkles className="h-3 w-3" aria-hidden="true" />}
              <span>{ROUTINE_TAG_LABELS[tag as RoutineTag] || tag}</span>
            </span>
          ))}

          <span className="ml-auto inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200/60">
            {difficultyLabel}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="mt-3 text-base font-bold tracking-tight text-slate-900 group-hover:text-primary transition-colors">
          <Link
            href={`/exercises/${exercise.slug}`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            {exercise.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {exercise.description}
        </p>

        {/* Target Area Chips */}
        {exercise.target_areas && exercise.target_areas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {exercise.target_areas.slice(0, 4).map((area) => (
              <span
                key={area}
                className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200/50"
              >
                {area.replace(/_/g, " ")}
              </span>
            ))}
            {exercise.target_areas.length > 4 && (
              <span className="text-[10px] text-slate-400 self-center">
                +{exercise.target_areas.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Prescription & Navigation Link */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {exercise.default_duration_seconds ? (
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {exercise.default_duration_seconds}s hold
            </span>
          ) : exercise.default_reps ? (
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <Repeat className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {exercise.default_reps} reps
            </span>
          ) : (
            <span className="text-slate-500">Bodyweight posture</span>
          )}

          {exercise.default_rest_seconds > 0 && (
            <span className="text-slate-400">
              {exercise.default_rest_seconds}s rest
            </span>
          )}
        </div>

        <Link
          href={`/exercises/${exercise.slug}`}
          className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform"
          aria-label={`View full instructions for ${exercise.name}`}
        >
          <span>Details</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
