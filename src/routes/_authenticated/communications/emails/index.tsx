/**
 * Scheduled Emails Route (Container)
 *
 * Container for ScheduledEmailsList presenter.
 * Handles data fetching and mutation callbacks.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  useScheduledEmails,
  useCancelScheduledEmail,
  type UseScheduledEmailsOptions,
} from "@/hooks/communications";
import { ScheduledEmailsList } from "@/components/domain/communications";
import { ScheduleEmailDialog } from "@/components/domain/communications";
import { toastSuccess, toastError } from "@/hooks";
import { ErrorState } from "@/components/shared";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/emails/")({
  component: ScheduledEmailsContainer,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});

// ============================================================================
// CONTAINER
// ============================================================================

function ScheduledEmailsContainer() {
  const navigate = useNavigate();
  const [statusFilter, _setStatusFilter] = useState<string | undefined>(undefined);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: emailsData,
    isLoading,
    error,
    refetch,
  } = useScheduledEmails({
    status: statusFilter as UseScheduledEmailsOptions["status"],
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const cancelMutation = useCancelScheduledEmail();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await cancelMutation.mutateAsync({ data: { id } });
        toastSuccess("Scheduled email cancelled");
      } catch {
        toastError("Failed to cancel email");
      }
    },
    [cancelMutation]
  );

  const handleEdit = useCallback((id: string) => {
    setEditingEmailId(id);
  }, []);

  const handleCompose = useCallback(() => {
    setComposeOpen(true);
  }, []);

  const handleCreateSignature = useCallback(() => {
    navigate({ to: "/communications/signatures" });
  }, [navigate]);

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <ErrorState
        title="Failed to load scheduled emails"
        message="There was an error loading your scheduled emails."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const emails = emailsData?.items ?? [];

  return (
    <>
      <ScheduledEmailsList
        emails={emails}
        isLoading={isLoading}
        onCancel={handleCancel}
        onEdit={handleEdit}
        onCompose={handleCompose}
        isCancelling={cancelMutation.isPending}
      />

      {/* Schedule Email Dialog handled by parent */}
      <ScheduleEmailDialog
        open={composeOpen || !!editingEmailId}
        onOpenChange={(open) => {
          if (!open) {
            setComposeOpen(false);
            setEditingEmailId(null);
          }
        }}
        onCreateSignature={handleCreateSignature}
        onSuccess={() => {
          setComposeOpen(false);
          setEditingEmailId(null);
        }}
      />
    </>
  );
}

export default ScheduledEmailsContainer;
