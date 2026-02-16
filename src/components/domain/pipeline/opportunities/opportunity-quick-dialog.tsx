/**
 * OpportunityQuickDialog Component
 *
 * Modal for quick create/edit of opportunities from the pipeline board.
 * Avoids full page navigation for fast workflows.
 */
import { memo, useEffect, useMemo, useState, startTransition, useCallback } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OpportunityForm } from "./opportunity-form";
import { useCustomers } from "@/hooks/customers";
import {
  useCreateOpportunity,
  useUpdateOpportunity,
} from "@/hooks/pipeline";
import { useOpportunity } from "@/hooks/pipeline/use-opportunities";
import { toastSuccess, toastError } from "@/hooks";
import {
  STAGE_PROBABILITY_DEFAULTS,
  type OpportunityStage,
  isValidOpportunityStage,
} from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityQuickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  stage?: OpportunityStage;
  opportunityId?: string | null;
  onSuccess?: (opportunityId: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STAGE_OPTIONS: Array<{ value: OpportunityStage; label: string }> = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const OpportunityQuickDialog = memo(function OpportunityQuickDialog({
  open,
  onOpenChange,
  mode,
  stage = "new",
  opportunityId,
  onSuccess,
}: OpportunityQuickDialogProps) {
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();

  const {
    data: opportunityDetail,
    isLoading: isLoadingOpportunity,
  } = useOpportunity({ id: opportunityId ?? "", enabled: mode === "edit" && !!opportunityId });

  const customersQuery = useCustomers({ page: 1, pageSize: 100 });
  const customers = customersQuery.data?.items ?? [];

  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stageValue, setStageValue] = useState<OpportunityStage>(stage);
  const [probability, setProbability] = useState(STAGE_PROBABILITY_DEFAULTS[stage]);
  const [valueDollars, setValueDollars] = useState("0");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");

  const isSaving = createOpportunity.isPending || updateOpportunity.isPending;

  useEffect(() => {
    if (!open || mode !== "create") return;
    startTransition(() => {
      setCustomerId("");
      setTitle("");
      setDescription("");
      setStageValue(stage);
      setProbability(STAGE_PROBABILITY_DEFAULTS[stage]);
      setValueDollars("0");
      setExpectedCloseDate("");
    });
  }, [open, mode, stage]);

  const handleStageChange = (nextStage: OpportunityStage) => {
    setStageValue(nextStage);
    setProbability(STAGE_PROBABILITY_DEFAULTS[nextStage]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerId) {
      toastError("Please select a customer.");
      return;
    }

    const value = parseFloat(valueDollars) || 0;

    try {
      const result = await createOpportunity.mutateAsync({
        title,
        description: description || undefined,
        customerId,
        stage: stageValue,
        probability,
        value,
        expectedCloseDate: expectedCloseDate || null,
        tags: [],
        metadata: {
          source: "other",
          notes: description || undefined,
        },
      });
      toastSuccess("Opportunity created.");
      onOpenChange(false);
      onSuccess?.(result.opportunity.id);
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to create opportunity."
      );
    }
  };

  const handleUpdate = useCallback(async (updates: Partial<{
    title: string;
    description: string | null;
    stage: string;
    probability: number | null;
    value: number;
    expectedCloseDate: Date | string | null;
    tags: string[] | null;
  }>) => {
    if (!opportunityId) return;
    try {
      const formattedCloseDate =
        updates.expectedCloseDate instanceof Date
          ? format(updates.expectedCloseDate, "yyyy-MM-dd")
          : updates.expectedCloseDate
            ? String(updates.expectedCloseDate)
            : null;

      // Build update payload, converting null to undefined for optional fields
      await updateOpportunity.mutateAsync({
        id: opportunityId,
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && {
          description: updates.description ?? undefined,
        }),
        ...(updates.stage !== undefined && isValidOpportunityStage(updates.stage) && {
          stage: updates.stage,
        }),
        ...(updates.probability !== undefined && {
          probability: updates.probability ?? undefined,
        }),
        ...(updates.value !== undefined && { value: updates.value }),
        ...(formattedCloseDate !== undefined && {
          expectedCloseDate: formattedCloseDate,
        }),
        ...(updates.tags !== undefined && {
          tags: updates.tags ?? undefined,
        }),
      });
      toastSuccess("Opportunity updated.");
      onOpenChange(false);
      onSuccess?.(opportunityId);
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to update opportunity."
      );
    }
  }, [opportunityId, updateOpportunity, onOpenChange, onSuccess]);

  const editContent = useMemo(() => {
    if (mode !== "edit") return null;
    if (isLoadingOpportunity) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading opportunity…
        </div>
      );
    }

    if (!opportunityDetail?.opportunity) {
      return (
        <div className="text-sm text-muted-foreground">
          Opportunity not found.
        </div>
      );
    }

    return (
      <OpportunityForm
        opportunity={opportunityDetail.opportunity}
        customer={opportunityDetail.customer}
        contact={opportunityDetail.contact}
        onSave={handleUpdate}
        onCancel={() => onOpenChange(false)}
        isLoading={isSaving}
      />
    );
  }, [
    handleUpdate,
    isLoadingOpportunity,
    isSaving,
    mode,
    onOpenChange,
    opportunityDetail,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Quick Add Opportunity" : "Edit Opportunity"}
          </DialogTitle>
        </DialogHeader>

        {mode === "create" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select
                  value={customerId}
                  onValueChange={setCustomerId}
                  disabled={customersQuery.isLoading}
                >
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Opportunity title"
                  required
                  maxLength={255}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context or notes"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={stageValue} onValueChange={handleStageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min={0}
                  max={100}
                  value={probability}
                  onChange={(event) => setProbability(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Deal Value</Label>
                <Input
                  id="value"
                  type="number"
                  min={0}
                  value={valueDollars}
                  onChange={(event) => setValueDollars(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closeDate">Expected Close Date</Label>
              <Input
                id="closeDate"
                type="date"
                value={expectedCloseDate}
                onChange={(event) => setExpectedCloseDate(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Opportunity"
                )}
              </Button>
            </div>
          </form>
        ) : (
          editContent
        )}
      </DialogContent>
    </Dialog>
  );
});

export default OpportunityQuickDialog;
