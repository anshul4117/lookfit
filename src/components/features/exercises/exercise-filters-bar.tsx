"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  EXERCISE_CATEGORIES,
  FITNESS_LEVELS,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
} from "@/lib/validation/exercise-filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, RotateCcw, Filter } from "lucide-react";

export function ExerciseFiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Current values derived from URL query parameters
  const activeSearch = searchParams.get("search") || "";
  const activeCategory = searchParams.get("category") || "";
  const activeRoutine = searchParams.get("routine_tag") || "";
  const activeDifficulty = searchParams.get("difficulty") || "";

  const [searchValue, setSearchValue] = React.useState(activeSearch);

  // Keep local search input synced with URL updates
  React.useEffect(() => {
    setSearchValue(activeSearch);
  }, [activeSearch]);

  const updateFilters = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value && value.trim().length > 0) {
          params.set(key, value.trim());
        } else {
          params.delete(key);
        }
      }

      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateFilters({ search: searchValue });
  }

  function handleClearSearch() {
    setSearchValue("");
    updateFilters({ search: null });
  }

  function handleResetAll() {
    setSearchValue("");
    router.push(pathname, { scroll: false });
  }

  const hasActiveFilters = Boolean(
    activeSearch || activeCategory || activeRoutine || activeDifficulty
  );

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4">
        {/* Search bar row */}
        <form onSubmit={handleSearchSubmit} className="relative flex w-full items-center">
          <label htmlFor="exercise-search-input" className="sr-only">
            Search exercises
          </label>
          <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" aria-hidden="true" />
          </div>

          <Input
            id="exercise-search-input"
            name="search"
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by exercise name, target area, or movement..."
            className="h-11 rounded-xl pl-10 pr-20 text-sm focus-visible:ring-primary"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {searchValue && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Clear search input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              className="h-8 px-3 text-xs font-semibold rounded-lg"
            >
              Search
            </Button>
          </div>
        </form>

        {/* Filter selectors row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Filters:</span>
          </div>

          {/* Category Dropdown */}
          <div className="min-w-[170px] flex-1 sm:flex-initial">
            <label htmlFor="exercise-category-filter" className="sr-only">
              Filter by Category
            </label>
            <select
              id="exercise-category-filter"
              value={activeCategory}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Categories</option>
              {EXERCISE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Routine Suitability Dropdown */}
          <div className="min-w-[160px] flex-1 sm:flex-initial">
            <label htmlFor="exercise-routine-filter" className="sr-only">
              Filter by Routine Suitability
            </label>
            <select
              id="exercise-routine-filter"
              value={activeRoutine}
              onChange={(e) => updateFilters({ routine_tag: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Routines</option>
              <option value="morning">Morning Eligible</option>
              <option value="evening">Evening Eligible</option>
              <option value="both">Both Morning & Evening</option>
            </select>
          </div>

          {/* Difficulty Dropdown */}
          <div className="min-w-[140px] flex-1 sm:flex-initial">
            <label htmlFor="exercise-difficulty-filter" className="sr-only">
              Filter by Difficulty
            </label>
            <select
              id="exercise-difficulty-filter"
              value={activeDifficulty}
              onChange={(e) => updateFilters({ difficulty: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Difficulty Levels</option>
              {FITNESS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {DIFFICULTY_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <Button
              id="exercise-clear-filters"
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="h-10 gap-1.5 rounded-xl border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
