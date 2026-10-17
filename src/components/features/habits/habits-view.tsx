"use client";

import * as React from "react";
import {
  CheckCircle2,
  Moon,
  Footprints,
  Monitor,
  Utensils,
  Sparkles,
  Flame,
  Check,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { toggleDailyHabitAction } from "@/server/actions/habits";
import type { HabitDataModel, HabitsData } from "@/server/queries/habits";
import type { HabitKey } from "@/lib/validation/habits";

interface HabitItem extends HabitDataModel {
  icon: React.ComponentType<{ className?: string }>;
}

const HABIT_ICONS: Record<HabitKey, React.ComponentType<{ className?: string }>> = {
  "habit-sleep": Moon,
  "habit-movement": Footprints,
  "habit-ergonomics": Monitor,
  "habit-nutrition": Utensils,
};

const INITIAL_FALLBACK_HABITS: HabitDataModel[] = [
  {
    id: "habit-sleep",
    title: "Restorative Sleep",
    target: "7–8 Hours",
    category: "recovery",
    description:
      "Support spinal decompression and tissue repair with adequate sleep in a supportive alignment.",
    completed: true,
    history: [true, true, true, false, true, true, true],
  },
  {
    id: "habit-movement",
    title: "45-Minute Movement Breaks",
    target: "Standing & Walking",
    category: "ergonomics",
    description:
      "Break prolonged seated postures every 45 minutes with a brief standing stretch or walk.",
    completed: true,
    history: [true, true, false, true, true, true, true],
  },
  {
    id: "habit-ergonomics",
    title: "Eye-Level Screen Alignment",
    target: "Counter Forward Head",
    category: "posture",
    description:
      "Keep the top third of your display at eye level to prevent excessive neck flexion and cervical strain.",
    completed: false,
    history: [false, true, true, true, true, true, false],
  },
  {
    id: "habit-nutrition",
    title: "Balanced Protein Nutrition",
    target: "Whole Foods",
    category: "recovery",
    description:
      "Incorporate balanced, protein-containing meals to fuel muscle recovery without restrictive dieting.",
    completed: true,
    history: [true, true, true, true, false, true, true],
  },
];

interface HabitsViewProps {
  initialData?: HabitsData;
}

export function HabitsView({ initialData }: HabitsViewProps) {
  const [habitsData, setHabitsData] = React.useState<HabitDataModel[]>(
    initialData?.habits || INITIAL_FALLBACK_HABITS
  );
  const [streakDays, setStreakDays] = React.useState<number>(
    initialData ? initialData.streakDays : 4
  );

  const daysOfWeek = initialData?.daysOfWeek || [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Today",
  ];
  const todayDate = initialData?.todayDate;

  // Sync state if initialData changes
  React.useEffect(() => {
    if (initialData) {
      setHabitsData(initialData.habits);
      setStreakDays(initialData.streakDays);
    }
  }, [initialData]);

  const habits: HabitItem[] = habitsData.map((h) => ({
    ...h,
    icon: HABIT_ICONS[h.id] || Monitor,
  }));

  const toggleHabit = async (id: HabitKey) => {
    const currentHabit = habitsData.find((h) => h.id === id);
    if (!currentHabit) return;

    const newCompleted = !currentHabit.completed;

    // Optimistic update
    setHabitsData((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const newHistory = [...h.history];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = newCompleted;
          }
          return {
            ...h,
            completed: newCompleted,
            history: newHistory,
          };
        }
        return h;
      })
    );

    // Call persistent server action
    try {
      const res = await toggleDailyHabitAction({
        habitKey: id,
        completed: newCompleted,
        activityDate: todayDate,
      });

      if (!res.success) {
        // Rollback on rejection
        setHabitsData((prev) =>
          prev.map((h) => (h.id === id ? currentHabit : h))
        );
      }
    } catch {
      // Rollback on network failure
      setHabitsData((prev) =>
        prev.map((h) => (h.id === id ? currentHabit : h))
      );
    }
  };

  const completedCount = habits.filter((h) => h.completed).length;
  const completionPercentage = Math.round(
    (completedCount / habits.length) * 100
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/60 px-3 py-1 text-xs font-semibold text-emerald-800 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Ergonomics &amp; Daily Wellness Support</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Daily Posture Habits
          </h1>
          <p className="text-sm text-slate-600">
            Form sustainable habits supporting workplace ergonomics, movement frequency, and restorative sleep.
          </p>
        </div>

        {/* Today's Score Pill */}
        <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-3 shadow-sm">
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Today&apos;s Habits
            </span>
            <p className="text-base font-bold text-slate-900">
              {completedCount} / {habits.length} ({completionPercentage}%)
            </p>
          </div>
        </div>
      </div>

      {/* Habits Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* 4 Interactive Habit Cards */}
      <section aria-labelledby="habits-list-heading" className="space-y-4">
        <h2 id="habits-list-heading" className="text-lg font-bold text-slate-900">
          Today&apos;s Core Habits Checklist
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {habits.map((habit) => (
            <Card
              key={habit.id}
              className={`border transition-all cursor-pointer ${
                habit.completed
                  ? "border-emerald-300 bg-emerald-50/30 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
              }`}
              onClick={() => toggleHabit(habit.id)}
            >
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`rounded-xl p-2.5 shrink-0 ${
                      habit.completed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <habit.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {habit.target}
                      </span>
                    </div>
                    <h3
                      className={`text-base font-bold transition-colors ${
                        habit.completed
                          ? "text-emerald-950 line-through decoration-emerald-500/50"
                          : "text-slate-900"
                      }`}
                    >
                      {habit.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {habit.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  {habit.completed ? (
                    <div className="rounded-full bg-emerald-600 p-1 text-white shadow-sm">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="rounded-full border-2 border-slate-300 p-1 text-transparent hover:border-emerald-500">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 7-Day Consistency Matrix */}
      <Card className="border-slate-200/90 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                7-Day Consistency Matrix
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Habit completion history across your recent week
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span>{streakDays}-Day Habit Streak</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Habit Focus</th>
                {daysOfWeek.map((d, i) => (
                  <th
                    key={`${d}-${i}`}
                    className={`py-2.5 px-3 text-center ${
                      i === daysOfWeek.length - 1 ? "text-emerald-700" : ""
                    }`}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {habits.map((habit) => (
                <tr key={habit.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <habit.icon className="h-4 w-4 text-slate-500" />
                    <span>{habit.title}</span>
                  </td>
                  {habit.history.map((isDone, idx) => (
                    <td key={idx} className="py-3 px-3 text-center">
                      {isDone ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px]">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-300 text-[10px]">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Ergonomic Desk Setup Guide */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-base font-bold text-slate-900">
              Workstation Ergonomic Blueprint
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Quick ergonomic reference for maintaining spinal alignment during sedentary hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs text-slate-600">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-1">
              <span className="font-bold text-slate-900 block">1. Display Height</span>
              <p className="text-slate-500 leading-relaxed">
                Position your display at arm&apos;s length. The top third of the monitor should be at eye level so your neck remains neutral.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-1">
              <span className="font-bold text-slate-900 block">2. Arm &amp; Wrist Support</span>
              <p className="text-slate-500 leading-relaxed">
                Elbows should rest near a 90-degree angle with shoulders relaxed. Avoid hunching upper traps while typing.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-1">
              <span className="font-bold text-slate-900 block">3. Feet &amp; Pelvis</span>
              <p className="text-slate-500 leading-relaxed">
                Keep both feet flat on the floor or an ergonomic footrest. Sit fully back into the chair with lumbar curvature supported.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
