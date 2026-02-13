/**
 * Customer Filter Utilities
 *
 * Shared utilities for normalizing and working with customer filters.
 */

import type { CustomerFiltersState } from '@/lib/schemas/customers/saved-filters';
import type { CustomerListQuery } from '@/lib/schemas/customers';

/**
 * Normalize customer filters to enforce single-select constraints.
 *
 * The API only accepts single values for status, type, and size filters,
 * so we take the last selected value from arrays.
 *
 * @param filters - Raw filter state (may have multiple values)
 * @returns Normalized filter state with single values
 */
export function normalizeCustomerFilters(
  filters: CustomerFiltersState
): CustomerFiltersState {
  return {
    ...filters,
    status: filters.status.slice(-1),
    type: filters.type.slice(-1),
    size: filters.size.slice(-1),
  };
}

/**
 * Build customer query parameters from filter state.
 *
 * Transforms CustomerFiltersState (which uses arrays for multi-select UI)
 * into CustomerListQuery format (which uses single values for API).
 *
 * @param filters - Filter state from UI
 * @returns Query parameters for customer list API
 */
export function buildCustomerQuery(
  filters: CustomerFiltersState
): Pick<
  CustomerListQuery,
  "search" | "status" | "type" | "size" | "healthScoreMin" | "healthScoreMax" | "tags"
> {
  // Note: CustomerListQuery expects single values for status/type/size
  // For now, we take the first value if multiple are selected
  // TODO: Consider extending the API to support multiple filter values
  return {
    search: filters.search || undefined,
    status: filters.status.length > 0 ? (filters.status[0] as CustomerListQuery["status"]) : undefined,
    type: filters.type.length > 0 ? (filters.type[0] as CustomerListQuery["type"]) : undefined,
    size: filters.size.length > 0 ? (filters.size[0] as CustomerListQuery["size"]) : undefined,
    healthScoreMin: filters.healthScoreRange?.min ?? undefined,
    healthScoreMax: filters.healthScoreRange?.max ?? undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
  };
}

/**
 * Transform URL search params to CustomerFiltersState.
 *
 * Used with useTransformedFilterUrlState to sync filter state with URL.
 *
 * @param search - URL search params from route
 * @returns Filter state for UI components
 */
export function fromUrlParams(search: {
  search?: string;
  status?: 'prospect' | 'active' | 'inactive' | 'suspended' | 'blacklisted';
  type?: 'individual' | 'business' | 'government' | 'non_profit';
  size?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
  healthScoreMin?: number;
  healthScoreMax?: number;
  tag?: string;
}): CustomerFiltersState {
  const healthScoreRange =
    search.healthScoreMin != null || search.healthScoreMax != null
      ? {
          min: search.healthScoreMin ?? null,
          max: search.healthScoreMax ?? null,
        }
      : null;

  return {
    search: search.search ?? '',
    status: search.status ? [search.status] : [],
    type: search.type ? [search.type] : [],
    size: search.size ? [search.size] : [],
    healthScoreRange,
    tags: search.tag ? [search.tag] : [],
  };
}

/**
 * Transform CustomerFiltersState to URL search params.
 *
 * Used with useTransformedFilterUrlState to sync filter state with URL.
 *
 * @param filters - Filter state from UI
 * @returns URL search params
 */
export function toUrlParams(filters: CustomerFiltersState): Record<string, unknown> {
  return {
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    type: filters.type.length > 0 ? filters.type[0] : undefined,
    size: filters.size.length > 0 ? filters.size[0] : undefined,
    healthScoreMin: filters.healthScoreRange?.min ?? undefined,
    healthScoreMax: filters.healthScoreRange?.max ?? undefined,
    tag: filters.tags.length > 0 ? filters.tags[0] : undefined,
  };
}
