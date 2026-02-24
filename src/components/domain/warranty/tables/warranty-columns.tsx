/* eslint-disable react-refresh/only-export-components -- Column file exports column factory with JSX cell renderers */
/**
 * Warranty Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, FileText, Ban, ArrowRightLeft, AlertCircle, PackageSearch } from "lucide-react";
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
import { WARRANTY_STATUS_CONFIG, formatExpiryDateRelative } from "./warranty-status-config";
import type { WarrantyListItem, CreateWarrantyColumnsOptions } from '@/lib/schemas/warranty';

// Memoized cell component for expiry date
const ExpiryDateCell = memo(function ExpiryDateCell({
  text,
  isExpired,
  isExpiringSoon,
}: {
  text: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
}) {
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
});

/**
 * Create column definitions for the warranties table.
 */
export function createWarrantyColumns(
  options: CreateWarrantyColumnsOptions
): ColumnDef<WarrantyListItem>[] {
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
      meta: {
        skeleton: { type: "checkbox" },
      },
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
      meta: {
        skeleton: { type: "icon-text", width: "w-44" },
      },
    },

    // Customer column
    {
      id: "customerName",
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => {
        const customerId = row.original.customerId;
        const val = row.getValue("customerName");
        const customerName = val == null ? null : typeof val === "string" ? val : String(val);
        const content = <NameCell name={customerName} maxWidth={200} />;
        return customerId ? (
          <Link
            to="/customers/$customerId"
            params={{ customerId }}
            search={{}}
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </Link>
        ) : (
          content
        );
      },
      enableSorting: false,
      size: 200,
      meta: {
        skeleton: { type: "text", width: "w-40" },
      },
    },

    // Product column
    {
      id: "productName",
      accessorKey: "productName",
      header: "Product",
      cell: ({ row }) => {
        const productId = row.original.productId;
        const val = row.getValue("productName");
        const productName = val == null ? null : typeof val === "string" ? val : String(val);
        const serial = row.original.productSerial ?? undefined;
        const sku = row.original.productSku ?? undefined;

        return (
          <div className="space-y-1">
            {productId ? (
              <Link
                to="/products/$productId"
                params={{ productId }}
                className="block text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <NameCell name={productName} subtitle={sku} maxWidth={220} />
              </Link>
            ) : (
              <NameCell name={productName} subtitle={sku} maxWidth={220} />
            )}
            {serial ? (
              <Link
                to="/inventory/browser"
                search={{ view: "serialized", serializedSearch: serial, page: 1 }}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <PackageSearch className="h-3 w-3" aria-hidden="true" />
                <span className="font-mono">{serial}</span>
              </Link>
            ) : null}
          </div>
        );
      },
      enableSorting: false,
      size: 220,
      meta: {
        skeleton: { type: "icon-text", width: "w-44" },
      },
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
      meta: {
        skeleton: { type: "badge", width: "w-24" },
      },
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
          <ExpiryDateCell
            text={text}
            isExpired={isExpired}
            isExpiringSoon={isExpiringSoon}
          />
        );
      },
      enableSorting: true,
      size: 100,
      meta: {
        skeleton: { type: "text", width: "w-20" },
      },
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
      meta: {
        skeleton: { type: "icon" },
      },
    },
  ];
}
