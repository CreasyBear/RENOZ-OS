/**
 * WonLostDialog Component
 *
 * Confirmation dialog for marking opportunities as Won or Lost.
 * Requires reason selection before allowing confirmation.
 *
 * @see _Initiation/_prd/2-domains/pipeline/wireframes/pipeline-kanban-board.wireframe.md
 */

import { useState } from "react";
import { Trophy, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormatAmount } from "@/components/shared/format";
import type { Opportunity } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface WonLostDialogProps {
  open: boolean;
  type: "won" | "lost";
  opportunity: Opportunity | null;
  onConfirm: (reason: {
    winLossReasonId?: string;
    lostNotes?: string;
    competitorName?: string;
  }) => void;
  onCancel: () => void;
}

// ============================================================================
// REASON OPTIONS (TODO: Fetch from winLossReasons table)
// ============================================================================

const WIN_REASONS = [
  { id: "better-pricing", name: "Better pricing" },
  { id: "superior-features", name: "Superior features" },
  { id: "relationship", name: "Strong relationship" },
  { id: "competitor-weakness", name: "Competitor weakness" },
  { id: "other", name: "Other" },
];

const LOSS_REASONS = [
  { id: "price-too-high", name: "Price too high" },
  { id: "missing-features", name: "Missing features" },
  { id: "chose-competitor", name: "Chose competitor" },
  { id: "budget-constraints", name: "Budget constraints" },
  { id: "timeline-mismatch", name: "Timeline mismatch" },
  { id: "no-decision", name: "No decision made" },
  { id: "other", name: "Other" },
];

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
  const [reasonId, setReasonId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [competitorName, setCompetitorName] = useState("");

  const isWon = type === "won";
  const reasons = isWon ? WIN_REASONS : LOSS_REASONS;
  const canConfirm = reasonId !== "";

  const handleConfirm = () => {
    onConfirm({
      winLossReasonId: reasonId || undefined,
      lostNotes: notes || undefined,
      competitorName: competitorName || undefined,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form when closing
      setReasonId("");
      setNotes("");
      setCompetitorName("");
      onCancel();
    }
  };

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
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
          </DialogTitle>
          <DialogDescription>
            {isWon ? (
              <>
                Congratulations! Mark "{opportunity.title}" as won for{" "}
                <span className="font-semibold">
                  <FormatAmount amount={opportunity.value} />
                </span>
                ?
              </>
            ) : (
              <>
                Mark "{opportunity.title}" as lost?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              {isWon ? "Win Reason" : "Loss Reason"} *
            </Label>
            <Select value={reasonId} onValueChange={setReasonId}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Competitor Name (Loss only) */}
          {!isWon && (
            <div className="space-y-2">
              <Label htmlFor="competitor">Competitor (if applicable)</Label>
              <Input
                id="competitor"
                placeholder="Competitor name..."
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isWon ? "Notes (optional)" : "What could we have done differently?"}
            </Label>
            <Textarea
              id="notes"
              placeholder={
                isWon
                  ? "Add any additional notes..."
                  : "Learnings from this opportunity..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            variant={isWon ? "default" : "destructive"}
          >
            {isWon ? "Confirm Win" : "Confirm Loss"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WonLostDialog;
