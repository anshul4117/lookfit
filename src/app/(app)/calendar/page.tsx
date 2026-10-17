import * as React from "react";
import type { Metadata } from "next";
import { getCalendarSessionsQuery } from "@/server/queries/calendar";
import { CalendarView } from "@/components/features/calendar/calendar-view";

export const metadata: Metadata = {
  title: "Calendar & Workout History — LookFit",
  description: "Review completed posture and spinal mobility workout sessions across your local calendar.",
};

export default async function CalendarPage() {
  const result = await getCalendarSessionsQuery();
  const sessions = result.success ? result.data : null;

  return <CalendarView initialSessions={sessions} />;
}
