import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/features/auth/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold tracking-tight text-slate-900"
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground"
                aria-hidden="true"
              >
                LF
              </span>
              <span>LookFit</span>
            </Link>

            <nav className="hidden items-center gap-1 sm:flex" aria-label="Main Navigation">
              <Link
                id="nav-dashboard"
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] flex items-center"
              >
                Dashboard
              </Link>
              <Link
                id="nav-exercises"
                href="/exercises"
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] flex items-center"
              >
                Exercise Library
              </Link>
              <Link
                id="nav-settings"
                href="/settings"
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] flex items-center"
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span
              id="user-badge"
              className="hidden max-w-xs truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-block"
            >
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
