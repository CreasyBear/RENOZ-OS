/**
 * Customer Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Link } from "@tanstack/react-router";
import { Eye, Edit, Trash2, Mail, Phone } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckboxCell,
  StatusCell,
  TypeCell,
  PriceCell,
  DateCell,
  ActionsCell,
  DataTableColumnHeader,
  ScoreCell,
  TagsCell,
} from "@/components/shared/data-table";
import type { CellActionItem as ActionItem, TagItem } from "@/components/shared/data-table";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_STATUS_CONFIG,
  CUSTOMER_TYPE_CONFIG,
  CUSTOMER_SIZE_CONFIG,
  type CustomerStatus,
  type CustomerType,
  type CustomerSize,
} from "./customer-status-config";

/**
 * Customer list item type - matches server function response
 * Preserving existing interface for backwards compatibility
 */
export interface CustomerTableData {
  id: string;
  name: string;
  customerCode: string;
  email: string | null;
  phone: string | null;
  status: string;
  type: string;
  size: string | null;
  industry: string | null;
  healthScore: number | null;
  lifetimeValue: string | number | null;
  totalOrders: number | null;
  lastOrderDate: string | Date | null;
  tags: string[] | null;
  lastActivityAt?: string | Date | null;
  lastActivityType?: string | null;
  owner?: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
}

export interface CreateCustomerColumnsOptions {
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
  /** View customer handler */
  onViewCustomer: (id: string) => void;
  /** Edit customer handler */
  onEditCustomer?: (id: string) => void;
  /** Delete customer handler */
  onDeleteCustomer?: (id: string) => void;
}

/**
 * Contact cell component for email/phone display
 */
function ContactCell({
  email,
  phone,
}: {
  email: string | null;
  phone: string | null;
}) {
  if (!email && !phone) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Mail className="h-3 w-3 flex-shrink-0" />
          <TruncateTooltip text={email} maxLength={20} maxWidth="max-w-[120px]" />
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3 w-3 flex-shrink-0" />
          <span>{phone}</span>
        </a>
      )}
    </div>
  );
}

/**
 * Size cell component with custom colored badge
 */
function SizeCell({ size }: { size: string | null }) {
  if (!size || !CUSTOMER_SIZE_CONFIG[size as CustomerSize]) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const config = CUSTOMER_SIZE_CONFIG[size as CustomerSize];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

/**
 * Create column definitions for the customers table.
 */
export function createCustomerColumns(
  options: CreateCustomerColumnsOptions
): ColumnDef<CustomerTableData>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewCustomer,
    onEditCustomer,
    onDeleteCustomer,
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
          ariaLabel="Select all customers"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select ${row.original.name}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Customer Name column with code and tags
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => {
        const customer = row.original;
        const tags: TagItem[] = (customer.tags ?? []).map((tag, idx) => ({
          id: `${customer.id}-tag-${idx}`,
          name: tag,
        }));

        return (
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <Link
              to="/customers/$customerId"
              params={{ customerId: customer.id }}
              className="font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.name}
            </Link>
            {customer.customerCode && (
              <span className="text-xs text-muted-foreground">
                {customer.customerCode}
              </span>
            )}
            {tags.length > 0 && (
              <TagsCell tags={tags} maxVisible={3} className="mt-0.5" />
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 200,
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
          status={row.original.status as CustomerStatus}
          statusConfig={CUSTOMER_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 110,
    },

    // Type column
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <TypeCell
          type={row.original.type as CustomerType}
          typeConfig={CUSTOMER_TYPE_CONFIG}
        />
      ),
      enableSorting: false,
      size: 100,
    },

    // Size column
    {
      id: "size",
      accessorKey: "size",
      header: "Size",
      cell: ({ row }) => <SizeCell size={row.original.size} />,
      enableSorting: false,
      size: 100,
    },

    // Industry column
    {
      id: "industry",
      accessorKey: "industry",
      header: "Industry",
      cell: ({ row }) =>
        row.original.industry ? (
          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
            {row.original.industry}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
      enableSorting: false,
      size: 140,
    },

    // Contact column
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <ContactCell email={row.original.email} phone={row.original.phone} />
      ),
      enableSorting: false,
      size: 160,
    },

    // Lifetime Value column
    {
      id: "lifetimeValue",
      accessorKey: "lifetimeValue",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="LTV" className="justify-end" />
      ),
      cell: ({ row }) => {
        const value = row.original.lifetimeValue;
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        return <PriceCell value={numValue} align="right" showCents={false} />;
      },
      enableSorting: true,
      size: 110,
    },

    // Total Orders column
    {
      id: "totalOrders",
      accessorKey: "totalOrders",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Orders" className="justify-center" />
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.totalOrders !== null && row.original.totalOrders > 0 ? (
            <span className="text-sm font-medium">{row.original.totalOrders}</span>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      ),
      enableSorting: true,
      size: 80,
    },

    // Health Score column
    {
      id: "healthScore",
      accessorKey: "healthScore",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Health" />
      ),
      cell: ({ row }) => {
        const score = row.original.healthScore;
        if (score === null) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        return <ScoreCell score={score} size="sm" />;
      },
      enableSorting: true,
      size: 90,
    },

    // Last Order Date column
    {
      id: "lastOrderDate",
      accessorKey: "lastOrderDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Order" />
      ),
      cell: ({ row }) => (
        <DateCell value={row.original.lastOrderDate} format="relative" />
      ),
      enableSorting: true,
      size: 110,
    },

    // Actions column
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const customer = row.original;

        const actions: ActionItem[] = [
          {
            label: "View Details",
            icon: Eye,
            onClick: () => onViewCustomer(customer.id),
          },
        ];

        if (onEditCustomer) {
          actions.push({
            label: "Edit",
            icon: Edit,
            onClick: () => onEditCustomer(customer.id),
          });
        }

        if (onDeleteCustomer) {
          actions.push({
            label: "Delete",
            icon: Trash2,
            onClick: () => onDeleteCustomer(customer.id),
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
