import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardContent } from "@/components/features/dashboard/dashboard-content";
import { WorkoutPlayer } from "@/components/features/workout/workout-player";
import { CalendarView } from "@/components/features/calendar/calendar-view";
import { HabitsView } from "@/components/features/habits/habits-view";

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
});
