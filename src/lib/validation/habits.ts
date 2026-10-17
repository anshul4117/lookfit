import { z } from "zod";

export const HABIT_KEYS = [
  "habit-sleep",
  "habit-movement",
  "habit-ergonomics",
  "habit-nutrition",
] as const;

export type HabitKey = (typeof HABIT_KEYS)[number];

export const toggleHabitSchema = z.object({
  habitKey: z.enum(HABIT_KEYS),
  activityDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
    .optional(),
  completed: z.boolean(),
});

export type ToggleHabitInput = z.infer<typeof toggleHabitSchema>;
