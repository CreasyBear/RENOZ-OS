/**
 * Email Signatures Page Component
 *
 * Container component that fetches signatures data and passes to SignaturesList presenter.
 * Handles all data fetching, mutations, and state management.
 *
 * @source signatures from useSignatures hook
 * @source mutations from useDeleteSignature, useSetDefaultSignature hooks
 *
 * @see src/routes/_authenticated/communications/signatures/index.tsx - Route definition
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { useCallback } from "react";
import {
  useSignatures,
  useDeleteSignature,
  useSetDefaultSignature,
} from "@/hooks/communications";
import { SignaturesList } from "@/components/domain/communications";
import { toastSuccess, toastError } from "@/hooks";
import { useConfirmation, confirmations } from "@/hooks/_shared/use-confirmation";
import { ErrorState } from "@/components/shared";

export default function SignaturesPage() {
  // ============================================================================
  // CONFIRMATION
  // ============================================================================
  const confirm = useConfirmation();

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
  const deleteMutation = useDeleteSignature();
  const setDefaultMutation = useSetDefaultSignature();

  const handleDelete = useCallback(
    async (id: string) => {
      const { confirmed } = await confirm.confirm(
        confirmations.delete("this signature", "signature")
      );

      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync({ id });
        toastSuccess("Signature deleted");
      } catch {
        toastError("Failed to delete signature");
      }
    },
    [confirm, deleteMutation]
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      try {
        await setDefaultMutation.mutateAsync({ id });
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
      <>
        <h2 className="text-xl font-semibold mb-4">Email Signatures</h2>
        <ErrorState
          title="Failed to load signatures"
          message="There was an error loading your email signatures."
          onRetry={() => refetch()}
        />
      </>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const signatures = signaturesData ?? [];

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Email Signatures</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Manage email signatures for your team
      </p>
      <div className="max-w-4xl">
          <SignaturesList
            signatures={signatures}
            isLoading={isLoading}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
            isDeleting={deleteMutation.isPending}
            isSettingDefault={setDefaultMutation.isPending}
          />
      </div>
    </>
  );
}
