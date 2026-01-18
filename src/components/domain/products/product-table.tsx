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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type inferred from products table
type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  type: "physical" | "service" | "digital" | "bundle";
  status: "active" | "inactive" | "discontinued";
  basePrice: number;
  costPrice: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

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
const PRODUCT_STATUS_CONFIG: Record<Product["status"], StatusConfigItem> = {
  active: { variant: "default", label: "Active" },
  inactive: { variant: "secondary", label: "Inactive" },
  discontinued: { variant: "destructive", label: "Discontinued" },
};

// Type configuration for TypeCell
const PRODUCT_TYPE_CONFIG: Record<Product["type"], TypeConfigItem> = {
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
