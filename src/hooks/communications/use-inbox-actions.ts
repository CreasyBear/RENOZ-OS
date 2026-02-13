/**
 * Inbox Actions Hooks
 *
 * TanStack Query mutation hooks for inbox email actions with optimistic updates.
 * Follows DATA-FETCHING-STANDARDS.md patterns for mutations and optimistic updates.
 *
 * @see DATA-FETCHING-STANDARDS.md - Mutation patterns with optimistic updates
 * @see STANDARDS.md - Hook patterns
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  markEmailAsRead,
  markAllEmailsAsRead,
  toggleEmailStarred,
  archiveEmail,
  deleteEmail,
} from "@/server/functions/communications/inbox-actions";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage } from "@/lib/error-handling";

// ============================================================================
// MARK AS READ
// ============================================================================

/**
 * Hook to mark an email as read with optimistic update
 */
export function useMarkEmailAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      return markEmailAsRead({ data: { emailId } });
    },
    onMutate: async (_emailId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
    onError: (error) => {
      toast.error("Failed to mark email as read", {
        description: getUserFriendlyMessage(error as Error),
      });
    },
    onSuccess: () => {
      toast.success("Email marked as read");
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
  });
}

/**
 * Hook to mark all emails as read with optimistic update
 */
export function useMarkAllEmailsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailIds?: string[]) => {
      return markAllEmailsAsRead({ data: { emailIds } });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
    onError: (error) => {
      toast.error("Failed to mark emails as read", {
        description: getUserFriendlyMessage(error as Error),
      });
    },
    onSuccess: () => {
      toast.success("All emails marked as read");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
  });
}

// ============================================================================
// TOGGLE STARRED
// ============================================================================

/**
 * Hook to toggle starred status with optimistic update
 */
export function useToggleEmailStarred() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      return toggleEmailStarred({ data: { emailId } });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
    onError: (error) => {
      toast.error("Failed to update starred status", {
        description: getUserFriendlyMessage(error as Error),
      });
    },
    onSuccess: (data) => {
      toast.success(data.starred ? "Email starred" : "Email unstarred");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
  });
}

// ============================================================================
// ARCHIVE
// ============================================================================

/**
 * Hook to archive an email with optimistic update
 */
export function useArchiveEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      return archiveEmail({ data: { emailId } });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
    onError: (error) => {
      toast.error("Failed to archive email", {
        description: getUserFriendlyMessage(error as Error),
      });
    },
    onSuccess: () => {
      toast.success("Email archived");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
  });
}

// ============================================================================
// DELETE
// ============================================================================

/**
 * Hook to delete an email with optimistic update
 */
export function useDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      return deleteEmail({ data: { emailId } });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
    onError: (error) => {
      toast.error("Failed to delete email", {
        description: getUserFriendlyMessage(error as Error),
      });
    },
    onSuccess: () => {
      toast.success("Email deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.inbox(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.emailHistory(),
      });
    },
  });
}
