/**
 * src/server/services/planner-service.ts
 *
 * Authenticated service layer for the T09 deterministic routine planner.
 *
 * Responsibilities:
 *  - Derive user identity via supabase.auth.getUser() (never trusts client-supplied user_id).
 *  - Verify profile eligibility before invoking the planner.
 *  - Fetch the active exercise catalog via Supabase (RLS enforced).
 *  - Delegate to the pure generatePlan() function.
 *  - Return typed ActionResult<PlannerOutput>.
 *
 * No planning logic lives here. See src/lib/planner.ts for the pure function.
 */

import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
} from "@/lib/errors";
import { isProfileEligibleForPlanning } from "@/lib/domain/profile";
import { generatePlan } from "@/lib/planner";
import type { PlannerOutput } from "@/lib/validation/planner";
import type { SessionType } from "@/lib/validation/routine";
import type { ExerciseCatalogItem } from "@/lib/validation/planner";

/**
 * Generates a deterministic morning or evening routine for the authenticated user.
 *
 * Returns:
 *  - success + PlannerOutput on a valid plan.
 *  - UNAUTHENTICATED if no valid session exists.
 *  - FORBIDDEN if the profile is incomplete (onboarding not finished).
 *  - NO_SAFE_PLAN if the planner cannot build a safe plan under the user's constraints.
 *  - INTERNAL_ERROR for unexpected infrastructure failures (message is sanitized).
 *
 * Health & Safety:
 *  - Mandatory Rule 05 disclaimers are produced by generatePlan() and
 *    passed through verbatim in PlannerOutput.safetyNotes.
 */
export async function generateUserRoutinePlan(
  sessionType: SessionType
): Promise<ActionResult<PlannerOutput>> {
  try {
    const supabase = await createClient();

    // Step 1: Authenticate — always derive identity from the server session.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Step 2: Load profile under RLS (user_id filter is enforced by RLS,
    // but we also pass user.id explicitly to avoid any ambiguity).
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      const sanitized = sanitizeError(profileError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    // Step 3: Verify profile eligibility before planning.
    if (!isProfileEligibleForPlanning(profile)) {
      return createErrorResult(
        "FORBIDDEN",
        "Complete your profile setup before generating a routine plan."
      );
    }

    // TypeScript narrowing: isProfileEligibleForPlanning guarantees non-null fields.
    // The following casts are safe by the domain helper's documented contract.
    const ageYears = profile!.age_years;
    const fitnessLevel = profile!.fitness_level;
    const goals = profile!.goals as string[];
    const limitations = (profile!.limitations ?? []) as string[];
    const availableMinutes = profile!.available_minutes;

    // Step 4: Fetch active exercise catalog under RLS.
    // RLS allows authenticated users SELECT access to is_active exercises only.
    const { data: rawCatalog, error: catalogError } = await supabase
      .from("exercises")
      .select("*")
      .eq("is_active", true)
      .order("slug", { ascending: true });

    if (catalogError) {
      const sanitized = sanitizeError(catalogError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!rawCatalog || rawCatalog.length === 0) {
      return createErrorResult(
        "NO_SAFE_PLAN",
        "The exercise catalog is empty. Please contact support."
      );
    }

    // Step 5: Map DB rows to the planner's ExerciseCatalogItem type.
    // All fields are directly from the exercises table Row type.
    const catalog: ExerciseCatalogItem[] = rawCatalog.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      routine_tags: row.routine_tags,
      goal_tags: row.goal_tags,
      target_areas: row.target_areas,
      equipment: row.equipment,
      instructions: row.instructions,
      safety_notes: row.safety_notes,
      is_active: row.is_active,
      default_sets: row.default_sets,
      default_reps: row.default_reps,
      default_duration_seconds: row.default_duration_seconds,
      default_rest_seconds: row.default_rest_seconds,
    }));

    // Step 6: Invoke the pure planner.
    const result = generatePlan({
      profile: {
        fitnessLevel,
        goals,
        limitations,
        availableMinutes,
        ageYears,
      },
      sessionType,
      catalog,
    });

    if (!result.success) {
      // Forward the typed NO_SAFE_PLAN error from the pure planner.
      return createErrorResult(
        result.error.code,
        result.error.message,
        // Wrap reasons array into a record so createErrorResult can accept it.
        result.error.reasons.length > 0
          ? { reasons: result.error.reasons }
          : undefined
      );
    }

    return createSuccessResult(result.data);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
