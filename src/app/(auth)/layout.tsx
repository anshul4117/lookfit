import * as React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900">
      <header className="w-full border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground"
              aria-hidden="true"
            >
              LF
            </span>
            <span>LookFit</span>
          </Link>
          <span className="text-xs font-medium text-slate-500">
            Posture &amp; Mobility
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="w-full border-t border-slate-200/80 bg-white/60 px-4 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-3xl space-y-1">
          <p className="font-medium text-slate-600">
            Non-Medical Posture &amp; Mobility Platform
          </p>
          <p className="text-slate-400">
            LookFit provides general exercise, mobility, and posture routines and is
            not a substitute for professional medical advice, diagnosis, or
            treatment.
          </p>
        </div>
      </footer>
    </div>
  );
}
