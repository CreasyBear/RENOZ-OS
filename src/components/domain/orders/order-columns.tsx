/**
 * Order Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Link } from "@tanstack/react-router";
import { Eye, Copy, Trash2, ShoppingCart, AlertCircle } from "lucide-react";
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
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/lib/schemas/orders";
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  formatDueDateRelative,
} from "./order-status-config";

/**
 * Order list item type - matches server function response
 */
export interface OrderTableItem {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  orderDate: string | null;
  dueDate: string | null;
  total: number | null;
  itemCount?: number;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
  } | null;
}

export interface CreateOrderColumnsOptions {
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
  /** View order handler */
  onViewOrder: (id: string) => void;
  /** Duplicate order handler */
  onDuplicateOrder: (id: string) => void;
  /** Delete order handler */
  onDeleteOrder: (id: string) => void;
}

/**
 * Create column definitions for the orders table.
 */
export function createOrderColumns(
  options: CreateOrderColumnsOptions
): ColumnDef<OrderTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewOrder,
    onDuplicateOrder,
    onDeleteOrder,
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
          ariaLabel="Select all orders"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select order ${row.original.orderNumber}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Order Number column
    {
      id: "orderNumber",
      accessorKey: "orderNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order #" />
      ),
      cell: ({ row }) => (
        <Link
          to="/orders/$orderId"
          params={{ orderId: row.original.id }}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.orderNumber}
        </Link>
      ),
      enableSorting: true,
      size: 120,
    },

    // Customer column
    {
      id: "customer",
      accessorFn: (row) => row.customer?.name ?? row.customerId,
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customer;
        return (
          <span className="text-sm truncate block max-w-[160px]">
            {customer?.name ? (
              <TruncateTooltip text={customer.name} maxLength={20} />
            ) : (
              <span className="text-muted-foreground">
                <TruncateTooltip text={row.original.customerId} maxLength={18} />
              </span>
            )}
          </span>
        );
      },
      enableSorting: false,
      size: 160,
    },

    // Order Date column
    {
      id: "orderDate",
      accessorKey: "orderDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <DateCell value={row.original.orderDate} format="short" />
      ),
      enableSorting: true,
      size: 100,
    },

    // Due Date column with overdue highlighting
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => {
        const { text, isOverdue } = formatDueDateRelative(row.original.dueDate);
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
      enableSorting: false,
      size: 90,
    },

    // Order Status column
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusCell
          status={row.original.status}
          statusConfig={ORDER_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 110,
    },

    // Payment Status column
    {
      id: "paymentStatus",
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => (
        <StatusCell
          status={row.original.paymentStatus}
          statusConfig={PAYMENT_STATUS_CONFIG}
          className="text-xs"
        />
      ),
      enableSorting: false,
      size: 100,
    },

    // Items Count column
    {
      id: "itemCount",
      accessorKey: "itemCount",
      header: () => (
        <div className="text-center">Items</div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <ShoppingCart className="h-3 w-3" />
          <span>{row.original.itemCount ?? 0}</span>
        </div>
      ),
      enableSorting: false,
      size: 70,
    },

    // Total column
    {
      id: "total",
      accessorKey: "total",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" className="justify-end" />
      ),
      cell: ({ row }) => (
        <PriceCell value={row.original.total} align="right" />
      ),
      enableSorting: true,
      size: 100,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const order = row.original;
        const canDelete = order.status === "draft";

        const actions: ActionItem[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewOrder(order.id),
          },
          {
            label: "Duplicate",
            icon: Copy,
            onClick: () => onDuplicateOrder(order.id),
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => onDeleteOrder(order.id),
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
