import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

  afterEach(() => {
    vi.useRealTimers();
  });

  function setupMockSupabase({
    timezone = "Asia/Kolkata",
    sessions = [],
    measurements = [],
  }: {
    timezone?: string;
    sessions?: unknown[];
    measurements?: unknown[];
  } = {}) {
    const mock = {
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
              data: { timezone },
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
            resolve({ data: sessions, error: null });
          };
          return b;
        }
        if (table === "body_measurements") {
          const b: Record<string, unknown> = {};
          b.select = vi.fn().mockReturnValue(b);
          b.eq = vi.fn().mockReturnValue(b);
          b.order = vi.fn().mockReturnValue(b);
          b.then = (resolve: (arg: unknown) => void) => {
            resolve({ data: measurements, error: null });
          };
          return b;
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mock);
    return mock;
  }

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

    setupMockSupabase({
      timezone: "Asia/Kolkata",
      sessions: mockSessions,
      measurements: mockMeasurements,
    });

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

  it("correctly aligns weekly chart from Monday to Sunday when today is Sunday", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T10:00:00.000Z"));

    const mockSessions = [
      {
        id: "sess-mon",
        activity_date: "2026-10-12",
        duration_seconds: 1200,
        session_type: "morning",
        completed_at: "2026-10-12T07:00:00Z",
      },
      {
        id: "sess-sun",
        activity_date: "2026-10-18",
        duration_seconds: 900,
        session_type: "evening",
        completed_at: "2026-10-18T18:00:00Z",
      },
    ];

    setupMockSupabase({ timezone: "UTC", sessions: mockSessions });

    const result = await getProgressDataQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeklyData).toHaveLength(7);
      expect(result.data.weeklyData.map((d) => d.day)).toEqual([
        "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
      ]);
      // Monday 2026-10-12
      expect(result.data.weeklyData[0]).toEqual({
        day: "Mon",
        morning: 20,
        evening: 0,
      });
      // Sunday 2026-10-18
      expect(result.data.weeklyData[6]).toEqual({
        day: "Sun",
        morning: 0,
        evening: 15,
      });
      // Midweek days have 0 minutes
      expect(result.data.weeklyData[1].morning).toBe(0);
      expect(result.data.weeklyData[5].morning).toBe(0);
    }
  });

  it("correctly aligns weekly chart when today is Monday", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T10:00:00.000Z"));

    const mockSessions = [
      {
        id: "sess-prev-sun",
        activity_date: "2026-10-18",
        duration_seconds: 1200,
        session_type: "morning",
        completed_at: "2026-10-18T07:00:00Z",
      },
      {
        id: "sess-curr-mon",
        activity_date: "2026-10-19",
        duration_seconds: 1800,
        session_type: "morning",
        completed_at: "2026-10-19T07:00:00Z",
      },
    ];

    setupMockSupabase({ timezone: "UTC", sessions: mockSessions });

    const result = await getProgressDataQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeklyData).toHaveLength(7);
      // Monday 2026-10-19 is day 0 of the new week
      expect(result.data.weeklyData[0]).toEqual({
        day: "Mon",
        morning: 30,
        evening: 0,
      });
      // Sunday 2026-10-18 was from previous week, so Sun of current week is 0
      expect(result.data.weeklyData[6]).toEqual({
        day: "Sun",
        morning: 0,
        evening: 0,
      });
    }
  });

  it("derives weekday from user timezone instead of server timezone across midnight boundary", async () => {
    vi.useFakeTimers();
    // 20:00:00Z on Sunday Oct 18 in UTC, but 01:30:00 on Monday Oct 19 in Asia/Kolkata (+05:30)
    vi.setSystemTime(new Date("2026-10-18T20:00:00.000Z"));

    const mockSessions = [
      {
        id: "sess-mon-kolkata",
        activity_date: "2026-10-19",
        duration_seconds: 1500,
        session_type: "morning",
        completed_at: "2026-10-19T01:30:00Z",
      },
    ];

    setupMockSupabase({ timezone: "Asia/Kolkata", sessions: mockSessions });

    const result = await getProgressDataQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeklyData).toHaveLength(7);
      // The user's todayDate is 2026-10-19 (Mon).
      // Monday must be index 0 of current week, not shifted into Sunday.
      expect(result.data.weeklyData[0]).toEqual({
        day: "Mon",
        morning: 25,
        evening: 0,
      });
      expect(result.data.weeklyData[6]).toEqual({
        day: "Sun",
        morning: 0,
        evening: 0,
      });
    }
  });

  it("correctly aligns weekly chart across a year boundary", async () => {
    vi.useFakeTimers();
    // Thursday Jan 1, 2026
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));

    const mockSessions = [
      {
        id: "sess-prev-year-mon",
        activity_date: "2025-12-29",
        duration_seconds: 1200,
        session_type: "morning",
        completed_at: "2025-12-29T08:00:00Z",
      },
      {
        id: "sess-curr-year-thu",
        activity_date: "2026-01-01",
        duration_seconds: 1800,
        session_type: "evening",
        completed_at: "2026-01-01T18:00:00Z",
      },
    ];

    setupMockSupabase({ timezone: "UTC", sessions: mockSessions });

    const result = await getProgressDataQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeklyData).toHaveLength(7);
      // Monday 2025-12-29
      expect(result.data.weeklyData[0]).toEqual({
        day: "Mon",
        morning: 20,
        evening: 0,
      });
      // Thursday 2026-01-01
      expect(result.data.weeklyData[3]).toEqual({
        day: "Thu",
        morning: 0,
        evening: 30,
      });
      // Sunday 2026-01-04
      expect(result.data.weeklyData[6]).toEqual({
        day: "Sun",
        morning: 0,
        evening: 0,
      });
    }
  });
});
