/**
 * ProductTable Component
 *
 * Data table for displaying products with sorting, pagination, and row actions.
 *
 * Features:
 * - Column sorting (name, SKU, price, status)
 * - Pagination with page size selection
 * - Row selection for bulk actions
 * - Quick actions per row (edit, duplicate, delete)
 * - Responsive: cards on mobile, table on desktop
 */
import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Eye,
  Package,
  Wrench,
  FileDigit,
  Layers,
} from "lucide-react";

import { DataTable } from "@/components/shared/data-table/data-table";
import {
  PriceCell,
  StatusCell,
  TypeCell,
  SkuCell,
  NameCell,
  type StatusConfigItem,
  type TypeConfigItem,
} from "@/components/shared/data-table/cells";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type inferred from products table - using broader types for compatibility
// with server function return types
interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  type: string;
  status: string;
  basePrice: number;
  costPrice: number | null;
  isActive: boolean;
  trackInventory?: boolean;
  totalQuantity?: number;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'not_tracked';
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Calculate margin percentage
function calculateMargin(basePrice: number, costPrice: number | null): number | null {
  if (!costPrice || costPrice <= 0 || basePrice <= 0) return null;
  return ((basePrice - costPrice) / basePrice) * 100;
}

// Format margin with color coding
function formatMargin(margin: number | null): { text: string; color: string } {
  if (margin === null) return { text: '-', color: 'text-muted-foreground' };
  if (margin < 0) return { text: `${margin.toFixed(1)}%`, color: 'text-red-600' };
  if (margin < 20) return { text: `${margin.toFixed(1)}%`, color: 'text-amber-600' };
  return { text: `${margin.toFixed(1)}%`, color: 'text-green-600' };
}

interface ProductTableProps {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: "asc" | "desc";
  selectedRows: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onRowClick: (product: Product) => void;
}

// Status configuration for StatusCell
const PRODUCT_STATUS_CONFIG: Record<string, StatusConfigItem> = {
  active: { variant: "default", label: "Active" },
  inactive: { variant: "secondary", label: "Inactive" },
  discontinued: { variant: "destructive", label: "Discontinued" },
};

// Type configuration for TypeCell
const PRODUCT_TYPE_CONFIG: Record<string, TypeConfigItem> = {
  physical: { icon: Package, label: "Physical" },
  service: { icon: Wrench, label: "Service" },
  digital: { icon: FileDigit, label: "Digital" },
  bundle: { icon: Layers, label: "Bundle" },
};

export function ProductTable({
  products,
  total,
  page,
  pageSize,
  sortBy: _sortBy,
  sortOrder: _sortOrder,
  selectedRows: _selectedRows,
  onSelectionChange,
  onPageChange,
  onPageSizeChange: _onPageSizeChange,
  onSortChange: _onSortChange,
  onRowClick,
}: ProductTableProps) {
  // Note: sortBy, sortOrder, selectedRows, onPageSizeChange, onSortChange
  // are available for future server-side sorting/filtering implementation
  // Build column definitions
  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      // Selection checkbox
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      // SKU
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <SkuCell value={row.getValue("sku")} copyable />
        ),
        size: 120,
      },
      // Barcode
      {
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
        size: 140,
      },
      // Name
      {
        accessorKey: "name",
        header: "Product Name",
        cell: ({ row }) => (
          <NameCell
            name={row.getValue("name")}
            subtitle={row.original.description}
            maxWidth={250}
          />
        ),
        size: 250,
      },
      // Category
      {
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => {
          const categoryName = row.original.categoryName;
          return (
            <span className="text-sm text-muted-foreground">
              {categoryName || "-"}
            </span>
          );
        },
        size: 120,
      },
      // Type
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <TypeCell
            type={row.getValue("type")}
            typeConfig={PRODUCT_TYPE_CONFIG}
          />
        ),
        size: 100,
      },
      // Status
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusCell
            status={row.getValue("status")}
            statusConfig={PRODUCT_STATUS_CONFIG}
          />
        ),
        size: 100,
      },
      // Stock Status
      {
        accessorKey: "stockStatus",
        header: "Stock",
        cell: ({ row }) => {
          const stockStatus = row.original.stockStatus;
          const totalQty = row.original.totalQuantity;
          
          if (stockStatus === 'not_tracked') {
            return <span className="text-muted-foreground text-sm">—</span>;
          }
          
          const config = {
            in_stock: { label: 'In Stock', variant: 'default', color: 'text-green-600 bg-green-50' },
            low_stock: { label: 'Low', variant: 'secondary', color: 'text-amber-600 bg-amber-50' },
            out_of_stock: { label: 'Out', variant: 'destructive', color: 'text-red-600 bg-red-50' },
          }[stockStatus ?? 'in_stock'];
          
          return (
            <div className="flex items-center gap-2">
              <Badge variant={config.variant as any} className={config.color}>
                {config.label}
              </Badge>
              {totalQty !== undefined && (
                <span className="text-sm text-muted-foreground">{totalQty}</span>
              )}
            </div>
          );
        },
        size: 120,
      },
      // Base Price
      {
        accessorKey: "basePrice",
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => (
          <PriceCell
            value={row.getValue("basePrice")}
            centsInput={false}
            showCents={true}
            align="right"
          />
        ),
        size: 100,
      },
      // Cost Price
      {
        accessorKey: "costPrice",
        header: () => <div className="text-right">Cost</div>,
        cell: ({ row }) => (
          <PriceCell
            value={row.getValue("costPrice")}
            centsInput={false}
            showCents={true}
            align="right"
            className="text-muted-foreground"
          />
        ),
        size: 100,
      },
      // Margin %
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
        size: 100,
      },
      // Actions
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const product = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onRowClick(product)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 50,
      },
    ],
    [onRowClick]
  );

  // Handle selection change
  const handleSelectionChange = (selectedProducts: Product[]) => {
    onSelectionChange(selectedProducts.map((p) => p.id));
  };

  return (
    <div className="space-y-4">
      <DataTable
        data={products}
        columns={columns}
        enableRowSelection
        enableSorting
        onRowClick={onRowClick}
        onSelectionChange={handleSelectionChange}
        className="border rounded-lg"
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, total)} of {total} products
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
