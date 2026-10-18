import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
import type { DashboardData } from "@/server/queries/dashboard";

const mockRefresh = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: mockRefresh,
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
            alternative_slug: "prone-w-raise",
            alternative_name: "Prone W Raise (Floor-Based Alternative)",
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

    // Verify alternative renders clean catalog name without hardcoded wall/doorway suffix
    expect(screen.getByText(/Prone W Raise \(Floor-Based Alternative\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/if no wall\/doorway available/i)).not.toBeInTheDocument();

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

  it("protects existing routines when activeRoutineTypes indicates custom routine exists", () => {
    const mockRoutines: PrebuiltRoutineDetail[] = [
      {
        id: "prebuilt-morning",
        name: "Morning Posture & Lean Strength Activation",
        session_type: "morning",
        estimated_minutes: 25,
        focus: "Thoracic extension, posture alignment.",
        description: "Equipment-free morning routine.",
        exercises: [],
      },
      {
        id: "prebuilt-evening",
        name: "Evening Spinal Mobility & Decompression Recovery",
        session_type: "evening",
        estimated_minutes: 20,
        focus: "Gentle spinal decompression.",
        description: "Restorative evening sequence.",
        exercises: [],
      },
    ];

    render(
      <PrebuiltRoutinesView
        routines={mockRoutines}
        activeRoutineTypes={["morning"]}
      />
    );

    // Morning card shows Active Routine Exists badge and disables Adopt button
    expect(screen.getAllByText(/Active Routine Exists/i).length).toBeGreaterThan(0);
    const morningAdoptBtn = screen.getByRole("button", { name: /Active Routine Exists/i });
    expect(morningAdoptBtn).toBeDisabled();

    // Evening card still allows adoption
    const eveningAdoptBtn = screen.getByRole("button", { name: /Adopt This Routine/i });
    expect(eveningAdoptBtn).not.toBeDisabled();
  });

  it("prioritizes and expands the requested session type when initialSessionType is set", () => {
    const mockRoutines: PrebuiltRoutineDetail[] = [
      {
        id: "prebuilt-morning",
        name: "Morning Posture Plan",
        session_type: "morning",
        estimated_minutes: 25,
        focus: "Morning posture",
        description: "Morning description",
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
            target_areas: ["spine"],
            instructions: ["Hands and knees."],
            safety_notes: "",
          },
        ],
      },
      {
        id: "prebuilt-evening",
        name: "Evening Recovery Plan",
        session_type: "evening",
        estimated_minutes: 20,
        focus: "Evening decompression",
        description: "Evening description",
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
            prescribed_duration_seconds: 45,
            rest_seconds: 15,
            target_areas: ["lower_back"],
            instructions: ["Sit on heels."],
            safety_notes: "",
          },
        ],
      },
    ];

    render(
      <PrebuiltRoutinesView
        routines={mockRoutines}
        initialSessionType="evening"
      />
    );

    // Evening exercise list is expanded by default
    expect(screen.getByText(/Child's Pose/i)).toBeInTheDocument();
  });

  it("renders DashboardContent error state and triggers refresh on retry", () => {
    mockRefresh.mockClear();

    render(
      <DashboardContent
        error="Unable to connect to database"
      />
    );

    expect(screen.getByText(/Unable to Load Dashboard Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to database/i)).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders DashboardContent with honest zero statistics and unconfigured routine state", () => {
    const zeroData: DashboardData = {
      user: {
        displayName: "New Starter",
        email: "starter@lookfit.test",
        timezone: "Asia/Kolkata",
        availableMinutes: 20,
        fitnessLevel: "intermediate",
        isOnboardingComplete: true,
        todayFormatted: "Sunday, Oct 18",
      },
      streak: {
        activeStreak: 0,
        longestStreak: 0,
      },
      stats: {
        totalSessionsDone: 0,
        totalMobilityMinutes: 0,
      },
      weeklyActivity: [
        { day: "Mon", date: "2026-10-12", morning: false, evening: false, isToday: false },
        { day: "Tue", date: "2026-10-13", morning: false, evening: false, isToday: false },
        { day: "Wed", date: "2026-10-14", morning: false, evening: false, isToday: false },
        { day: "Thu", date: "2026-10-15", morning: false, evening: false, isToday: false },
        { day: "Fri", date: "2026-10-16", morning: false, evening: false, isToday: false },
        { day: "Sat", date: "2026-10-17", morning: false, evening: false, isToday: false },
        { day: "Sun", date: "2026-10-18", morning: false, evening: false, isToday: true },
      ],
      morningSession: {
        routine: null,
        status: "not_started",
        completedAt: undefined,
        activeSessionId: undefined,
      },
      eveningSession: {
        routine: null,
        status: "not_started",
        completedAt: undefined,
        activeSessionId: undefined,
      },
    };

    render(<DashboardContent initialData={zeroData} />);

    // Honest zero statistics — no fake 5 days or 460 min
    expect(screen.getAllByText("0 Days")).toHaveLength(2);
    expect(screen.getByText("0 Total")).toBeInTheDocument();
    expect(screen.getByText("0 Min")).toBeInTheDocument();

    // Honest unconfigured routine state with CTA to Workout Plan
    const noRoutineBadges = screen.getAllByText(/No Routine Adopted/i);
    expect(noRoutineBadges.length).toBe(2);

    const planButtons = screen.getAllByRole("button", { name: /Choose Plan in Workout Plan/i });
    expect(planButtons.length).toBe(2);

    // Formatted date from server
    expect(screen.getByText(/Sunday, Oct 18/i)).toBeInTheDocument();
  });

  it("renders DashboardContent weekly activity with real dots and current day highlight", () => {
    const weeklyData: DashboardData = {
      user: {
        displayName: "Active Athlete",
        email: "athlete@lookfit.test",
        timezone: "Asia/Kolkata",
        availableMinutes: 25,
        fitnessLevel: "intermediate",
        isOnboardingComplete: true,
        todayFormatted: "Sunday, Oct 18",
      },
      streak: {
        activeStreak: 3,
        longestStreak: 5,
      },
      stats: {
        totalSessionsDone: 4,
        totalMobilityMinutes: 90,
      },
      weeklyActivity: [
        { day: "Mon", date: "2026-10-12", morning: true, evening: false, isToday: false },
        { day: "Tue", date: "2026-10-13", morning: false, evening: true, isToday: false },
        { day: "Wed", date: "2026-10-14", morning: true, evening: true, isToday: false },
        { day: "Thu", date: "2026-10-15", morning: false, evening: false, isToday: false },
        { day: "Fri", date: "2026-10-16", morning: false, evening: false, isToday: false },
        { day: "Sat", date: "2026-10-17", morning: false, evening: false, isToday: false },
        { day: "Sun", date: "2026-10-18", morning: true, evening: false, isToday: true },
      ],
      morningSession: {
        routine: {
          id: "routine-m1",
          name: "Morning Posture Flow",
          sessionType: "morning",
          estimatedMinutes: 20,
          exerciseCount: 5,
          exercisesSummary: ["Cat-Cow", "Glute Bridge"],
        },
        status: "completed",
        completedAt: "2026-10-18T08:00:00Z",
        activeSessionId: undefined,
      },
      eveningSession: {
        routine: {
          id: "routine-e1",
          name: "Evening Decompression",
          sessionType: "evening",
          estimatedMinutes: 15,
          exerciseCount: 4,
          exercisesSummary: ["Child's Pose", "Kneeling Quad Stretch"],
        },
        status: "not_started",
        completedAt: undefined,
        activeSessionId: undefined,
      },
    };

    render(<DashboardContent initialData={weeklyData} />);

    // Real stats
    expect(screen.getByText("3 Days")).toBeInTheDocument();
    expect(screen.getByText("4 Total")).toBeInTheDocument();
    expect(screen.getByText("90 Min")).toBeInTheDocument();

    // Morning routine completed badge and review button
    expect(screen.getByText(/Completed Today/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Completed Today \(Restart\)/i })).toBeInTheDocument();

    // Evening routine ready to start
    expect(screen.getByRole("button", { name: /Start Evening Decompression/i })).toBeInTheDocument();

    // Check weekly activity days rendered
    const weeklyLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const label of weeklyLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
