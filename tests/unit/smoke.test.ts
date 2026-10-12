import { describe, it, expect } from "vitest";
import { z } from "zod";
import { cn } from "@/lib/utils";

describe("T01 Setup & Utility Smoke Tests", () => {
  it("merges tailwind classes cleanly via cn utility", () => {
    const result = cn("p-4 text-sm", "text-lg", { "font-bold": true, "opacity-50": false });
    expect(result).toBe("p-4 text-lg font-bold");
  });

  it("validates data correctly with Zod", () => {
    const ProfileSchema = z.object({
      age: z.number().int().min(10).max(100),
      routineTag: z.enum(["morning", "evening", "both"]),
    });

    const validData = ProfileSchema.safeParse({ age: 23, routineTag: "morning" });
    expect(validData.success).toBe(true);

    const invalidData = ProfileSchema.safeParse({ age: 150, routineTag: "afternoon" });
    expect(invalidData.success).toBe(false);
  });
});
