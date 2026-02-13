/**
 * PipelineBoard Component
 *
 * Pipeline kanban board using shared kanban components.
 * Handles domain-specific logic (Won/Lost dialogs) while delegating
 * rendering to the shared KanbanBoard component.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Sparkles,
  Target,
  FileText,
  MessageSquare,
  Trophy,
  XCircle,
  Pencil,
} from "lucide-react";
import { FormatAmount } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import {
  KanbanBoard,
  SortableKanbanCard,
  type KanbanColumnDef,
  type KanbanMoveEvent,
  type KanbanPriority,
} from "@/components/shared/kanban";
import { WonLostDialog } from "./won-lost-dialog";
import type { Opportunity, OpportunityStage } from "@/lib/schemas/pipeline";
import { PIPELINE_STAGE_COLORS, PIPELINE_TAG_COLORS } from "./pipeline-stage-colors";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineBoardProps {
  opportunities: Opportunity[];
  onStageChange: (
    opportunityId: string,
    newStage: OpportunityStage,
    reason?: { winLossReasonId?: string; lostNotes?: string; competitorName?: string }
  ) => Promise<void>;
  onAddOpportunity?: (stage: OpportunityStage) => void;
  onEditOpportunity?: (id: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

const PIPELINE_COLUMNS: KanbanColumnDef<OpportunityStage>[] = [
  {
    key: "new",
    title: "New",
    color: PIPELINE_STAGE_COLORS.new,
    icon: Sparkles,
  },
  {
    key: "qualified",
    title: "Qualified",
    color: PIPELINE_STAGE_COLORS.qualified,
    icon: Target,
  },
  {
    key: "proposal",
    title: "Proposal",
    color: PIPELINE_STAGE_COLORS.proposal,
    icon: FileText,
  },
  {
    key: "negotiation",
    title: "Negotiation",
    color: PIPELINE_STAGE_COLORS.negotiation,
    icon: MessageSquare,
  },
  {
    key: "won",
    title: "Won",
    color: PIPELINE_STAGE_COLORS.won,
    icon: Trophy,
    acceptsDrop: true,
  },
  {
    key: "lost",
    title: "Lost",
    color: PIPELINE_STAGE_COLORS.lost,
    icon: XCircle,
    acceptsDrop: true,
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function getDaysUntil(date: Date | string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getPriorityFromProbability(probability: number | null): KanbanPriority | undefined {
  if (probability === null) return undefined;
  if (probability >= 80) return "urgent"; // High probability = urgent to close
  if (probability >= 60) return "high";
  if (probability >= 30) return "medium";
  return "low";
}

// ============================================================================
// OPPORTUNITY CARD RENDERER
// ============================================================================

interface OpportunityCardRendererProps {
  opportunity: Opportunity;
  onEdit?: (id: string) => void;
}

function OpportunityCardRenderer({ opportunity, onEdit }: OpportunityCardRendererProps) {
  const router = useRouter();

  const daysUntilClose = getDaysUntil(opportunity.expectedCloseDate);
  const isOverdue = daysUntilClose !== null && daysUntilClose < 0;
  const isStale = opportunity.daysInStage >= 30;

  const daysUntilQuoteExpires = getDaysUntil(opportunity.quoteExpiresAt);
  const isQuoteExpiring = daysUntilQuoteExpires !== null && daysUntilQuoteExpires <= 7 && daysUntilQuoteExpires > 0;
  const isQuoteExpired = daysUntilQuoteExpires !== null && daysUntilQuoteExpires <= 0;

  // Build tags from states
  const tags = useMemo(() => {
    const result: { label: string; color?: string }[] = [];

    if (isStale) {
      result.push({ label: `Stale ${opportunity.daysInStage}d`, color: PIPELINE_TAG_COLORS.stale });
    }
    if (isOverdue) {
      result.push({ label: `Overdue ${Math.abs(daysUntilClose!)}d`, color: PIPELINE_TAG_COLORS.overdue });
    }
    if (isQuoteExpiring) {
      result.push({ label: `Quote expires ${daysUntilQuoteExpires}d`, color: PIPELINE_TAG_COLORS.expiring });
    }
    if (isQuoteExpired) {
      result.push({ label: "Quote expired", color: PIPELINE_TAG_COLORS.expired });
    }

    return result;
  }, [isStale, isOverdue, isQuoteExpiring, isQuoteExpired, opportunity.daysInStage, daysUntilClose, daysUntilQuoteExpires]);

  const handleClick = useCallback(() => {
    router.navigate({
      to: "/pipeline/$opportunityId",
      params: { opportunityId: opportunity.id },
    });
  }, [router, opportunity.id]);

  return (
    <SortableKanbanCard
      id={opportunity.id}
      title={opportunity.title}
      subtitle={opportunity.description ?? undefined}
      value={<FormatAmount amount={opportunity.value} />}
      priority={getPriorityFromProbability(opportunity.probability)}
      dueDate={opportunity.expectedCloseDate ?? undefined}
      tags={tags.length > 0 ? tags : undefined}
      onClick={handleClick}
      actions={
        onEdit ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(opportunity.id)}
            data-no-card-click
            aria-label="Edit opportunity"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null
      }
      status={{
        key: opportunity.stage,
        name: `${opportunity.probability ?? 0}%`,
      }}
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PipelineBoard({
  opportunities,
  onStageChange,
  onAddOpportunity,
  onEditOpportunity,
  isLoading = false,
}: PipelineBoardProps) {
  const handleAddForColumn = useCallback(
    (column: KanbanColumnDef<OpportunityStage>) => {
      onAddOpportunity?.(column.key);
    },
    [onAddOpportunity]
  );
  // Track pending Won/Lost confirmation
  const [pendingTransition, setPendingTransition] = useState<{
    opportunityId: string;
    opportunity: Opportunity;
    targetStage: "won" | "lost";
  } | null>(null);

  // Calculate column aggregates
  const columnsWithAggregates = useMemo(() => {
    const totals: Record<OpportunityStage, number> = {
      new: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    };

    for (const opp of opportunities) {
      totals[opp.stage] += opp.value;
    }

    return PIPELINE_COLUMNS.map((col) => ({
      ...col,
      aggregate: {
        label: "Total",
        value: <FormatAmount amount={totals[col.key]} />,
      },
    }));
  }, [opportunities]);

  // Handle move event from kanban board
  const handleMove = useCallback(
    async (event: KanbanMoveEvent<OpportunityStage>) => {
      const { itemId, toColumn } = event;
      const opportunity = opportunities.find((o) => o.id === itemId);
      if (!opportunity) return;

      // If moving to Won or Lost, show confirmation dialog
      if (toColumn === "won" || toColumn === "lost") {
        setPendingTransition({
          opportunityId: itemId,
          opportunity,
          targetStage: toColumn,
        });
        return;
      }

      // Otherwise, update stage directly
      try {
        await onStageChange(itemId, toColumn);
      } catch {
        // Error is handled by onStageChange callback (toast shown in container)
        // Silently fail here to prevent unhandled promise rejection
      }
    },
    [opportunities, onStageChange]
  );

  // Handle Won/Lost confirmation
  const handleConfirmTransition = useCallback(
    async (reason: { winLossReasonId?: string; lostNotes?: string; competitorName?: string }) => {
      if (!pendingTransition) return;

      try {
        await onStageChange(
          pendingTransition.opportunityId,
          pendingTransition.targetStage,
          reason
        );
      } catch {
        // Error is handled by onStageChange callback (toast shown in container)
        // Silently fail here to prevent unhandled promise rejection
      } finally {
        setPendingTransition(null);
      }
    },
    [pendingTransition, onStageChange]
  );

  const handleCancelTransition = useCallback(() => {
    setPendingTransition(null);
  }, []);

  // Render card function for kanban board
  const renderCard = useCallback(
    (opportunity: Opportunity) => (
      <OpportunityCardRenderer opportunity={opportunity} onEdit={onEditOpportunity} />
    ),
    [onEditOpportunity]
  );

  return (
    <>
      <KanbanBoard
        columns={columnsWithAggregates}
        items={opportunities}
        getColumnKey={(opp) => opp.stage}
        getItemKey={(opp) => opp.id}
        onMove={handleMove}
        renderCard={renderCard}
        isLoading={isLoading}
        emptyMessage="No opportunities"
        height="calc(100vh - 320px)"
        onAddItem={handleAddForColumn}
      />

      {/* Won/Lost Confirmation Dialog */}
      <WonLostDialog
        open={pendingTransition !== null}
        type={pendingTransition?.targetStage ?? "won"}
        opportunity={pendingTransition?.opportunity ?? null}
        onConfirm={handleConfirmTransition}
        onCancel={handleCancelTransition}
      />
    </>
  );
}

export default PipelineBoard;
