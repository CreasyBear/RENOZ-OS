/**
 * Pricing Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Link } from "@tanstack/react-router";
import { Star, Pencil, Trash2, Clock, Percent } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckboxCell,
  StatusCell,
  PriceCell,
  DateCell,
  ActionsCell,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import type { ActionItem } from "@/components/shared/data-table/cells/actions-cell";
import { Badge } from "@/components/ui/badge";
import type { PriceListStatus } from "@/lib/schemas/pricing";
import { PRICE_LIST_STATUS_CONFIG } from "./pricing-status-config";

/**
 * Pricing table item type - matches PriceListRow from schemas
 */
export interface PricingTableItem {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  productSku: string | null;
  price: number;
  effectivePrice: number;
  currency: string;
  status: PriceListStatus;
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number | null;
  effectiveDate: string;
  expiryDate: string | null;
  isPreferredPrice: boolean;
  leadTimeDays: number | null;
}

export interface CreatePricingColumnsOptions {
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
  /** Edit price handler */
  onEdit?: (id: string) => void;
  /** Delete price handler */
  onDelete?: (id: string) => void;
  /** Set preferred price handler */
  onSetPreferred?: (id: string, preferred: boolean) => void;
  /** Currency formatter function (optional - PriceCell uses useOrgFormat internally) */
  formatCurrency?: (amount: number) => string;
}

/**
 * Format quantity range for display
 */
function formatQuantityRange(min: number, max: number | null): string {
  if (max === null) {
    return `${min}+`;
  }
  if (min === max) {
    return String(min);
  }
  return `${min}-${max}`;
}

/**
 * Create column definitions for the pricing table.
 */
export function createPricingColumns(
  options: CreatePricingColumnsOptions
): ColumnDef<PricingTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onEdit,
    onDelete,
    onSetPreferred,
    formatCurrency,
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
          ariaLabel="Select all price lists"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select price list for ${row.original.productName}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Product Name column
    {
      id: "productName",
      accessorKey: "productName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isPreferredPrice && (
            <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
          )}
          <div className="min-w-0">
            <Link
              to="/products/$productId"
              params={{ productId: row.original.productId }}
              className="font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.productName || "Unknown Product"}
            </Link>
            {row.original.productSku && (
              <p className="text-muted-foreground truncate text-xs">
                SKU: {row.original.productSku}
              </p>
            )}
          </div>
        </div>
      ),
      enableSorting: true,
      size: 200,
    },

    // Supplier Name column
    {
      id: "supplierName",
      accessorKey: "supplierName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) => (
        <Link
          to="/suppliers/$supplierId"
          params={{ supplierId: row.original.supplierId }}
          className="text-sm hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.supplierName || "Unknown Supplier"}
        </Link>
      ),
      enableSorting: true,
      size: 150,
    },

    // Price column
    {
      id: "effectivePrice",
      accessorKey: "effectivePrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" className="justify-end" />
      ),
      cell: ({ row }) => {
        const { effectivePrice, price } = row.original;
        const hasDiscount = effectivePrice !== price;

        // Use custom formatter if provided, otherwise use PriceCell (which uses useOrgFormat)
        if (formatCurrency) {
          return (
            <div className="text-right">
              <p className="text-sm tabular-nums font-medium">{formatCurrency(effectivePrice)}</p>
              {hasDiscount && (
                <p className="text-muted-foreground text-xs line-through">
                  {formatCurrency(price)}
                </p>
              )}
            </div>
          );
        }

        return (
          <div className="text-right">
            <PriceCell value={effectivePrice} align="right" />
            {hasDiscount && (
              <span className="text-muted-foreground text-xs line-through block text-right">
                <PriceCell value={price} align="right" />
              </span>
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 100,
    },

    // Quantity Range column
    {
      id: "minQuantity",
      accessorKey: "minQuantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Qty Range" className="justify-center" />
      ),
      cell: ({ row }) => (
        <div className="text-muted-foreground text-center text-sm">
          {formatQuantityRange(row.original.minQuantity, row.original.maxQuantity)}
        </div>
      ),
      enableSorting: true,
      size: 90,
    },

    // Discount column
    {
      id: "discountPercent",
      accessorKey: "discountPercent",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Discount" className="justify-center" />
      ),
      cell: ({ row }) => {
        const discount = row.original.discountPercent;
        if (!discount) {
          return <span className="text-muted-foreground block text-center">-</span>;
        }
        return (
          <div className="flex justify-center">
            <Badge variant="outline" className="gap-1">
              <Percent className="h-3 w-3" />
              {discount}%
            </Badge>
          </div>
        );
      },
      enableSorting: true,
      size: 90,
    },

    // Valid Period column
    {
      id: "effectiveDate",
      accessorKey: "effectiveDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valid Period" />
      ),
      cell: ({ row }) => {
        const { effectiveDate, expiryDate, leadTimeDays } = row.original;
        return (
          <div className="text-sm">
            <DateCell value={effectiveDate} format="short" />
            {expiryDate && (
              <p className="text-muted-foreground text-xs">
                to <DateCell value={expiryDate} format="short" className="inline" />
              </p>
            )}
            {leadTimeDays !== null && (
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {leadTimeDays}d lead
              </div>
            )}
          </div>
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
        <DataTableColumnHeader column={column} title="Status" className="justify-center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <StatusCell
            status={row.original.status}
            statusConfig={PRICE_LIST_STATUS_CONFIG}
            showIcon
          />
        </div>
      ),
      enableSorting: true,
      size: 100,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;

        const actions: ActionItem[] = [];

        if (onEdit) {
          actions.push({
            label: "Edit Price",
            icon: Pencil,
            onClick: () => onEdit(item.id),
          });
        }

        if (onSetPreferred) {
          actions.push({
            label: item.isPreferredPrice ? "Remove Preferred" : "Set as Preferred",
            icon: Star,
            onClick: () => onSetPreferred(item.id, !item.isPreferredPrice),
          });
        }

        if (onDelete) {
          actions.push({
            label: "Delete",
            icon: Trash2,
            onClick: () => onDelete(item.id),
            variant: "destructive",
            separator: actions.length > 0,
          });
        }

        if (actions.length === 0) {
          return null;
        }

        return <ActionsCell actions={actions} />;
      },
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
  ];
}
