import * as React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProgressDataQuery } from "@/server/queries/progress";
import { ProgressView } from "@/components/features/progress/progress-view";

export const metadata: Metadata = {
  title: "Progress & Analytics — LookFit",
  description: "Review weekly posture workout volume, streak records, and alignment notes.",
};

export default async function ProgressPage() {
  const result = await getProgressDataQuery();

  if (!result.success) {
    if (result.error.code === "UNAUTHENTICATED") {
      redirect("/login");
    }

    return (
      <ProgressView
        error={
          result.error.message ||
          "Unable to load progress data. Please check your connection and try again."
        }
      />
    );
  }

  return <ProgressView initialData={result.data} />;
}
