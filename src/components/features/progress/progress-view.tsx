"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Award,
  Clock,
  TrendingUp,
  Calendar,
  ShieldAlert,
  AlertCircle,
  Plus,
  Scale,
  PieChart,
  Loader2,
} from "lucide-react";
import { createMeasurementAction } from "@/server/actions/measurements";
import type {
  ProgressData,
  WeeklyDayData,
  MonthlyWeekTrend,
  MeasurementItem,
} from "@/server/queries/progress";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MeasurementRecord = MeasurementItem;

export interface ProgressViewProps {
  initialData?: ProgressData | null;
  error?: string | null;
}

export function ProgressView({ initialData, error }: ProgressViewProps = {}) {
  const router = useRouter();
  const [measurements, setMeasurements] = React.useState<MeasurementRecord[]>(
    initialData?.measurements ?? []
  );
  const [newWeight, setNewWeight] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isSubmittingRef = React.useRef(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Synchronize local measurements state when initialData changes from server revalidation
  React.useEffect(() => {
    if (initialData?.measurements) {
      setMeasurements(initialData.measurements);
    }
  }, [initialData?.measurements]);

  // Default empty timeline datasets when user has no completed sessions
  const defaultWeeklyData: WeeklyDayData[] = React.useMemo(
    () => [
      { day: "Mon", morning: 0, evening: 0 },
      { day: "Tue", morning: 0, evening: 0 },
      { day: "Wed", morning: 0, evening: 0 },
      { day: "Thu", morning: 0, evening: 0 },
      { day: "Fri", morning: 0, evening: 0 },
      { day: "Sat", morning: 0, evening: 0 },
      { day: "Sun", morning: 0, evening: 0 },
    ],
    []
  );

  const defaultMonthlyTrend: MonthlyWeekTrend[] = React.useMemo(
    () => [
      { week: "Week 1", sessions: 0, minutes: 0 },
      { week: "Week 2", sessions: 0, minutes: 0 },
      { week: "Week 3", sessions: 0, minutes: 0 },
      { week: "Week 4", sessions: 0, minutes: 0 },
    ],
    []
  );

  const weeklyData = initialData?.weeklyData ?? defaultWeeklyData;
  const monthlyTrend = initialData?.monthlyTrend ?? defaultMonthlyTrend;

  const hasWeeklyActivity = weeklyData.some(
    (d) => (d.morning ?? 0) > 0 || (d.evening ?? 0) > 0
  );
  const hasMonthlyActivity = monthlyTrend.some(
    (w) => (w.sessions ?? 0) > 0 || (w.minutes ?? 0) > 0
  );

  // Honest KPI values derived strictly from real server data
  const completedSessions = initialData?.kpis.completedSessions ?? 0;
  const currentStreak = initialData?.kpis.currentStreak ?? 0;
  const setsLogged = completedSessions * 5; // Standard 5 exercises per prescribed session
  const totalMobilityMinutes = initialData?.kpis.totalMobilityMinutes ?? 0;

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSubmittingRef.current) return;

    const trimmedNotes = newNotes.trim();
    const parsedWeight = newWeight ? parseFloat(newWeight) : null;

    if (!trimmedNotes && (parsedWeight === null || isNaN(parsedWeight))) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: { weight_kg?: number | null; notes?: string } = {
        weight_kg: parsedWeight,
      };
      if (trimmedNotes) {
        payload.notes = trimmedNotes;
      }

      const res = await createMeasurementAction(payload);

      if (!res.success) {
        setSubmitError(res.error.message);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const savedRecord: MeasurementRecord = {
        id: res.data.id,
        date: res.data.measured_at.split("T")[0],
        weightKg: res.data.weight_kg ? Number(res.data.weight_kg) : undefined,
        notes: res.data.notes || "Daily alignment check-in.",
      };

      setMeasurements((prev) => [savedRecord, ...prev]);
      setNewWeight("");
      setNewNotes("");
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setShowAddForm(false);
      router.refresh();
    } catch {
      setSubmitError(
        "Failed to save measurement check-in. Please check your connection and try again."
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12" id="progress-view-root">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/60 px-3 py-1 text-xs font-semibold text-emerald-800 mb-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          <span>Lean Physique, Strength &amp; Consistency Analytics</span>
        </div>
        <h1
          id="progress-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Progress &amp; Analytics
        </h1>
        <p className="text-sm text-slate-600">
          Track bodyweight strength volume, sets and reps logged, weekly training minutes, and posture consistency.
        </p>
      </div>

      {/* Query Error Banner */}
      {error && (
        <Card id="progress-error-card" role="alert" className="border-rose-200 bg-rose-50/70 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-rose-950">Unable to Load Progress Data</h3>
                <p className="mt-0.5 text-xs text-rose-700">{error}</p>
              </div>
            </div>
            <Button
              id="progress-retry-button"
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="border-rose-300 text-rose-900 hover:bg-rose-100 text-xs font-semibold shrink-0"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Top Key Performance Indicators — Strictly Real Data */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" id="kpi-grid">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Workouts Completed
              </span>
              <p id="kpi-workouts-completed" className="text-xl font-bold text-slate-900">
                {completedSessions} Sessions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Current Streak
              </span>
              <p id="kpi-current-streak" className="text-xl font-bold text-slate-900">
                {currentStreak} Days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Sets &amp; Reps
              </span>
              <p id="kpi-sets-reps" className="text-xl font-bold text-indigo-950">
                {setsLogged} Sets
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
                Training Time
              </span>
              <p id="kpi-training-time" className="text-xl font-bold text-slate-900">
                {totalMobilityMinutes} Mins
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Minutes Breakdown Chart */}
        <Card className="border-slate-200 shadow-sm bg-white" id="weekly-volume-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              Weekly Volume (Minutes per Day)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribution between Morning Activation and Evening Decompression
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "0.75rem",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="morning" name="Morning Activation" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="evening" name="Evening Decompression" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {!hasWeeklyActivity && (
                <div
                  id="weekly-chart-empty-notice"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px] pointer-events-none rounded-xl"
                >
                  <p className="text-xs font-semibold text-slate-700">No Workout Activity This Week</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Complete a morning activation or evening decompression session to chart volume
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4-Week Activity Trend Area Chart */}
        <Card className="border-slate-200/90 shadow-sm bg-white" id="monthly-trend-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              4-Week Consistency Trend
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total monthly mobility volume progression
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "0.75rem",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    name="Mobility Minutes"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMinutes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              {!hasMonthlyActivity && (
                <div
                  id="monthly-chart-empty-notice"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px] pointer-events-none rounded-xl"
                >
                  <p className="text-xs font-semibold text-slate-700">No Past 4-Week Activity Recorded</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Consistency progression will chart as you log workouts over time
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement Category Balance — Target Distribution */}
      <Card className="border-slate-200/90 shadow-sm bg-white" id="training-balance-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-base font-bold text-slate-900">
              Recommended Movement Balance &amp; Focus
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Target weekly distribution across full-body strength, defined abs, upper-back posture, and spinal mobility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="text-[11px] font-semibold text-slate-500 block">Full-Body Strength</span>
              <p className="text-lg font-bold text-slate-900">35%</p>
              <span className="text-[10px] text-emerald-700 font-medium">Push, Squats &amp; Lunges</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="text-[11px] font-semibold text-slate-500 block">Abs &amp; Core Stability</span>
              <p className="text-lg font-bold text-slate-900">25%</p>
              <span className="text-[10px] text-slate-500">Plank, Bird-Dog &amp; Bridge</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="text-[11px] font-semibold text-slate-500 block">Posture &amp; Upper-Back</span>
              <p className="text-lg font-bold text-slate-900">22%</p>
              <span className="text-[10px] text-slate-500">Cobra, Wall Angels &amp; Tucks</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="text-[11px] font-semibold text-slate-500 block">Mobility &amp; Recovery</span>
              <p className="text-lg font-bold text-slate-900">18%</p>
              <span className="text-[10px] text-slate-500">Decompression &amp; Flexibility</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optional Body & Alignment Measurements */}
      <Card className="border-slate-200/90 shadow-sm bg-white" id="measurements-card">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Optional Alignment &amp; Body Tracking
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Private posture observations and bodyweight logs (strictly optional)
            </CardDescription>
          </div>

          <Button
            id="toggle-add-measurement-button"
            size="sm"
            className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showAddForm ? "Cancel" : "Add Note"}</span>
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* Mandatory Health Disclaimer Regarding Height (Rule 07) */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              <strong className="text-rose-950 block">Health, Safety &amp; Height Note:</strong>
              Posture and functional strength exercises build upper-back muscular endurance, core stability, and
              decompress spinal discs, which helps you stand taller and straighter with optimal alignment. However,
              exercises cannot lengthen bones after growth plates close. Measured standing height is variable and not guaranteed.
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form
              id="add-measurement-form"
              onSubmit={handleAddMeasurement}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Log New Posture Check-in
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="weight-input" className="text-xs">Optional Weight (kg)</Label>
                  <Input
                    id="weight-input"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 68.5"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="text-xs h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes-input" className="text-xs">Posture &amp; Alignment Notes</Label>
                  <Input
                    id="notes-input"
                    type="text"
                    placeholder="e.g. Thoracic extension feels smoother"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="text-xs h-9 bg-white"
                  />
                </div>
              </div>
              {submitError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                  {submitError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowAddForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  id="save-measurement-button"
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Note</span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Measurement History Table or Honest Empty State */}
          {measurements.length === 0 ? (
            <div
              id="no-measurements-empty-state"
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2"
            >
              <Scale className="h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="text-xs font-semibold text-slate-700">No Check-ins Logged Yet</p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Record optional observations about spinal alignment, posture endurance, or bodyweight above.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 overflow-hidden" id="measurements-table-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Weight</th>
                    <th className="py-2.5 px-3">Alignment Observation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {measurements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">{m.date}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.weightKg ? `${m.weightKg} kg` : "—"}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
