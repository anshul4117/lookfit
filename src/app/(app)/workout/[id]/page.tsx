import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkoutSessionByIdQuery } from "@/server/services/workout-service";
import { WorkoutPlayer } from "@/components/features/workout/workout-player";

export const metadata: Metadata = {
  title: "Workout Session Player — LookFit",
  description: "Guided posture and mobility workout execution with timers and safety cues.",
};

interface WorkoutPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const { id } = await params;

  if (id !== "morning-session" && id !== "evening-session") {
    const sessionResult = await getWorkoutSessionByIdQuery(id);
    if (!sessionResult.success || !sessionResult.data) {
      notFound();
    }
    return <WorkoutPlayer sessionId={id} initialSession={sessionResult.data} />;
  }

  return <WorkoutPlayer sessionId={id} />;
}
