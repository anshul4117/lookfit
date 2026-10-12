"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/types/database";
import {
  updateProfileSettingsAction,
  completeOnboardingAction,
} from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { MedicalDisclaimerCard } from "./medical-disclaimer-card";

type ProfileRecord = Tables<"profiles">;
type FitnessLevel = "beginner" | "intermediate" | "advanced";

const ALL_GOALS = [
  { id: "posture", label: "Upper-Back Posture & Alignment" },
  { id: "mobility", label: "Spinal Mobility & Decompression" },
  { id: "strength", label: "Core Stability & Posture Strength" },
  { id: "general_fitness", label: "General Lean Fitness" },
  { id: "flexibility", label: "Hip & Hamstring Flexibility" },
  { id: "cardio", label: "Low-Impact Cardio" },
] as const;

const COMMON_LIMITATIONS = [
  "Wrist discomfort",
  "Knee sensitivity",
  "Neck stiffness",
  "Lower back fatigue",
  "Shoulder impingement",
] as const;

export function SettingsForm({
  initialProfile,
}: {
  initialProfile: ProfileRecord | null;
}) {
  const router = useRouter();
  const isOnboarding = !initialProfile?.onboarding_complete;

  // Form State
  const [displayName, setDisplayName] = React.useState(
    initialProfile?.display_name ?? ""
  );
  const [ageYears, setAgeYears] = React.useState<number>(
    initialProfile?.age_years ?? 23
  );
  const [fitnessLevel, setFitnessLevel] = React.useState<FitnessLevel>(
    initialProfile?.fitness_level ?? "intermediate"
  );
  const [selectedGoals, setSelectedGoals] = React.useState<string[]>(
    initialProfile?.goals && initialProfile.goals.length > 0
      ? initialProfile.goals
      : ["mobility", "posture", "strength", "general_fitness"]
  );
  const [limitations, setLimitations] = React.useState<string[]>(
    initialProfile?.limitations ?? []
  );
  const [customLimitation, setCustomLimitation] = React.useState("");
  const [availableMinutes, setAvailableMinutes] = React.useState<number>(
    initialProfile?.available_minutes ?? 20
  );
  const [timezone, setTimezone] = React.useState(
    initialProfile?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "Asia/Kolkata"
  );
  const [morningTime, setMorningTime] = React.useState(
    initialProfile?.morning_time?.slice(0, 5) ?? "06:30"
  );
  const [eveningTime, setEveningTime] = React.useState(
    initialProfile?.evening_time?.slice(0, 5) ?? "18:30"
  );
  const [remindersEnabled, setRemindersEnabled] = React.useState(
    initialProfile?.reminders_enabled ?? false
  );
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = React.useState(true);

  // Status State
  const [isPending, setIsPending] = React.useState(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  function toggleGoal(goalId: string) {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  }

  function toggleLimitation(tag: string) {
    setLimitations((prev) =>
      prev.includes(tag) ? prev.filter((l) => l !== tag) : [...prev, tag]
    );
  }

  function addCustomLimitation(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = customLimitation.trim();
    if (trimmed && !limitations.includes(trimmed)) {
      setLimitations((prev) => [...prev, trimmed]);
      setCustomLimitation("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    if (selectedGoals.length === 0) {
      setGeneralError("Please select at least one Posture or Mobility goal.");
      return;
    }

    if (!disclaimerAcknowledged) {
      setGeneralError(
        "Please acknowledge the health and spinal safety notice before proceeding."
      );
      return;
    }

    setIsPending(true);

    const payload = {
      display_name: displayName.trim() || null,
      age_years: Number(ageYears),
      fitness_level: fitnessLevel,
      goals: selectedGoals,
      limitations,
      available_minutes: Number(availableMinutes),
      timezone: timezone.trim(),
      morning_time: morningTime,
      evening_time: eveningTime,
      reminders_enabled: remindersEnabled,
    };

    try {
      const result = isOnboarding
        ? await completeOnboardingAction(payload)
        : await updateProfileSettingsAction(payload);

      if (!result.success) {
        setGeneralError(result.error.message);
        if (result.error.details) {
          setFieldErrors(result.error.details);
        }
        setIsPending(false);
        return;
      }

      setSuccessMessage(
        isOnboarding
          ? "Onboarding complete! Your profile is active."
          : "Preferences saved successfully."
      );
      setIsPending(false);

      if (isOnboarding) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Mode Banner */}
      {isOnboarding ? (
        <div
          id="onboarding-mode-banner"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-200/80 text-xs font-bold text-emerald-800"
            aria-hidden="true"
          >
            ✓
          </span>
          <div>
            <p className="text-sm font-semibold">Step 1: Set Up Your Posture &amp; Mobility Profile</p>
            <p className="text-xs text-emerald-700">
              Personalized routines are calibrated for your age (target 23), available time, and spinal mobility goals.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Account Preferences
          </p>
          <span
            id="onboarding-status-pill"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Profile Active
          </span>
        </div>
      )}

      {/* Notifications */}
      {generalError && (
        <div
          id="settings-error-banner"
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {generalError}
        </div>
      )}

      {successMessage && (
        <div
          id="settings-success-banner"
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {successMessage}
        </div>
      )}

      {/* Basic Demographics Card */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Personal Profile</CardTitle>
          <CardDescription>
            Core profile parameters. Gender is strictly optional and omitted to protect your privacy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display Name (Optional)</Label>
              <Input
                id="display-name"
                name="displayName"
                type="text"
                placeholder="How should LookFit address you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="age-years">Age (Years)</Label>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Target Profile: 23
                </span>
              </div>
              <Input
                id="age-years"
                name="ageYears"
                type="number"
                min={10}
                max={100}
                value={ageYears}
                onChange={(e) => setAgeYears(Number(e.target.value))}
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.age_years)}
                aria-describedby={
                  fieldErrors.age_years ? "age-years-error" : undefined
                }
                required
              />
              {fieldErrors.age_years && (
                <p id="age-years-error" className="text-xs text-destructive">
                  {fieldErrors.age_years[0]}
                </p>
              )}
            </div>
          </div>

          {/* Fitness Level Segmented Pills */}
          <div className="space-y-2 pt-2">
            <Label>Fitness Level</Label>
            <div
              role="radiogroup"
              aria-label="Fitness Level"
              className="grid grid-cols-3 gap-2"
            >
              {(["beginner", "intermediate", "advanced"] as const).map((level) => {
                const isSelected = fitnessLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setFitnessLevel(level)}
                    className={`flex h-11 items-center justify-center rounded-lg border text-sm font-medium capitalize transition-colors min-h-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals & Focus Areas Card */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Posture &amp; Mobility Focus</CardTitle>
          <CardDescription>
            Select the health goals you want LookFit&apos;s daily routines to emphasize.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ALL_GOALS.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => toggleGoal(goal.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-between rounded-lg border p-3.5 text-left text-sm transition-colors min-h-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50/70 text-indigo-950 font-medium"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{goal.label}</span>
                  <span
                    className={`ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && "✓"}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Movement Limitations Card */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Movement Restrictions &amp; Exclusions</CardTitle>
          <CardDescription>
            Tag any areas of discomfort. The planner excludes contraindicated movements (e.g. knee strain, wrist stress).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COMMON_LIMITATIONS.map((preset) => {
              const isSelected = limitations.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => toggleLimitation(preset)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {isSelected ? `✕ ${preset}` : `+ ${preset}`}
                </button>
              );
            })}
          </div>

          {/* Custom limitation tag add */}
          <div className="flex gap-2 pt-2">
            <Input
              type="text"
              placeholder="Add specific joint or movement exclusion..."
              value={customLimitation}
              onChange={(e) => setCustomLimitation(e.target.value)}
              className="h-9 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomLimitation}
              disabled={!customLimitation.trim()}
            >
              Add
            </Button>
          </div>

          {limitations.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-slate-500">
                Active exclusions ({limitations.length}):{" "}
                <span className="font-medium text-slate-700">
                  {limitations.join(", ")}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Routine Schedule & Timing Card */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Schedule &amp; Session Duration</CardTitle>
          <CardDescription>
            Target time per workout session and daily reminder notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="available-minutes">Session Duration (Minutes)</Label>
              <Input
                id="available-minutes"
                name="availableMinutes"
                type="number"
                min={5}
                max={120}
                value={availableMinutes}
                onChange={(e) => setAvailableMinutes(Number(e.target.value))}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="morning-time">Morning Routine Time</Label>
              <Input
                id="morning-time"
                name="morningTime"
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evening-time">Evening Routine Time</Label>
              <Input
                id="evening-time"
                name="eveningTime"
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone (IANA Identifier)</Label>
              <Input
                id="timezone"
                name="timezone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="flex items-center space-x-3 pt-6">
              <input
                id="reminders-enabled"
                name="remindersEnabled"
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="reminders-enabled" className="text-sm font-normal">
                Enable daily schedule reminders
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Safety Disclaimer Callout */}
      <MedicalDisclaimerCard />

      <div className="flex items-center space-x-3 px-1">
        <input
          id="disclaimer-ack"
          name="disclaimerAck"
          type="checkbox"
          checked={disclaimerAcknowledged}
          onChange={(e) => setDisclaimerAcknowledged(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          required
        />
        <Label htmlFor="disclaimer-ack" className="text-xs text-slate-600">
          I understand the health and safety notice and will stop immediately if I experience sharp pain.
        </Label>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          id={isOnboarding ? "complete-onboarding-submit" : "save-settings-submit"}
          type="submit"
          className="w-full sm:w-auto sm:min-w-[200px]"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              Saving Preferences...
            </span>
          ) : isOnboarding ? (
            "Complete Onboarding &amp; Activate"
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
