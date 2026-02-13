/**
 * Issue Hooks
 *
 * TanStack Query hooks for issue data fetching:
 * - Issue list with pagination and filtering
 * - Single issue detail with SLA state
 * - Issue mutations (create, update)
 *
 * @see src/server/functions/issues.ts
 * @see src/lib/schemas/support/issues.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getIssues,
  getIssueById,
  getIssuesWithSlaMetrics,
  createIssue,
  updateIssue,
  deleteIssue,
} from '@/server/functions/support/issues';
import { escalateIssue } from '@/server/functions/support/escalation';
import type {
  CreateIssueInput,
  UpdateIssueInput,
  IssueStatus,
  IssuePriority,
  IssueType,
} from '@/lib/schemas/support/issues';

type IssueListResult = Awaited<ReturnType<typeof getIssues>>;
type IssueDetail = Awaited<ReturnType<typeof getIssueById>>;

// ============================================================================
// QUERY KEYS
// ============================================================================

export interface IssueListFilters {
  status?: IssueStatus | IssueStatus[];
  priority?: IssuePriority | IssuePriority[];
  type?: IssueType;
  customerId?: string;
  assignedToUserId?: string;
  assignedToFilter?: 'me' | 'unassigned';
  search?: string;
  slaStatus?: 'breached' | 'at_risk';
  escalated?: boolean;
  limit?: number;
  offset?: number;
}

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseIssuesOptions extends Partial<IssueListFilters> {
  enabled?: boolean;
}

export function useIssues(options: UseIssuesOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.support.issuesListFiltered(filters),
    queryFn: async () => {
      const result = await getIssues({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - issues change frequently
  });
}

// ============================================================================
// LIST HOOKS (WITH SLA METRICS)
// ============================================================================

export function useIssuesWithSlaMetrics(options: UseIssuesOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.support.issuesListFiltered({
      ...filters,
      includeSlaMetrics: true,
    }),
    queryFn: async () => {
      const result = await getIssuesWithSlaMetrics({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - issues change frequently
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export interface UseIssueOptions {
  issueId: string;
  enabled?: boolean;
}

export function useIssue({ issueId, enabled = true }: UseIssueOptions) {
  return useQuery({
    queryKey: queryKeys.support.issueDetail(issueId),
    queryFn: async () => {
      const result = await getIssueById({
        data: { issueId } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!issueId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIssueInput) => createIssue({ data }),
    onSuccess: () => {
      // Invalidate all issue lists to show the new issue
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issuesList() });
    },
  });
}

export interface UpdateIssueData extends UpdateIssueInput {
  issueId: string;
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, ...data }: UpdateIssueData) =>
      updateIssue({ data: { issueId, ...data } }),
    onMutate: async (variables) => {
      const { issueId, ...updates } = variables;
      await queryClient.cancelQueries({
        queryKey: queryKeys.support.issueDetail(variables.issueId),
      });
      await queryClient.cancelQueries({ queryKey: queryKeys.support.issuesList() });

      const previousDetail = queryClient.getQueryData<IssueDetail>(
        queryKeys.support.issueDetail(variables.issueId)
      );
      const previousLists = queryClient.getQueriesData<IssueListResult>({
        queryKey: queryKeys.support.issuesList(),
      });

      if (previousDetail) {
        queryClient.setQueryData<IssueDetail>(queryKeys.support.issueDetail(variables.issueId), {
          ...previousDetail,
          ...updates,
          updatedAt: new Date(),
        });
      }

      queryClient.setQueriesData<IssueListResult>(
        { queryKey: queryKeys.support.issuesList() },
        (old) => {
          if (!old) return old;
          return old.map((issue) =>
            issue.id === variables.issueId
              ? {
                  ...issue,
                  ...updates,
                  updatedAt: new Date(),
                }
              : issue
          );
        }
      );

      return { previousDetail, previousLists };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      if (context.previousDetail) {
        queryClient.setQueryData(
          queryKeys.support.issueDetail(context.previousDetail.id),
          context.previousDetail
        );
      }
      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (_result, variables) => {
      // Invalidate the specific issue detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.issueDetail(variables.issueId),
      });
      // Invalidate all lists (status/priority may have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issuesList() });
    },
  });
}

// ============================================================================
// DELETE ISSUE MUTATION
// ============================================================================

/**
 * Soft-delete an issue (sets deletedAt)
 */
export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteIssue({ data: { id } }),
    onSuccess: (_, id) => {
      // Invalidate both list and detail caches per STANDARDS.md
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issuesList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issueDetail(id) });
    },
  });
}

// ============================================================================
// ESCALATE ISSUE MUTATION
// ============================================================================

export interface EscalateIssueInput {
  issueId: string;
  reason: string;
  escalateToUserId?: string;
}

/**
 * Manually escalate an issue.
 * @see src/server/functions/support/escalation.ts
 */
export function useEscalateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EscalateIssueInput) => escalateIssue({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.issueDetail(variables.issueId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issuesList() });
    },
  });
}
