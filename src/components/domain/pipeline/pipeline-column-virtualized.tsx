/**
 * PipelineColumnVirtualized Component
 *
 * A virtualized version of PipelineColumn for handling large numbers of opportunities.
 * Uses @tanstack/react-virtual to only render visible items + buffer.
 *
 * PERFORMANCE:
 * - Renders only ~10-15 DOM nodes regardless of total items
 * - Smooth scrolling for columns with 100+ cards
 * - Maintains drag-and-drop compatibility
 *
 * @see STANDARDS.md - Performance optimization for large datasets
 */

import { useRef, useMemo, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormatAmount } from "@/components/shared/format";
import { OpportunityCard } from "./opportunities/opportunity-card";
import type { Opportunity, OpportunityStage } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineColumnVirtualizedProps {
  stage: OpportunityStage;
  opportunities: Opportunity[];
  isOver?: boolean;
  onAddOpportunity?: (stage: OpportunityStage) => void;
  onEditOpportunity?: (id: string) => void;
  onScheduleFollowup?: (id: string) => void;
  /** Estimated height of each card in pixels */
  estimateSize?: number;
  /** Number of items to render outside viewport */
  overscan?: number;
}

// ============================================================================
// STAGE CONFIG
// ============================================================================

const STAGE_CONFIG: Record<
  OpportunityStage,
  { label: string; color: string }
> = {
  new: {
    label: "New",
    color: "bg-slate-100 dark:bg-slate-900 border-slate-300",
  },
  qualified: {
    label: "Qualified",
    color: "bg-blue-50 dark:bg-blue-950 border-blue-300",
  },
  proposal: {
    label: "Proposal",
    color: "bg-indigo-50 dark:bg-indigo-950 border-indigo-300",
  },
  negotiation: {
    label: "Negotiation",
    color: "bg-purple-50 dark:bg-purple-950 border-purple-300",
  },
  won: { label: "Won", color: "bg-green-50 dark:bg-green-950 border-green-300" },
  lost: {
    label: "Lost",
    color: "bg-gray-100 dark:bg-gray-900 border-gray-300",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

const ESTIMATED_CARD_HEIGHT = 120; // Base estimate, adjusts dynamically
const DEFAULT_OVERSCAN = 5;

export const PipelineColumnVirtualized = memo(
  function PipelineColumnVirtualized({
    stage,
    opportunities,
    isOver = false,
    onAddOpportunity,
    onEditOpportunity,
    onScheduleFollowup,
    estimateSize = ESTIMATED_CARD_HEIGHT,
    overscan = DEFAULT_OVERSCAN,
  }: PipelineColumnVirtualizedProps) {
    // Reference to the scrollable container
    const parentRef = useRef<HTMLDivElement>(null);

    // Droppable for drag-and-drop
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

    // Virtualizer setup
    const virtualizer = useVirtualizer({
      count: opportunities.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => estimateSize,
      overscan,
      // Dynamic measurement for accurate sizing
      measureElement:
        typeof window !== "undefined" &&
        "ResizeObserver" in window
          ? (element) => element.getBoundingClientRect().height
          : undefined,
    });

    const virtualItems = virtualizer.getVirtualItems();
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
        aria-label={`${config.label} stage, ${count} opportunities`}
      >
        {/* Stage Header */}
        <header
          className={cn("p-3 border-b", isOver && "bg-primary/10")}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm uppercase tracking-wide">
              {config.label}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {count} items
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                ({virtualizer.getVirtualItems().length} visible)
              </span>
            </div>
          </div>
          <div className="text-sm">
            <span className="font-semibold">
              <FormatAmount amount={totalValue} />
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            W: <FormatAmount amount={weightedValue} />
          </div>
        </header>

        {/* Virtualized Cards Container */}
        <SortableContext
          items={opportunityIds}
          strategy={verticalListSortingStrategy}
        >
          <ScrollArea className="flex-1" ref={parentRef}>
            <div
              className="relative p-2"
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                minHeight: "100px",
              }}
            >
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
                virtualItems.map((virtualItem) => {
                  const opportunity = opportunities[virtualItem.index];
                  if (!opportunity) return null;

                  return (
                    <div
                      key={opportunity.id}
                      data-index={virtualItem.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="px-1 py-1"
                    >
                      <OpportunityCard
                        opportunity={opportunity}
                        onEdit={onEditOpportunity}
                        onScheduleFollowup={onScheduleFollowup}
                      />
                    </div>
                  );
                })
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
  }
);

export default PipelineColumnVirtualized;
