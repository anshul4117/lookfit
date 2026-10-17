import { describe, expect, it, vi, beforeEach } from "vitest";
import { toggleHabitSchema } from "@/lib/validation/habits";
import { toggleDailyHabitAction } from "@/server/actions/habits";
import { getHabitsDataQuery } from "@/server/queries/habits";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("toggleHabitSchema", () => {
  it("validates correct habit toggle input", () => {
    const valid = toggleHabitSchema.safeParse({
      habitKey: "habit-sleep",
      completed: true,
      activityDate: "2026-10-17",
    });
    expect(valid.success).toBe(true);
  });

  it("allows omitting activityDate", () => {
    const valid = toggleHabitSchema.safeParse({
      habitKey: "habit-movement",
      completed: false,
    });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid habitKey", () => {
    const invalid = toggleHabitSchema.safeParse({
      habitKey: "habit-invalid-something",
      completed: true,
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects malformed activityDate", () => {
    const invalid = toggleHabitSchema.safeParse({
      habitKey: "habit-ergonomics",
      completed: true,
      activityDate: "17-10-2026",
    });
    expect(invalid.success).toBe(false);
  });
});

describe("toggleDailyHabitAction", () => {
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

    const result = await toggleDailyHabitAction({
      habitKey: "habit-sleep",
      completed: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("rejects invalid habit payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await toggleDailyHabitAction({ habitKey: "invalid" } as any);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("upserts habit entry and revalidates paths on success", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await toggleDailyHabitAction({
      habitKey: "habit-ergonomics",
      completed: true,
      activityDate: "2026-10-17",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completed).toBe(true);
      expect(result.data.activityDate).toBe("2026-10-17");
    }
    expect(revalidatePath).toHaveBeenCalledWith("/habits");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

describe("getHabitsDataQuery", () => {
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

    const result = await getHabitsDataQuery();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("queries 7-day habits and computes streak", async () => {
    const mockHabitsRows = [
      {
        habit_key: "habit-sleep",
        activity_date: "2026-10-17",
        completed: true,
      },
      {
        habit_key: "habit-movement",
        activity_date: "2026-10-17",
        completed: true,
      },
      {
        habit_key: "habit-sleep",
        activity_date: "2026-10-16",
        completed: true,
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
        if (table === "daily_habits") {
          const b: Record<string, unknown> = {};
          b.select = vi.fn().mockReturnValue(b);
          b.eq = vi.fn().mockReturnValue(b);
          b.gte = vi.fn().mockReturnValue(b);
          b.lte = vi.fn().mockReturnValue(b);
          b.order = vi.fn().mockReturnValue(b);
          b.then = (resolve: (arg: unknown) => void) => {
            resolve({ data: mockHabitsRows, error: null });
          };
          return b;
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getHabitsDataQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.habits.length).toBe(4);
      expect(result.data.daysOfWeek.length).toBe(7);
      expect(result.data.daysOfWeek[6]).toBe("Today");

      const sleepHabit = result.data.habits.find((h) => h.id === "habit-sleep");
      expect(sleepHabit).toBeDefined();
      expect(sleepHabit?.completed).toBe(true);
    }
  });
});
