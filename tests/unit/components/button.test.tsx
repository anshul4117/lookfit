import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button Component Smoke Test", () => {
  it("renders sample button component with accessible text", () => {
    render(<Button>Start Morning Activation</Button>);
    const button = screen.getByRole("button", { name: /start morning activation/i });
    expect(button).toBeInTheDocument();
  });
});
