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
  searchParams: Promise<{ type?: string }>;
}

export default async function RoutineNewPage({
  searchParams,
}: RoutineNewPageProps) {
  const params = await searchParams;
  const sessionType: SessionType =
    params.type === "evening" ? "evening" : "morning";

  const catalogResult = await getExercisesQuery();
  const catalog = catalogResult.success ? catalogResult.data : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="routine-new-page">
      <div>
        <Link
          href="/routines"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Routines</span>
        </Link>
      </div>

      <div>
        <h1
          id="routine-new-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Create Custom Routine
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Build a personalized sequence from the curated exercise catalog (Version 1).
        </p>
      </div>

      <RoutineEditorForm
        availableExercises={catalog}
        sessionType={sessionType}
      />
    </div>
  );
}
