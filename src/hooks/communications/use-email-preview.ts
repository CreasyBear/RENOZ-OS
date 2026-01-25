/**
 * Email Preview Hooks
 *
 * Query and mutation hooks for email template preview and test send.
 * Uses centralized query keys for proper cache management.
 *
 * @see INT-RES-006
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  renderEmailPreview,
  sendTestEmail,
} from "@/server/functions/communications/email-preview";
import type {
  RenderPreviewInput,
  SendTestEmailInput,
  RenderPreviewResult,
  SendTestEmailResult,
} from "@/lib/schemas/communications/email-preview";

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseEmailPreviewOptions {
  templateId: string;
  variables?: Record<string, unknown>;
  sampleCustomerId?: string;
  enabled?: boolean;
}

/**
 * Hook to render an email template preview.
 * Automatically fetches when templateId changes.
 */
export function useEmailPreview(options: UseEmailPreviewOptions) {
  const { templateId, variables, sampleCustomerId, enabled = true } = options;

  return useQuery<RenderPreviewResult>({
    queryKey: queryKeys.communications.emailPreview.render(templateId, { variables, sampleCustomerId }),
    queryFn: () =>
      renderEmailPreview({
        data: {
          templateId,
          variables,
          sampleCustomerId,
        },
      }),
    enabled: enabled && !!templateId,
    staleTime: 30 * 1000, // 30 seconds - preview changes often during editing
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to manually render an email template preview.
 * Use when you need to trigger rendering on demand rather than automatically.
 */
export function useRenderPreview() {
  const queryClient = useQueryClient();

  return useMutation<RenderPreviewResult, Error, RenderPreviewInput>({
    mutationFn: (input) => renderEmailPreview({ data: input }),
    onSuccess: (data, variables) => {
      // Cache the result for quick access
      queryClient.setQueryData(
        queryKeys.communications.emailPreview.render(variables.templateId, {
          variables: variables.variables,
          sampleCustomerId: variables.sampleCustomerId,
        }),
        data
      );
    },
  });
}

/**
 * Hook to send a test email.
 */
export function useSendTestEmail() {
  return useMutation<SendTestEmailResult, Error, SendTestEmailInput>({
    mutationFn: (input) => sendTestEmail({ data: input }),
  });
}
