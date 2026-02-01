import { useState, useCallback, useMemo } from "react";

export interface FilterConfig {
  /** Unique filter identifier */
  id: string;
  /** Default value when not set */
  defaultValue: string;
}

export interface UseTableFiltersOptions {
  /** Filter configurations */
  filters: FilterConfig[];
  /** Initial values (overrides defaults) */
  initialValues?: Record<string, string>;
}

export interface FilterState {
  /** Current filter value */
  value: string;
  /** Default value for reset */
  defaultValue: string;
  /** Update filter value */
  onChange: (value: string) => void;
}

export interface UseTableFiltersReturn {
  /** Filter states keyed by filter id */
  filterStates: Record<string, FilterState>;
  /** Whether any filter is active (not default) */
  hasActiveFilters: boolean;
  /** Clear all filters to defaults */
  clearAllFilters: () => void;
  /** Get filter value by id */
  getFilterValue: (id: string) => string;
  /** Set filter value by id */
  setFilterValue: (id: string, value: string) => void;
  /** Get all current values as object (for URL sync) */
  getAllValues: () => Record<string, string>;
}

/**
 * Hook for managing table filter state.
 *
 * For URL sync, use this hook with TanStack Router's useSearch:
 *
 * @example
 * ```tsx
 * // Basic usage (local state)
 * const { filterStates, hasActiveFilters, clearAllFilters } = useTableFilters({
 *   filters: [
 *     { id: "status", defaultValue: "all" },
 *     { id: "type", defaultValue: "all" },
 *   ],
 * });
 *
 * // With URL sync (in route component)
 * const search = useSearch({ from: Route.fullPath });
 * const { filterStates, hasActiveFilters } = useTableFilters({
 *   filters: [
 *     { id: "status", defaultValue: "all" },
 *   ],
 *   initialValues: search,
 * });
 *
 * // Then update URL on change:
 * // navigate({ search: { ...search, ...getAllValues() } });
 *
 * // Convert to DataTableFilter format for DataTableFilterDropdown
 * const filters: DataTableFilter[] = [
 *   {
 *     id: "status",
 *     label: "Status",
 *     options: [...],
 *     ...filterStates.status,
 *   },
 * ];
 * ```
 */
export function useTableFilters({
  filters,
  initialValues = {},
}: UseTableFiltersOptions): UseTableFiltersReturn {
  const [state, setState] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const filter of filters) {
      initial[filter.id] = initialValues[filter.id] ?? filter.defaultValue;
    }
    return initial;
  });

  const getFilterValue = useCallback(
    (id: string): string => {
      const config = filters.find((f) => f.id === id);
      if (!config) return "";
      return state[id] ?? config.defaultValue;
    },
    [filters, state]
  );

  const setFilterValue = useCallback(
    (id: string, value: string) => {
      setState((prev) => ({
        ...prev,
        [id]: value,
      }));
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    const defaults: Record<string, string> = {};
    for (const filter of filters) {
      defaults[filter.id] = filter.defaultValue;
    }
    setState(defaults);
  }, [filters]);

  const getAllValues = useCallback(() => {
    return { ...state };
  }, [state]);

  const filterStates = useMemo(() => {
    const states: Record<string, FilterState> = {};
    for (const filter of filters) {
      states[filter.id] = {
        value: state[filter.id] ?? filter.defaultValue,
        defaultValue: filter.defaultValue,
        onChange: (value: string) => setFilterValue(filter.id, value),
      };
    }
    return states;
  }, [filters, state, setFilterValue]);

  const hasActiveFilters = useMemo(() => {
    return filters.some((filter) => {
      const value = state[filter.id] ?? filter.defaultValue;
      return value !== filter.defaultValue;
    });
  }, [filters, state]);

  return {
    filterStates,
    hasActiveFilters,
    clearAllFilters,
    getFilterValue,
    setFilterValue,
    getAllValues,
  };
}
