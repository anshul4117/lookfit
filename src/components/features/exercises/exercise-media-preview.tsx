import * as React from "react";
import type { ExerciseCategory } from "@/lib/validation/exercise-filters";
import {
  Activity,
  Sparkles,
  Shield,
  Zap,
  Flame,
  ArrowUpCircle,
  ArrowDownCircle,
  Layers,
  Heart,
} from "lucide-react";

interface ExerciseMediaPreviewProps {
  mediaUrl: string | null;
  name: string;
  category: ExerciseCategory;
  className?: string;
}

/**
 * Returns an accessible icon and color theme per exercise category
 * for graceful media fallback representation.
 */
function getCategoryVisual(category: ExerciseCategory) {
  switch (category) {
    case "posture_spine":
      return {
        icon: Activity,
        bgClass: "bg-indigo-50/80 text-indigo-600 border-indigo-100",
        label: "Spinal Alignment",
      };
    case "mobility":
      return {
        icon: Sparkles,
        bgClass: "bg-purple-50/80 text-purple-600 border-purple-100",
        label: "Joint Mobility",
      };
    case "stretching":
      return {
        icon: Heart,
        bgClass: "bg-teal-50/80 text-teal-600 border-teal-100",
        label: "Flexibility & Stretch",
      };
    case "core":
      return {
        icon: Shield,
        bgClass: "bg-emerald-50/80 text-emerald-600 border-emerald-100",
        label: "Core Stability",
      };
    case "posture":
      return {
        icon: Layers,
        bgClass: "bg-blue-50/80 text-blue-600 border-blue-100",
        label: "Posture Correction",
      };
    case "push":
      return {
        icon: ArrowUpCircle,
        bgClass: "bg-amber-50/80 text-amber-600 border-amber-100",
        label: "Upper Push",
      };
    case "pull":
      return {
        icon: ArrowDownCircle,
        bgClass: "bg-sky-50/80 text-sky-600 border-sky-100",
        label: "Upper Pull",
      };
    case "legs":
      return {
        icon: Flame,
        bgClass: "bg-rose-50/80 text-rose-600 border-rose-100",
        label: "Lower Body",
      };
    case "cardio":
      return {
        icon: Zap,
        bgClass: "bg-orange-50/80 text-orange-600 border-orange-100",
        label: "Activation & Cardio",
      };
    default:
      return {
        icon: Activity,
        bgClass: "bg-slate-50 text-slate-600 border-slate-200",
        label: "Movement",
      };
  }
}

/**
 * Renders an exercise media illustration or a graceful category-branded fallback.
 * Adheres to WCAG contrast standards and prevents layout shifting.
 */
export function ExerciseMediaPreview({
  mediaUrl,
  name,
  category,
  className = "h-40 w-full",
}: ExerciseMediaPreviewProps) {
  const visual = getCategoryVisual(category);
  const IconComponent = visual.icon;

  if (mediaUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt={`Demonstration of ${name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Visual demonstration fallback for ${name} (${visual.label})`}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl border ${visual.bgClass} p-4 transition-colors ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 shadow-xs ring-1 ring-black/5">
        <IconComponent className="h-6 w-6" aria-hidden="true" />
      </div>
      <span className="mt-2 text-xs font-semibold tracking-wide">
        {visual.label}
      </span>
      <span className="text-[10px] text-slate-500">
        Equipment-Free Movement
      </span>
    </div>
  );
}
