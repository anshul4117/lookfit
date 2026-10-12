import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  updateProfileSettingsAction,
  completeOnboardingAction,
} from "@/server/actions/profile";
import { isProfileEligibleForPlanning } from "@/lib/domain/profile";
import { getProfileQuery } from "@/server/queries/profile";
import type { Tables } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

type ProfileRecord = Tables<"profiles">;

function createMockProfile(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    user_id: "user-1111-1111-1111",
    display_name: "Test User",
    age_years: 23,
    fitness_level: "intermediate",
    goals: ["mobility", "posture", "strength"],
    limitations: ["wrist discomfort"],
    available_minutes: 20,
    timezone: "Asia/Kolkata",
    morning_time: "06:30:00",
    evening_time: "18:30:00",
    reminders_enabled: true,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("T07: Profile Queries, Actions & Domain Eligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isProfileEligibleForPlanning (Domain Eligibility Guard)", () => {
    it("returns true for a fully completed profile", () => {
      const profile = createMockProfile();
      expect(isProfileEligibleForPlanning(profile)).toBe(true);
    });

    it("returns false if profile is null or undefined", () => {
      expect(isProfileEligibleForPlanning(null)).toBe(false);
      expect(isProfileEligibleForPlanning(undefined)).toBe(false);
    });

    it("returns false if onboarding is incomplete", () => {
      const profile = createMockProfile({ onboarding_complete: false });
      expect(isProfileEligibleForPlanning(profile)).toBe(false);
    });

    it("returns false if age is missing or out of valid boundary", () => {
      expect(
        isProfileEligibleForPlanning(createMockProfile({ age_years: null }))
      ).toBe(false);
      expect(
        isProfileEligibleForPlanning(createMockProfile({ age_years: 9 }))
      ).toBe(false);
      expect(
        isProfileEligibleForPlanning(createMockProfile({ age_years: 101 }))
      ).toBe(false);
    });

    it("returns false if goals array is empty", () => {
      expect(
        isProfileEligibleForPlanning(createMockProfile({ goals: [] }))
      ).toBe(false);
    });

    it("returns false if available minutes is outside boundary", () => {
      expect(
        isProfileEligibleForPlanning(createMockProfile({ available_minutes: 4 }))
      ).toBe(false);
      expect(
        isProfileEligibleForPlanning(createMockProfile({ available_minutes: 121 }))
      ).toBe(false);
    });
  });

  describe("getProfileQuery", () => {
    it("returns UNAUTHENTICATED error when no user session exists", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("No session"),
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getProfileQuery();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("queries profile under user ownership and returns row data", async () => {
      const mockProfile = createMockProfile();
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockProfile.user_id } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getProfileQuery();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockProfile);
      }
    });

    it("safely handles a legitimately missing profile row without error", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-new-id" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getProfileQuery();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe("updateProfileSettingsAction", () => {
    it("strictly rejects client attempts to supply user_id or onboarding_complete", async () => {
      const withUserId = await updateProfileSettingsAction({
        user_id: "forged-user-id",
        available_minutes: 30,
      });
      expect(withUserId.success).toBe(false);
      if (!withUserId.success) {
        expect(withUserId.error.code).toBe("VALIDATION_ERROR");
        expect(withUserId.error.details?.user_id).toBeDefined();
      }

      const withOnboarding = await updateProfileSettingsAction({
        onboarding_complete: true,
        available_minutes: 30,
      });
      expect(withOnboarding.success).toBe(false);
      if (!withOnboarding.success) {
        expect(withOnboarding.error.code).toBe("VALIDATION_ERROR");
        expect(withOnboarding.error.details?.onboarding_complete).toBeDefined();
      }
    });

    it("updates only valid settings fields and does not mutate onboarding_complete", async () => {
      const mockProfile = createMockProfile({ available_minutes: 25 });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockProfile.user_id } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await updateProfileSettingsAction({
        available_minutes: 25,
      });

      expect(result.success).toBe(true);
      // Ensure update payload does NOT contain onboarding_complete
      const payloadPassedToUpdate = mockUpdate.mock.calls[0]?.[0];
      expect(payloadPassedToUpdate).toEqual({ available_minutes: 25 });
      expect(payloadPassedToUpdate.onboarding_complete).toBeUndefined();
    });
  });

  describe("completeOnboardingAction", () => {
    it("strictly rejects client-supplied user_id", async () => {
      const result = await completeOnboardingAction({
        user_id: "forged-id",
        age_years: 23,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("sets onboarding_complete: true on the server upon valid onboarding submission", async () => {
      const mockProfile = createMockProfile({ onboarding_complete: true });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockProfile.user_id } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await completeOnboardingAction({
        age_years: 23,
        fitness_level: "intermediate",
        goals: ["mobility", "posture"],
        available_minutes: 20,
        timezone: "Asia/Kolkata",
        morning_time: "06:30",
        evening_time: "18:30",
      });

      expect(result.success).toBe(true);
      const payloadPassedToUpdate = mockUpdate.mock.calls[0]?.[0];
      expect(payloadPassedToUpdate.onboarding_complete).toBe(true);
    });
  });
});
