"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export interface HistoricalSessionItem {
  id: string;
  routineName: string;
  sessionType: "morning" | "evening";
  version: number;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  exercises: {
    name: string;
    category: string;
    prescribedSets: number;
    prescribedReps?: number;
    prescribedDurationSeconds?: number;
  }[];
}

const MOCK_HISTORICAL_SESSIONS: HistoricalSessionItem[] = [
  {
    id: "sess-1",
    routineName: "Morning Posture Alignment",
    sessionType: "morning",
    version: 1,
    date: "2026-10-14",
    durationMinutes: 22,
    exercises: [
      { name: "Cat-Cow Stretch", category: "mobility", prescribedSets: 3, prescribedDurationSeconds: 45 },
      { name: "Bird-Dog", category: "core", prescribedSets: 3, prescribedReps: 10 },
      { name: "Wall Angels", category: "posture_spine", prescribedSets: 2, prescribedReps: 12 },
      { name: "Cobra Pose", category: "posture_spine", prescribedSets: 3, prescribedDurationSeconds: 30 },
      { name: "Bodyweight Squat", category: "legs", prescribedSets: 3, prescribedReps: 15 },
    ],
  },
  {
    id: "sess-2",
    routineName: "Evening Decompression Routine",
    sessionType: "evening",
    version: 1,
    date: "2026-10-14",
    durationMinutes: 18,
    exercises: [
      { name: "Child's Pose", category: "stretching", prescribedSets: 2, prescribedDurationSeconds: 60 },
      { name: "Doorway Chest Stretch", category: "posture_spine", prescribedSets: 3, prescribedDurationSeconds: 40 },
      { name: "Seated Spinal Twist", category: "mobility", prescribedSets: 2, prescribedDurationSeconds: 45 },
      { name: "Sphinx Pose", category: "posture_spine", prescribedSets: 2, prescribedDurationSeconds: 60 },
    ],
  },
  {
    id: "sess-3",
    routineName: "Morning Posture Alignment",
    sessionType: "morning",
    version: 1,
    date: "2026-10-13",
    durationMinutes: 24,
    exercises: [
      { name: "Cat-Cow Stretch", category: "mobility", prescribedSets: 3, prescribedDurationSeconds: 45 },
      { name: "Bird-Dog", category: "core", prescribedSets: 3, prescribedReps: 10 },
      { name: "Wall Angels", category: "posture_spine", prescribedSets: 2, prescribedReps: 12 },
    ],
  },
  {
    id: "sess-4",
    routineName: "Evening Decompression Routine",
    sessionType: "evening",
    version: 1,
    date: "2026-10-12",
    durationMinutes: 16,
    exercises: [
      { name: "Child's Pose", category: "stretching", prescribedSets: 2, prescribedDurationSeconds: 60 },
      { name: "Seated Spinal Twist", category: "mobility", prescribedSets: 2, prescribedDurationSeconds: 45 },
    ],
  },
  {
    id: "sess-5",
    routineName: "Morning Posture Alignment",
    sessionType: "morning",
    version: 1,
    date: "2026-10-11",
    durationMinutes: 20,
    exercises: [
      { name: "Cat-Cow Stretch", category: "mobility", prescribedSets: 3, prescribedDurationSeconds: 45 },
      { name: "Bird-Dog", category: "core", prescribedSets: 3, prescribedReps: 10 },
    ],
  },
  {
    id: "sess-6",
    routineName: "Evening Decompression Routine",
    sessionType: "evening",
    version: 1,
    date: "2026-10-11",
    durationMinutes: 19,
    exercises: [
      { name: "Doorway Chest Stretch", category: "posture_spine", prescribedSets: 3, prescribedDurationSeconds: 40 },
      { name: "Sphinx Pose", category: "posture_spine", prescribedSets: 2, prescribedDurationSeconds: 60 },
    ],
  },
];

