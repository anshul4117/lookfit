import * as React from "react";
import type { Metadata } from "next";
import { HabitsView } from "@/components/features/habits/habits-view";
import { getHabitsDataQuery } from "@/server/queries/habits";

export const metadata: Metadata = {
  title: "Daily Posture Habits — LookFit",
  description:
    "Track workplace ergonomics, 45-minute movement breaks, and restorative sleep habits.",
};

export default async function HabitsPage() {
  const result = await getHabitsDataQuery();

  return <HabitsView initialData={result.success ? result.data : undefined} />;
}
