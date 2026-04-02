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
import { type Opportunity } from '@/lib/schemas/pipeline';
import { isValidOpportunitySortField } from '@/components/domain/pipeline/opportunities/opportunity-sorting';

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
  expectedCloseDateFrom?: Date;
  expectedCloseDateTo?: Date;
  includeWonLost?: boolean;
}

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseOpportunitiesOptions extends Partial<OpportunityFilters> {
  enabled?: boolean;
}

function normalizeOpportunityListFilters(
  filters: Partial<OpportunityFilters>
): OpportunityFilters {
  return {
    ...filters,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    sortBy:
      typeof filters.sortBy === 'string' && isValidOpportunitySortField(filters.sortBy)
        ? filters.sortBy
        : 'createdAt',
    sortOrder: filters.sortOrder ?? 'desc',
  };
}

function normalizeOpportunityInfiniteFilters(
  filters: Partial<OpportunityFilters>
): OpportunityFilters {
  return {
    ...filters,
    pageSize: filters.pageSize ?? 50,
    sortBy:
      typeof filters.sortBy === 'string' && isValidOpportunitySortField(filters.sortBy)
        ? filters.sortBy
        : 'createdAt',
    sortOrder: filters.sortOrder ?? 'desc',
  };
}

/**
 * Fetch paginated opportunity list with filters
 */
export function useOpportunities(options: UseOpportunitiesOptions = {}) {
  const { enabled = true, ...filters } = options;
  const normalizedFilters = normalizeOpportunityListFilters(filters);

  return useQuery({
    queryKey: queryKeys.opportunities.list(normalizedFilters),
    queryFn: async () => {
      const result = await listOpportunities({
        data: {
          ...normalizedFilters,
          search: normalizedFilters.search,
          stage: normalizedFilters.stage as
            | 'new'
            | 'qualified'
            | 'proposal'
            | 'negotiation'
            | 'won'
            | 'lost'
            | undefined,
          assignedTo: normalizedFilters.assignedTo,
          customerId: normalizedFilters.customerId,
        },
      });
      if (result == null) throw new Error('Opportunities list returned no data');
      return result;
    },
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
          expectedCloseDateFrom: filters.expectedCloseDateFrom,
          expectedCloseDateTo: filters.expectedCloseDateTo,
          includeWonLost: filters.includeWonLost,
        },
      });
      if (result == null) throw new Error('Opportunities list returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Infinite scroll opportunities list
 */
export function useOpportunitiesInfinite(filters: Partial<OpportunityFilters> = {}) {
  const normalizedFilters = normalizeOpportunityInfiniteFilters(filters);

  return useInfiniteQuery({
    queryKey: queryKeys.opportunities.infiniteList(normalizedFilters),
    queryFn: async ({ pageParam }) => {
      const result = await listOpportunities({
        data: {
          ...normalizedFilters,
          page: pageParam,
          search: normalizedFilters.search,
          stage: normalizedFilters.stage as
            | 'new'
            | 'qualified'
            | 'proposal'
            | 'negotiation'
            | 'won'
            | 'lost'
            | undefined,
          assignedTo: normalizedFilters.assignedTo,
          customerId: normalizedFilters.customerId,
        },
      });
      if (result == null) throw new Error('Opportunities list returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await getOpportunity({ data: { id } });
      if (result == null) throw new Error('Opportunity not found');
      return result;
    },
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

function normalizeOpportunitySearchFilters(query: string, limit: number) {
  return {
    search: query,
    page: 1,
    pageSize: limit,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  };
}

/**
 * Search opportunities by title
 */
export function useOpportunitySearch({ query, limit = 10, enabled = true }: UseOpportunitySearchOptions) {
  const normalizedFilters = normalizeOpportunitySearchFilters(query, limit);

  return useQuery({
    queryKey: queryKeys.opportunities.list(normalizedFilters),
    queryFn: async () => {
      const result = await listOpportunities({
        data: normalizedFilters,
      });
      if (result == null) throw new Error('Opportunity search returned no data');
      return result;
    },
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
