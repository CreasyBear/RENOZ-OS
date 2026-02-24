/**
 * WonLostDialog Component
 *
 * Confirmation dialog for marking opportunities as Won or Lost.
 * Requires reason selection before allowing confirmation.
 *
 * @see _Initiation/_prd/2-domains/pipeline/wireframes/pipeline-kanban-board.wireframe.md
 */

import { useMemo } from "react";
import { Trophy, XCircle } from "lucide-react";
import { FormatAmount } from "@/components/shared/format";
import {
  FormDialog,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/shared/forms";
import { toast } from "sonner";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { useWinLossReasons } from "@/hooks/settings";
import type { WinLossDialog, WinLossReasonType } from "@/lib/schemas/pipeline";
import { winLossDialogSchema } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

/** Minimal opportunity shape—WonLostDialog only uses title and value */
export interface WonLostDialogOpportunity {
  title: string;
  value: number;
}

export interface WonLostDialogProps {
  open: boolean;
  type: "won" | "lost";
  opportunity: WonLostDialogOpportunity | null;
  onConfirm: (reason: {
    winLossReasonId?: string;
    lostNotes?: string;
    competitorName?: string;
  }) => void;
  onCancel: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WonLostDialog({
  open,
  type,
  opportunity,
  onConfirm,
  onCancel,
}: WonLostDialogProps) {
  const isWon = type === "won";
  const reasonFilters = useMemo<{ type: WinLossReasonType; isActive: boolean }>(
    () => ({
      type: isWon ? "win" : "loss",
      isActive: true,
    }),
    [isWon]
  );
  const { data: reasonsData, isLoading: isReasonsLoading } = useWinLossReasons({
    filters: reasonFilters,
    enabled: open,
  });
  const reasons = useMemo(() => reasonsData?.reasons ?? [], [reasonsData?.reasons]);
  const reasonOptions = useMemo(
    () => reasons.map((reason) => ({ value: reason.id, label: reason.name })),
    [reasons]
  );

  const form = useTanStackForm<WinLossDialog>({
    schema: winLossDialogSchema,
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
    defaultValues: {
      winLossReasonId: "",
      lostNotes: "",
      competitorName: "",
    },
    onSubmit: async (values) => {
      onConfirm({
        winLossReasonId: values.winLossReasonId || undefined,
        lostNotes: values.lostNotes?.trim() || undefined,
        competitorName: values.competitorName?.trim() || undefined,
      });
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      onCancel();
    }
  };

  if (!opportunity) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          {isWon ? (
            <>
              <Trophy className="h-5 w-5 text-green-600" />
              Mark as Won
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-600" />
              Mark as Lost
            </>
          )}
        </span>
      }
      description={
        isWon ? (
          <>
            Congratulations! Mark {opportunity.title} as won for{" "}
            <span className="font-semibold">
              <FormatAmount amount={opportunity.value} />
            </span>
            ?
          </>
        ) : (
          <>Mark {opportunity.title} as lost?</>
        )
      }
      form={form}
      submitLabel={isWon ? "Confirm Win" : "Confirm Loss"}
      loadingLabel={isWon ? "Confirming win..." : "Confirming loss..."}
      submitVariant={isWon ? "default" : "destructive"}
      submitDisabled={reasons.length === 0}
      size="sm"
      className="sm:max-w-[425px]"
      resetOnClose={false}
    >
      <div className="space-y-4 py-4">
            <form.Field name="winLossReasonId">
              {(field) => (
                <SelectField
                  field={field}
                  label={isWon ? "Win Reason" : "Loss Reason"}
                  placeholder="Select a reason..."
                  options={reasonOptions}
                  required
                  disabled={isReasonsLoading || reasons.length === 0}
                  description={
                    isReasonsLoading
                      ? "Loading reasons..."
                      : reasons.length === 0
                        ? "No reasons available."
                        : undefined
                  }
                />
              )}
            </form.Field>

            {!isWon && (
              <form.Field name="competitorName">
                {(field) => (
                  <TextField
                    field={field}
                    label="Competitor (if applicable)"
                    placeholder="Competitor name..."
                  />
                )}
              </form.Field>
            )}

            <form.Field name="lostNotes">
              {(field) => (
                <TextareaField
                  field={field}
                  label={isWon ? "Notes (optional)" : "What could we have done differently?"}
                  placeholder={
                    isWon
                      ? "Add any additional notes..."
                      : "Learnings from this opportunity..."
                  }
                  rows={3}
                  maxLength={2000}
                />
              )}
            </form.Field>
          </div>
    </FormDialog>
  );
}

export default WonLostDialog;
