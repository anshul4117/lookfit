# Rule 04: UI/UX Engineering, Design System & Accessibility

## 1. Product Aesthetic & Visual Identity
LookFit must feel like a focused, premium fitness companion (akin to Apple Fitness, Strava, or Strong) rather than a generic administrative template or an AI-generated mock-up:
- **Design Tokens**: Use a curated, high-contrast HSL color system implemented via Tailwind CSS tokens.
- **Restraint**: Avoid arbitrary decorative gradients, aggressive glassmorphism, or multi-nested cards.
- **Hierarchy & Whitespace**: Prioritize glanceability and clear typography so users can follow workout timers and instructions from a distance.
- **Shadcn/UI Integration**: Use shadcn/ui components as foundational primitives, customized with LookFit's design tokens and styling conventions.

## 2. Mobile-First Responsive Design
- Design and test all views for mobile screens first (375px+ minimum viewport width).
- Interactive touch targets must meet a minimum size of **44x44px** on mobile viewports.
- In-workout controls (Play, Pause, Next, Finish) must reside in sticky or thumb-friendly bottom action bars for one-handed operation.
- Desktop views should provide structured, centered layouts that do not stretch controls across excessively wide containers.

## 3. Mandatory Component States
Every data-driven view, card, and interaction must provide four distinct functional states:
1. **Loading State**: Smooth skeleton loaders that mirror the dimensions and structure of the incoming content (no abrupt layout shift).
2. **Empty State**: Clear visual indicators accompanied by actionable next steps (e.g., an empty dashboard prompts generating a routine or completing onboarding).
3. **Error State**: User-friendly, contextual error messages with retry buttons for recoverable errors.
4. **Success State**: Immediate visual feedback for completions (e.g. checkmarks on completed sets, celebration banners upon completing a session).

## 4. Workout Player Experience
- **Glanceable Timers**: Large, high-contrast digital displays for countdowns and elapsed intervals.
- **Accessible Instructions**: One-tap access to exercise instructions and safety notes without navigating away or losing in-progress timers.
- **Session Protection**:
  - Provide a confirmation dialog on "Cancel Session" to prevent accidental data loss.
  - Local state persistence so accidental refreshes or browser tab switches do not discard current exercise progress.
- **Real Controls**: Every button and toggle must be fully functional. No decorative or simulated placeholder controls.

## 5. Accessibility (WCAG 2.1 AA Compliance)
- **Semantic HTML**: Proper use of `<main>`, `<nav>`, `<article>`, `<header>`, and `<section>` elements.
- **Heading Hierarchy**: Exactly one `<h1>` per page, followed by logical `<h2>` and `<h3>` structures.
- **Interactive Labels**: Every button, input, and icon-only button must have an explicit `aria-label` or accessible text label.
- **Keyboard Navigation & Focus States**: Full keyboard navigability with visible focus indicators (`focus-visible:ring-2`). Workout player must support keyboard shortcuts (e.g. Space to play/pause).
- **Color Contrast**: Ensure text meets or exceeds WCAG AA contrast standards (minimum 4.5:1 for body text, 3:1 for large text and interactive icons).
