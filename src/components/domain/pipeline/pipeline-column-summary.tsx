/**
 * PipelineColumnSummary Component
 *
 * Summary view for columns with a large number of opportunities.
 * Shows aggregate statistics and provides drill-down options.
 *
 * Use case: When a column has 50+ items, showing a summary is more
 * useful than scrolling through many cards.
 *
 * @see STANDARDS.md - Progressive disclosure pattern
 */

import { useState, memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  ChevronDown,
  ChevronUp,
  List,
  BarChart3,
  Plus,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormatAmount } from "@/components/shared/format";
import type { Opportunity, OpportunityStage } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineColumnSummaryProps {
  stage: OpportunityStage;
  opportunities: Opportunity[];
  isOver?: boolean;
  onAddOpportunity?: (stage: OpportunityStage) => void;
  onViewAll?: () => void;
  /** Threshold to suggest filtering */
  warningThreshold?: number;
}

// ============================================================================
// STAGE CONFIG
// ============================================================================

const STAGE_CONFIG: Record<
  OpportunityStage,
  { label: string; color: string; bgColor: string }
> = {
  new: {
    label: "New",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-900 border-slate-300",
  },
  qualified: {
    label: "Qualified",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950 border-blue-300",
  },
  proposal: {
    label: "Proposal",
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-50 dark:bg-indigo-950 border-indigo-300",
  },
  negotiation: {
    label: "Negotiation",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50 dark:bg-purple-950 border-purple-300",
  },
  won: {
    label: "Won",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-50 dark:bg-green-950 border-green-300",
  },
  lost: {
    label: "Lost",
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100 dark:bg-gray-900 border-gray-300",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ============================================================================
// COMPONENT
// ============================================================================

const DEFAULT_WARNING_THRESHOLD = 100;

export const PipelineColumnSummary = memo(function PipelineColumnSummary({
  stage,
  opportunities,
  isOver = false,
  onAddOpportunity,
  onViewAll,
  warningThreshold = DEFAULT_WARNING_THRESHOLD,
}: PipelineColumnSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { setNodeRef } = useDroppable({
    id: stage,
    data: { type: "column", stage },
  });

  const config = STAGE_CONFIG[stage];
  const isClosedStage = stage === "won" || stage === "lost";
  const showWarning = opportunities.length >= warningThreshold;

  // Calculate aggregate statistics
  const stats = useMemo(() => {
    const values = opportunities.map((o) => o.value);
    const weightedValues = opportunities.map((o) => o.weightedValue ?? 0);
    const daysInStage = opportunities.map((o) => o.daysInStage);

    return {
      totalValue: values.reduce((a, b) => a + b, 0),
      totalWeighted: weightedValues.reduce((a, b) => a + b, 0),
      averageValue: calculateAverage(values),
      medianValue: calculateMedian(values),
      averageDaysInStage: calculateAverage(daysInStage),
      maxValue: Math.max(...values, 0),
      minValue: values.length > 0 ? Math.min(...values) : 0,
    };
  }, [opportunities]);

  // Group by value ranges for distribution
  const distribution = useMemo(() => {
    const ranges = [
      { label: "<$5k", min: 0, max: 500000, count: 0 },
      { label: "$5k-$20k", min: 500000, max: 2000000, count: 0 },
      { label: "$20k-$50k", min: 2000000, max: 5000000, count: 0 },
      { label: ">$50k", min: 5000000, max: Infinity, count: 0 },
    ];

    for (const opp of opportunities) {
      const range = ranges.find(
        (r) => opp.value >= r.min && opp.value < r.max
      );
      if (range) range.count++;
    }

    return ranges;
  }, [opportunities]);

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] rounded-lg border",
        config.bgColor,
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "p-3 border-b flex items-center justify-between",
          isOver && "bg-primary/10"
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-semibold text-sm uppercase tracking-wide",
                config.color
              )}
            >
              {config.label}
            </h3>
            <Badge variant={showWarning ? "destructive" : "secondary"}>
              {opportunities.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Summary view • Drag to move
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </header>

      {/* Summary Content */}
      <div className="p-3 space-y-3">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-white/50 dark:bg-black/20">
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-sm font-semibold">
                <FormatAmount amount={stats.totalValue} />
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/50 dark:bg-black/20">
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground">Weighted</p>
              <p className="text-sm font-semibold">
                <FormatAmount amount={stats.totalWeighted} />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t">
            {/* Value Statistics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Value Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm pl-6">
                <span className="text-muted-foreground">Average:</span>
                <span className="text-right">
                  <FormatAmount amount={stats.averageValue} />
                </span>
                <span className="text-muted-foreground">Median:</span>
                <span className="text-right">
                  <FormatAmount amount={stats.medianValue} />
                </span>
                <span className="text-muted-foreground">Range:</span>
                <span className="text-right text-xs">
                  <FormatAmount amount={stats.minValue} /> -
                  <FormatAmount amount={stats.maxValue} />
                </span>
              </div>
            </div>

            {/* Time in Stage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Time in Stage</span>
              </div>
              <p className="text-sm pl-6">
                Average{" "}
                <span className="font-medium">
                  {Math.round(stats.averageDaysInStage)} days
                </span>
              </p>
            </div>

            {/* Value Distribution */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Distribution</span>
              </div>
              <div className="space-y-1 pl-6">
                {distribution.map((range) => (
                  <div
                    key={range.label}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="text-muted-foreground w-16">
                      {range.label}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(range.count / opportunities.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right">{range.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onViewAll}
          >
            <List className="h-4 w-4 mr-1.5" />
            View All
          </Button>
          {!isClosedStage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddOpportunity?.(stage)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
});

export default PipelineColumnSummary;
