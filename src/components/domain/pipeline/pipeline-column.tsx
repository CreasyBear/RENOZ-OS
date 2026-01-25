/**
 * PipelineColumn Component
 *
 * A column in the pipeline board representing a single stage.
 * Shows stage header with counts and totals, and contains draggable opportunity cards.
 *
 * @see _Initiation/_prd/2-domains/pipeline/wireframes/pipeline-kanban-board.wireframe.md
 */

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { memo, useMemo } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/formatters";
import { FormatAmount } from "@/components/shared/format";
import { OpportunityCard } from "./opportunities/opportunity-card";
import type { Opportunity, OpportunityStage } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineColumnProps {
  stage: OpportunityStage;
  opportunities: Opportunity[];
  isOver?: boolean;
  onAddOpportunity?: (stage: OpportunityStage) => void;
  onEditOpportunity?: (id: string) => void;
  onScheduleFollowup?: (id: string) => void;
}

// ============================================================================
// STAGE CONFIG
// ============================================================================

const STAGE_CONFIG: Record<OpportunityStage, { label: string; color: string }> = {
  new: { label: "New", color: "bg-slate-100 dark:bg-slate-900 border-slate-300" },
  qualified: { label: "Qualified", color: "bg-blue-50 dark:bg-blue-950 border-blue-300" },
  proposal: { label: "Proposal", color: "bg-indigo-50 dark:bg-indigo-950 border-indigo-300" },
  negotiation: { label: "Negotiation", color: "bg-purple-50 dark:bg-purple-950 border-purple-300" },
  won: { label: "Won", color: "bg-green-50 dark:bg-green-950 border-green-300" },
  lost: { label: "Lost", color: "bg-gray-100 dark:bg-gray-900 border-gray-300" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const PipelineColumn = memo(function PipelineColumn({
  stage,
  opportunities,
  isOver = false,
  onAddOpportunity,
  onEditOpportunity,
  onScheduleFollowup,
}: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage,
    data: {
      type: "column",
      stage,
    },
  });

  const config = STAGE_CONFIG[stage];

  // Calculate totals
  const { count, totalValue, weightedValue } = useMemo(() => {
    return opportunities.reduce(
      (acc, opp) => ({
        count: acc.count + 1,
        totalValue: acc.totalValue + opp.value,
        weightedValue: acc.weightedValue + (opp.weightedValue ?? 0),
      }),
      { count: 0, totalValue: 0, weightedValue: 0 }
    );
  }, [opportunities]);

  const opportunityIds = useMemo(
    () => opportunities.map((o) => o.id),
    [opportunities]
  );

  const isClosedStage = stage === "won" || stage === "lost";

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] rounded-lg border",
        config.color,
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
      aria-label={`${config.label} stage, ${count} opportunities, ${formatCurrency(totalValue)}`}
    >
      {/* Stage Header */}
      <header className={cn(
        "p-3 border-b",
        isOver && "bg-primary/10"
      )}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm uppercase tracking-wide">
            {config.label}
          </h3>
          <span className="text-sm font-medium text-muted-foreground">
            ({count})
          </span>
        </div>
        <div className="text-sm">
          <span className="font-semibold"><FormatAmount amount={totalValue} /></span>
        </div>
        <div className="text-xs text-muted-foreground">
          W: <FormatAmount amount={weightedValue} />
        </div>
      </header>

      {/* Cards Container */}
      <SortableContext
        items={opportunityIds}
        strategy={verticalListSortingStrategy}
      >
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-2 min-h-[100px]">
            {opportunities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <p className="text-sm">No opportunities</p>
                <p className="text-xs">
                  {isClosedStage
                    ? `${stage === "won" ? "Won" : "Lost"} deals appear here`
                    : "Drag cards here or add new"}
                </p>
              </div>
            ) : (
              opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onEdit={onEditOpportunity}
                  onScheduleFollowup={onScheduleFollowup}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SortableContext>

      {/* Add Card Button (only for active stages) */}
      {!isClosedStage && (
        <footer className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => onAddOpportunity?.(stage)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Opportunity
          </Button>
        </footer>
      )}
    </article>
  );
});

export default PipelineColumn;
