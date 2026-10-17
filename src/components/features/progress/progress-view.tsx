"use client";

import * as React from "react";
import {
  Flame,
  Award,
  Clock,
  TrendingUp,
  Calendar,
  ShieldAlert,
  Plus,
  Scale,
  PieChart,
  Loader2,
} from "lucide-react";
import { createMeasurementAction } from "@/server/actions/measurements";
import type { ProgressData } from "@/server/queries/progress";
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

const WEEKLY_DATA = [
  { day: "Mon", morning: 22, evening: 18 },
  { day: "Tue", morning: 24, evening: 19 },
  { day: "Wed", morning: 20, evening: 0 },
  { day: "Thu", morning: 25, evening: 18 },
  { day: "Fri", morning: 22, evening: 20 },
  { day: "Sat", morning: 24, evening: 0 },
  { day: "Sun", morning: 0, evening: 15 },
];

const MONTHLY_TREND = [
  { week: "Week 1", sessions: 8, minutes: 165 },
  { week: "Week 2", sessions: 10, minutes: 210 },
  { week: "Week 3", sessions: 9, minutes: 190 },
  { week: "Week 4", sessions: 11, minutes: 235 },
];

interface MeasurementRecord {
  id: string;
  date: string;
  weightKg?: number;
  notes: string;
}

const INITIAL_MEASUREMENTS: MeasurementRecord[] = [
  {
    id: "m-1",
    date: "2026-10-14",
    weightKg: 68.5,
    notes: "Noticeable reduction in mid-back fatigue after 6-hour desk work.",
  },
  {
    id: "m-2",
    date: "2026-10-07",
    weightKg: 68.8,
    notes: "Shoulder blades sit flatter against ribcage during Wall Angels.",
  },
  {
    id: "m-3",
    date: "2026-09-30",
    weightKg: 69.1,
    notes: "Initial posture benchmark recorded.",
  },
];

export function ProgressView({
  initialData,
}: {
  initialData?: ProgressData | null;
} = {}) {
  const [measurements, setMeasurements] = React.useState<MeasurementRecord[]>(
    initialData?.measurements ?? INITIAL_MEASUREMENTS
  );
  const [newWeight, setNewWeight] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const weeklyData = initialData ? initialData.weeklyData : WEEKLY_DATA;
  const monthlyTrend = initialData ? initialData.monthlyTrend : MONTHLY_TREND;

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotes && !newWeight) return;

    const parsedWeight = newWeight ? parseFloat(newWeight) : null;
    const notesValue = newNotes || "Daily alignment check-in.";

    if (initialData) {
      setIsSubmitting(true);
      setSubmitError(null);
      const res = await createMeasurementAction({
        weight_kg: parsedWeight,
        notes: notesValue,
      });

      if (!res.success) {
        setSubmitError(res.error.message);
        setIsSubmitting(false);
        return;
      }

      setMeasurements([
        {
          id: res.data.id,
          date: res.data.measured_at.split("T")[0],
          weightKg: res.data.weight_kg ? Number(res.data.weight_kg) : undefined,
          notes: res.data.notes || notesValue,
        },
        ...measurements,
      ]);
      setNewWeight("");
      setNewNotes("");
      setIsSubmitting(false);
      setShowAddForm(false);
      return;
    }

    const record: MeasurementRecord = {
      id: `m-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      weightKg: parsedWeight ?? undefined,
      notes: notesValue,
    };

    setMeasurements([record, ...measurements]);
    setNewWeight("");
    setNewNotes("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/60 px-3 py-1 text-xs font-semibold text-emerald-800 mb-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          <span>Lean Physique, Strength &amp; Consistency Analytics</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Progress &amp; Analytics
        </h1>
        <p className="text-sm text-slate-600">
          Track bodyweight strength volume, sets and reps logged, weekly training minutes, and posture consistency.
        </p>
      </div>

      {/* Top Key Performance Indicators */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Workouts Completed
              </span>
              <p className="text-xl font-bold text-slate-900">
                {initialData ? `${initialData.kpis.completedSessions} Sessions` : "28 Sessions"}
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
              <p className="text-xl font-bold text-slate-900">
                {initialData ? `${initialData.kpis.currentStreak} Days` : "5 Days"}
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
              <p className="text-xl font-bold text-indigo-950">
                {initialData ? `${initialData.kpis.completedSessions * 5} Sets` : "140 Sets"}
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
              <p className="text-xl font-bold text-slate-900">
                {initialData ? `${initialData.kpis.totalMobilityMinutes} Mins` : "540 Mins"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Minutes Breakdown Chart */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              Weekly Volume (Minutes per Day)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribution between Morning Activation and Evening Decompression
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
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
            </div>
          </CardContent>
        </Card>

        {/* 4-Week Activity Trend Area Chart */}
        <Card className="border-slate-200/90 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              4-Week Consistency Trend
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total monthly mobility volume progression
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement Category Balance */}
      <Card className="border-slate-200/90 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-base font-bold text-slate-900">
              Training Balance &amp; Muscle Focus
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Balanced distribution across full-body strength, defined abs, upper-back posture, and spinal mobility
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
      <Card className="border-slate-200/90 shadow-sm bg-white">
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
            size="sm"
            className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showAddForm ? "Cancel" : "Add Note"}</span>
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* Mandatory Health Disclaimer Regarding Height */}
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
            <form onSubmit={handleAddMeasurement} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
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
                    required
                  />
                </div>
              </div>
              {submitError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                  {submitError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button
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

          {/* Measurement History Table */}
          <div className="rounded-xl border border-slate-100 overflow-hidden">
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
        </CardContent>
      </Card>
    </div>
  );
}
