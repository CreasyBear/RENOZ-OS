/**
 * Opportunities Mobile Cards Component
 *
 * Mobile-optimized card layout for opportunities list.
 */

import { memo, useCallback } from "react";
import { Clock, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceCell } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import type { OpportunityTableItem } from "@/lib/schemas/pipeline";
import {
  STAGE_COLORS,
  formatExpectedCloseDateRelative,
} from "./opportunity-status-config";
import type { OpportunityStage } from "@/lib/schemas/pipeline";

export interface OpportunitiesMobileCardsProps {
  /** Opportunities to display */
  opportunities: OpportunityTableItem[];
  /** Set of selected opportunity IDs */
  selectedIds: Set<string>;
  /** Handle selection toggle */
  onSelect: (id: string, checked: boolean) => void;
  /** View opportunity handler */
  onViewOpportunity: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Stage badge with colors for mobile cards
 */
function MobileStageBadge({ stage }: { stage: OpportunityStage }) {
  const colors = STAGE_COLORS[stage];
  const labels: Record<OpportunityStage, string> = {
    new: "New",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost",
  };

  return (
    <Badge
      variant="secondary"
      className={cn(colors.bgColor, colors.color, "font-medium text-xs")}
    >
      {labels[stage]}
    </Badge>
  );
}

/**
 * Mobile card layout for opportunities list.
 * Each card is tappable to view opportunity details.
 */
export const OpportunitiesMobileCards = memo(function OpportunitiesMobileCards({
  opportunities,
  selectedIds,
  onViewOpportunity,
  className,
}: OpportunitiesMobileCardsProps) {
  const handleCardClick = useCallback(
    (opportunityId: string) => {
      onViewOpportunity(opportunityId);
    },
    [onViewOpportunity]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, opportunityId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onViewOpportunity(opportunityId);
      }
    },
    [onViewOpportunity]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {opportunities.map((opportunity) => {
        const isSelected = selectedIds.has(opportunity.id);
        const { text: closeDateText, isOverdue } = formatExpectedCloseDateRelative(
          opportunity.expectedCloseDate
        );

        return (
          <Card
            key={opportunity.id}
            tabIndex={0}
            role="button"
            aria-label={`View opportunity ${opportunity.title}`}
            className={cn(
              "cursor-pointer hover:bg-muted/50 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && "bg-muted/50 ring-1 ring-primary"
            )}
            onClick={() => handleCardClick(opportunity.id)}
            onKeyDown={(e) => handleCardKeyDown(e, opportunity.id)}
          >
            <CardContent className="p-4">
              {/* Header row: Title + Stage */}
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-medium truncate">{opportunity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {opportunity.customer?.name ?? opportunity.customerId.slice(0, 8)}
                  </p>
                </div>
                <MobileStageBadge stage={opportunity.stage} />
              </div>

              {/* Middle row: Close date + Days in stage */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                {opportunity.expectedCloseDate ? (
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      isOverdue && "text-destructive font-medium"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    {closeDateText}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    No date
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {opportunity.daysInStage}d in stage
                </span>
              </div>

              {/* Footer row: Value + Probability */}
              <div className="flex items-center justify-between">
                <PriceCell value={opportunity.value} className="font-semibold" />
                <span className="text-sm text-muted-foreground">
                  {opportunity.probability ?? 0}% probability
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

OpportunitiesMobileCards.displayName = "OpportunitiesMobileCards";
