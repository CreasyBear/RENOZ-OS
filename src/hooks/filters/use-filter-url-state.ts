/**
 * Filter URL State Hook
 *
 * Provides URL-synced filter state using TanStack Router.
 * Handles pagination reset on filter changes and serialization.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { useCallback, useMemo } from "react";
import { z } from "zod";

/**
 * Options for useFilterUrlState hook.
 */
export interface UseFilterUrlStateOptions<T extends z.ZodType> {
  /** Zod schema for validation */
  schema: T;
  /** Default values when not present in URL */
  defaults: z.infer<T>;
  /** Keys that should reset page to 1 when changed */
  resetPageOnChange?: string[];
  /** Page key name (default: 'page') */
  pageKey?: string;
}

/**
 * Navigate function signature from TanStack Router.
 */
export type NavigateFn = (options: {
  to: string;
  search: Record<string, unknown>;
}) => void;

/**
 * Result type for useFilterUrlState hook.
 */
export interface UseFilterUrlStateResult<T> {
  /** Current filter values from URL */
  filters: T;
  /** Update one or more filter values */
  setFilters: (updates: Partial<T>) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Check if any non-default filters are active */
  hasActiveFilters: boolean;
  /** Count of active non-default filters (excluding search and pagination) */
  activeFilterCount: number;
}

/**
 * Hook for URL-synced filter state with TanStack Router.
 *
 * Must be used within a route that has validateSearch configured.
 * Requires the route's useSearch result and navigate function.
 *
 * @example
 * ```tsx
 * // In route file:
 * const searchParamsSchema = z.object({
 *   page: z.coerce.number().optional().default(1),
 *   search: z.string().optional(),
 *   status: z.string().optional(),
 * });
 *
 * export const Route = createFileRoute('/orders/')({
 *   validateSearch: searchParamsSchema,
 *   component: OrdersPage,
 * });
 *
 * // In component:
 * function OrdersPage() {
 *   const navigate = useNavigate();
 *   const search = Route.useSearch();
 *
 *   const { filters, setFilters, resetFilters } = useFilterUrlState({
 *     currentSearch: search,
 *     navigate,
 *     defaults: { page: 1, search: '', status: null },
 *     resetPageOnChange: ['search', 'status'],
 *   });
 *
 *   return (
 *     <DomainFilterBar
 *       config={ORDER_FILTER_CONFIG}
 *       filters={filters}
 *       onFiltersChange={setFilters}
 *       defaultFilters={defaults}
 *     />
 *   );
 * }
 * ```
 */
export function useFilterUrlState<T extends Record<string, unknown>>({
  currentSearch,
  navigate,
  defaults,
  resetPageOnChange = [],
  pageKey = "page",
}: {
  /** Current search params from Route.useSearch() */
  currentSearch: T;
  /** Navigate function from useNavigate() */
  navigate: NavigateFn;
  /** Default filter values */
  defaults: T;
  /** Keys that should reset page to 1 when changed */
  resetPageOnChange?: (keyof T)[];
  /** Page key name (default: 'page') */
  pageKey?: keyof T;
}): UseFilterUrlStateResult<T> {
  // Merge defaults with current search
  const filters = useMemo(() => {
    return { ...defaults, ...currentSearch };
  }, [defaults, currentSearch]);

  // Update filters handler
  const setFilters = useCallback(
    (updates: Partial<T>) => {
      // Check if any of the changed keys should reset pagination
      const shouldResetPage = Object.keys(updates).some(
        (key) =>
          resetPageOnChange.includes(key as keyof T) &&
          updates[key as keyof T] !== filters[key as keyof T]
      );

      const newSearch: Record<string, unknown> = {
        ...filters,
        ...updates,
      };

      // Reset page to 1 if filter that affects results changed
      if (shouldResetPage && !(pageKey in updates)) {
        newSearch[pageKey as string] = 1;
      }

      // Clean undefined/null values to keep URL clean
      const cleanSearch = Object.fromEntries(
        Object.entries(newSearch).filter(
          ([, value]) =>
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !(Array.isArray(value) && value.length === 0)
        )
      );

      navigate({
        to: ".",
        search: cleanSearch,
      });
    },
    [filters, navigate, pageKey, resetPageOnChange]
  );

  // Reset to defaults
  const resetFilters = useCallback(() => {
    navigate({
      to: ".",
      search: defaults as Record<string, unknown>,
    });
  }, [navigate, defaults]);

  // Count active filters (excluding pagination and search)
  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    const excludeKeys = [pageKey, "pageSize", "sortBy", "sortOrder"];
    let count = 0;

    for (const [key, value] of Object.entries(filters)) {
      if (excludeKeys.includes(key as keyof T)) continue;
      if (key === "search" && value) {
        count++;
        continue;
      }

      const defaultValue = defaults[key as keyof T];
      if (value !== defaultValue) {
        // Check if value is "truthy" or different from empty default
        if (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0)
        ) {
          count++;
        }
      }
    }

    return {
      hasActiveFilters: count > 0,
      activeFilterCount: count,
    };
  }, [filters, defaults, pageKey]);

  return {
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}

