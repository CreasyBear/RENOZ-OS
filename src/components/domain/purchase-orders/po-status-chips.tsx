/**
 * PO Status Filter Chips
 *
 * One-click filter chips with counts per DOMAIN-LANDING-STANDARDS.
 * Surfaces "what needs attention" in the command bar.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { memo } from 'react';
import { Clock, AlertTriangle, Package, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PurchaseOrderFiltersState, PurchaseOrderStatus } from '@/lib/schemas/purchase-orders';

export interface POStatusChipsProps {
  counts: {
    all: number;
    pending_approval: number;
    partial_received: number;
    overdue: number;
  };
  filters: PurchaseOrderFiltersState;
  onFiltersChange: (filters: PurchaseOrderFiltersState) => void;
  className?: string;
}

interface POStatusChip {
  id: string;
  label: string;
  key: string;
  icon: typeof Clock;
  statuses?: readonly string[];
  isOverdue?: true;
}

const CHIPS: POStatusChip[] = [
  { id: 'overdue', label: 'Overdue', key: 'overdue', icon: AlertTriangle, statuses: ['approved', 'ordered', 'partial_received'] as const, isOverdue: true },
  { id: 'pending_approval', label: 'Pending Approval', key: 'pending_approval', icon: Clock, statuses: ['pending_approval'] as const },
  { id: 'partial_received', label: 'Partially Received', key: 'partial_received', icon: Package, statuses: ['partial_received'] as const },
  { id: 'all', label: 'All', key: 'all', icon: LayoutGrid },
];

function isChipActive(
  chip: POStatusChip,
  filters: PurchaseOrderFiltersState,
  _counts: POStatusChipsProps['counts']
): boolean {
  if (chip.id === 'all') {
    return filters.status.length === 0 && !filters.overdue;
  }
  if (chip.isOverdue) {
    return !!filters.overdue;
  }
  if (chip.statuses) {
    return filters.status.length === chip.statuses.length
      && chip.statuses.every((s) => filters.status.includes(s as PurchaseOrderStatus))
      && !filters.overdue;
  }
  return false;
}

export const POStatusChips = memo(function POStatusChips({
  counts,
  filters,
  onFiltersChange,
  className,
}: POStatusChipsProps) {
  const handleChipClick = (chip: POStatusChip) => {
    if (chip.id === 'all') {
      onFiltersChange({ ...filters, status: [], overdue: false });
      return;
    }
    if (chip.isOverdue) {
      onFiltersChange({
        ...filters,
        status: ['approved', 'ordered', 'partial_received'],
        overdue: true,
      });
      return;
    }
    if (chip.statuses) {
      onFiltersChange({ ...filters, status: [...chip.statuses] as PurchaseOrderStatus[], overdue: false });
    }
  };

  const getCount = (chip: POStatusChip) => {
    if (chip.id === 'all') return counts.all;
    return counts[chip.key as keyof typeof counts] ?? 0;
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {CHIPS.map((chip) => {
        const Icon = chip.icon;
        const count = getCount(chip);
        const isActive = isChipActive(chip, filters, counts);

        return (
          <Button
            key={chip.id}
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 font-normal',
              isActive && 'border-primary ring-1 ring-primary/20'
            )}
            onClick={() => handleChipClick(chip)}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" aria-hidden />
            <span>{chip.label}</span>
            <span className="ml-1 text-muted-foreground">({count})</span>
          </Button>
        );
      })}
    </div>
  );
});
