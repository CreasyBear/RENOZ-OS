/**
 * Product Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Eye, Pencil, Copy, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckboxCell,
  StatusCell,
  TypeCell,
  PriceCell,
  SkuCell,
  NameCell,
  ActionsCell,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import type { ActionItem } from "@/components/shared/data-table/cells/actions-cell";
import type { ProductTableItem } from "@/lib/schemas/products";
import {
  PRODUCT_STATUS_CONFIG,
  PRODUCT_TYPE_CONFIG,
  STOCK_STATUS_CONFIG,
  calculateMargin,
  formatMargin,
  getStockStatusConfig,
} from "./product-status-config";

// ============================================================================
// TYPES
// ============================================================================
// ProductTableItem moved to schemas/products.ts - imported above

export interface CreateProductColumnsOptions {
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
  /** View product handler */
  onViewProduct: (id: string) => void;
  /** Edit product handler */
  onEditProduct: (id: string) => void;
  /** Duplicate product handler */
  onDuplicateProduct: (id: string) => void;
  /** Delete product handler */
  onDeleteProduct: (id: string) => void;
}

// ============================================================================
// COLUMN FACTORY
// ============================================================================

/**
 * Create column definitions for the products table.
 */
export function createProductColumns(
  options: CreateProductColumnsOptions
): ColumnDef<ProductTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewProduct,
    onEditProduct,
    onDuplicateProduct,
    onDeleteProduct,
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
          ariaLabel="Select all products"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select product ${row.original.name}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },

    // SKU column
    {
      id: "sku",
      accessorKey: "sku",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SKU" />
      ),
      cell: ({ row }) => (
        <SkuCell value={row.original.sku} copyable />
      ),
      enableSorting: true,
      size: 120,
    },

    // Barcode column
    {
      id: "barcode",
      accessorKey: "barcode",
      header: "Barcode",
      cell: ({ row }) => {
        const barcode = row.original.barcode;
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {barcode || "-"}
          </span>
        );
      },
      enableSorting: false,
      size: 140,
    },

    // Name column
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product Name" />
      ),
      cell: ({ row }) => (
        <NameCell
          name={row.original.name}
          subtitle={row.original.description}
          maxWidth={250}
        />
      ),
      enableSorting: true,
      size: 250,
    },

    // Category column
    {
      id: "categoryName",
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => {
        const categoryName = row.original.categoryName;
        const categoryId = row.original.categoryId;
        
        if (!categoryName) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }

        // Link to filtered products list by category
        return categoryId ? (
          <Link
            to="/products"
            search={{ categoryId }}
            className="text-sm text-primary hover:underline"
          >
            {categoryName}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{categoryName}</span>
        );
      },
      enableSorting: false,
      size: 120,
    },

    // Type column
    {
      id: "type",
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <TypeCell
          type={row.original.type}
          typeConfig={PRODUCT_TYPE_CONFIG}
        />
      ),
      enableSorting: true,
      size: 100,
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
          statusConfig={PRODUCT_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 100,
    },

    // Stock Status column
    {
      id: "stockStatus",
      accessorKey: "stockStatus",
      header: "Stock",
      cell: ({ row }) => {
        const stockConfig = getStockStatusConfig(row.original.stockStatus);
        const totalQty = row.original.totalQuantity;

        if (!stockConfig) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }

        // Type guard for stock status (exclude "not_tracked")
        const stockStatus = row.original.stockStatus;
        if (!stockStatus || stockStatus === "not_tracked") {
          return <span className="text-muted-foreground text-sm">-</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <StatusCell
              status={stockStatus}
              statusConfig={STOCK_STATUS_CONFIG}
            />
            {totalQty !== undefined && (
              <span className="text-sm text-muted-foreground">{totalQty}</span>
            )}
          </div>
        );
      },
      enableSorting: false,
      size: 120,
    },

    // Base Price column
    {
      id: "basePrice",
      accessorKey: "basePrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" className="justify-end" />
      ),
      cell: ({ row }) => (
        <PriceCell
          value={row.original.basePrice}
          centsInput={false}
          showCents={true}
          align="right"
        />
      ),
      enableSorting: true,
      size: 100,
    },

    // Cost Price column
    {
      id: "costPrice",
      accessorKey: "costPrice",
      header: () => <div className="text-right">Cost</div>,
      cell: ({ row }) => (
        <PriceCell
          value={row.original.costPrice}
          centsInput={false}
          showCents={true}
          align="right"
          className="text-muted-foreground"
        />
      ),
      enableSorting: false,
      size: 100,
    },

    // Margin column
    {
      id: "margin",
      header: () => <div className="text-right">Margin</div>,
      cell: ({ row }) => {
        const basePrice = row.original.basePrice;
        const costPrice = row.original.costPrice;
        const margin = calculateMargin(basePrice, costPrice);
        const { text, color } = formatMargin(margin);

        return (
          <div className={`text-right font-medium ${color}`}>
            {text}
          </div>
        );
      },
      enableSorting: false,
      size: 100,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const product = row.original;
        const canDelete = product.status !== "active";

        const actions: ActionItem[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewProduct(product.id),
          },
          {
            label: "Edit",
            icon: Pencil,
            onClick: () => onEditProduct(product.id),
          },
          {
            label: "Duplicate",
            icon: Copy,
            onClick: () => onDuplicateProduct(product.id),
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => onDeleteProduct(product.id),
            variant: "destructive",
            disabled: !canDelete,
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
