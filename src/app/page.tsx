import { Activity, ShieldCheck, Sparkles, Sun, Moon } from "lucide-react";

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-between px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-3xl space-y-12">
        {/* Brand Header */}
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-medium text-teal-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Posture &amp; Spinal Mobility Companion</span>
          </div>
          <h1
            id="hero-title"
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Look<span className="text-teal-400">Fit</span>
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
            Daily posture awareness, spinal mobility decompression, and lean
            strength routines. Equipment-free, deterministic, and built for
            healthy alignment.
          </p>
        </header>

        {/* Foundation Pillars */}
        <section
          aria-labelledby="pillars-heading"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <h2 id="pillars-heading" className="sr-only">
            Core Routine Pillars
          </h2>

          <div
            id="pillar-morning"
            className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-teal-500/40"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Sun className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold">Morning Activation</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              20–30 min routines focused on gentle spinal wake-up, upper-back
              engagement, and posture alignment.
            </p>
          </div>

          <div
            id="pillar-evening"
            className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-teal-500/40"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Moon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold">Evening Decompression</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              15–25 min routines targeting thoracic release, hip flexor opening,
              and nervous system relaxation.
            </p>
          </div>
        </section>

        {/* Foundation Status & Health Transparency */}
        <section
          aria-labelledby="architecture-status-heading"
          className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="architecture-status-heading"
                className="text-base font-semibold"
              >
                Foundation Initialized
              </h2>
              <p className="text-xs text-muted-foreground">
                Next.js App Router • Strict TypeScript • Tailwind &amp; shadcn tokens • Supabase Ready
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                App Router Status
              </span>
              <span
                id="app-status"
                className="rounded-full bg-teal-500/10 px-2.5 py-0.5 font-medium text-teal-400"
              >
                Online
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <p>LookFit Personal Fitness • Deterministic Routine Engine</p>
      </footer>
    </main>
  );
}
