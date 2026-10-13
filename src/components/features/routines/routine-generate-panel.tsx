"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { saveGeneratedRoutineAction } from "@/server/actions/routines";
import type { SessionType } from "@/lib/validation/routine";
import {
  Sparkles,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

export function RoutineGeneratePanel() {
  const router = useRouter();
  const [loadingType, setLoadingType] = React.useState<SessionType | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [errorReasons, setErrorReasons] = React.useState<string[]>([]);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleGenerate = async (sessionType: SessionType) => {
    setLoadingType(sessionType);
    setErrorMessage(null);
    setErrorReasons([]);
    setSuccessMessage(null);

    try {
      const result = await saveGeneratedRoutineAction(sessionType);

      if (!result.success) {
        const details = result.error.details;
        if (details && "reasons" in details && Array.isArray(details.reasons)) {
          setErrorReasons(details.reasons);
        }
        setLoadingType(null);
        return;
      }

      setSuccessMessage(
        `Generated and saved ${result.data.name} (v${result.data.version}) successfully!`
      );
      setLoadingType(null);
      setTimeout(() => {
        router.push(`/routines/${result.data.id}`);
        router.refresh();
      }, 1000);
    } catch {
      setErrorMessage("An unexpected error occurred while generating the routine.");
      setLoadingType(null);
    }
  };

  return (
    <Card className="border-slate-200/90 bg-gradient-to-br from-slate-50 to-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Deterministic Routine Planner
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Calibrated from your saved profile, physical limitations, and active catalog.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Morning Generator */}
          <div className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-sm">
                <Sun className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span>Morning Routine</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                20–30 min: Spine activation, posture awareness, and strength conditioning.
              </p>
            </div>
            <Button
              id="generate-morning-routine-button"
              variant="outline"
              size="sm"
              disabled={loadingType !== null}
              onClick={() => handleGenerate("morning")}
              className="w-full font-semibold border-amber-300 text-amber-900 hover:bg-amber-100/80 gap-1.5"
            >
              {loadingType === "morning" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Calibrating...</span>
                </>
              ) : (
                <>
                  <span>Generate Morning Plan</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>

          {/* Evening Generator */}
          <div className="flex flex-col justify-between rounded-xl border border-indigo-200/80 bg-indigo-50/30 p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-sm">
                <Moon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                <span>Evening Routine</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                15–25 min: Spinal decompression, static stretching, and nervous system relaxation.
              </p>
            </div>
            <Button
              id="generate-evening-routine-button"
              variant="outline"
              size="sm"
              disabled={loadingType !== null}
              onClick={() => handleGenerate("evening")}
              className="w-full font-semibold border-indigo-300 text-indigo-900 hover:bg-indigo-100/80 gap-1.5"
            >
              {loadingType === "evening" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Calibrating...</span>
                </>
              ) : (
                <>
                  <span>Generate Evening Plan</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div
            role="alert"
            id="routine-generation-error"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 space-y-1.5"
          >
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
            {errorReasons.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-rose-700 pl-1">
                {errorReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            id="routine-generation-success"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
