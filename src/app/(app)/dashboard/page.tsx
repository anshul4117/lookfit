import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileQuery } from "@/server/queries/profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard — LookFit",
  description: "Your posture and mobility workout dashboard.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileResult = await getProfileQuery();
  const profile = profileResult.success ? profileResult.data : null;
  const isOnboardingComplete = Boolean(profile?.onboarding_complete);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1
          id="dashboard-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Dashboard
        </h1>
        <p id="welcome-message" className="text-sm text-slate-600">
          Welcome, {profile?.display_name || user?.email || "User"}.
        </p>
      </header>

      {/* Onboarding State Detection */}
      {!isOnboardingComplete ? (
        <Card
          id="onboarding-prompt-card"
          className="border-emerald-200 bg-emerald-50/40 shadow-sm"
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
                aria-hidden="true"
              >
                !
              </span>
              <CardTitle className="text-lg text-emerald-950">
                Action Required: Complete Your Posture Profile
              </CardTitle>
            </div>
            <CardDescription className="text-emerald-800">
              Personalized morning activation and evening decompression routines
              cannot be generated until your profile is completed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700">
              Set your target age (default 23), select upper-back posture and spinal
              mobility focus areas, and configure your daily session duration.
            </p>
            <div>
              <Link href="/settings">
                <Button id="onboarding-cta-button">
                  Complete Onboarding Setup &rarr;
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card id="profile-status-card" className="border-slate-200/90 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <CardTitle className="text-lg">Posture &amp; Mobility Profile Active</CardTitle>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                Onboarding Complete
              </span>
            </div>
            <CardDescription>
              Your personal profile is calibrated and ready for daily routine generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="block text-slate-400">Target Age</span>
                <span className="font-semibold text-slate-800">
                  {profile?.age_years ?? 23} years
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="block text-slate-400">Session Target</span>
                <span className="font-semibold text-slate-800">
                  {profile?.available_minutes ?? 20} min
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="block text-slate-400">Fitness Level</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {profile?.fitness_level ?? "Intermediate"}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="block text-slate-400">Timezone</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {profile?.timezone ?? "Asia/Kolkata"}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/settings"
                className="text-xs font-medium text-primary hover:underline underline-offset-4"
              >
                Edit Posture &amp; Mobility Preferences &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
