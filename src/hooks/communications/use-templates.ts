/**
 * Email Templates Hooks
 *
 * Query and mutation hooks for email templates.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-007
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  cloneEmailTemplate,
  getTemplateVersionHistory,
  restoreTemplateVersion,
} from '@/lib/server/email-templates';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseTemplatesOptions {
  category?: 'quotes' | 'orders' | 'installations' | 'warranty' | 'support' | 'marketing' | 'follow_up' | 'custom';
  activeOnly?: boolean;
  enabled?: boolean;
}

export function useTemplates(options: UseTemplatesOptions = {}) {
  const { category, activeOnly = true, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.templatesList({ type: category, limit: 100 }),
    queryFn: () => getEmailTemplates({ data: { category, activeOnly } }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
  });
}

export interface UseTemplateOptions {
  templateId: string;
  enabled?: boolean;
}

export function useTemplate(options: UseTemplateOptions) {
  const { templateId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.templateDetail(templateId),
    queryFn: () => getEmailTemplate({ data: { id: templateId } }),
    enabled: enabled && !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}

export interface UseTemplateVersionsOptions {
  templateId: string;
  enabled?: boolean;
}

export function useTemplateVersions(options: UseTemplateVersionsOptions) {
  const { templateId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.templateVersions(templateId),
    queryFn: () => getTemplateVersionHistory({ data: { templateId } }),
    enabled: enabled && !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEmailTemplate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templateDetail(variables.data.id),
      });
      if (variables.data.createVersion) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.templateVersions(variables.data.id),
        });
      }
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
    },
  });
}

export function useCloneTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cloneEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
    },
  });
}

export function useRestoreTemplateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreTemplateVersion,
    onSuccess: () => {
      // Invalidate all template-related queries since restore affects everything
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
    },
  });
}
