/**
 * Scheduled Calls Page Component
 *
 * Container for ScheduledCallsList presenter.
 * Handles data fetching and mutation callbacks.
 *
 * @source calls from useScheduledCalls hook
 * @source mutations from useCompleteCall, useCancelCall, useRescheduleCall hooks
 *
 * @see src/routes/_authenticated/communications/calls/index.tsx - Route definition
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { useCallback, useMemo, useState } from "react";
import { useScheduledCalls, useCompleteCall, useCancelCall, useRescheduleCall } from "@/hooks/communications";
import { ScheduledCallsList, CallOutcomeDialog } from "@/components/domain/communications";
import { toastSuccess, toastError } from "@/hooks";
import { ErrorState } from "@/components/shared";

export default function CallsPage() {
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
        await completeMutation.mutateAsync({
          id,
          outcome: outcome as "answered" | "no_answer" | "voicemail" | "busy" | "wrong_number" | "callback_requested" | "completed_successfully",
          outcomeNotes: notes,
        });
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
        await cancelMutation.mutateAsync({ id });
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
        await rescheduleMutation.mutateAsync({ id, newScheduledAt: newDate });
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

  // Compute derived data before any early returns (hooks must run unconditionally)
  const calls = useMemo(() => callsData?.items ?? [], [callsData?.items]);
  const selectedCall = useMemo(
    () => calls.find((call) => call.id === selectedCallForOutcome),
    [calls, selectedCallForOutcome]
  );

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <ErrorState
        title="Failed to load scheduled calls"
        message="There was an error loading your scheduled calls."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
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

      {/* Outcome Dialog */}
      {selectedCallForOutcome && selectedCall && (
        <CallOutcomeDialog
          callId={selectedCallForOutcome}
          customerId={selectedCall.customerId}
          defaultOpen
          onOpenChange={(open) => {
            if (!open) setSelectedCallForOutcome(null);
          }}
          onSuccess={() => {
            setSelectedCallForOutcome(null);
          }}
        />
      )}
    </>
  );
}
