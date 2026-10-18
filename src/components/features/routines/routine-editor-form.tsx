"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  updateRoutineAction,
  createRoutineAction,
} from "@/server/actions/routines";
import type { RoutineWithExercises } from "@/server/queries/routines";
import type { ExerciseRecord } from "@/server/queries/exercises";
import type { SessionType } from "@/lib/validation/routine";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Dumbbell,
  History,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface EditableExerciseItem {
  id: string; // client temporary ID or existing ID
  exercise_id: string;
  name: string;
  category: string;
  position: number;
  prescribed_sets: number | null;
  target_type: "reps" | "duration";
  prescribed_reps: number | null;
  prescribed_duration_seconds: number | null;
  rest_seconds: number;
}

interface RoutineEditorFormProps {
  initialRoutine?: RoutineWithExercises;
  availableExercises: ExerciseRecord[];
  sessionType?: SessionType;
  mode?: "create" | "edit";
}

export function RoutineEditorForm({
  initialRoutine,
  availableExercises,
  sessionType = "morning",
  mode,
}: RoutineEditorFormProps) {
  const router = useRouter();
  const isEditing = mode ? mode === "edit" : Boolean(initialRoutine?.id);

  const [name, setName] = React.useState(initialRoutine?.name || `${sessionType === "morning" ? "Morning" : "Evening"} Custom Routine`);
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(
    initialRoutine?.estimated_minutes || 20
  );

  // Initialize editable exercises
  const [exercises, setExercises] = React.useState<EditableExerciseItem[]>(() => {
    if (initialRoutine && initialRoutine.routine_exercises.length > 0) {
      return initialRoutine.routine_exercises.map((item, idx) => ({
        id: item.id || `item-${idx}`,
        exercise_id: item.exercise_id,
        name: item.exercise?.name || "Exercise",
        category: item.exercise?.category || "posture_spine",
        position: idx + 1,
        prescribed_sets: item.prescribed_sets ?? 2,
        target_type: item.prescribed_duration_seconds ? "duration" : "reps",
        prescribed_reps: item.prescribed_reps ?? (item.prescribed_duration_seconds ? null : 10),
        prescribed_duration_seconds: item.prescribed_duration_seconds ?? null,
        rest_seconds: item.rest_seconds ?? 30,
      }));
    }
    return [];
  });

  const [selectedCatalogId, setSelectedCatalogId] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Helper to reorder exercises and normalize sequential 1-indexed positions
  const moveExercise = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= exercises.length) return;

    const updated = [...exercises];
    const temp = updated[index]!;
    updated[index] = updated[newIdx]!;
    updated[newIdx] = temp;

    // Normalize positions
    const normalized = updated.map((item, i) => ({
      ...item,
      position: i + 1,
    }));
    setExercises(normalized);
  };

  const removeExercise = (index: number) => {
    const updated = exercises.filter((_, i) => i !== index);
    const normalized = updated.map((item, i) => ({
      ...item,
      position: i + 1,
    }));
    setExercises(normalized);
  };

  const addExercise = () => {
    if (!selectedCatalogId) return;
    const catalogItem = availableExercises.find((e) => e.id === selectedCatalogId);
    if (!catalogItem) return;

    const newItem: EditableExerciseItem = {
      id: `new-${Date.now()}-${Math.random()}`,
      exercise_id: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      position: exercises.length + 1,
      prescribed_sets: catalogItem.default_sets ?? 2,
      target_type: catalogItem.default_duration_seconds ? "duration" : "reps",
      prescribed_reps: catalogItem.default_reps ?? (catalogItem.default_duration_seconds ? null : 10),
      prescribed_duration_seconds: catalogItem.default_duration_seconds ?? null,
      rest_seconds: catalogItem.default_rest_seconds ?? 30,
    };

    setExercises([...exercises, newItem]);
    setSelectedCatalogId("");
  };

  const updateItemField = <K extends keyof EditableExerciseItem>(
    index: number,
    field: K,
    value: EditableExerciseItem[K]
  ) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index]!, [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter a routine name.");
      return;
    }

    if (exercises.length === 0) {
      setErrorMessage("Routine must contain at least one exercise.");
      return;
    }

    // Prepare exercise payload with strictly unique, sequential positions
    const payloadExercises = exercises.map((item, idx) => ({
      exercise_id: item.exercise_id,
      position: idx + 1,
      prescribed_sets: item.prescribed_sets ? Number(item.prescribed_sets) : null,
      prescribed_reps:
        item.target_type === "reps" && item.prescribed_reps
          ? Number(item.prescribed_reps)
          : null,
      prescribed_duration_seconds:
        item.target_type === "duration" && item.prescribed_duration_seconds
          ? Number(item.prescribed_duration_seconds)
          : null,
      rest_seconds: Number(item.rest_seconds) || 30,
    }));

    setIsSubmitting(true);

    try {
      if (isEditing && initialRoutine) {
        const result = await updateRoutineAction({
          id: initialRoutine.id,
          name: name.trim(),
          estimated_minutes: Number(estimatedMinutes),
          exercises: payloadExercises,
        });

        if (!result.success) {
          setErrorMessage(result.error.message);
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage(
          `Routine updated successfully as Version ${result.data.version}. Previous version archived.`
        );
        setTimeout(() => {
          router.push(`/routines/${result.data.id}`);
          router.refresh();
        }, 800);
      } else {
        const result = await createRoutineAction({
          name: name.trim(),
          session_type: sessionType,
          estimated_minutes: Number(estimatedMinutes),
          status: "active",
          exercises: payloadExercises,
        });

        if (!result.success) {
          setErrorMessage(result.error.message);
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage("Routine created successfully!");
        setTimeout(() => {
          router.push(`/routines/${result.data.id}`);
          router.refresh();
        }, 800);
      }
    } catch {
      setErrorMessage("An unexpected error occurred while saving the routine.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" id="routine-editor-form">
      {/* Versioning Explanation Alert */}
      {isEditing && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-900"
        >
          <History className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-bold text-indigo-950">
              Automatic Versioning Guarantee (v{(initialRoutine?.version || 1) + 1})
            </span>
            <p className="leading-relaxed">
              Saving updates creates a new routine version. Version {initialRoutine?.version} will be
              archived in place. Historical workout sessions linked to Version {initialRoutine?.version} remain
              completely unchanged.
            </p>
          </div>
        </div>
      )}

      {/* Routine Metadata Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Routine Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="routine-name-input" className="text-xs font-semibold">
                Routine Name
              </Label>
              <Input
                id="routine-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning Spine Activation"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="routine-duration-input" className="text-xs font-semibold">
                Estimated Duration (minutes)
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                  id="routine-duration-input"
                  type="number"
                  min={1}
                  max={180}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercises Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Prescribed Exercises ({exercises.length})</span>
          </h2>
        </div>

        {exercises.length === 0 ? (
          <div
            id="editor-empty-exercises"
            className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 text-sm"
          >
            No exercises added yet. Select an exercise below to add to your routine.
          </div>
        ) : (
          <div className="space-y-3" id="editable-exercises-list">
            {exercises.map((item, idx) => (
              <Card
                key={item.id}
                id={`editable-exercise-item-${item.position}`}
                className="border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Position & Name */}
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                      <span className="text-xs text-slate-400 capitalize">
                        {item.category.replace("_", " & ")}
                      </span>
                    </div>
                  </div>

                  {/* Target Controls */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Sets */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <Label htmlFor={`sets-${idx}`} className="text-slate-500 text-[11px]">
                        Sets
                      </Label>
                      <input
                        id={`sets-${idx}`}
                        type="number"
                        min={1}
                        max={20}
                        value={item.prescribed_sets ?? 2}
                        onChange={(e) =>
                          updateItemField(idx, "prescribed_sets", Number(e.target.value))
                        }
                        className="w-12 text-center rounded border border-slate-300 py-0.5 text-xs font-bold"
                      />
                    </div>

                    {/* Target Type Selector */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <select
                        aria-label="Target type"
                        value={item.target_type}
                        onChange={(e) => {
                          const type = e.target.value as "reps" | "duration";
                          updateItemField(idx, "target_type", type);
                          if (type === "reps") {
                            updateItemField(idx, "prescribed_reps", 10);
                            updateItemField(idx, "prescribed_duration_seconds", null);
                          } else {
                            updateItemField(idx, "prescribed_duration_seconds", 30);
                            updateItemField(idx, "prescribed_reps", null);
                          }
                        }}
                        className="rounded border border-slate-300 py-0.5 px-1 text-xs font-semibold bg-white"
                      >
                        <option value="reps">Reps</option>
                        <option value="duration">Hold (s)</option>
                      </select>

                      {item.target_type === "reps" ? (
                        <input
                          id={`reps-${idx}`}
                          aria-label="Prescribed reps"
                          type="number"
                          min={1}
                          max={200}
                          value={item.prescribed_reps ?? 10}
                          onChange={(e) =>
                            updateItemField(idx, "prescribed_reps", Number(e.target.value))
                          }
                          className="w-12 text-center rounded border border-slate-300 py-0.5 text-xs font-bold"
                        />
                      ) : (
                        <input
                          id={`duration-${idx}`}
                          aria-label="Prescribed duration in seconds"
                          type="number"
                          min={5}
                          max={3600}
                          value={item.prescribed_duration_seconds ?? 30}
                          onChange={(e) =>
                            updateItemField(
                              idx,
                              "prescribed_duration_seconds",
                              Number(e.target.value)
                            )
                          }
                          className="w-14 text-center rounded border border-slate-300 py-0.5 text-xs font-bold"
                        />
                      )}
                    </div>

                    {/* Rest Seconds */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <Label htmlFor={`rest-${idx}`} className="text-slate-500 text-[11px]">
                        Rest (s)
                      </Label>
                      <input
                        id={`rest-${idx}`}
                        type="number"
                        min={0}
                        max={600}
                        value={item.rest_seconds ?? 30}
                        onChange={(e) =>
                          updateItemField(idx, "rest_seconds", Number(e.target.value))
                        }
                        className="w-12 text-center rounded border border-slate-300 py-0.5 text-xs font-bold"
                      />
                    </div>

                    {/* Action buttons (Up, Down, Delete) */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() => moveExercise(idx, "up")}
                        aria-label={`Move exercise ${item.name} up`}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === exercises.length - 1}
                        onClick={() => moveExercise(idx, "down")}
                        aria-label={`Move exercise ${item.name} down`}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(idx)}
                        aria-label={`Remove exercise ${item.name}`}
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Exercise Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <select
            id="add-exercise-select"
            aria-label="Select exercise to add"
            value={selectedCatalogId}
            onChange={(e) => setSelectedCatalogId(e.target.value)}
            className="w-full sm:flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select an exercise to add to routine...</option>
            {availableExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.category.replace("_", " & ")}) — {ex.difficulty}
              </option>
            ))}
          </select>

          <Button
            type="button"
            id="add-exercise-button"
            variant="outline"
            size="sm"
            onClick={addExercise}
            disabled={!selectedCatalogId}
            className="w-full sm:w-auto text-xs font-semibold gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Exercise</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div
          role="alert"
          id="routine-editor-error"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          id="routine-editor-success"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          id="save-routine-submit-button"
          disabled={isSubmitting}
          className="font-semibold gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          <span>{isEditing ? `Save as Version ${(initialRoutine?.version || 1) + 1}` : "Create Routine"}</span>
        </Button>
      </div>
    </form>
  );
}
