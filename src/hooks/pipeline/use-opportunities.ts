/**
 * Pipeline Opportunity Hooks
 *
 * TanStack Query hooks for opportunity data fetching:
 * - Opportunity list with pagination and filtering
 * - Opportunity detail view
 * - Opportunity search
 *
 * @see src/lib/query-keys.ts for centralized query keys
 * @see src/server/functions/pipeline/pipeline.ts for server functions
 */
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys, type OpportunityFilters } from '@/lib/query-keys';
import { listOpportunities, getOpportunity } from '@/server/functions/pipeline/pipeline';
import type { Opportunity } from '@/lib/schemas/pipeline';

// ============================================================================
// TYPES
// ============================================================================

type OpportunityListResult = Awaited<ReturnType<typeof listOpportunities>>;
type OpportunityDetailResult = Awaited<ReturnType<typeof getOpportunity>>;

// Extended filter options for kanban view (supports arrays and ranges)
export interface OpportunityKanbanFilters {
  search?: string;
  stages?: Array<'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'>;
  assignedTo?: string;
  minValue?: number;
  maxValue?: number;
  includeWonLost?: boolean;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseOpportunitiesOptions extends Partial<OpportunityFilters> {
  enabled?: boolean;
}

/**
 * Fetch paginated opportunity list with filters
 */
export function useOpportunities(options: UseOpportunitiesOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.opportunities.list(filters),
    queryFn: () =>
      listOpportunities({
        data: {
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 50,
          sortBy: filters.sortBy ?? 'createdAt',
          sortOrder: filters.sortOrder ?? 'desc',
          search: filters.search,
          stage: filters.stage as 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost' | undefined,
          assignedTo: filters.assignedTo,
          customerId: filters.customerId,
        },
      }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// KANBAN BOARD HOOK
// ============================================================================

export interface UseOpportunitiesKanbanOptions extends OpportunityKanbanFilters {
  enabled?: boolean;
}

/**
 * Fetch opportunities for kanban board view with extended filters.
 * Loads all opportunities (up to 200) for drag-and-drop functionality.
 * Supports stage array filter, value range filter, and won/lost toggle.
 */
export function useOpportunitiesKanban(options: UseOpportunitiesKanbanOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.opportunities.list(filters),
    queryFn: async () => {
      const result = await listOpportunities({
        data: {
          page: 1,
          pageSize: 100, // Max allowed by schema, loads most kanban boards
          sortBy: 'createdAt',
          sortOrder: 'desc',
          search: filters.search || undefined,
          stages: filters.stages && filters.stages.length > 0 ? filters.stages : undefined,
          assignedTo: filters.assignedTo || undefined,
          minValue: filters.minValue ?? undefined,
          maxValue: filters.maxValue ?? undefined,
          includeWonLost: filters.includeWonLost,
        },
      });
      return result as {
        items: Opportunity[];
        pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
        metrics: { totalValue: number; weightedValue: number };
      };
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Infinite scroll opportunities list
 */
export function useOpportunitiesInfinite(filters: Partial<OpportunityFilters> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.opportunities.list(filters),
    queryFn: ({ pageParam }) =>
      listOpportunities({
        data: {
          page: pageParam,
          pageSize: filters.pageSize ?? 50,
          sortBy: filters.sortBy ?? 'createdAt',
          sortOrder: filters.sortOrder ?? 'desc',
          search: filters.search,
          stage: filters.stage as 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost' | undefined,
          assignedTo: filters.assignedTo,
          customerId: filters.customerId,
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return totalFetched < lastPage.pagination.totalItems ? allPages.length + 1 : undefined;
    },
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export interface UseOpportunityOptions {
  id: string;
  enabled?: boolean;
}

/**
 * Fetch single opportunity with related data (customer, contact, activities, versions)
 */
export function useOpportunity({ id, enabled = true }: UseOpportunityOptions) {
  return useQuery({
    queryKey: queryKeys.pipeline.opportunity(id),
    queryFn: () => getOpportunity({ data: { id } }),
    enabled: enabled && !!id && id !== 'new',
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// SEARCH HOOKS
// ============================================================================

export interface UseOpportunitySearchOptions {
  query: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Search opportunities by title
 */
export function useOpportunitySearch({ query, limit = 10, enabled = true }: UseOpportunitySearchOptions) {
  return useQuery({
    queryKey: queryKeys.opportunities.list({ search: query }),
    queryFn: () =>
      listOpportunities({
        data: {
          search: query,
          pageSize: limit,
          page: 1,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      }),
    enabled: enabled && query.length >= 2,
    staleTime: 10 * 1000, // 10 seconds
    placeholderData: (previousData) => previousData,
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  OpportunityListResult,
  OpportunityDetailResult,
  Opportunity,
  OpportunityFilters,
};
