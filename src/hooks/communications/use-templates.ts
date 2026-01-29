/**
 * Email Templates Hooks
 *
 * Query and mutation hooks for email templates.
 * Uses centralized query keys for proper cache invalidation.
 *
 * @see DOM-COMMS-007
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  DeleteTemplateInput,
  CloneTemplateInput,
  RestoreVersionInput,
} from '@/lib/schemas/communications/email-templates';
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  cloneEmailTemplate,
  getTemplateVersionHistory,
  restoreTemplateVersion,
} from '@/server/functions/communications/email-templates';

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
  const createTemplateFn = useServerFn(createEmailTemplate);

  return useMutation({
    mutationFn: (input: CreateTemplateInput) => createTemplateFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const updateTemplateFn = useServerFn(updateEmailTemplate);

  return useMutation({
    mutationFn: (input: UpdateTemplateInput) => updateTemplateFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templateDetail(variables.id),
      });
      if (variables.createVersion) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.templateVersions(variables.id),
        });
      }
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const deleteTemplateFn = useServerFn(deleteEmailTemplate);

  return useMutation({
    mutationFn: (input: DeleteTemplateInput) => deleteTemplateFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
    },
  });
}

export function useCloneTemplate() {
  const queryClient = useQueryClient();
  const cloneTemplateFn = useServerFn(cloneEmailTemplate);

  return useMutation({
    mutationFn: (input: CloneTemplateInput) => cloneTemplateFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
    },
  });
}

export function useRestoreTemplateVersion() {
  const queryClient = useQueryClient();
  const restoreVersionFn = useServerFn(restoreTemplateVersion);

  return useMutation({
    mutationFn: (input: RestoreVersionInput) => restoreVersionFn({ data: input }),
    onSuccess: () => {
      // Invalidate all template-related queries since restore affects everything
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.templates(),
      });
    },
  });
}
