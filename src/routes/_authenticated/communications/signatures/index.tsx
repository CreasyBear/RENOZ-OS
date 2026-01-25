/**
 * Email Signatures Route (Container)
 *
 * Container component that fetches signatures data and passes to SignaturesList presenter.
 * Handles all data fetching, mutations, and state management.
 *
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import {
  useSignatures,
  useCreateSignature,
  useUpdateSignature,
  useDeleteSignature,
  useSetDefaultSignature,
} from "@/hooks/communications";
import { SignaturesList } from "@/components/domain/communications";
import { type SignatureFormValues } from "@/components/domain/communications";
import { toastSuccess, toastError } from "@/hooks";
import { ErrorState } from "@/components/shared";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/signatures/")({
  component: SignaturesContainer,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => (
    <div className="container py-6 max-w-4xl">
      <CommunicationsListSkeleton />
    </div>
  ),
});

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

function SignaturesContainer() {
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: signaturesData,
    isLoading,
    error,
    refetch,
  } = useSignatures({
    includeCompanyWide: true,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const createMutation = useCreateSignature();
  const updateMutation = useUpdateSignature();
  const deleteMutation = useDeleteSignature();
  const setDefaultMutation = useSetDefaultSignature();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleCreate = useCallback(
    async (values: SignatureFormValues) => {
      try {
        await createMutation.mutateAsync({
          data: {
            name: values.name,
            content: values.content,
            isDefault: values.isDefault,
          },
        });
        toastSuccess("Signature created");
      } catch {
        toastError("Failed to create signature");
        throw new Error("Failed to create signature");
      }
    },
    [createMutation]
  );

  const handleUpdate = useCallback(
    async (id: string, values: SignatureFormValues) => {
      try {
        await updateMutation.mutateAsync({
          data: {
            id,
            name: values.name,
            content: values.content,
            isDefault: values.isDefault,
          },
        });
        toastSuccess("Signature updated");
      } catch {
        toastError("Failed to update signature");
        throw new Error("Failed to update signature");
      }
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ data: { id } });
        toastSuccess("Signature deleted");
      } catch {
        toastError("Failed to delete signature");
      }
    },
    [deleteMutation]
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      try {
        await setDefaultMutation.mutateAsync({ data: { id } });
        toastSuccess("Default signature updated");
      } catch {
        toastError("Failed to set default signature");
      }
    },
    [setDefaultMutation]
  );

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <ErrorState
        title="Failed to load signatures"
        message="There was an error loading your email signatures."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const signatures = signaturesData?.items ?? [];

  return (
    <div className="container py-6 max-w-4xl">
      <SignaturesList
        signatures={signatures}
        isLoading={isLoading}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
        isDeleting={deleteMutation.isPending}
        isSettingDefault={setDefaultMutation.isPending}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

export default SignaturesContainer;
