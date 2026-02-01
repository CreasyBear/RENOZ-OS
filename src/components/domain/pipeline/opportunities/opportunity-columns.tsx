/**
 * Opportunity Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Link } from "@tanstack/react-router";
import { Eye, Edit, Trash2, Clock, Calendar, ArrowRightLeft } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  CheckboxCell,
  PriceCell,
  ActionsCell,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import type { ActionItem } from "@/components/shared/data-table/cells/actions-cell";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import { cn } from "@/lib/utils";
import type { OpportunityStage } from "@/lib/schemas/pipeline";
import {
  STAGE_COLORS,
  formatExpectedCloseDateRelative,
} from "./opportunity-status-config";

/**
 * Opportunity table item type - matches server function response
 */
export interface OpportunityTableItem {
  id: string;
  title: string;
  customerId: string;
  stage: OpportunityStage;
  value: number;
  probability: number | null;
  expectedCloseDate: Date | null;
  daysInStage: number;
  createdAt: Date;
  updatedAt: Date;
  customer?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateOpportunityColumnsOptions {
  /** Handle single item selection */
  onSelect: (id: string, checked: boolean) => void;
  /** Handle shift-click range selection */
  onShiftClickRange: (rowIndex: number) => void;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether some items are selected (indeterminate) */
  isPartiallySelected: boolean;
  /** Handle select all */
  onSelectAll: (checked: boolean) => void;
  /** Check if item is selected */
  isSelected: (id: string) => boolean;
  /** View opportunity handler */
  onViewOpportunity: (id: string) => void;
  /** Edit opportunity handler */
  onEditOpportunity: (id: string) => void;
  /** Change stage handler */
  onChangeStage: (id: string, stage: OpportunityStage) => void;
  /** Delete opportunity handler */
  onDeleteOpportunity?: (id: string) => void;
}

/**
 * Custom StageBadge component with color styling
 */
function StageBadge({ stage }: { stage: OpportunityStage }) {
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
      className={cn(colors.bgColor, colors.color, "font-medium")}
    >
      {labels[stage]}
    </Badge>
  );
}

/**
 * Days in stage cell with clock icon
 */
function DaysInStageCell({ days }: { days: number }) {
  const isLong = days > 14;
  const isVeryLong = days > 30;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 text-sm",
        isVeryLong && "text-destructive font-medium",
        isLong && !isVeryLong && "text-amber-600"
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>{days}</span>
    </div>
  );
}

/**
 * Create column definitions for the opportunities table.
 */
export function createOpportunityColumns(
  options: CreateOpportunityColumnsOptions
): ColumnDef<OpportunityTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewOpportunity,
    onEditOpportunity,
    onChangeStage,
    onDeleteOpportunity,
  } = options;

  return [
    // Checkbox column
    {
      id: "select",
      header: () => (
        <CheckboxCell
          checked={isAllSelected}
          indeterminate={isPartiallySelected}
          onChange={onSelectAll}
          ariaLabel="Select all opportunities"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select opportunity ${row.original.title}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Title column
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Opportunity" />
      ),
      cell: ({ row }) => (
        <div>
          <Link
            to="/pipeline/$opportunityId"
            params={{ opportunityId: row.original.id }}
            className="font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <TruncateTooltip text={row.original.title} maxLength={30} />
          </Link>
          <p className="text-xs text-muted-foreground">
            {row.original.customer?.name ? (
              <TruncateTooltip text={row.original.customer.name} maxLength={25} />
            ) : (
              <TruncateTooltip text={row.original.customerId} maxLength={18} />
            )}
          </p>
        </div>
      ),
      enableSorting: true,
      size: 200,
    },

    // Stage column
    {
      id: "stage",
      accessorKey: "stage",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stage" />
      ),
      cell: ({ row }) => <StageBadge stage={row.original.stage} />,
      enableSorting: true,
      size: 120,
    },

    // Value column
    {
      id: "value",
      accessorKey: "value",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Value"
          className="justify-end"
        />
      ),
      cell: ({ row }) => <PriceCell value={row.original.value} align="right" />,
      enableSorting: true,
      size: 120,
    },

    // Probability column
    {
      id: "probability",
      accessorKey: "probability",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Prob."
          className="justify-end"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right text-sm">
          {row.original.probability ?? 0}%
        </div>
      ),
      enableSorting: true,
      size: 80,
    },

    // Expected Close Date column
    {
      id: "expectedCloseDate",
      accessorKey: "expectedCloseDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Close Date" />
      ),
      cell: ({ row }) => {
        const date = row.original.expectedCloseDate;
        if (!date) {
          return (
            <span className="text-sm text-muted-foreground">Not set</span>
          );
        }

        const { text, isOverdue } = formatExpectedCloseDateRelative(date);

        return (
          <div
            className={cn(
              "flex items-center gap-1.5",
              isOverdue && "text-destructive font-medium"
            )}
          >
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{text}</span>
          </div>
        );
      },
      enableSorting: true,
      size: 120,
    },

    // Days in Stage column
    {
      id: "daysInStage",
      accessorKey: "daysInStage",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Days"
          className="justify-center"
        />
      ),
      cell: ({ row }) => <DaysInStageCell days={row.original.daysInStage} />,
      enableSorting: true,
      size: 80,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const opportunity = row.original;
        const isClosedStage =
          opportunity.stage === "won" || opportunity.stage === "lost";

        const actions: ActionItem[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewOpportunity(opportunity.id),
          },
          {
            label: "Edit",
            icon: Edit,
            onClick: () => onEditOpportunity(opportunity.id),
          },
          {
            label: "Change Stage",
            icon: ArrowRightLeft,
            onClick: () => onChangeStage(opportunity.id, opportunity.stage),
            disabled: isClosedStage,
            separator: true,
          },
        ];

        if (onDeleteOpportunity) {
          actions.push({
            label: "Delete",
            icon: Trash2,
            onClick: () => onDeleteOpportunity(opportunity.id),
            variant: "destructive",
            separator: true,
          });
        }

        return <ActionsCell actions={actions} />;
      },
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
  ];
}
