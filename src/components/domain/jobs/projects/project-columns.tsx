/**
 * Project Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Eye, Edit, Trash2, AlertCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckboxCell,
  StatusCell,
  ActionsCell,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import type { ActionItem } from "@/components/shared/data-table/cells/actions-cell";
import { cn } from "@/lib/utils";
import type { ProjectStatus, ProjectPriority } from "@/lib/schemas/jobs/projects";
import {
  PROJECT_STATUS_CONFIG,
  PROJECT_PRIORITY_CONFIG,
  formatTargetDateRelative,
  formatProjectType,
} from "./project-status-config";

/**
 * Project table item type - matches server function response
 */
export interface ProjectTableItem {
  id: string;
  projectNumber: string;
  title: string;
  description: string | null;
  projectType: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  customerId: string;
  targetCompletionDate: string | null;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
  customer?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateProjectColumnsOptions {
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
  /** View project handler */
  onViewProject: (id: string) => void;
  /** Edit project handler */
  onEditProject: (id: string) => void;
  /** Delete project handler */
  onDeleteProject: (id: string) => void;
}

/**
 * Progress bar cell component
 */
function ProgressCell({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value === 100 ? "bg-green-500" : "bg-primary"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 tabular-nums">
        {value}%
      </span>
    </div>
  );
}

/**
 * Create column definitions for the projects table.
 */
export function createProjectColumns(
  options: CreateProjectColumnsOptions
): ColumnDef<ProjectTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewProject,
    onEditProject,
    onDeleteProject,
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
          ariaLabel="Select all projects"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select project ${row.original.projectNumber}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Project column (title + number)
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Project" />
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.projectNumber}</p>
        </div>
      ),
      enableSorting: true,
      size: 200,
    },

    // Status column
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusCell
          status={row.original.status}
          statusConfig={PROJECT_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 120,
    },

    // Priority column
    {
      id: "priority",
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => (
        <StatusCell
          status={row.original.priority}
          statusConfig={PROJECT_PRIORITY_CONFIG}
          className="text-xs"
        />
      ),
      enableSorting: true,
      size: 100,
    },

    // Type column
    {
      id: "projectType",
      accessorKey: "projectType",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-sm capitalize">
          {formatProjectType(row.original.projectType)}
        </span>
      ),
      enableSorting: false,
      size: 110,
    },

    // Target Date column with overdue highlighting
    {
      id: "targetCompletionDate",
      accessorKey: "targetCompletionDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due Date" />
      ),
      cell: ({ row }) => {
        const { text, isOverdue } = formatTargetDateRelative(
          row.original.targetCompletionDate,
          row.original.status
        );
        return (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue && "text-destructive font-medium"
            )}
          >
            {isOverdue && <AlertCircle className="h-3 w-3" />}
            <span>{text}</span>
          </div>
        );
      },
      enableSorting: true,
      size: 100,
    },

    // Progress column
    {
      id: "progressPercent",
      accessorKey: "progressPercent",
      header: "Progress",
      cell: ({ row }) => <ProgressCell value={row.original.progressPercent} />,
      enableSorting: false,
      size: 120,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const project = row.original;
        const canDelete = project.status === "quoting" || project.status === "cancelled";

        const actions: ActionItem[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewProject(project.id),
          },
          {
            label: "Edit",
            icon: Edit,
            onClick: () => onEditProject(project.id),
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => onDeleteProject(project.id),
            variant: "destructive",
            disabled: !canDelete,
            separator: true,
          },
        ];

        return <ActionsCell actions={actions} />;
      },
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
  ];
}
