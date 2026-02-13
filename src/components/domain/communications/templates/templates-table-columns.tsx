/* eslint-disable react-refresh/only-export-components -- Column file exports column factory with JSX cell renderers */
/**
 * Email Templates Table Columns
 *
 * Column definitions for templates DataTable.
 * Follows TABLE-STANDARDS.md patterns with memoized cells.
 *
 * @see TABLE-STANDARDS.md
 */

import { memo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Copy, History, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/shared/data-table/data-table-column-header";
import { NameCell } from "@/components/shared/data-table/cells/name-cell";
import { StatusCell } from "@/components/shared/data-table/cells/status-cell";
import { ActionsCell, type ActionItem } from "@/components/shared/data-table/cells/actions-cell";
import type { Template } from "@/lib/schemas/communications";

// ============================================================================
// TYPES
// ============================================================================

// TemplateTableItem is just Template - no extension needed
export type TemplateTableItem = Template;

export interface CreateTemplateColumnsOptions {
  onEdit: (templateId: string) => void;
  onClone: (templateId: string) => void;
  onViewHistory: (templateId: string) => void;
  onDelete: (templateId: string) => void;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const TEMPLATE_STATUS_CONFIG = {
  active: {
    label: "Active",
    variant: "default" as const,
  },
  inactive: {
    label: "Inactive",
    variant: "secondary" as const,
  },
} as const;

// ============================================================================
// CATEGORY LABELS
// ============================================================================

const CATEGORY_LABELS: Record<Template["category"], string> = {
  quotes: "Quotes",
  orders: "Orders",
  installations: "Installations",
  warranty: "Warranty",
  support: "Support",
  marketing: "Marketing",
  follow_up: "Follow-up",
  custom: "Custom",
};

// ============================================================================
// MEMOIZED CELL COMPONENTS
// ============================================================================

const CategoryBadge = memo(function CategoryBadge({
  category,
}: {
  category: Template["category"];
}) {
  return (
    <Badge variant="outline" className="text-xs">
      {CATEGORY_LABELS[category]}
    </Badge>
  );
});
CategoryBadge.displayName = "CategoryBadge";

const VersionBadge = memo(function VersionBadge({ version }: { version: number }) {
  return (
    <span className="text-xs text-muted-foreground">v{version}</span>
  );
});
VersionBadge.displayName = "VersionBadge";

const NameCellWithBadge = memo(function NameCellWithBadge({
  name,
  subject,
  isActive,
}: {
  name: string;
  subject: string;
  isActive: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <NameCell name={name} subtitle={subject} maxWidth={300} />
      {!isActive && (
        <Badge variant="secondary" className="text-xs">
          Inactive
        </Badge>
      )}
    </div>
  );
});
NameCellWithBadge.displayName = "NameCellWithBadge";

const SubjectCell = memo(function SubjectCell({ subject }: { subject: string }) {
  return (
    <span className="text-sm text-muted-foreground truncate max-w-[300px] block">
      {subject}
    </span>
  );
});
SubjectCell.displayName = "SubjectCell";

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

export function createTemplateColumns(
  options: CreateTemplateColumnsOptions
): ColumnDef<TemplateTableItem>[] {
  const { onEdit, onClone, onViewHistory, onDelete } = options;

  return [
    // Name column (with subject as subtitle)
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Template Name" />
      ),
      cell: ({ row }) => {
        const template = row.original;
        return (
          <NameCellWithBadge
            name={template.name}
            subject={template.subject}
            isActive={template.isActive}
          />
        );
      },
      enableSorting: true,
      size: 300,
    },

    // Category column
    {
      id: "category",
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => <CategoryBadge category={row.original.category} />,
      enableSorting: true,
      size: 120,
    },

    // Subject column
    {
      id: "subject",
      accessorKey: "subject",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject" />
      ),
      cell: ({ row }) => <SubjectCell subject={row.original.subject} />,
      enableSorting: true,
      size: 300,
    },

    // Status column
    {
      id: "status",
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.isActive ? "active" : "inactive";
        return (
          <StatusCell
            status={status}
            statusConfig={TEMPLATE_STATUS_CONFIG}
          />
        );
      },
      enableSorting: true,
      size: 100,
    },

    // Version column
    {
      id: "version",
      accessorKey: "version",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Version" />
      ),
      cell: ({ row }) => <VersionBadge version={row.original.version} />,
      enableSorting: true,
      size: 80,
    },

    // Actions column
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const template = row.original;

        const actions: ActionItem[] = [
          {
            label: "Edit",
            icon: Edit2,
            onClick: () => onEdit(template.id),
          },
          {
            label: "Clone",
            icon: Copy,
            onClick: () => onClone(template.id),
          },
          {
            label: "Version History",
            icon: History,
            onClick: () => onViewHistory(template.id),
            separator: true,
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => onDelete(template.id),
            variant: "destructive",
            separator: true,
          },
        ];

        return <ActionsCell actions={actions} />;
      },
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
  ];
}
