import * as React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDashboardDataQuery } from "@/server/queries/dashboard";
import { DashboardContent } from "@/components/features/dashboard/dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard — LookFit: Lean Physique & Strength",
  description:
    "Your lean physique, bodyweight strength, and postural alignment workout dashboard.",
};

export default async function DashboardPage() {
  const dashboardResult = await getDashboardDataQuery();

  if (!dashboardResult.success) {
    if (dashboardResult.error.code === "UNAUTHENTICATED") {
      redirect("/login");
    }

    return (
      <DashboardContent
        error={
          dashboardResult.error.message ||
          "Unable to load dashboard data. Please check your connection and try again."
        }
      />
    );
  }

  const dashboardData = dashboardResult.data;

  return (
    <DashboardContent
      user={dashboardData.user}
      initialData={dashboardData}
    />
  );
}
