"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  Flame,
  Award,
  Clock,
  Play,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Dumbbell,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { DashboardData } from "@/server/queries/dashboard";
import { startWorkoutAction } from "@/server/actions/workouts";

export interface DashboardUserProps {
  displayName: string;
  email: string;
  timezone: string;
  availableMinutes: number;
  fitnessLevel: string;
  isOnboardingComplete: boolean;
}

export function DashboardContent({
  user,
  initialData,
}: {
  user: DashboardUserProps;
  initialData?: DashboardData | null;
}) {
  const router = useRouter();
  const [mockStarting, setMockStarting] = React.useState<string | null>(null);
  const [isStartingType, setIsStartingType] = React.useState<"morning" | "evening" | null>(null);
  const [startError, setStartError] = React.useState<string | null>(null);

  // Local calendar date formatting
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const handleStartWorkout = (sessionSlug: string) => {
    setMockStarting(sessionSlug);
    setTimeout(() => {
      router.push(`/workout/${sessionSlug}`);
    }, 400);
  };

  const handleLaunchWorkout = async (sessionType: "morning" | "evening") => {
    if (!initialData) {
      handleStartWorkout(sessionType === "morning" ? "morning-session" : "evening-session");
      return;
    }

    const sessionState =
      sessionType === "morning"
        ? initialData.morningSession
        : initialData.eveningSession;

    // 1. If session is already active in progress, resume immediately
    if (sessionState.status === "in_progress" && sessionState.activeSessionId) {
      router.push(`/workout/${sessionState.activeSessionId}`);
      return;
    }

    // 2. If routine exists, start a new session atomically via T11 RPC
    if (sessionState.routine) {
      setIsStartingType(sessionType);
      setStartError(null);

      try {
        const res = await startWorkoutAction({ routine_id: sessionState.routine.id });
        if (!res.success) {
          setStartError(res.error.message);
          setIsStartingType(null);
          return;
        }

        router.push(`/workout/${res.data.id}`);
      } catch {
        setStartError("Failed to initialize workout session. Please try again.");
        setIsStartingType(null);
      }
    } else {
      // 3. Prompt user to calibrate routine
      router.push("/routines");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Top Greeting & Date Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-3 py-1 text-xs font-semibold text-emerald-800 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Lean Physique, Functional Strength &amp; Posture Focus</span>
          </div>
          <h1
            id="dashboard-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Welcome back, {user.displayName}!
          </h1>
          <p id="welcome-message" className="text-sm text-slate-600">
            {todayFormatted} • Timezone: <span className="font-medium text-slate-800">{user.timezone}</span> • Intermediate Level
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <Link href="/calendar">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9">
              <Calendar className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </Button>
          </Link>
          <Link href="/routines/new">
            <Button size="sm" className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              <Dumbbell className="h-3.5 w-3.5" />
              <span>New Routine</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding State Detection Banner */}
      {!user.isOnboardingComplete && (
        <Card
          id="onboarding-prompt-card"
          className="border-emerald-200 bg-emerald-50/50 shadow-sm"
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
                aria-hidden="true"
              >
                !
              </span>
              <CardTitle className="text-lg text-emerald-950 font-semibold">
                Action Required: Complete Your Posture Profile
              </CardTitle>
            </div>
            <CardDescription className="text-emerald-800">
              Personalized morning activation and evening decompression routines
              cannot be generated until your profile is completed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700">
              Set your target age (default 23), select upper-back posture and spinal
              mobility focus areas, and configure your daily session duration.
            </p>
            <div>
              <Link href="/settings">
                <Button id="onboarding-cta-button" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  Complete Onboarding Setup &rarr;
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak & Consistency Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Active Streak
              </span>
              <p className="text-xl font-bold text-slate-900">
                {initialData ? `${initialData.streak.activeStreak} Days` : "5 Days"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Longest Streak
              </span>
              <p className="text-xl font-bold text-indigo-950">
                {initialData ? `${initialData.streak.longestStreak} Days` : "14 Days"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Sessions Done
              </span>
              <p className="text-xl font-bold text-slate-900">
                {initialData ? `${initialData.stats.totalSessionsDone} Total` : "24 Total"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Mobility
              </span>
              <p className="text-xl font-bold text-slate-900">
                {initialData ? `${initialData.stats.totalMobilityMinutes} Min` : "460 Min"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Primary Workout Sessions Section */}
      <section aria-labelledby="today-sessions-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="today-sessions-heading"
            className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
          >
            Today&apos;s Sessions
          </h2>
          <span className="text-xs text-slate-500">
            2 scheduled routines • Equipment-free
          </span>
        </div>

        {startError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900"
          >
            {startError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Morning Activation Card */}
          <Card
            id="morning-session-card"
            className="border-slate-200 bg-white shadow-sm transition hover:shadow-md flex flex-col justify-between"
          >
            <CardHeader className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 border border-amber-100">
                    <Sun className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      {initialData?.morningSession.routine?.name || "Morning Activation: Strength & Core"}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Full-body bodyweight strength • Defined abs • Spinal mobility
                    </CardDescription>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                    initialData?.morningSession.status === "completed"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : initialData?.morningSession.status === "in_progress"
                      ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {initialData?.morningSession.status === "completed"
                    ? "Completed"
                    : initialData?.morningSession.status === "in_progress"
                    ? "In Progress"
                    : "Ready"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Estimated Duration:</span>
                  <span className="font-semibold text-slate-800">
                    {initialData?.morningSession.routine
                      ? `${initialData.morningSession.routine.estimatedMinutes} minutes`
                      : "20–30 minutes"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Prescribed Exercises:</span>
                  <span className="font-semibold text-slate-800">
                    {initialData?.morningSession.routine
                      ? `${initialData.morningSession.routine.exerciseCount} exercises`
                      : "7–8 exercises"}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-700 leading-relaxed border border-slate-100">
                  <p className="font-medium text-slate-900 mb-0.5">Key Movements:</p>
                  {initialData?.morningSession.routine?.exercisesSummary.length
                    ? initialData.morningSession.routine.exercisesSummary.slice(0, 5).join(", ")
                    : "Push-ups, Bodyweight Squats, Forearm Plank, Bird-Dog, Wall Angels, Prone W Raise."}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  id="start-morning-workout-button"
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium min-h-[44px]"
                  disabled={isStartingType === "morning" || mockStarting === "morning-session"}
                  onClick={() => handleLaunchWorkout("morning")}
                >
                  {isStartingType === "morning" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Launching Session...</span>
                    </>
                  ) : initialData?.morningSession.status === "in_progress" ? (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Resume Morning Activation</span>
                    </>
                  ) : initialData?.morningSession.status === "completed" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Completed Today (Restart)</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>
                        {initialData?.morningSession.routine
                          ? `Start ${initialData.morningSession.routine.name}`
                          : "Start Morning Strength & Core"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Evening Decompression Card (Sky Blue Theme) */}
          <Card
            id="evening-session-card"
            className="border-slate-200 bg-white shadow-sm transition hover:shadow-md flex flex-col justify-between"
          >
            <CardHeader className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600 border border-sky-100">
                    <Moon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      {initialData?.eveningSession.routine?.name || "Evening Decompression: Mobility & Core"}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Spinal decompression • Hip &amp; chest flexibility • Core recovery
                    </CardDescription>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                    initialData?.eveningSession.status === "completed"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : initialData?.eveningSession.status === "in_progress"
                      ? "bg-sky-100 text-sky-900 border-sky-300 animate-pulse"
                      : "bg-sky-50 text-sky-800 border-sky-200"
                  }`}
                >
                  {initialData?.eveningSession.status === "completed"
                    ? "Completed"
                    : initialData?.eveningSession.status === "in_progress"
                    ? "In Progress"
                    : "Ready"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Estimated Duration:</span>
                  <span className="font-semibold text-slate-800">
                    {initialData?.eveningSession.routine
                      ? `${initialData.eveningSession.routine.estimatedMinutes} minutes`
                      : "15–25 minutes"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Prescribed Exercises:</span>
                  <span className="font-semibold text-slate-800">
                    {initialData?.eveningSession.routine
                      ? `${initialData.eveningSession.routine.exerciseCount} exercises`
                      : "6–7 exercises"}
                  </span>
                </div>
                <div className="rounded-lg bg-sky-50/50 p-2.5 text-[11px] text-sky-900 leading-relaxed border border-sky-100">
                  <p className="font-medium text-sky-950 mb-0.5">Key Movements:</p>
                  {initialData?.eveningSession.routine?.exercisesSummary.length
                    ? initialData.eveningSession.routine.exercisesSummary.slice(0, 5).join(", ")
                    : "Child's Pose, Doorway Chest Stretch, Seated Spinal Twist, Sphinx Pose, Glute Bridge Hold."}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  id="start-evening-workout-button"
                  className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium min-h-[44px]"
                  disabled={isStartingType === "evening" || mockStarting === "evening-session"}
                  onClick={() => handleLaunchWorkout("evening")}
                >
                  {isStartingType === "evening" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Launching Session...</span>
                    </>
                  ) : initialData?.eveningSession.status === "in_progress" ? (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Resume Evening Decompression</span>
                    </>
                  ) : initialData?.eveningSession.status === "completed" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Completed Today (Restart)</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>
                        {initialData?.eveningSession.routine
                          ? `Start ${initialData.eveningSession.routine.name}`
                          : "Start Evening Decompression"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Weekly Activity Timeline Bar */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Weekly Activity &amp; Consistency
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Track completion across your 7-day posture routine cycle
              </CardDescription>
            </div>
            <Link
              href="/progress"
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>View Analytics</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center">
            {[
              { day: "Mon", morning: true, evening: true },
              { day: "Tue", morning: true, evening: true },
              { day: "Wed", morning: true, evening: false },
              { day: "Thu", morning: true, evening: true },
              { day: "Fri", morning: true, evening: true },
              { day: "Sat", morning: true, evening: false, today: true },
              { day: "Sun", morning: false, evening: false },
            ].map((d) => (
              <div
                key={d.day}
                className={`rounded-xl p-2.5 border transition-all ${
                  d.today
                    ? "border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500"
                    : "border-slate-100 bg-slate-50/60"
                }`}
              >
                <span className={`block text-xs font-bold ${d.today ? "text-emerald-900" : "text-slate-700"}`}>
                  {d.day}
                </span>
                <div className="mt-2 flex justify-center gap-1">
                  <span
                    title={d.morning ? "Morning Session Completed" : "Morning Session Pending"}
                    className={`h-2.5 w-2.5 rounded-full ${
                      d.morning ? "bg-amber-500" : "bg-slate-200"
                    }`}
                  />
                  <span
                    title={d.evening ? "Evening Session Completed" : "Evening Session Pending"}
                    className={`h-2.5 w-2.5 rounded-full ${
                      d.evening ? "bg-sky-500" : "bg-slate-200"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-6 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Morning Session Done
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Evening Session Done
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-200" /> Rest / Upcoming
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation Cards */}
      <section aria-labelledby="quick-nav-heading" className="space-y-3">
        <h2 id="quick-nav-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Posture Tools &amp; Resources
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/exercises" className="group">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 group-hover:bg-emerald-100">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">53 Exercise Catalog</h3>
              </div>
              <p className="text-xs text-slate-500">
                Explore setup guides, breathing cues, and beginner modifications.
              </p>
            </div>
          </Link>

          <Link href="/habits" className="group">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 group-hover:bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Ergonomic Habits</h3>
              </div>
              <p className="text-xs text-slate-500">
                Track 45-min desk movement breaks, screen height, and sleep wellness.
              </p>
            </div>
          </Link>

          <Link href="/settings" className="group">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 group-hover:bg-emerald-100">
                  <Award className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Profile &amp; Reminders</h3>
              </div>
              <p className="text-xs text-slate-500">
                Adjust age target (23), session durations, and notification times.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Health & Safety Notice Footer (Subtle Rose Pattern) */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 leading-relaxed shadow-sm">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-rose-950 mb-0.5">LookFit Health &amp; Safety Protocol:</p>
            <p className="text-slate-700">
              Listen to your body at all times. Stop immediately if you experience sharp pain or pinching
              (mild stretching tension and muscular fatigue are normal; joint or nerve pain is not). Posture
              and strength exercises enhance upright spinal alignment and decompression, but cannot lengthen
              bones after growth plates close; standing height is variable and not guaranteed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
