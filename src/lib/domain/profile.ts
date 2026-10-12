import type { Tables } from "@/types/database";

export type ProfileRecord = Tables<"profiles">;

/**
 * Domain eligibility helper to evaluate whether a user's profile is fully
 * configured for routine planning.
 *
 * Requirements:
 * - onboarding_complete === true
 * - age_years between 10 and 100
 * - goals is a non-empty array
 * - available_minutes between 5 and 120
 *
 * Note: Used solely as a domain check; authorization boundaries reside strictly
 * in Supabase PostgreSQL RLS and server actions.
 */
export function isProfileEligibleForPlanning(
  profile: ProfileRecord | null | undefined
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.onboarding_complete &&
      profile.age_years != null &&
      profile.age_years >= 10 &&
      profile.age_years <= 100 &&
      Array.isArray(profile.goals) &&
      profile.goals.length > 0 &&
      profile.available_minutes >= 5 &&
      profile.available_minutes <= 120
  );
}
