/**
 * Templates Page Hook
 *
 * Custom hook that encapsulates all handlers and state for the templates page.
 * Extracted to reduce templates-page.tsx file size for code splitting compliance.
 *
 * @see templates-page.tsx - Page component using this hook
 */

import { useCallback, useState } from "react";
import {
  useDeleteTemplate,
  useCloneTemplate,
  useTemplateVersions,
  useRestoreTemplateVersion,
} from "@/hooks/communications";
import { toastSuccess, toastError } from "@/hooks";
import { useConfirmation, confirmations } from "@/hooks/_shared/use-confirmation";

export function useTemplatesPage() {
  // Only manage version history state here (not filter state - that's URL-synced)
  const [versionsTemplateId, setVersionsTemplateId] = useState<string | null>(
    null
  );

  // ============================================================================
  // CONFIRMATION
  // ============================================================================
  const confirm = useConfirmation();

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const deleteMutation = useDeleteTemplate();
  const cloneMutation = useCloneTemplate();
  const restoreVersionMutation = useRestoreTemplateVersion();

  const { data: versionsData, isLoading: versionsLoading } = useTemplateVersions({
    templateId: versionsTemplateId ?? "",
    enabled: !!versionsTemplateId,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleDelete = useCallback(
    async (id: string) => {
      const { confirmed } = await confirm.confirm(
        confirmations.delete("this template", "template")
      );

      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync({ id });
        toastSuccess("Template deleted");
      } catch {
        toastError("Failed to delete template");
      }
    },
    [confirm, deleteMutation]
  );

  const handleClone = useCallback(
    async (id: string, newName: string): Promise<void> => {
      try {
        await cloneMutation.mutateAsync({ id, newName });
        toastSuccess("Template cloned");
      } catch {
        toastError("Failed to clone template");
      }
    },
    [cloneMutation]
  );

  const handleFetchVersions = useCallback((templateId: string) => {
    setVersionsTemplateId(templateId);
  }, []);

  const handleRestoreVersion = useCallback(
    async (versionId: string): Promise<void> => {
      try {
        await restoreVersionMutation.mutateAsync({ versionId });
        toastSuccess("Template version restored");
      } catch {
        toastError("Failed to restore template version");
        throw new Error("Failed to restore template version");
      }
    },
    [restoreVersionMutation]
  );

  return {
    // State (only version history - filters are URL-synced in page component)
    versions: versionsData ?? [],
    versionsLoading,

    // Handlers
    handleDelete,
    handleClone,
    handleFetchVersions,
    handleRestoreVersion,

    // Loading states
    isDeleting: deleteMutation.isPending,
    isCloning: cloneMutation.isPending,
    isRestoringVersion: restoreVersionMutation.isPending,
  };
}