export function CalendarView({
  initialSessions,
}: {
  initialSessions?: HistoricalSessionItem[] | null;
} = {}) {
  const now = new Date();
  const [currentYear, setCurrentYear] = React.useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = React.useState(now.getMonth());
  const initialDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = React.useState(initialDateStr);
  const [sessionFilter, setSessionFilter] = React.useState<"all" | "morning" | "evening">("all");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays = React.useMemo(() => {
    const days: { dayNumber: number; dateString: string }[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dayStr = String(i).padStart(2, "0");
      days.push({
        dayNumber: i,
        dateString: `${currentYear}-${monthStr}-${dayStr}`,
      });
    }
    return days;
  }, [currentYear, currentMonth, daysInMonth]);

  // Map sessions by date
  const sessionsByDate = React.useMemo(() => {
    const list =
      initialSessions !== undefined
        ? initialSessions ?? []
        : MOCK_HISTORICAL_SESSIONS;
    const map = new Map<string, HistoricalSessionItem[]>();
    for (const s of list) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return map;
  }, [initialSessions]);

  const selectedSessions = React.useMemo(() => {
    const list = sessionsByDate.get(selectedDate) || [];
    if (sessionFilter === "all") return list;
    return list.filter((s) => s.sessionType === sessionFilter);
  }, [sessionsByDate, selectedDate, sessionFilter]);

  const selectedFormatted = React.useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(dateObj);
  }, [selectedDate]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-3 py-1 text-xs font-semibold text-emerald-800 mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Immutable Historical Records</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Workout Calendar &amp; History
          </h1>
          <p className="text-sm text-slate-600">
            Inspect completed workout sessions and exercise snapshots across your local calendar.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-xs">
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 text-xs font-semibold px-3 ${
              sessionFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
            onClick={() => setSessionFilter("all")}
          >
            All Sessions
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 text-xs font-semibold px-3 gap-1.5 ${
              sessionFilter === "morning" ? "bg-white text-amber-900 shadow-sm" : "text-slate-600"
            }`}
            onClick={() => setSessionFilter("morning")}
          >
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span>Morning</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 text-xs font-semibold px-3 gap-1.5 ${
              sessionFilter === "evening" ? "bg-white text-sky-800 shadow-sm" : "text-slate-600"
            }`}
            onClick={() => setSessionFilter("evening")}
          >
            <Moon className="h-3.5 w-3.5 text-sky-500" />
            <span>Evening</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Calendar Grid Section */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200/90 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg font-bold text-slate-900">
                  {monthNames[currentMonth]} {currentYear}
                </CardTitle>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {/* Blank padding for first day of month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-14 rounded-xl bg-slate-50/30" />
                ))}

                {/* Actual Month Days */}
                {calendarDays.map(({ dayNumber, dateString }) => {
                  const daySessions = sessionsByDate.get(dateString) || [];
                  const isSelected = selectedDate === dateString;
                  const hasMorning = daySessions.some((s) => s.sessionType === "morning");
                  const hasEvening = daySessions.some((s) => s.sessionType === "evening");

                  return (
                    <button
                      key={dateString}
                      onClick={() => setSelectedDate(dateString)}
                      className={`h-14 sm:h-16 rounded-xl border p-1 sm:p-1.5 flex flex-col justify-between text-left transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600"
                          : daySessions.length > 0
                          ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 text-slate-400"
                      }`}
                    >
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? "text-emerald-950 font-black"
                            : daySessions.length > 0
                            ? "text-slate-800"
                            : "text-slate-400"
                        }`}
                      >
                        {dayNumber}
                      </span>

                      {/* Workout Session Badges */}
                      <div className="flex items-center gap-1">
                        {hasMorning && (
                          <span
                            title="Morning Activation Completed"
                            className="h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white"
                          />
                        )}
                        {hasEvening && (
                          <span
                            title="Evening Decompression Completed"
                            className="h-2 w-2 rounded-full bg-sky-500 ring-1 ring-white"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Morning Session
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  Evening Session
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  Rest / Planned
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Session Details Panel */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white h-full">
            <CardHeader className="pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Selected Date Activity
              </span>
              <CardTitle className="text-lg font-bold text-slate-900">
                {selectedFormatted}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {selectedSessions.length === 0
                  ? "No completed sessions on this calendar date."
                  : `${selectedSessions.length} completed session(s) logged.`}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Empty Rest Day State */}
              {selectedSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
                  <div className="mx-auto rounded-full bg-slate-100 p-3 text-slate-400 w-fit">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Rest &amp; Posture Awareness Day</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    No workout recorded on this date. Maintaining screen eye-level alignment and taking
                    brief walking breaks every 45 minutes protects spinal recovery.
                  </p>
                </div>
              ) : (
                /* Sessions List */
                <div className="space-y-4">
                  {selectedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 hover:border-slate-300 transition-colors shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`rounded-xl p-2 ${
                              session.sessionType === "morning"
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-sky-50 text-sky-700 border border-sky-100"
                            }`}
                          >
                            {session.sessionType === "morning" ? (
                              <Sun className="h-4 w-4" />
                            ) : (
                              <Moon className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {session.routineName}
                            </h4>
                            <span className="text-[11px] text-slate-500">
                              Snapshot Version {session.version} • {session.durationMinutes} min duration
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Completed</span>
                        </span>
                      </div>

                      {/* Exercise Snapshot Table */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-600 block">
                          Recorded Exercise Snapshots:
                        </span>
                        <div className="rounded-xl bg-white border border-slate-200/80 p-2.5 space-y-2 text-xs">
                          {session.exercises.map((ex, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-slate-700 border-b border-slate-50 last:border-none pb-1 last:pb-0"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-slate-400 font-mono text-[10px]">{idx + 1}.</span>
                                <span className="font-medium text-slate-800 truncate">{ex.name}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                                {ex.prescribedDurationSeconds
                                  ? `${ex.prescribedSets} × ${ex.prescribedDurationSeconds}s`
                                  : `${ex.prescribedSets} × ${ex.prescribedReps} reps`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                        <span>Immutable Record ID: {session.id}</span>
                        <span className="text-emerald-700 font-medium">Verified RLS Security</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
