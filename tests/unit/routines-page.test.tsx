import { describe, expect, it, vi, beforeEach } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/routines",
}));

// Mock server queries for RoutinesPage
vi.mock("@/server/queries/routines", () => ({
  getUserRoutinesQuery: vi.fn(),
  getPrebuiltRoutinesQuery: vi.fn(),
}));

import { getUserRoutinesQuery, getPrebuiltRoutinesQuery } from "@/server/queries/routines";
import RoutinesPage from "@/app/(app)/routines/page";

const mockPrebuiltRoutines = [
  {
    id: "prebuilt-morning" as const,
    name: "Morning Posture & Lean Strength",
    session_type: "morning" as const,
    estimated_minutes: 25,
    focus: "Spinal Mobility, Core Stability & Functional Strength",
    description: "An invigorating 25-minute sequence.",
    exercises: [
      {
        exercise_id: "00000000-0000-0000-0000-000000000001",
        slug: "cat-cow",
        name: "Cat-Cow",
        category: "posture_spine",
        difficulty: "beginner",
        position: 1,
        prescribed_sets: 1,
        prescribed_reps: 10,
        prescribed_duration_seconds: null,
        rest_seconds: 15,
        target_areas: ["spine", "back"],
        instructions: ["Start on hands and knees."],
        safety_notes: "Move comfortably.",
      },
    ],
  },
  {
    id: "prebuilt-evening" as const,
    name: "Evening Spinal Mobility & Decompression",
    session_type: "evening" as const,
    estimated_minutes: 20,
    focus: "Joint Release, Muscle Lengthening & Deep Relaxation",
    description: "A calming 20-minute recovery routine.",
    exercises: [
      {
        exercise_id: "00000000-0000-0000-0000-000000000002",
        slug: "child-pose",
        name: "Child's Pose",
        category: "stretching",
        difficulty: "beginner",
        position: 1,
        prescribed_sets: 2,
        prescribed_reps: null,
        prescribed_duration_seconds: 45,
        rest_seconds: 20,
        target_areas: ["lower_back", "hips"],
        instructions: ["Kneel and sit back."],
        safety_notes: "",
      },
    ],
  },
];

describe("RoutinesPage First-Time Experience with Filter Query Parameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrebuiltRoutinesQuery).mockResolvedValue({
      success: true,
      data: mockPrebuiltRoutines,
    });
  });

  it("displays prebuilt blueprints when first-time user visits /routines?type=morning", async () => {
    // User has no saved routines for morning or overall
    vi.mocked(getUserRoutinesQuery).mockResolvedValue({
      success: true,
      data: [],
    });

    const pageElement = await RoutinesPage({
      searchParams: Promise.resolve({ type: "morning" }),
    });

    render(pageElement);

    // Verifies header title
    expect(screen.getByRole("heading", { level: 1, name: /^Workout Plan$/i })).toBeInTheDocument();

    // Verifies pre-built blueprints section is displayed (NOT "No workout routines found for this filter")
    expect(screen.getByText(/Pre-built Workout Plan Blueprints/i)).toBeInTheDocument();
    expect(screen.getByText(/Morning Posture & Lean Strength/i)).toBeInTheDocument();
    expect(screen.getByText(/Evening Spinal Mobility & Decompression/i)).toBeInTheDocument();
    expect(screen.queryByText(/No workout routines found for this filter/i)).not.toBeInTheDocument();

    // Verifies Adopt and Customize buttons exist
    expect(screen.getAllByRole("button", { name: /Adopt This Routine/i }).length).toBe(2);
    expect(screen.getAllByRole("link", { name: /Customize in Editor/i }).length).toBe(2);
  });

  it("displays prebuilt blueprints when first-time user visits /routines?type=evening", async () => {
    vi.mocked(getUserRoutinesQuery).mockResolvedValue({
      success: true,
      data: [],
    });

    const pageElement = await RoutinesPage({
      searchParams: Promise.resolve({ type: "evening" }),
    });

    render(pageElement);

    expect(screen.getByText(/Pre-built Workout Plan Blueprints/i)).toBeInTheDocument();
    expect(screen.getByText(/Evening Spinal Mobility & Decompression/i)).toBeInTheDocument();
    expect(screen.getByText(/Child's Pose/i)).toBeInTheDocument();
    expect(screen.queryByText(/No workout routines found for this filter/i)).not.toBeInTheDocument();
  });

  it("displays empty state when user filters by status=archived and has no archived routines", async () => {
    vi.mocked(getUserRoutinesQuery).mockResolvedValue({
      success: true,
      data: [],
    });

    const pageElement = await RoutinesPage({
      searchParams: Promise.resolve({ status: "archived" }),
    });

    render(pageElement);

    expect(screen.getByText(/No archived routine versions/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pre-built Workout Plan Blueprints/i)).not.toBeInTheDocument();
  });
});
