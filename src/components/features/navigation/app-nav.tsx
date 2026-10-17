"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Settings,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  id: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", id: "nav-dashboard", icon: LayoutDashboard },
  { name: "Routines", href: "/routines", id: "nav-routines", icon: Dumbbell },
  { name: "Exercises", href: "/exercises", id: "nav-exercises", icon: BookOpen },
  { name: "Calendar", href: "/calendar", id: "nav-calendar", icon: Calendar },
  { name: "Progress", href: "/progress", id: "nav-progress", icon: TrendingUp },
  { name: "Habits", href: "/habits", id: "nav-habits", icon: CheckCircle2 },
  { name: "Settings", href: "/settings", id: "nav-settings", icon: Settings },
];

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            id={item.id}
            href={item.href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] ${
              isActive
                ? "bg-emerald-50 text-emerald-800 font-bold"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <item.icon className={`h-4 w-4 ${isActive ? "text-emerald-700" : "text-slate-400"}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-1 py-1 backdrop-blur-md md:hidden shadow-lg"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-6 items-center">
        {NAV_ITEMS.slice(0, 6).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              id={`mobile-${item.id}`}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 text-[9px] font-medium min-h-[48px] rounded-lg transition-colors ${
                isActive
                  ? "text-emerald-700 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <item.icon
                className={`h-4.5 w-4.5 mb-0.5 ${
                  isActive ? "text-emerald-600" : "text-slate-400"
                }`}
              />
              <span className="truncate max-w-full text-center">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
