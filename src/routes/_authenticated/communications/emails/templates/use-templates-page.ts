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
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCloneTemplate,
  useTemplateVersions,
} from "@/hooks/communications";
import { toastSuccess, toastError } from "@/hooks";
import { useConfirmation, confirmations } from "@/hooks/_shared/use-confirmation";
import type { TemplateFormValues } from "@/lib/schemas/communications";

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
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const cloneMutation = useCloneTemplate();

  const { data: versionsData, isLoading: versionsLoading } = useTemplateVersions({
    templateId: versionsTemplateId ?? "",
    enabled: !!versionsTemplateId,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreate = useCallback(
    async (values: TemplateFormValues): Promise<void> => {
      try {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description,
          category: values.category,
          subject: values.subject,
          bodyHtml: values.bodyHtml,
          variables: [],
          // Note: isActive not in create schema, templates are active by default
        });
        toastSuccess("Template created");
      } catch {
        toastError("Failed to create template");
        throw new Error("Failed to create template");
      }
    },
    [createMutation]
  );

  const handleUpdate = useCallback(
    async (id: string, values: TemplateFormValues) => {
      try {
        await updateMutation.mutateAsync({
          id,
          name: values.name,
          description: values.description,
          category: values.category,
          subject: values.subject,
          bodyHtml: values.bodyHtml,
          isActive: values.isActive,
          createVersion: values.createVersion,
        });
        toastSuccess("Template updated");
      } catch {
        toastError("Failed to update template");
        throw new Error("Failed to update template");
      }
    },
    [updateMutation]
  );

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

  return {
    // State (only version history - filters are URL-synced in page component)
    versions: versionsData ?? [],
    versionsLoading,

    // Handlers
    handleCreate,
    handleUpdate,
    handleDelete,
    handleClone,
    handleFetchVersions,

    // Loading states
    isDeleting: deleteMutation.isPending,
    isCloning: cloneMutation.isPending,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}
