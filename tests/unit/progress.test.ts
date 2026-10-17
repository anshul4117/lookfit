import { describe, expect, it, vi, beforeEach } from "vitest";
import { getProgressDataQuery } from "@/server/queries/progress";
import { createMeasurementAction } from "@/server/actions/measurements";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("createMeasurementAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns UNAUTHENTICATED when user is not logged in", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "No session" },
        }),
      },
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await createMeasurementAction({
      weight_kg: 68.5,
      notes: "Feeling lighter and upright",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("rejects empty measurement payload", async () => {
    const result = await createMeasurementAction({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("successfully creates measurement record and revalidates cache", async () => {
    const mockRecord = {
      id: "meas-1",
      user_id: USER_ID,
      weight_kg: 68.5,
      height_cm: null,
      notes: "Mid-back tension reduced after desk work",
      measured_at: "2026-10-17T10:00:00Z",
      created_at: "2026-10-17T10:00:00Z",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockRecord,
              error: null,
            }),
          }),
        }),
      }),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await createMeasurementAction({
      weight_kg: 68.5,
      notes: "Mid-back tension reduced after desk work",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weight_kg).toBe(68.5);
      expect(result.data.notes).toBe("Mid-back tension reduced after desk work");
    }
    expect(revalidatePath).toHaveBeenCalledWith("/progress");
  });
});

describe("getProgressDataQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns progress KPIs, chart breakdowns, and measurements", async () => {
    const mockSessions = [
      {
        id: "sess-1",
        activity_date: "2026-10-17",
        duration_seconds: 1200,
        session_type: "morning",
        completed_at: "2026-10-17T02:00:00Z",
      },
      {
        id: "sess-2",
        activity_date: "2026-10-16",
        duration_seconds: 1080,
        session_type: "evening",
        completed_at: "2026-10-16T14:00:00Z",
      },
    ];

    const mockMeasurements = [
      {
        id: "meas-1",
        user_id: USER_ID,
        weight_kg: 68.5,
        height_cm: null,
        notes: "Good alignment",
        measured_at: "2026-10-17T10:00:00Z",
      },
    ];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { timezone: "Asia/Kolkata" },
              error: null,
            }),
          };
        }
        if (table === "workout_sessions") {
          const b: Record<string, unknown> = {};
          b.select = vi.fn().mockReturnValue(b);
          b.eq = vi.fn().mockReturnValue(b);
          b.order = vi.fn().mockReturnValue(b);
          b.then = (resolve: (arg: unknown) => void) => {
            resolve({ data: mockSessions, error: null });
          };
          return b;
        }
        if (table === "body_measurements") {
          const b: Record<string, unknown> = {};
          b.select = vi.fn().mockReturnValue(b);
          b.eq = vi.fn().mockReturnValue(b);
          b.order = vi.fn().mockReturnValue(b);
          b.then = (resolve: (arg: unknown) => void) => {
            resolve({ data: mockMeasurements, error: null });
          };
          return b;
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getProgressDataQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kpis.completedSessions).toBe(2);
      expect(result.data.kpis.totalMobilityMinutes).toBe(38);
      expect(result.data.kpis.activeDays).toBe(2);
      expect(result.data.weeklyData.length).toBe(7);
      expect(result.data.monthlyTrend.length).toBe(4);
      expect(result.data.measurements.length).toBe(1);
      expect(result.data.measurements[0].weightKg).toBe(68.5);
    }
  });
});
