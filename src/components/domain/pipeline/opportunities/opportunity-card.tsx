/**
 * OpportunityCard Component
 *
 * Draggable card representing a single opportunity in the pipeline board.
 * Shows key info: title, value, probability, expected close date.
 * Supports stale, overdue, and quote expiring states.
 *
 * @see _Initiation/_prd/2-domains/pipeline/wireframes/pipeline-kanban-board.wireframe.md
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { GripVertical, AlertCircle, Clock, Pencil, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormatAmount } from "@/components/shared/format";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import type { Opportunity } from "@/lib/schemas/pipeline";
import { useOrgFormat } from "@/hooks/use-org-format";

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityCardProps {
  opportunity: Opportunity;
  isOverlay?: boolean;
  onEdit?: (id: string) => void;
  onScheduleFollowup?: (id: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function getDaysUntil(date: Date | string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getProbabilityColor(probability: number | null): string {
  if (probability === null) return "bg-muted text-muted-foreground";
  if (probability >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (probability >= 60) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  if (probability >= 30) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

// ============================================================================
// COMPONENT
// ============================================================================

export const OpportunityCard = memo(function OpportunityCard({
  opportunity,
  isOverlay = false,
  onEdit,
  onScheduleFollowup,
}: OpportunityCardProps) {
  const { formatCurrency } = useOrgFormat();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: opportunity.id,
    data: {
      type: "opportunity",
      opportunity,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate states
  const daysUntilClose = getDaysUntil(opportunity.expectedCloseDate);
  const isOverdue = daysUntilClose !== null && daysUntilClose < 0;
  const isStale = opportunity.daysInStage >= 30;

  const daysUntilQuoteExpires = getDaysUntil(opportunity.quoteExpiresAt);
  const isQuoteExpiring = daysUntilQuoteExpires !== null && daysUntilQuoteExpires <= 7 && daysUntilQuoteExpires > 0;
  const isQuoteExpired = daysUntilQuoteExpires !== null && daysUntilQuoteExpires <= 0;

  // Weighted value (value * probability / 100)
  const weightedValue = useMemo(() => {
    if (opportunity.probability === null) return 0;
    return (opportunity.value * opportunity.probability) / 100;
  }, [opportunity.value, opportunity.probability]);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-card rounded-lg border shadow-sm",
        "hover:shadow-md transition-shadow",
        isDragging && "opacity-50 shadow-lg",
        isOverlay && "shadow-xl rotate-2 cursor-grabbing",
        isOverdue && "border-destructive",
        isStale && "border-dashed border-muted-foreground/50 opacity-75"
      )}
      aria-label={`${opportunity.title}, ${formatCurrency(opportunity.value, { cents: false, showCents: true })}, ${opportunity.probability}% probability`}
      tabIndex={0}
    >
      {/* Header with drag handle and probability */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 hover:bg-muted rounded"
            aria-label="Drag to move opportunity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link
            to="/pipeline/$opportunityId"
            params={{ opportunityId: opportunity.id }}
            className="font-medium hover:underline"
          >
            <TruncateTooltip text={opportunity.title} />
          </Link>
        </div>
        <Badge className={cn("shrink-0 ml-2", getProbabilityColor(opportunity.probability))}>
          {opportunity.probability ?? 0}%
        </Badge>
      </div>

      {/* Value and date */}
      <div className="px-3 pb-2">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-semibold font-display">
            <FormatAmount amount={opportunity.value} />
          </span>
          {opportunity.expectedCloseDate && (
            <span className={cn(
              "text-sm",
              isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              {isOverdue && <AlertCircle className="inline h-3 w-3 mr-1" />}
              {formatDate(opportunity.expectedCloseDate)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Weighted: <FormatAmount amount={weightedValue} />
        </p>
      </div>

      {/* Status badges */}
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {isStale && (
          <Badge variant="outline" className="text-xs bg-muted">
            <Clock className="h-3 w-3 mr-1" />
            Stale {opportunity.daysInStage}d
          </Badge>
        )}
        {isOverdue && (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue {Math.abs(daysUntilClose!)}d
          </Badge>
        )}
        {isQuoteExpiring && (
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
            Quote expires {daysUntilQuoteExpires}d
          </Badge>
        )}
        {isQuoteExpired && (
          <Badge variant="outline" className="text-xs bg-red-50 text-red-800 border-red-200">
            Quote expired
          </Badge>
        )}
      </div>

      {/* Actions (visible on hover) */}
      <div className="px-3 pb-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => onEdit?.(opportunity.id)}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onScheduleFollowup?.(opportunity.id)}>
              Schedule Follow-up
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/pipeline/$opportunityId" params={{ opportunityId: opportunity.id }}>
                View Details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
});

export default OpportunityCard;
