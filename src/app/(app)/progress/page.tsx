import * as React from "react";
import type { Metadata } from "next";
import { getProgressDataQuery } from "@/server/queries/progress";
import { ProgressView } from "@/components/features/progress/progress-view";

export const metadata: Metadata = {
  title: "Progress & Analytics — LookFit",
  description: "Review weekly posture workout volume, streak records, and alignment notes.",
};

export default async function ProgressPage() {
  const result = await getProgressDataQuery();
  const progressData = result.success ? result.data : null;

  return <ProgressView initialData={progressData} />;
}
