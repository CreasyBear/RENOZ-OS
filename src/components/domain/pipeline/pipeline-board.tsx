/**
 * PipelineBoard Component
 *
 * Main kanban board for pipeline management with drag-and-drop.
 * Uses DnD Kit for drag operations with optimistic updates.
 *
 * Features:
 * - Drag opportunities between stages
 * - Optimistic updates with rollback on error
 * - Confirmation dialogs for Won/Lost transitions
 * - Keyboard navigation support
 *
 * @see _Initiation/_prd/2-domains/pipeline/wireframes/pipeline-kanban-board.wireframe.md
 */

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PipelineColumn } from "./pipeline-column";
import { OpportunityCard } from "./opportunity-card";
import { WonLostDialog } from "./won-lost-dialog";
import type { Opportunity, OpportunityStage } from "@/lib/schemas/pipeline";

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
// CONSTANTS
// ============================================================================

const STAGES: OpportunityStage[] = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

// ============================================================================
// COMPONENT
// ============================================================================

export function PipelineBoard({
  opportunities,
  onStageChange,
  onAddOpportunity,
  onEditOpportunity,
  isLoading = false,
}: PipelineBoardProps) {
  // Track active drag
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Track pending Won/Lost confirmation
  const [pendingTransition, setPendingTransition] = useState<{
    opportunityId: string;
    opportunity: Opportunity;
    targetStage: "won" | "lost";
  } | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<OpportunityStage, Opportunity[]> = {
      new: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    };

    for (const opp of opportunities) {
      if (grouped[opp.stage]) {
        grouped[opp.stage].push(opp);
      }
    }

    return grouped;
  }, [opportunities]);

  // Get active opportunity for drag overlay
  const activeOpportunity = useMemo(() => {
    if (!activeId) return null;
    return opportunities.find((o) => o.id === activeId) ?? null;
  }, [activeId, opportunities]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag over (for visual feedback)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string ?? null);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const opportunityId = active.id as string;
      const opportunity = opportunities.find((o) => o.id === opportunityId);
      if (!opportunity) return;

      // Determine target stage
      let targetStage: OpportunityStage | null = null;

      // Check if dropped on a column
      if (STAGES.includes(over.id as OpportunityStage)) {
        targetStage = over.id as OpportunityStage;
      }
      // Check if dropped on another card (use that card's stage)
      else {
        const targetOpp = opportunities.find((o) => o.id === over.id);
        if (targetOpp) {
          targetStage = targetOpp.stage;
        }
      }

      if (!targetStage || targetStage === opportunity.stage) return;

      // If moving to Won or Lost, show confirmation dialog
      if (targetStage === "won" || targetStage === "lost") {
        setPendingTransition({
          opportunityId,
          opportunity,
          targetStage,
        });
        return;
      }

      // Otherwise, update stage directly
      try {
        await onStageChange(opportunityId, targetStage);
      } catch (error) {
        console.error("Failed to update stage:", error);
        // Toast error is handled in parent
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
      } catch (error) {
        console.error("Failed to update stage:", error);
      } finally {
        setPendingTransition(null);
      }
    },
    [pendingTransition, onStageChange]
  );

  const handleCancelTransition = useCallback(() => {
    setPendingTransition(null);
  }, []);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full">
          <div
            className={cn(
              "flex gap-4 p-4 min-w-max",
              isLoading && "opacity-50 pointer-events-none"
            )}
            role="region"
            aria-label="Pipeline board"
          >
            {STAGES.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                opportunities={opportunitiesByStage[stage]}
                isOver={overId === stage}
                onAddOpportunity={onAddOpportunity}
                onEditOpportunity={onEditOpportunity}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeOpportunity ? (
            <OpportunityCard opportunity={activeOpportunity} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

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
