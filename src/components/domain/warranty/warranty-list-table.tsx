/**
 * Warranty List Table
 *
 * Presenter for warranty list table and pagination controls.
 */
'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Eye, Shield } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table/data-table';
import { DateCell } from '@/components/shared/data-table/cells/date-cell';
import { NameCell } from '@/components/shared/data-table/cells/name-cell';
import { StatusCell, type StatusConfigItem } from '@/components/shared/data-table/cells/status-cell';
import { actionsColumn } from '@/components/shared/data-table/column-presets';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';

export interface WarrantyListItem {
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
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  registrationDate: string;
  expiryDate: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'voided' | 'transferred';
  currentCycleCount: number | null;
  cycleLimit: number | null;
  expiryAlertOptOut: boolean;
  certificateUrl: string | null;
}

interface WarrantyListTableProps {
  warranties: WarrantyListItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onRowClick?: (warranty: WarrantyListItem) => void;
  onPageChange: (page: number) => void;
  className?: string;
}

const WARRANTY_STATUS_CONFIG: Record<WarrantyListItem['status'], StatusConfigItem> = {
  active: { label: 'Active', variant: 'default' },
  expiring_soon: { label: 'Expiring Soon', variant: 'outline' },
  expired: { label: 'Expired', variant: 'destructive' },
  voided: { label: 'Voided', variant: 'destructive' },
  transferred: { label: 'Transferred', variant: 'secondary' },
};

export function WarrantyListTable({
  warranties,
  total,
  page,
  pageSize,
  isLoading,
  error,
  onRetry,
  onRowClick,
  onPageChange,
  className,
}: WarrantyListTableProps) {
  const columns = useMemo<ColumnDef<WarrantyListItem>[]>(
    () => [
      {
        accessorKey: 'warrantyNumber',
        header: 'Warranty',
        cell: ({ row }) => (
          <NameCell
            name={row.getValue('warrantyNumber')}
            subtitle={row.original.policyName}
            href={`/support/warranties/${row.original.id}`}
            maxWidth={220}
          />
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <NameCell name={row.getValue('customerName')} maxWidth={200} />
        ),
      },
      {
        accessorKey: 'productName',
        header: 'Product',
        cell: ({ row }) => (
          <NameCell
            name={row.getValue('productName')}
            subtitle={row.original.productSerial ?? row.original.productSku ?? undefined}
            maxWidth={220}
          />
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusCell status={row.getValue('status')} statusConfig={WARRANTY_STATUS_CONFIG} />
        ),
      },
      {
        accessorKey: 'expiryDate',
        header: 'Expiry',
        cell: ({ row }) => <DateCell value={row.getValue('expiryDate')} />,
      },
      actionsColumn<WarrantyListItem>([
        {
          label: 'View',
          onClick: (row) => onRowClick?.(row),
        },
      ]),
    ],
    [onRowClick]
  );

  if (error) {
    return (
      <ErrorState
        title="Failed to load warranties"
        message={error.message}
        onRetry={() => onRetry?.()}
        className={className}
      />
    );
  }

  if (!isLoading && warranties.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="No warranties found"
        message="Try adjusting filters or check back after registering warranties."
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <DataTable
        data={warranties}
        columns={columns}
        enableSorting
        onRowClick={onRowClick}
        isLoading={isLoading}
        className="rounded-lg border"
      />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}{' '}
          warranties
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
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
