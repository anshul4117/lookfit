import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getUserRoutinesQuery, getPrebuiltRoutinesQuery } from "@/server/queries/routines";
import { RoutineCard } from "@/components/features/routines/routine-card";
import { RoutineGeneratePanel } from "@/components/features/routines/routine-generate-panel";
import { PrebuiltRoutinesView } from "@/components/features/routines/prebuilt-routines-view";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, Sparkles, AlertCircle, Compass } from "lucide-react";
import type { RoutineStatus, SessionType } from "@/lib/validation/routine";

export const metadata: Metadata = {
  title: "Workout Plan — LookFit",
  description:
    "Manage, inspect, and calibrate your posture and spinal mobility workout plan.",
};

interface RoutinesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RoutinesPage({ searchParams }: RoutinesPageProps) {
  const rawParams = await searchParams;
  const statusParam = (
    typeof rawParams.status === "string" ? rawParams.status : undefined
  ) as RoutineStatus | undefined;
  const sessionTypeParam = (
    typeof rawParams.type === "string" ? rawParams.type : undefined
  ) as SessionType | undefined;

  const [result, allActiveResult, prebuiltResult] = await Promise.all([
    getUserRoutinesQuery({
      status: statusParam,
      session_type: sessionTypeParam,
    }),
    getUserRoutinesQuery({
      status: "active",
    }),
    getPrebuiltRoutinesQuery(),
  ]);

  const hasAnyActiveRoutines =
    allActiveResult.success && allActiveResult.data.length > 0;

  // First-time experience: user has no active saved routines and is not inspecting archived versions
  const isFirstTimeExperience = !hasAnyActiveRoutines && statusParam !== "archived";

  const activeRoutineTypes = allActiveResult.success
    ? allActiveResult.data.map((r) => r.session_type)
    : [];

  return (
    <div className="space-y-8" id="routines-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Deterministic Routine Engine</span>
          </div>
          <h1
            id="routines-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Workout Plan
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Calibrate, customize, and inspect your daily morning and evening posture routines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/routines/new">
            <Button
              id="create-custom-routine-button"
              className="font-semibold text-xs gap-1.5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create Custom Routine</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Routine Generator Panel */}
      <RoutineGeneratePanel />

      {/* First-time Experience: No saved routines yet (even when filtered by ?type=morning or ?type=evening) */}
      {isFirstTimeExperience ? (
        <section aria-labelledby="prebuilt-routines-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2
                id="prebuilt-routines-heading"
                className="text-sm font-bold uppercase tracking-wider text-slate-700"
              >
                Pre-built Workout Plan Blueprints
              </h2>
            </div>

            {/* Quick Filter Links for First-Time Review */}
            <div className="flex items-center gap-1 text-xs font-semibold">
              <Link
                href="/routines"
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  !sessionTypeParam
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Blueprints
              </Link>
              <Link
                href="/routines?type=morning"
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  sessionTypeParam === "morning"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Morning
              </Link>
              <Link
                href="/routines?type=evening"
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  sessionTypeParam === "evening"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Evening
              </Link>
            </div>
          </div>

          {prebuiltResult.success && prebuiltResult.data.length > 0 ? (
            <PrebuiltRoutinesView
              routines={prebuiltResult.data}
              initialSessionType={sessionTypeParam}
            />
          ) : (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-900"
            >
              <p>Failed to load pre-built routines. Please try refreshing the page.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 pb-2 text-xs font-semibold">
            <Link
              href="/routines"
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                !statusParam && !sessionTypeParam
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Active Routines
            </Link>
            <Link
              href="/routines?type=morning"
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                sessionTypeParam === "morning"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Morning
            </Link>
            <Link
              href="/routines?type=evening"
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                sessionTypeParam === "evening"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Evening
            </Link>
            <Link
              href="/routines?status=archived"
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                statusParam === "archived"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Archived Versions
            </Link>
          </div>

          {/* Routines Grid */}
          {!result.success ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-900"
            >
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span>Error loading routines</span>
              </div>
              <p className="mt-1 text-xs text-rose-700">{result.error.message}</p>
            </div>
          ) : result.data.length === 0 ? (
            <div
              id="routines-empty-state"
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Dumbbell className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800">
                {statusParam === "archived"
                  ? "No archived routine versions"
                  : "No workout routines found for this filter"}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {statusParam === "archived"
                  ? "When you edit an existing routine, earlier versions are preserved here."
                  : "Clear the active filters or generate a routine above."}
              </p>
            </div>
          ) : (
            <div
              id="routines-grid"
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {result.data.map((routine) => (
                <RoutineCard key={routine.id} routine={routine} />
              ))}
            </div>
          )}

          {/* Non-destructive Pre-built Blueprints Drawer for Returning Users */}
          {prebuiltResult.success && prebuiltResult.data.length > 0 && (
            <div className="border-t border-slate-200 pt-6">
              <details className="group rounded-xl border border-slate-200 bg-white p-4">
                <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>View Recommended Pre-built Blueprints</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 group-open:hidden">
                    Show Templates
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 hidden group-open:inline">
                    Hide Templates
                  </span>
                </summary>
                <div className="mt-6">
                  <PrebuiltRoutinesView
                    routines={prebuiltResult.data}
                    activeRoutineTypes={activeRoutineTypes}
                    initialSessionType={sessionTypeParam}
                  />
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}
