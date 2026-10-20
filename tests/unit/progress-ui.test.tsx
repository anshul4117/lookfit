import { describe, expect, it, vi, beforeEach } from "vitest";
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProgressView } from "@/components/features/progress/progress-view";
import type { ProgressData } from "@/server/queries/progress";
import { createMeasurementAction } from "@/server/actions/measurements";

const mockRefresh = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: mockRefresh,
  }),
  usePathname: () => "/progress",
}));

// Mock createMeasurementAction
vi.mock("@/server/actions/measurements", () => ({
  createMeasurementAction: vi.fn(),
}));

// Mock Recharts ResponsiveContainer to render properly in JSDOM environment
vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 800, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe("ProgressView Component UI & Data Integrity Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders error state with message and functional Retry button", () => {
    render(<ProgressView error="Database connection timed out" />);

    expect(screen.getByText(/Unable to Load Progress Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Database connection timed out/i)).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders honest zero statistics and clear empty states for a user with zero completed workouts", () => {
    const zeroData: ProgressData = {
      kpis: {
        completedSessions: 0,
        currentStreak: 0,
        totalMobilityMinutes: 0,
        activeDays: 0,
      },
      weeklyData: [
        { day: "Mon", morning: 0, evening: 0 },
        { day: "Tue", morning: 0, evening: 0 },
        { day: "Wed", morning: 0, evening: 0 },
        { day: "Thu", morning: 0, evening: 0 },
        { day: "Fri", morning: 0, evening: 0 },
        { day: "Sat", morning: 0, evening: 0 },
        { day: "Sun", morning: 0, evening: 0 },
      ],
      monthlyTrend: [
        { week: "Week 1", sessions: 0, minutes: 0 },
        { week: "Week 2", sessions: 0, minutes: 0 },
        { week: "Week 3", sessions: 0, minutes: 0 },
        { week: "Week 4", sessions: 0, minutes: 0 },
      ],
      measurements: [],
    };

    render(<ProgressView initialData={zeroData} />);

    // Honest zero KPI numbers — no fake 28 sessions, 5 days, or 540 mins
    expect(screen.getByText("0 Sessions")).toBeInTheDocument();
    expect(screen.getByText("0 Days")).toBeInTheDocument();
    expect(screen.getByText("0 Sets")).toBeInTheDocument();
    expect(screen.getByText("0 Mins")).toBeInTheDocument();

    // Chart empty state overlays
    expect(screen.getByText(/No Workout Activity This Week/i)).toBeInTheDocument();
    expect(screen.getByText(/No Past 4-Week Activity Recorded/i)).toBeInTheDocument();

    // Honest measurement empty state — no fake historical rows
    expect(screen.getByText(/No Check-ins Logged Yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Record optional observations about spinal alignment/i)
    ).toBeInTheDocument();

    // Rule 07 health disclaimer
    expect(screen.getByText(/Health, Safety & Height Note:/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot lengthen bones after growth plates close/i)).toBeInTheDocument();
  });

  it("renders populated KPI statistics, real charts, and historical measurement records", () => {
    const populatedData: ProgressData = {
      kpis: {
        completedSessions: 12,
        currentStreak: 4,
        totalMobilityMinutes: 240,
        activeDays: 6,
      },
      weeklyData: [
        { day: "Mon", morning: 25, evening: 0 },
        { day: "Tue", morning: 0, evening: 20 },
        { day: "Wed", morning: 25, evening: 20 },
        { day: "Thu", morning: 0, evening: 0 },
        { day: "Fri", morning: 25, evening: 0 },
        { day: "Sat", morning: 0, evening: 20 },
        { day: "Sun", morning: 0, evening: 0 },
      ],
      monthlyTrend: [
        { week: "Week 1", sessions: 3, minutes: 60 },
        { week: "Week 2", sessions: 4, minutes: 80 },
        { week: "Week 3", sessions: 2, minutes: 40 },
        { week: "Week 4", sessions: 3, minutes: 60 },
      ],
      measurements: [
        {
          id: "meas-1",
          date: "2026-10-18",
          weightKg: 68.2,
          notes: "Upper-back tension visibly relieved after morning routine",
        },
      ],
    };

    render(<ProgressView initialData={populatedData} />);

    // Real KPI numbers
    expect(screen.getByText("12 Sessions")).toBeInTheDocument();
    expect(screen.getByText("4 Days")).toBeInTheDocument();
    expect(screen.getByText("60 Sets")).toBeInTheDocument();
    expect(screen.getByText("240 Mins")).toBeInTheDocument();

    // Empty notices should NOT be shown when data exists
    expect(screen.queryByText(/No Workout Activity This Week/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No Past 4-Week Activity Recorded/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No Check-ins Logged Yet/i)).not.toBeInTheDocument();

    // Real measurement row rendered
    expect(screen.getByText("2026-10-18")).toBeInTheDocument();
    expect(screen.getByText("68.2 kg")).toBeInTheDocument();
    expect(screen.getByText("Upper-back tension visibly relieved after morning routine")).toBeInTheDocument();
  });

  it("submits a new measurement through createMeasurementAction, updates the list, and triggers router.refresh", async () => {
    (createMeasurementAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "meas-new-123",
        user_id: "user-1",
        weight_kg: 69.0,
        height_cm: null,
        notes: "Shoulders feel loose and natural",
        measured_at: "2026-10-20T16:00:00Z",
        created_at: "2026-10-20T16:00:00Z",
      },
    });

    render(<ProgressView initialData={{
      kpis: { completedSessions: 0, currentStreak: 0, totalMobilityMinutes: 0, activeDays: 0 },
      weeklyData: [],
      monthlyTrend: [],
      measurements: [],
    }} />);

    // Click "Add Note" button to open the form
    const toggleButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(toggleButton);

    // Fill in the form fields
    const weightInput = screen.getByLabelText(/Optional Weight/i);
    const notesInput = screen.getByLabelText(/Posture & Alignment Notes/i);

    fireEvent.change(weightInput, { target: { value: "69.0" } });
    fireEvent.change(notesInput, { target: { value: "Shoulders feel loose and natural" } });

    // Submit the form
    const saveButton = screen.getByRole("button", { name: /Save Note/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createMeasurementAction).toHaveBeenCalledWith({
        weight_kg: 69.0,
        notes: "Shoulders feel loose and natural",
      });
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    // Verify new measurement appears in table
    expect(screen.getByText("2026-10-20")).toBeInTheDocument();
    expect(screen.getByText("69 kg")).toBeInTheDocument();
    expect(screen.getByText("Shoulders feel loose and natural")).toBeInTheDocument();
  });

  it("submits a weight-only measurement successfully without notes", async () => {
    (createMeasurementAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: "meas-weight-1",
        user_id: "user-1",
        weight_kg: 72.4,
        height_cm: null,
        notes: null,
        measured_at: "2026-10-20T17:00:00Z",
        created_at: "2026-10-20T17:00:00Z",
      },
    });

    render(<ProgressView initialData={{
      kpis: { completedSessions: 0, currentStreak: 0, totalMobilityMinutes: 0, activeDays: 0 },
      weeklyData: [],
      monthlyTrend: [],
      measurements: [],
    }} />);

    // Open add form
    const toggleButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(toggleButton);

    const weightInput = screen.getByLabelText(/Optional Weight/i);
    fireEvent.change(weightInput, { target: { value: "72.4" } });

    // Submit without notes
    const saveButton = screen.getByRole("button", { name: /Save Note/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createMeasurementAction).toHaveBeenCalledWith({
        weight_kg: 72.4,
      });
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("2026-10-20")).toBeInTheDocument();
    expect(screen.getByText("72.4 kg")).toBeInTheDocument();
  });

  it("does not dispatch server action when both weight and notes are empty", async () => {
    render(<ProgressView initialData={{
      kpis: { completedSessions: 0, currentStreak: 0, totalMobilityMinutes: 0, activeDays: 0 },
      weeklyData: [],
      monthlyTrend: [],
      measurements: [],
    }} />);

    // Open add form
    const toggleButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(toggleButton);

    // Click save with empty fields
    const saveButton = screen.getByRole("button", { name: /Save Note/i });
    fireEvent.click(saveButton);

    // createMeasurementAction should NOT be called
    expect(createMeasurementAction).not.toHaveBeenCalled();
    expect(screen.getByText(/No Check-ins Logged Yet/i)).toBeInTheDocument();
  });

  it("ignores repeated submissions during an in-flight request to prevent duplicate server calls", async () => {
    let resolveAction!: (val: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveAction = resolve;
    });

    (createMeasurementAction as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => pendingPromise);

    render(<ProgressView initialData={{
      kpis: { completedSessions: 0, currentStreak: 0, totalMobilityMinutes: 0, activeDays: 0 },
      weeklyData: [],
      monthlyTrend: [],
      measurements: [],
    }} />);

    // Open form and fill values
    const toggleButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(toggleButton);

    const notesInput = screen.getByLabelText(/Posture & Alignment Notes/i);
    fireEvent.change(notesInput, { target: { value: "Testing re-entrancy protection" } });

    const form = screen.getByText(/Log New Posture Check-in/i).closest("form")!;
    const saveButton = screen.getByRole("button", { name: /Save Note/i });

    // First submit
    fireEvent.click(saveButton);
    expect(createMeasurementAction).toHaveBeenCalledTimes(1);

    // Repeated submissions while in-flight
    fireEvent.submit(form);
    fireEvent.click(saveButton);
    expect(createMeasurementAction).toHaveBeenCalledTimes(1);

    // Now resolve the in-flight request
    resolveAction({
      success: true,
      data: {
        id: "meas-in-flight-1",
        user_id: "user-1",
        weight_kg: null,
        height_cm: null,
        notes: "Testing re-entrancy protection",
        measured_at: "2026-10-20T17:00:00Z",
        created_at: "2026-10-20T17:00:00Z",
      },
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    expect(createMeasurementAction).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Testing re-entrancy protection")).toBeInTheDocument();
  });

  it("handles measurement action failure gracefully, does NOT append local records, and preserves user input", async () => {
    (createMeasurementAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Weight must be a positive number",
      },
    });

    render(<ProgressView initialData={{
      kpis: { completedSessions: 0, currentStreak: 0, totalMobilityMinutes: 0, activeDays: 0 },
      weeklyData: [],
      monthlyTrend: [],
      measurements: [],
    }} />);

    // Open add form
    const toggleButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(toggleButton);

    const weightInput = screen.getByLabelText(/Optional Weight/i);
    const notesInput = screen.getByLabelText(/Posture & Alignment Notes/i);

    fireEvent.change(weightInput, { target: { value: "68.5" } });
    fireEvent.change(notesInput, { target: { value: "Testing failure persistence" } });

    const saveButton = screen.getByRole("button", { name: /Save Note/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createMeasurementAction).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert")).toHaveTextContent("Weight must be a positive number");
    });

    // Verify NO fake local record is in the table; empty state remains
    expect(screen.getByText(/No Check-ins Logged Yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Testing failure persistence")).not.toBeInTheDocument();

    // Verify user input is preserved and not wiped on error
    expect(weightInput).toHaveValue(68.5);
    expect(notesInput).toHaveValue("Testing failure persistence");
  });
});
