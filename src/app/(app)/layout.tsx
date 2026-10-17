import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/features/auth/sign-out-button";
import { DesktopNavigation, MobileBottomNavigation } from "@/components/features/navigation/app-nav";
import { Settings } from "lucide-react";

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
              className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900"
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white shadow-sm"
                aria-hidden="true"
              >
                LF
              </span>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight">LookFit</span>
                <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase leading-none hidden sm:inline">
                  Lean Physique &amp; Strength
                </span>
              </div>
            </Link>

            <DesktopNavigation />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              id="user-badge"
              className="hidden max-w-xs truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-block"
            >
              {user.email}
            </span>
            <Link
              href="/settings"
              id="mobile-header-settings"
              className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Settings & Profile"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 pb-20 sm:px-6 lg:px-8 md:pb-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <MobileBottomNavigation />
    </div>
  );
}
