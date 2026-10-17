import * as React from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfileQuery } from "@/server/queries/profile";
import { getDashboardDataQuery } from "@/server/queries/dashboard";
import { DashboardContent } from "@/components/features/dashboard/dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard — LookFit: Lean Physique & Strength",
  description:
    "Your lean physique, bodyweight strength, and postural alignment workout dashboard.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, dashboardResult] = await Promise.all([
    getProfileQuery(),
    getDashboardDataQuery(),
  ]);

  const profile = profileResult.success ? profileResult.data : null;
  const dashboardData = dashboardResult.success ? dashboardResult.data : null;

  return (
    <DashboardContent
      user={{
        displayName:
          dashboardData?.user.displayName ||
          profile?.display_name ||
          user?.email?.split("@")[0] ||
          "Athlete",
        email: user?.email || "",
        timezone: dashboardData?.user.timezone || profile?.timezone || "Asia/Kolkata",
        availableMinutes: dashboardData?.user.availableMinutes || profile?.available_minutes || 20,
        fitnessLevel: dashboardData?.user.fitnessLevel || profile?.fitness_level || "intermediate",
        isOnboardingComplete:
          dashboardData?.user.isOnboardingComplete ?? Boolean(profile?.onboarding_complete),
      }}
      initialData={dashboardData}
    />
  );
}
