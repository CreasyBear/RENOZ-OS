/**
 * Scheduled Calls Route (Container)
 *
 * Container for ScheduledCallsList presenter.
 * Handles data fetching and mutation callbacks.
 *
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useScheduledCalls, useCompleteCall, useCancelCall, useRescheduleCall } from "@/hooks/communications";
import { ScheduledCallsList } from "@/components/domain/communications/scheduled-calls-list";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { ErrorState } from "@/components/shared";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/communications/calls/")({
  component: ScheduledCallsContainer,
});

// ============================================================================
// CONTAINER
// ============================================================================

function ScheduledCallsContainer() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCallForOutcome, setSelectedCallForOutcome] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: callsData,
    isLoading,
    error,
    refetch,
  } = useScheduledCalls({
    status: statusFilter === "all" ? undefined : statusFilter as "pending" | "completed" | "cancelled" | "rescheduled",
    limit: 50,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const completeMutation = useCompleteCall();
  const cancelMutation = useCancelCall();
  const rescheduleMutation = useRescheduleCall();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleComplete = useCallback(
    async (id: string, outcome: string, notes?: string) => {
      try {
        await completeMutation.mutateAsync({ data: { id, outcome, notes } });
        toastSuccess("Call marked as complete");
        setSelectedCallForOutcome(null);
      } catch {
        toastError("Failed to complete call");
      }
    },
    [completeMutation]
  );

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await cancelMutation.mutateAsync({ data: { id } });
        toastSuccess("Call cancelled");
      } catch {
        toastError("Failed to cancel call");
      }
    },
    [cancelMutation]
  );

  const handleReschedule = useCallback(
    async (id: string, newDate: Date) => {
      try {
        await rescheduleMutation.mutateAsync({ data: { id, scheduledAt: newDate } });
        toastSuccess("Call rescheduled");
      } catch {
        toastError("Failed to reschedule call");
      }
    },
    [rescheduleMutation]
  );

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  const handleSelectCallForOutcome = useCallback((callId: string | null) => {
    setSelectedCallForOutcome(callId);
  }, []);

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <ErrorState
        title="Failed to load scheduled calls"
        description="There was an error loading your scheduled calls."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  const calls = callsData?.items ?? [];

  return (
    <ScheduledCallsList
      calls={calls}
      isLoading={isLoading}
      statusFilter={statusFilter}
      onStatusFilterChange={handleStatusFilterChange}
      selectedCallForOutcome={selectedCallForOutcome}
      onSelectCallForOutcome={handleSelectCallForOutcome}
      onComplete={handleComplete}
      onCancel={handleCancel}
      onReschedule={handleReschedule}
      isCompleting={completeMutation.isPending}
      isCancelling={cancelMutation.isPending}
      isRescheduling={rescheduleMutation.isPending}
    />
  );
}

export default ScheduledCallsContainer;
