/**
 * PipelineListView Component
 *
 * Alternative table-based view for pipeline opportunities.
 * Better suited for bulk operations, sorting, and managing large datasets.
 *
 * Features:
 * - Sortable columns (value, stage, close date, etc.)
 * - Bulk selection for actions
 * - Compact density for viewing many items
 * - Quick filters integrated into column headers
 *
 * @see STANDARDS.md - Data table pattern for large datasets
 */

import { useState, useMemo, memo, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ArrowRightLeft,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormatAmount } from "@/components/shared/format";
import { formatDate } from "@/lib/formatters";
import type { Opportunity, OpportunityStage } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineListViewProps {
  opportunities: Opportunity[];
  onStageChange: (opportunityId: string, newStage: OpportunityStage) => void;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

type SortField =
  | "title"
  | "customerId"
  | "stage"
  | "value"
  | "probability"
  | "expectedCloseDate"
  | "daysInStage";
type SortDirection = "asc" | "desc";

// ============================================================================
// STAGE CONFIG
// ============================================================================

/**
 * Stage configuration using design system semantic colors.
 * Uses STATUS_COLORS for consistent theming across light/dark modes.
 *
 * @see lib/status/colors.ts - STATUS_COLORS
 * @see docs/design-system/MASTER.md - Color Palette
 */
const STAGE_CONFIG: Record<
  OpportunityStage,
  { label: string; color: string; bgColor: string }
> = {
  new: {
    label: "New",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
  qualified: {
    label: "Qualified",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  proposal: {
    label: "Proposal",
    color: "text-indigo-700 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  negotiation: {
    label: "Negotiation",
    color: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  won: {
    label: "Won",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  lost: {
    label: "Lost",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StageBadge({ stage }: { stage: OpportunityStage }) {
  const config = STAGE_CONFIG[stage];
  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, "font-medium")}
    >
      {config.label}
    </Badge>
  );
}

function SortHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort.field === field;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive &&
        (currentSort.direction === "asc" ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        ))}
    </Button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PipelineListView = memo(function PipelineListView({
  opportunities,
  onStageChange,
  onEdit,
  onDelete,
  isLoading = false,
}: PipelineListViewProps) {
  // Sort state
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: "expectedCloseDate",
    direction: "asc",
  });

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkChangingStage, setIsBulkChangingStage] = useState(false);

  // Handle sort
  const handleSort = (field: SortField) => {
    setSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  // Sort opportunities
  const sortedOpportunities = useMemo(() => {
    const sorted = [...opportunities];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "stage":
          comparison = a.stage.localeCompare(b.stage);
          break;
        case "value":
          comparison = a.value - b.value;
          break;
        case "probability":
          comparison = (a.probability ?? 0) - (b.probability ?? 0);
          break;
        case "expectedCloseDate": {
          const dateA = a.expectedCloseDate
            ? new Date(a.expectedCloseDate).getTime()
            : Infinity;
          const dateB = b.expectedCloseDate
            ? new Date(b.expectedCloseDate).getTime()
            : Infinity;
          comparison = dateA - dateB;
          break;
        }
        case "daysInStage":
          comparison = a.daysInStage - b.daysInStage;
          break;
        default:
          comparison = 0;
      }
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [opportunities, sort]);

  // Handle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === sortedOpportunities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedOpportunities.map((o) => o.id)));
    }
  };

  // Calculate totals for selected
  const selectedTotal = useMemo(() => {
    return sortedOpportunities
      .filter((o) => selectedIds.has(o.id))
      .reduce((sum, o) => sum + o.value, 0);
  }, [sortedOpportunities, selectedIds]);

  const handleBulkStageChange = useCallback(
    async (targetStage: OpportunityStage) => {
      if (selectedIds.size === 0 || isBulkChangingStage) return;
      setIsBulkChangingStage(true);
      try {
        const ids = Array.from(selectedIds);
        await Promise.allSettled(
          ids.map((id) => Promise.resolve(onStageChange(id, targetStage)))
        );
        setSelectedIds(new Set());
      } finally {
        setIsBulkChangingStage(false);
      }
    },
    [selectedIds, onStageChange, isBulkChangingStage]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="p-8 text-center text-muted-foreground">
          Loading opportunities...
        </div>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="p-8 text-center text-muted-foreground">
          No opportunities found. Try adjusting your filters.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk Actions Bar */}
      {selectedIds.size >= 2 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <span className="text-sm text-muted-foreground">
              Total: <FormatAmount amount={selectedTotal} />
            </span>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isBulkChangingStage}>
                  <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                  {isBulkChangingStage ? "Updating..." : "Change Stage"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(STAGE_CONFIG) as OpportunityStage[]).map((stage) => (
                  <DropdownMenuItem key={stage} onClick={() => void handleBulkStageChange(stage)}>
                    {STAGE_CONFIG[stage].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedIds.size === sortedOpportunities.length &&
                    sortedOpportunities.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  label="Opportunity"
                  field="title"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  label="Stage"
                  field="stage"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-right">
                <SortHeader
                  label="Value"
                  field="value"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-right">
                <SortHeader
                  label="Prob."
                  field="probability"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  label="Close Date"
                  field="expectedCloseDate"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortHeader
                  label="Days"
                  field="daysInStage"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOpportunities.map((opportunity) => (
              <TableRow
                key={opportunity.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  selectedIds.has(opportunity.id) && "bg-muted"
                )}
                onClick={() => onEdit(opportunity.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(opportunity.id)}
                    onCheckedChange={() => toggleSelection(opportunity.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{opportunity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {opportunity.customerId}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <StageBadge stage={opportunity.stage} />
                </TableCell>
                <TableCell className="text-right">
                  <FormatAmount amount={opportunity.value} />
                </TableCell>
                <TableCell className="text-right">
                  {opportunity.probability ?? 0}%
                </TableCell>
                <TableCell>
                  {opportunity.expectedCloseDate ? (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        {formatDate(opportunity.expectedCloseDate)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Not set
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{opportunity.daysInStage}</span>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(opportunity.id)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onStageChange(opportunity.id, opportunity.stage)
                        }
                      >
                        Change Stage
                      </DropdownMenuItem>
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(opportunity.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {sortedOpportunities.length} of {opportunities.length}{" "}
          opportunities
        </span>
        <span>
          Total Value:{" "}
          <span className="font-medium">
            <FormatAmount
              amount={opportunities.reduce((sum, o) => sum + o.value, 0)}
            />
          </span>
        </span>
      </div>
    </div>
  );
});

export default PipelineListView;
