import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRoutineByIdQuery } from "@/server/queries/routines";
import { getExercisesQuery } from "@/server/queries/exercises";
import { RoutineEditorForm } from "@/components/features/routines/routine-editor-form";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoutineEditPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit Routine — LookFit",
  description: "Edit routine prescription and create a new version.",
};

export default async function RoutineEditPage({ params }: RoutineEditPageProps) {
  const { id } = await params;
  const routineResult = await getRoutineByIdQuery(id);
  const catalogResult = await getExercisesQuery();

  if (!routineResult.success) {
    if (routineResult.error.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-900 space-y-2"
      >
        <div className="flex items-center gap-2 font-bold text-rose-800">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>Error loading routine</span>
        </div>
        <p className="text-xs text-rose-700">{routineResult.error.message}</p>
        <Link href="/routines">
          <Button variant="outline" size="sm" className="mt-2 text-xs">
            Back to Routines
          </Button>
        </Link>
      </div>
    );
  }

  const routine = routineResult.data;

  // Archived routines cannot be edited directly
  if (routine.status === "archived") {
    redirect(`/routines/${routine.id}`);
  }

  const catalog = catalogResult.success ? catalogResult.data : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="routine-edit-page">
      <div>
        <Link
          href={`/routines/${routine.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Cancel &amp; Back to Routine</span>
        </Link>
      </div>

      <div>
        <h1
          id="routine-edit-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Edit Routine: {routine.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Modifying this routine will archive Version {routine.version} and create Version {routine.version + 1}.
        </p>
      </div>

      <RoutineEditorForm
        initialRoutine={routine}
        availableExercises={catalog}
        sessionType={routine.session_type}
      />
    </div>
  );
}
