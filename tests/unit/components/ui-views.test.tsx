import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardContent } from "@/components/features/dashboard/dashboard-content";
import { WorkoutPlayer } from "@/components/features/workout/workout-player";
import { CalendarView } from "@/components/features/calendar/calendar-view";
import { HabitsView } from "@/components/features/habits/habits-view";
import {
  DesktopNavigation,
  MobileBottomNavigation,
} from "@/components/features/navigation/app-nav";
import { PrebuiltRoutinesView } from "@/components/features/routines/prebuilt-routines-view";
import type { PrebuiltRoutineDetail } from "@/server/queries/routines";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

describe("LookFit Frontend UI Smoke and Interaction Tests", () => {
  it("renders DashboardContent with streak bar, session cards, and safety disclaimer", () => {
    render(
      <DashboardContent
        user={{
          displayName: "Anshul",
          email: "anshul@lookfit.test",
          timezone: "Asia/Kolkata",
          availableMinutes: 25,
          fitnessLevel: "intermediate",
          isOnboardingComplete: true,
        }}
      />
    );

    expect(screen.getByText(/Welcome back, Anshul!/i)).toBeInTheDocument();
    expect(screen.getByText(/Lean Physique, Functional Strength/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Morning Activation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Evening Decompression/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Active Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Stop immediately if you experience sharp pain/i)).toBeInTheDocument();
  });

  it("renders onboarding prompt card on dashboard when onboarding is incomplete", () => {
    render(
      <DashboardContent
        user={{
          displayName: "New User",
          email: "new@lookfit.test",
          timezone: "Asia/Kolkata",
          availableMinutes: 20,
          fitnessLevel: "intermediate",
          isOnboardingComplete: false,
        }}
      />
    );

    expect(screen.getByText(/Action Required: Complete Your Posture Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete Onboarding Setup/i)).toBeInTheDocument();
  });

  it("renders WorkoutPlayer with exercise details, hold timer, and safety protocol", () => {
    render(<WorkoutPlayer sessionId="morning-session" />);

    expect(screen.getByText(/Morning Activation Routine/i)).toBeInTheDocument();
    expect(screen.getByText(/Cat-Cow Stretch/i)).toBeInTheDocument();
    expect(screen.getByText(/Safety Protocol:/i)).toBeInTheDocument();
    expect(screen.getByText(/Beginner Modification Available/i)).toBeInTheDocument();
  });

  it("renders CalendarView with month title, filters, and activity details", () => {
    render(<CalendarView />);

    expect(screen.getByText(/Workout Calendar & History/i)).toBeInTheDocument();
    expect(screen.getByText(/October 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Selected Date Activity/i)).toBeInTheDocument();
  });

  it("renders HabitsView with core habits and 7-day matrix", () => {
    render(<HabitsView />);

    expect(screen.getByText(/Daily Posture Habits/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Restorative Sleep/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/45-Minute Movement Breaks/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Eye-Level Screen Alignment/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/7-Day Consistency Matrix/i)).toBeInTheDocument();
  });

  it("renders DesktopNavigation with 'Workout Plan' pointing to /routines", () => {
    render(<DesktopNavigation />);

    const link = screen.getByRole("link", { name: /Workout Plan/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/routines");
    expect(link).toHaveAttribute("id", "nav-routines");
  });

  it("renders MobileBottomNavigation with 'Workout Plan' pointing to /routines", () => {
    render(<MobileBottomNavigation />);

    const link = screen.getByRole("link", { name: /Workout Plan/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/routines");
    expect(link).toHaveAttribute("id", "mobile-nav-routines");
  });

  it("renders PrebuiltRoutinesView for first-time review with both blueprints, safety cues, and no auto-start", () => {
    const mockRoutines: PrebuiltRoutineDetail[] = [
      {
        id: "prebuilt-morning",
        name: "Morning Posture & Lean Strength Activation",
        session_type: "morning",
        estimated_minutes: 25,
        focus: "Thoracic extension, posture alignment, abs/core stability, and lean bodyweight strength.",
        description: "Equipment-free morning routine designed to awaken posture.",
        exercises: [
          {
            exercise_id: "ex-1",
            slug: "cat-cow",
            name: "Cat-Cow Stretch",
            category: "posture_spine",
            difficulty: "beginner",
            position: 1,
            prescribed_sets: 2,
            prescribed_reps: 10,
            prescribed_duration_seconds: null,
            rest_seconds: 15,
            target_areas: ["spine", "back"],
            instructions: ["Start on hands and knees.", "Inhale arch, exhale round."],
            safety_notes: "Move comfortably. Stop for sharp pain.",
            alternative_slug: undefined,
            alternative_name: undefined,
          },
        ],
      },
      {
        id: "prebuilt-evening",
        name: "Evening Spinal Mobility & Decompression Recovery",
        session_type: "evening",
        estimated_minutes: 20,
        focus: "Gentle spinal decompression, chest opening, hip flexor release, and relaxation.",
        description: "Restorative evening sequence for decompression.",
        exercises: [
          {
            exercise_id: "ex-2",
            slug: "child-pose",
            name: "Child's Pose",
            category: "flexibility_mobility",
            difficulty: "beginner",
            position: 1,
            prescribed_sets: 2,
            prescribed_reps: null,
            prescribed_duration_seconds: 40,
            rest_seconds: 15,
            target_areas: ["lower_back", "hips"],
            instructions: ["Kneel and sit back onto heels.", "Reach arms forward."],
            safety_notes: "Place a folded towel under knees if sensitive.",
            alternative_slug: undefined,
            alternative_name: undefined,
          },
        ],
      },
    ];

    render(<PrebuiltRoutinesView routines={mockRoutines} />);

    // Check headings and copy
    expect(screen.getByText(/Recommended Starting Workout Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Morning Posture & Lean Strength Activation/i)).toBeInTheDocument();
    expect(screen.getByText(/Evening Spinal Mobility & Decompression Recovery/i)).toBeInTheDocument();
    expect(screen.getByText(/~25 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/~20 minutes/i)).toBeInTheDocument();

    // Verify both Adopt buttons exist
    const adoptBtns = screen.getAllByRole("button", { name: /Adopt This Routine/i });
    expect(adoptBtns).toHaveLength(2);
    expect(adoptBtns[0]).toHaveAttribute("id", "adopt-prebuilt-morning-button");
    expect(adoptBtns[1]).toHaveAttribute("id", "adopt-prebuilt-evening-button");

    // Verify Customize links exist with template query params
    const customizeLinks = screen.getAllByRole("link", { name: /Customize in Editor/i });
    expect(customizeLinks).toHaveLength(2);
    expect(customizeLinks[0]).toHaveAttribute("href", "/routines/new?template=morning");
    expect(customizeLinks[1]).toHaveAttribute("href", "/routines/new?template=evening");

    // Verify Rule 07 posture & health disclaimer
    expect(screen.getByText(/Posture, Mobility & Safety Guidelines/i)).toBeInTheDocument();
    expect(screen.getByText(/adult height increase cannot be guaranteed/i)).toBeInTheDocument();
    expect(screen.getByText(/Stop immediately if you feel sharp pain/i)).toBeInTheDocument();
  });
});
