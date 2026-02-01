/**
 * Purchase Order Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Link } from "@tanstack/react-router";
import { Eye, Pencil, Trash2, PackageOpen } from "lucide-react";
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
import type { PurchaseOrderTableData } from "@/lib/schemas/purchase-orders";
import { PO_STATUS_CONFIG, canReceiveGoods, canEditPO, canDeletePO } from "./po-status-config";

export interface CreatePOColumnsOptions {
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
  /** View PO handler */
  onViewPO: (id: string) => void;
  /** Edit PO handler */
  onEditPO: (id: string) => void;
  /** Delete PO handler */
  onDeletePO: (id: string) => void;
  /** Receive goods handler */
  onReceivePO: (id: string) => void;
}

/**
 * Create column definitions for the purchase orders table.
 */
export function createPOColumns(
  options: CreatePOColumnsOptions
): ColumnDef<PurchaseOrderTableData>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewPO,
    onEditPO,
    onDeletePO,
    onReceivePO,
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
          ariaLabel="Select all purchase orders"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select purchase order ${row.original.poNumber}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // PO Number column
    {
      id: "poNumber",
      accessorKey: "poNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PO #" />
      ),
      cell: ({ row }) => (
        <Link
          to="/purchase-orders/$poId"
          params={{ poId: row.original.id }}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.poNumber}
        </Link>
      ),
      enableSorting: true,
      size: 120,
    },

    // Supplier column
    {
      id: "supplierName",
      accessorKey: "supplierName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) => {
        const supplierName = row.original.supplierName;
        return (
          <span className="text-sm truncate block max-w-[180px]">
            {supplierName ? (
              <TruncateTooltip text={supplierName} maxLength={24} />
            ) : (
              <span className="text-muted-foreground">Unknown Supplier</span>
            )}
          </span>
        );
      },
      enableSorting: true,
      size: 180,
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
          statusConfig={PO_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 130,
    },

    // Order Date column
    {
      id: "orderDate",
      accessorKey: "orderDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order Date" />
      ),
      cell: ({ row }) => (
        <DateCell value={row.original.orderDate} format="short" />
      ),
      enableSorting: true,
      size: 110,
    },

    // Required Date column
    {
      id: "requiredDate",
      accessorKey: "requiredDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Required" />
      ),
      cell: ({ row }) => (
        <DateCell value={row.original.requiredDate} format="short" />
      ),
      enableSorting: true,
      size: 110,
    },

    // Total Amount column
    {
      id: "totalAmount",
      accessorKey: "totalAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Value" className="justify-end" />
      ),
      cell: ({ row }) => (
        <PriceCell value={row.original.totalAmount} align="right" />
      ),
      enableSorting: true,
      size: 110,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const po = row.original;
        const showReceive = canReceiveGoods(po.status);
        const showEdit = canEditPO(po.status);
        const showDelete = canDeletePO(po.status);

        const actions: ActionItem[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewPO(po.id),
          },
        ];

        if (showReceive) {
          actions.push({
            label: "Receive Goods",
            icon: PackageOpen,
            onClick: () => onReceivePO(po.id),
          });
        }

        if (showEdit) {
          actions.push({
            label: "Edit Order",
            icon: Pencil,
            onClick: () => onEditPO(po.id),
            separator: !showDelete,
          });
        }

        if (showDelete) {
          actions.push({
            label: "Delete Order",
            icon: Trash2,
            onClick: () => onDeletePO(po.id),
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
