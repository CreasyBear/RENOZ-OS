/**
 * Issue Template Hooks
 *
 * TanStack Query hooks for issue template management.
 *
 * @see src/server/functions/issue-templates.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listIssueTemplates,
  getIssueTemplate,
  createIssueTemplate,
  updateIssueTemplate,
  deleteIssueTemplate,
  incrementTemplateUsage,
  getPopularTemplates,
} from '@/server/functions/support/issue-templates';
import type {
  ListIssueTemplatesInput,
  CreateIssueTemplateInput,
  UpdateIssueTemplateInput,
  IssueType,
} from '@/lib/schemas/support/issue-templates';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST HOOK
// ============================================================================

export interface UseIssueTemplatesOptions {
  type?: IssueType;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: ListIssueTemplatesInput['sortBy'];
  sortOrder?: ListIssueTemplatesInput['sortOrder'];
  enabled?: boolean;
}

export function useIssueTemplates({
  type,
  isActive,
  search,
  page = 1,
  pageSize = 20,
  sortBy = 'usageCount',
  sortOrder = 'desc',
  enabled = true,
}: UseIssueTemplatesOptions = {}) {
  const filters: Partial<ListIssueTemplatesInput> = {
    type,
    isActive,
    search,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };

  return useQuery({
    queryKey: queryKeys.support.issueTemplatesListFiltered(filters),
    queryFn: () =>
      listIssueTemplates({
        data: {
          ...filters,
          page: page ?? 1,
          pageSize: pageSize ?? 20,
          sortBy: sortBy ?? 'usageCount',
          sortOrder: sortOrder ?? 'desc',
        },
      }),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// DETAIL HOOK
// ============================================================================

export interface UseIssueTemplateOptions {
  templateId: string;
  enabled?: boolean;
}

export function useIssueTemplate({ templateId, enabled = true }: UseIssueTemplateOptions) {
  return useQuery({
    queryKey: queryKeys.support.issueTemplateDetail(templateId),
    queryFn: () => getIssueTemplate({ data: { templateId } }),
    enabled: enabled && !!templateId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// POPULAR TEMPLATES HOOK
// ============================================================================

export interface UsePopularTemplatesOptions {
  limit?: number;
  enabled?: boolean;
}

export function usePopularTemplates({
  limit = 5,
  enabled = true,
}: UsePopularTemplatesOptions = {}) {
  return useQuery({
    queryKey: queryKeys.support.issueTemplatesPopular(),
    queryFn: () => getPopularTemplates({ data: { pageSize: limit } }),
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// CREATE MUTATION
// ============================================================================

export function useCreateIssueTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIssueTemplateInput) => createIssueTemplate({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issueTemplatesList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issueTemplatesPopular() });
    },
  });
}

// ============================================================================
// UPDATE MUTATION
// ============================================================================

export function useUpdateIssueTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateIssueTemplateInput) => updateIssueTemplate({ data }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.support.issueTemplateDetail(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issueTemplatesList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issueTemplatesPopular() });
    },
  });
}

// ============================================================================
// DELETE MUTATION
// ============================================================================

export function useDeleteIssueTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteIssueTemplate({ data: { templateId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issueTemplatesList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issueTemplatesPopular() });
    },
  });
}

// ============================================================================
// INCREMENT USAGE MUTATION
// ============================================================================

export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => incrementTemplateUsage({ data: { templateId } }),
    onSuccess: () => {
      // Invalidate popular templates since usage counts changed
      queryClient.invalidateQueries({ queryKey: queryKeys.support.issueTemplatesPopular() });
    },
  });
}
