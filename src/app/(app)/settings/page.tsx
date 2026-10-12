import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getProfileQuery } from "@/server/queries/profile";
import { SettingsForm } from "@/components/features/settings/settings-form";

export const metadata: Metadata = {
  title: "Settings & Profile — LookFit",
  description:
    "Manage your personal Posture & Mobility fitness profile, schedule, and limitations.",
};

export default async function SettingsPage() {
  const profileResult = await getProfileQuery();

  if (!profileResult.success) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1
            id="settings-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Settings &amp; Profile
          </h1>
          <p className="text-sm text-slate-600">
            Configure your posture awareness, spinal mobility, and schedule settings.
          </p>
        </header>

        <div
          id="profile-query-error"
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3"
        >
          <p className="text-sm font-medium text-destructive">
            {profileResult.error.message ||
              "Unable to load profile preferences. Please try again."}
          </p>
          <Link
            href="/settings"
            className="inline-flex h-9 items-center justify-center rounded-md bg-destructive/10 px-4 text-xs font-semibold text-destructive hover:bg-destructive/20"
          >
            Retry Loading Profile
          </Link>
        </div>
      </div>
    );
  }

  const profile = profileResult.data;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1
          id="settings-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          {profile?.onboarding_complete
            ? "Settings & Posture Profile"
            : "Welcome to LookFit — Onboarding"}
        </h1>
        <p className="text-sm text-slate-600">
          {profile?.onboarding_complete
            ? "Manage your physical profile, spinal mobility focus areas, and session times."
            : "Calibrate your personal posture, mobility, and schedule preferences to activate daily routines."}
        </p>
      </header>

      <SettingsForm initialProfile={profile} />
    </div>
  );
}
