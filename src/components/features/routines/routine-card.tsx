import * as React from "react";
import Link from "next/link";
import type { RoutineSummary } from "@/server/queries/routines";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Clock, Dumbbell, Sun, Moon, ArrowRight, Edit3, Archive } from "lucide-react";

interface RoutineCardProps {
  routine: RoutineSummary;
  onArchive?: (id: string) => void;
  isArchiving?: boolean;
}

export function RoutineCard({
  routine,
  onArchive,
  isArchiving,
}: RoutineCardProps) {
  const isMorning = routine.session_type === "morning";
  const isArchived = routine.status === "archived";

  return (
    <Card
      id={`routine-card-${routine.id}`}
      className={`rounded-xl border flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${
        isArchived
          ? "border-slate-200 bg-slate-50/60 opacity-80"
          : isMorning
          ? "border-amber-200/70 bg-white"
          : "border-sky-200/70 bg-white"
      }`}
    >
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          {/* Session Type Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isMorning
                ? "bg-amber-100 text-amber-800"
                : "bg-sky-100 text-sky-800"
            }`}
          >
            {isMorning ? (
              <Sun className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            )}
            <span className="capitalize">{routine.session_type} Routine</span>
          </span>

          {/* Status & Version Badges */}
          <div className="flex items-center gap-1.5">
            <span
              id={`routine-version-badge-${routine.id}`}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 border border-slate-200"
            >
              v{routine.version}
            </span>
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
        </div>

        <CardTitle className="text-lg font-bold tracking-tight text-slate-900">
          <Link
            href={`/routines/${routine.id}`}
            className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            {routine.name}
          </Link>
        </CardTitle>

        <CardDescription className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{routine.estimated_minutes} min</span>
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{routine.exercise_count} exercises</span>
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3 text-xs text-slate-500">
        <p className="line-clamp-2">
          {routine.generated_by === "deterministic_v1"
            ? "Calibrated by LookFit deterministic posture & mobility planner."
            : "Custom calibrated workout routine."}
        </p>
      </CardContent>

      <CardFooter className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link href={`/routines/${routine.id}`}>
          <Button
            id={`view-routine-button-${routine.id}`}
            variant="ghost"
            size="sm"
            className="text-xs font-semibold gap-1 text-slate-700 hover:text-slate-900"
          >
            <span>Inspect</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Link>

        {!isArchived && (
          <div className="flex items-center gap-1">
            <Link href={`/routines/${routine.id}/edit`}>
              <Button
                id={`edit-routine-button-${routine.id}`}
                variant="outline"
                size="sm"
                className="text-xs font-medium gap-1"
              >
                <Edit3 className="h-3 w-3" aria-hidden="true" />
                <span>Edit</span>
              </Button>
            </Link>

            {onArchive && (
              <Button
                id={`archive-routine-button-${routine.id}`}
                variant="ghost"
                size="sm"
                onClick={() => onArchive(routine.id)}
                disabled={isArchiving}
                className="text-xs text-slate-500 hover:text-rose-600 gap-1"
                aria-label="Archive routine"
              >
                <Archive className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
