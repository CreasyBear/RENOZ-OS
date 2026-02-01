/**
 * Warranty Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Link } from "@tanstack/react-router";
import { Eye, FileText, Ban, ArrowRightLeft, AlertCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckboxCell,
  StatusCell,
  NameCell,
  ActionsCell,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import type { ActionItem } from "@/components/shared/data-table/cells/actions-cell";
import { cn } from "@/lib/utils";
import type { WarrantyStatus } from "@/lib/schemas/warranty";
import { WARRANTY_STATUS_CONFIG, formatExpiryDateRelative } from "./warranty-status-config";

/**
 * Warranty list item type - matches server function response
 */
export interface WarrantyTableItem {
  id: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSku: string | null;
  productSerial: string | null;
  warrantyPolicyId: string;
  policyName: string;
  policyType: "battery_performance" | "inverter_manufacturer" | "installation_workmanship";
  registrationDate: string;
  expiryDate: string;
  status: WarrantyStatus;
  currentCycleCount: number | null;
  cycleLimit: number | null;
  expiryAlertOptOut: boolean;
  certificateUrl: string | null;
}

export interface CreateWarrantyColumnsOptions {
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
  /** View warranty handler */
  onViewWarranty: (id: string) => void;
  /** View certificate handler */
  onViewCertificate?: (id: string) => void;
  /** Void warranty handler */
  onVoidWarranty?: (id: string) => void;
  /** Transfer warranty handler */
  onTransferWarranty?: (id: string) => void;
}

/**
 * Create column definitions for the warranties table.
 */
export function createWarrantyColumns(
  options: CreateWarrantyColumnsOptions
): ColumnDef<WarrantyTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewWarranty,
    onViewCertificate,
    onVoidWarranty,
    onTransferWarranty,
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
          ariaLabel="Select all warranties"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select warranty ${row.original.warrantyNumber}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Warranty Number column
    {
      id: "warrantyNumber",
      accessorKey: "warrantyNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Warranty" />
      ),
      cell: ({ row }) => (
        <Link
          to="/support/warranties/$warrantyId"
          params={{ warrantyId: row.original.id }}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <NameCell
            name={row.original.warrantyNumber}
            subtitle={row.original.policyName}
            maxWidth={220}
          />
        </Link>
      ),
      enableSorting: true,
      size: 220,
    },

    // Customer column
    {
      id: "customerName",
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <NameCell name={row.getValue("customerName")} maxWidth={200} />
      ),
      enableSorting: false,
      size: 200,
    },

    // Product column
    {
      id: "productName",
      accessorKey: "productName",
      header: "Product",
      cell: ({ row }) => (
        <NameCell
          name={row.getValue("productName")}
          subtitle={row.original.productSerial ?? row.original.productSku ?? undefined}
          maxWidth={220}
        />
      ),
      enableSorting: false,
      size: 220,
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
          statusConfig={WARRANTY_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 130,
    },

    // Expiry Date column with highlighting
    {
      id: "expiryDate",
      accessorKey: "expiryDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Expiry" />
      ),
      cell: ({ row }) => {
        const { text, isExpired, isExpiringSoon } = formatExpiryDateRelative(
          row.original.expiryDate
        );
        return (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              isExpired && "text-destructive font-medium",
              isExpiringSoon && !isExpired && "text-warning font-medium"
            )}
          >
            {(isExpired || isExpiringSoon) && <AlertCircle className="h-3 w-3" />}
            <span>{text}</span>
          </div>
        );
      },
      enableSorting: true,
      size: 100,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const warranty = row.original;
        const canVoid = warranty.status === "active" || warranty.status === "expiring_soon";
        const canTransfer = warranty.status === "active";
        const hasCertificate = !!warranty.certificateUrl;

        const actions: ActionItem[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewWarranty(warranty.id),
          },
        ];

        if (hasCertificate && onViewCertificate) {
          actions.push({
            label: "View Certificate",
            icon: FileText,
            onClick: () => onViewCertificate(warranty.id),
          });
        }

        if (onTransferWarranty) {
          actions.push({
            label: "Transfer",
            icon: ArrowRightLeft,
            onClick: () => onTransferWarranty(warranty.id),
            disabled: !canTransfer,
          });
        }

        if (onVoidWarranty) {
          actions.push({
            label: "Void Warranty",
            icon: Ban,
            onClick: () => onVoidWarranty(warranty.id),
            variant: "destructive",
            disabled: !canVoid,
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
