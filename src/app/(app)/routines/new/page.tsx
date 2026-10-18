import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getExercisesQuery } from "@/server/queries/exercises";
import { RoutineEditorForm } from "@/components/features/routines/routine-editor-form";
import { ArrowLeft } from "lucide-react";
import type { SessionType } from "@/lib/validation/routine";

export const metadata: Metadata = {
  title: "Create Routine — LookFit",
  description: "Create a custom posture and spinal mobility routine.",
};

interface RoutineNewPageProps {
  searchParams: Promise<{ type?: string; template?: string }>;
}

export default async function RoutineNewPage({
  searchParams,
}: RoutineNewPageProps) {
  const params = await searchParams;
  const sessionType: SessionType =
    params.type === "evening" || params.template === "evening"
      ? "evening"
      : "morning";

  const catalogResult = await getExercisesQuery();
  const catalog = catalogResult.success ? catalogResult.data : [];

  // If a template is requested, pre-fill initial routine exercises from pre-built blueprint
  let initialRoutine = undefined;
  if (params.template === "morning" || params.template === "evening") {
    const { getPrebuiltBlueprint } = await import(
      "@/lib/domain/prebuilt-routines"
    );
    const blueprint = getPrebuiltBlueprint(params.template);
    const catalogMap = new Map(catalog.map((e) => [e.slug, e]));

    const mappedExercises = blueprint.exercises.flatMap((be) => {
      const cat = catalogMap.get(be.slug);
      if (!cat) return [];
      return [
        {
          id: `template-${be.position}`,
          routine_id: "",
          user_id: "",
          exercise_id: cat.id,
          position: be.position,
          prescribed_sets: be.prescribedSets,
          prescribed_reps: be.prescribedReps,
          prescribed_duration_seconds: be.prescribedDurationSeconds,
          rest_seconds: be.restSeconds,
          created_at: new Date().toISOString(),
          exercise: {
            id: cat.id,
            slug: cat.slug,
            name: cat.name,
            category: cat.category,
            difficulty: cat.difficulty,
            target_areas: cat.target_areas,
            equipment: cat.equipment,
            instructions: cat.instructions,
            safety_notes: cat.safety_notes,
          },
        },
      ];
    });

    initialRoutine = {
      id: "",
      user_id: "",
      name: `${blueprint.name} (Customized)`,
      session_type: blueprint.sessionType,
      version: 1,
      status: "active" as const,
      estimated_minutes: blueprint.estimatedMinutes,
      generated_by: "user",
      routine_lineage_id: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      routine_exercises: mappedExercises,
    };
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="routine-new-page">
      <div>
        <Link
          href="/routines"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Workout Plan</span>
        </Link>
      </div>

      <div>
        <h1
          id="routine-new-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          {params.template
            ? `Customize ${params.template === "morning" ? "Morning" : "Evening"} Pre-Built Routine`
            : "Create Custom Routine"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {params.template
            ? "Calibrated sequence loaded. Reorder, adjust sets and repetitions, or add exercises before saving (Version 1)."
            : "Build a personalized sequence from the curated exercise catalog (Version 1)."}
        </p>
      </div>

      <RoutineEditorForm
        initialRoutine={initialRoutine}
        availableExercises={catalog}
        sessionType={sessionType}
        mode="create"
      />
    </div>
  );
}
