/**
 * Supplier Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Pencil, Trash2, Star, Mail, Phone } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckboxCell,
  StatusCell,
  TypeCell,
  DateCell,
  ActionsCell,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import type { ActionItem } from "@/components/shared/data-table/cells/actions-cell";
import { cn } from "@/lib/utils";
import type { SupplierStatus, SupplierType } from "@/lib/schemas/suppliers";
import {
  SUPPLIER_STATUS_CONFIG,
  SUPPLIER_TYPE_CONFIG,
  formatLeadTime,
} from "./supplier-status-config";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supplier table item type - matches server function response
 */
export interface SupplierTableItem {
  id: string;
  supplierCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: SupplierStatus;
  supplierType: SupplierType | null;
  overallRating: number | null;
  totalPurchaseOrders: number | null;
  leadTimeDays: number | null;
  lastOrderDate: string | null;
}

export interface CreateSupplierColumnsOptions {
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
  /** View supplier handler */
  onViewSupplier: (id: string) => void;
  /** Edit supplier handler */
  onEditSupplier: (id: string) => void;
  /** Delete supplier handler */
  onDeleteSupplier: (id: string) => void;
}

// ============================================================================
// RATING STARS COMPONENT (inline helper)
// ============================================================================

interface RatingStarsProps {
  rating: number | null;
}

/**
 * Display star rating visualization.
 * Kept inline since it's only used in the suppliers domain.
 */
const RatingStars = memo(function RatingStars({ rating }: RatingStarsProps) {
  if (rating === null || rating === undefined) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < fullStars
              ? "fill-yellow-400 text-yellow-400"
              : i === fullStars && hasHalfStar
                ? "fill-yellow-400/50 text-yellow-400"
                : "text-muted-foreground/30"
          )}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
});

RatingStars.displayName = "RatingStars";

// ============================================================================
// COLUMN FACTORY
// ============================================================================

/**
 * Create column definitions for the suppliers table.
 */
export function createSupplierColumns(
  options: CreateSupplierColumnsOptions
): ColumnDef<SupplierTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewSupplier,
    onEditSupplier,
    onDeleteSupplier,
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
          ariaLabel="Select all suppliers"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select supplier ${row.original.name}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Supplier Name column with contact info
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <Link
            to="/suppliers/$supplierId"
            params={{ supplierId: supplier.id }}
            className="block group"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-medium text-primary group-hover:underline">
              {supplier.name}
            </div>
            {supplier.supplierCode && (
              <div className="text-xs text-muted-foreground">
                {supplier.supplierCode}
              </div>
            )}
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              {supplier.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {supplier.email}
                </span>
              )}
              {supplier.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {supplier.phone}
                </span>
              )}
            </div>
          </Link>
        );
      },
      enableSorting: true,
      size: 200,
    },

    // Supplier Type column
    {
      id: "supplierType",
      accessorKey: "supplierType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.original.supplierType;
        if (!type) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <TypeCell type={type} typeConfig={SUPPLIER_TYPE_CONFIG} />
        );
      },
      enableSorting: true,
      size: 130,
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
          statusConfig={SUPPLIER_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 110,
    },

    // Rating column
    {
      id: "overallRating",
      accessorKey: "overallRating",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rating" />
      ),
      cell: ({ row }) => <RatingStars rating={row.original.overallRating} />,
      enableSorting: true,
      size: 140,
    },

    // Total Orders column
    {
      id: "totalPurchaseOrders",
      accessorKey: "totalPurchaseOrders",
      header: () => <div className="text-right">Orders</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {row.original.totalPurchaseOrders ?? 0}
        </div>
      ),
      enableSorting: true,
      size: 80,
    },

    // Lead Time column
    {
      id: "leadTimeDays",
      accessorKey: "leadTimeDays",
      header: () => <div className="text-right">Lead Time</div>,
      cell: ({ row }) => (
        <div className="text-right text-sm text-muted-foreground">
          {formatLeadTime(row.original.leadTimeDays)}
        </div>
      ),
      enableSorting: true,
      size: 100,
    },

    // Last Order Date column
    {
      id: "lastOrderDate",
      accessorKey: "lastOrderDate",
      header: "Last Order",
      cell: ({ row }) => (
        <DateCell value={row.original.lastOrderDate} format="short" />
      ),
      enableSorting: true,
      size: 100,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const supplier = row.original;

        const actions: ActionItem[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewSupplier(supplier.id),
          },
          {
            label: "Edit Supplier",
            icon: Pencil,
            onClick: () => onEditSupplier(supplier.id),
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => onDeleteSupplier(supplier.id),
            variant: "destructive",
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
