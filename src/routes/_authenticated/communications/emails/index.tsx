/**
 * Scheduled Emails Route
 *
 * Route for ScheduledEmailsList which is self-contained (fetches its own data).
 * Provides edit and compose callbacks.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ScheduledEmailsList } from "@/components/domain/communications";
import { ScheduleEmailDialog } from "@/components/domain/communications";
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
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================
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
  // RENDER
  // ============================================================================
  return (
    <>
      {/* ScheduledEmailsList is self-contained - fetches its own data */}
      <ScheduledEmailsList
        onEdit={handleEdit}
        onCompose={handleCompose}
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
