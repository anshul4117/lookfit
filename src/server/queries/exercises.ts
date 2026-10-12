import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
} from "@/lib/errors";
import type { ExerciseFilterInput } from "@/lib/validation/exercise-filters";

export type ExerciseRecord = Tables<"exercises">;

/**
 * Server query to fetch exercises matching catalog filters under PostgreSQL RLS.
 * Derives user identity from supabase.auth.getUser().
 * Ordinary users have strictly SELECT permissions on active catalog entries.
 */
export async function getExercisesQuery(
  filters?: ExerciseFilterInput
): Promise<ActionResult<ExerciseRecord[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    let query = supabase
      .from("exercises")
      .select("*")
      .eq("is_active", true);

    // Apply category filter
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    // Apply difficulty ceiling filter
    if (filters?.difficulty) {
      query = query.eq("difficulty", filters.difficulty);
    }

    // Apply routine suitability filter
    if (filters?.routine_tag) {
      if (filters.routine_tag === "morning") {
        query = query.overlaps("routine_tags", ["morning", "both"]);
      } else if (filters.routine_tag === "evening") {
        query = query.overlaps("routine_tags", ["evening", "both"]);
      } else if (filters.routine_tag === "both") {
        query = query.contains("routine_tags", ["both"]);
      }
    }

    // Apply text search across name, slug, description
    if (filters?.search && filters.search.trim().length > 0) {
      // Sanitize search string for PostgREST filter pattern
      const sanitizedSearch = filters.search.replace(/[%_,()]/g, " ").trim();
      if (sanitizedSearch.length > 0) {
        query = query.or(
          `name.ilike.%${sanitizedSearch}%,slug.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`
        );
      }
    }

    // Sort deterministically by category, then name
    query = query
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    const { data, error } = await query;

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    let results = data ?? [];

    // In-memory target_areas match enhancement if search was specified
    // (PostgREST array column ILIKE is limited, so we supplement target_areas search here)
    if (filters?.search && filters.search.trim().length > 0) {
      const queryLower = filters.search.trim().toLowerCase();
      // If direct query matched items, keep them; also include items whose target_areas match
      results = results.filter((ex) => {
        const matchesName = ex.name.toLowerCase().includes(queryLower);
        const matchesDesc = ex.description.toLowerCase().includes(queryLower);
        const matchesSlug = ex.slug.toLowerCase().includes(queryLower);
        const matchesTargetAreas = Array.isArray(ex.target_areas) &&
          ex.target_areas.some((area) => area.toLowerCase().includes(queryLower));
        const matchesGoalTags = Array.isArray(ex.goal_tags) &&
          ex.goal_tags.some((tag) => tag.toLowerCase().includes(queryLower));
        return matchesName || matchesDesc || matchesSlug || matchesTargetAreas || matchesGoalTags;
      });
    }

    return createSuccessResult<ExerciseRecord[]>(results);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
  }
}

/**
 * Server query to fetch a single exercise entry by its unique slug.
 */
export async function getExerciseBySlugQuery(
  slug: string
): Promise<ActionResult<ExerciseRecord | null>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    return createSuccessResult<ExerciseRecord | null>(data);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
  }
}
