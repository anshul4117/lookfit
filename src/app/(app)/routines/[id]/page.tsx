import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRoutineByIdQuery, getRoutineVersionsQuery } from "@/server/queries/routines";
import { RoutineExerciseList } from "@/components/features/routines/routine-exercise-list";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Edit3,
  History,
  Sun,
  Moon,
  AlertCircle,
} from "lucide-react";

interface RoutineDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: RoutineDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getRoutineByIdQuery(id);
  if (!result.success) {
    return { title: "Routine Details — LookFit" };
  }
  return {
    title: `${result.data.name} (v${result.data.version}) — LookFit`,
    description: `Inspect routine exercises and prescription targets for ${result.data.name}.`,
  };
}

export default async function RoutineDetailPage({
  params,
}: RoutineDetailPageProps) {
  const { id } = await params;
  const result = await getRoutineByIdQuery(id);

  if (!result.success) {
    if (result.error.code === "NOT_FOUND") {
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
        <p className="text-xs text-rose-700">{result.error.message}</p>
        <Link href="/routines">
          <Button variant="outline" size="sm" className="mt-2 text-xs">
            Back to Routines
          </Button>
        </Link>
      </div>
    );
  }

  const routine = result.data;
  const isMorning = routine.session_type === "morning";
  const isArchived = routine.status === "archived";

  // Fetch version history for this specific routine lineage
  const versionsResult = await getRoutineVersionsQuery(routine.routine_lineage_id);
  const versions = versionsResult.success ? versionsResult.data : [];

  return (
    <div className="space-y-8" id="routine-detail-page">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/routines"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Routines</span>
        </Link>
      </div>

      {/* Routine Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200/80 pb-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Session Type */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isMorning
                  ? "bg-amber-100 text-amber-800"
                  : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {isMorning ? (
                <Sun className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
              )}
              <span className="capitalize">{routine.session_type} Routine</span>
            </span>

            {/* Version Badge */}
            <span
              id="routine-detail-version-badge"
              className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white shadow-sm"
            >
              Version {routine.version}
            </span>

            {/* Status Badge */}
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                isArchived
                  ? "bg-slate-200 text-slate-600"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {routine.status}
            </span>
          </div>

          <h1
            id="routine-detail-name"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            {routine.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>{routine.estimated_minutes} min estimated</span>
            </span>
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>{routine.routine_exercises.length} prescribed exercises</span>
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {!isArchived && (
            <Link href={`/routines/${routine.id}/edit`}>
              <Button id="edit-routine-header-button" className="font-semibold text-xs gap-1.5">
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit Routine (Create v{routine.version + 1})</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Archived Notice */}
      {isArchived && (
        <div
          role="note"
          id="archived-routine-notice"
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
        >
          <History className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-bold text-slate-800">
              Archived Routine Version
            </span>
            <p>
              This is a historical version of this routine. It remains preserved for review
              and for existing workout sessions that completed this specific snapshot.
            </p>
          </div>
        </div>
      )}

      {/* Prescribed Exercises Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Prescription Sequence &amp; Targets
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Unique sequential order (1 to {routine.routine_exercises.length})
          </span>
        </div>

        <RoutineExerciseList exercises={routine.routine_exercises} />
      </div>

      {/* Version History Drawer / Panel */}
      {versions.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span>Version History for {routine.session_type} routines</span>
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">v{ver.version}</span>
                  <span className="text-slate-600 truncate max-w-xs">{ver.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                      ver.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ver.status}
                  </span>
                </div>
                <div>
                  {ver.id === routine.id ? (
                    <span className="font-bold text-slate-400">Viewing now</span>
                  ) : (
                    <Link
                      href={`/routines/${ver.id}`}
                      className="text-primary hover:underline font-semibold"
                    >
                      Inspect v{ver.version} &rarr;
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
