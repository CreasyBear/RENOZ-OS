/**
 * Dashboard Context Provider
 *
 * Provides global dashboard state including date range filtering.
 * Syncs state with URL search params for shareable links.
 *
 * @see DASH-DATE-RANGE
 * @see wireframes/dashboard-date-range.wireframe.md
 */

"use client";

import * as React from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  type DateRange,
  DEFAULT_PRESET,
  dateRangeFromSearchParams,
  dateRangeToSearchParams,
  detectPreset,
} from "@/lib/utils/date-presets";

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardContextValue {
  /** Current date range filter */
  dateRange: DateRange;
  /** Current preset value (e.g., "this-month", "custom") */
  preset: string;
  /** Update the date range */
  setDateRange: (range: DateRange, preset?: string) => void;
  /** Set date range by preset value */
  setPreset: (presetValue: string) => void;
  /** Whether dashboard data is loading */
  isLoading: boolean;
  /** Set loading state */
  setIsLoading: (loading: boolean) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const DashboardContext = React.createContext<DashboardContextValue | null>(null);

// ============================================================================
// PROVIDER PROPS
// ============================================================================

export interface DashboardProviderProps {
  children: React.ReactNode;
  /** Default preset to use when no URL params present */
  defaultPreset?: string;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function DashboardProvider({
  children,
  defaultPreset = DEFAULT_PRESET,
}: DashboardProviderProps) {
  const navigate = useNavigate();

  // Read search params from URL
  // Use any to avoid type issues with dynamic route search params
  const searchParams = useSearch({ strict: false }) as Record<string, string | undefined>;

  // Parse date range from URL params
  const { range: initialRange, preset: initialPreset } = React.useMemo(
    () => dateRangeFromSearchParams({
      dateRange: searchParams?.dateRange ?? defaultPreset,
      start: searchParams?.start,
      end: searchParams?.end,
    }),
    [searchParams?.dateRange, searchParams?.start, searchParams?.end, defaultPreset]
  );

  // Local state for date range
  const [dateRange, setDateRangeState] = React.useState<DateRange>(initialRange);
  const [preset, setPresetState] = React.useState<string>(initialPreset);
  const [isLoading, setIsLoading] = React.useState(false);

  // Sync URL params when date range changes
  const updateUrlParams = React.useCallback(
    (range: DateRange, presetValue: string) => {
      const params = dateRangeToSearchParams(range, presetValue);

      // Navigate to update search params without full page reload
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          ...params,
          // Remove old params if switching from custom to preset
          ...(presetValue !== "custom" && { start: undefined, end: undefined }),
        }),
        replace: true, // Replace history entry to avoid back-button pollution
      });
    },
    [navigate]
  );

  // Set date range handler
  const setDateRange = React.useCallback(
    (range: DateRange, presetValue?: string) => {
      const detected = presetValue ?? detectPreset(range);
      setDateRangeState(range);
      setPresetState(detected);
      updateUrlParams(range, detected);
    },
    [updateUrlParams]
  );

  // Set preset handler (for preset button clicks)
  const setPreset = React.useCallback(
    (presetValue: string) => {
      const { range } = dateRangeFromSearchParams({ dateRange: presetValue });
      setDateRangeState(range);
      setPresetState(presetValue);
      updateUrlParams(range, presetValue);
    },
    [updateUrlParams]
  );

  // Sync state when URL changes externally (e.g., browser back button)
  React.useEffect(() => {
    const { range, preset: urlPreset } = dateRangeFromSearchParams({
      dateRange: searchParams?.dateRange ?? defaultPreset,
      start: searchParams?.start,
      end: searchParams?.end,
    });

    // Only update if different from current state
    if (
      range.from.getTime() !== dateRange.from.getTime() ||
      range.to.getTime() !== dateRange.to.getTime() ||
      urlPreset !== preset
    ) {
      setDateRangeState(range);
      setPresetState(urlPreset);
    }
  }, [searchParams?.dateRange, searchParams?.start, searchParams?.end, defaultPreset, dateRange, preset]);

  // Context value
  const value = React.useMemo<DashboardContextValue>(
    () => ({
      dateRange,
      preset,
      setDateRange,
      setPreset,
      isLoading,
      setIsLoading,
    }),
    [dateRange, preset, setDateRange, setPreset, isLoading]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access dashboard context.
 * Must be used within a DashboardProvider.
 */
export function useDashboardContext(): DashboardContextValue {
  const context = React.useContext(DashboardContext);

  if (!context) {
    throw new Error(
      "useDashboardContext must be used within a DashboardProvider"
    );
  }

  return context;
}

/**
 * Hook to access just the date range from context.
 * Convenient for widgets that only need date filtering.
 */
export function useDashboardDateRange(): {
  dateRange: DateRange;
  preset: string;
  setDateRange: (range: DateRange, preset?: string) => void;
  setPreset: (presetValue: string) => void;
} {
  const { dateRange, preset, setDateRange, setPreset } = useDashboardContext();
  return { dateRange, preset, setDateRange, setPreset };
}