/**
 * Extended result type for useTransformedFilterUrlState hook.
 */
export interface UseTransformedFilterUrlStateResult<TFilters> {
  /** Current filter values (transformed from URL) */
  filters: TFilters;
  /** Update filter values (transforms back to URL) */
  setFilters: (filters: TFilters) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Check if any non-default filters are active */
  hasActiveFilters: boolean;
  /** Count of active non-default filters */
  activeFilterCount: number;
}

/**
 * Hook for URL-synced filter state with type transformations.
 *
 * Use this when your filter state type differs from the URL search params type.
 * For example, when URL uses flat params (dateFrom, dateTo) but filter state
 * uses nested objects (dateRange: { from, to }).
 *
 * IMPORTANT: Define `fromUrlParams` and `toUrlParams` outside the component
 * or wrap them in useCallback to avoid unnecessary recalculations.
 *
 * @example
 * ```tsx
 * // Define transform functions outside component for stability
 * const fromUrlParams = (search: SearchParams): OrderFilters => ({
 *   search: search.search ?? "",
 *   dateRange: search.dateFrom ? { from: new Date(search.dateFrom), to: new Date(search.dateTo) } : null,
 * });
 *
 * const toUrlParams = (filters: OrderFilters): Record<string, unknown> => ({
 *   search: filters.search || undefined,
 *   dateFrom: filters.dateRange?.from?.toISOString().split('T')[0],
 *   dateTo: filters.dateRange?.to?.toISOString().split('T')[0],
 * });
 *
 * function OrdersPage() {
 *   const { filters, setFilters } = useTransformedFilterUrlState({
 *     currentSearch: search,
 *     navigate,
 *     defaults: DEFAULT_ORDER_FILTERS,
 *     fromUrlParams,
 *     toUrlParams,
 *     resetPageOnChange: ['search', 'status'],
 *   });
 * }
 * ```
 */
export function useTransformedFilterUrlState<
  TUrl extends Record<string, unknown>,
  TFilters extends Record<string, unknown>,
>({
  currentSearch,
  navigate,
  defaults,
  fromUrlParams,
  toUrlParams,
  resetPageOnChange = [],
  pageKey = "page",
}: {
  /** Current search params from Route.useSearch() */
  currentSearch: TUrl;
  /** Navigate function from useNavigate() */
  navigate: NavigateFn;
  /** Default filter values in the filter state format */
  defaults: TFilters;
  /** Transform URL search params to filter state */
  fromUrlParams: (search: TUrl) => TFilters;
  /** Transform filter state to URL search params */
  toUrlParams: (filters: TFilters) => Record<string, unknown>;
  /** Keys (in filter state) that should reset page to 1 when changed */
  resetPageOnChange?: (keyof TFilters)[];
  /** Page key name in URL params (default: 'page') */
  pageKey?: string;
}): UseTransformedFilterUrlStateResult<TFilters> {
  // Transform URL params to filter state
  const filters = useMemo(
    () => fromUrlParams(currentSearch),
    [currentSearch, fromUrlParams]
  );

  // Update filters handler
  const setFilters = useCallback(
    (newFilters: TFilters) => {
      // Check if any of the changed keys should reset pagination
      const shouldResetPage = resetPageOnChange.some(
        (key) => newFilters[key] !== filters[key]
      );

      const urlSearch = toUrlParams(newFilters);

      // Reset page to 1 if filter that affects results changed
      if (shouldResetPage) {
        urlSearch[pageKey] = 1;
      }

      // Clean undefined/null values to keep URL clean
      const cleanSearch = Object.fromEntries(
        Object.entries(urlSearch).filter(
          ([, value]) =>
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !(Array.isArray(value) && value.length === 0)
        )
      );

      navigate({
        to: ".",
        search: cleanSearch,
      });
    },
    [filters, navigate, pageKey, resetPageOnChange, toUrlParams]
  );

  // Reset to defaults
  const resetFilters = useCallback(() => {
    const urlSearch = toUrlParams(defaults);
    navigate({
      to: ".",
      search: urlSearch,
    });
  }, [navigate, defaults, toUrlParams]);

  // Count active filters (excluding pagination and search)
  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0;

    for (const [key, value] of Object.entries(filters)) {
      // Skip search separately (it's always counted if present)
      if (key === "search" && value) {
        count++;
        continue;
      }

      const defaultValue = defaults[key as keyof TFilters];
      if (value !== defaultValue) {
        // Check for non-empty values
        if (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0) &&
          !(typeof value === "object" && value !== null && Object.keys(value).length === 0)
        ) {
          count++;
        }
      }
    }

    return {
      hasActiveFilters: count > 0,
      activeFilterCount: count,
    };
  }, [filters, defaults]);

  return {
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}

/**
 * Type helper to create a search params schema with common pagination fields.
 */
export function createFilterSearchSchema<T extends z.ZodRawShape>(
  filterSchema: T
) {
  return z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
    ...filterSchema,
  });
}

/**
 * Serialize a Date to ISO string for URL.
 */
export function serializeDateForUrl(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Parse a date string from URL to Date object.
 */
export function parseDateFromUrl(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}
