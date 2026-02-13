/**
 * Warranty Status Filter Chips
 *
 * One-click filter chips with counts per DOMAIN-LANDING-STANDARDS.
 * Surfaces "what needs attention" in the command bar.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { memo } from 'react';
import { Clock, AlertTriangle, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WarrantyFiltersState } from './warranty-filter-config';
import { isWarrantyStatusValue } from '@/lib/schemas/warranty';

export interface WarrantyStatusChipsProps {
  counts: {
    all: number;
    expiring_soon: number;
    expired: number;
  };
  filters: WarrantyFiltersState;
  onFiltersChange: (filters: WarrantyFiltersState) => void;
  className?: string;
}

interface WarrantyStatusChip {
  id: string;
  label: string;
  key: keyof WarrantyStatusChipsProps['counts'];
  icon: typeof Clock;
  status: string | null;
}

const CHIPS: WarrantyStatusChip[] = [
  { id: 'expiring', label: 'Expiring', key: 'expiring_soon', icon: Clock, status: 'expiring_soon' },
  { id: 'expired', label: 'Expired', key: 'expired', icon: AlertTriangle, status: 'expired' },
  { id: 'all', label: 'All', key: 'all', icon: LayoutGrid, status: null },
];

function isChipActive(
  chip: WarrantyStatusChip,
  filters: WarrantyFiltersState
): boolean {
  if (chip.id === 'all') {
    return filters.status === null;
  }
  return filters.status === chip.status;
}

export const WarrantyStatusChips = memo(function WarrantyStatusChips({
  counts,
  filters,
  onFiltersChange,
  className,
}: WarrantyStatusChipsProps) {
  const handleChipClick = (chip: WarrantyStatusChip) => {
    if (chip.id === 'all') {
      onFiltersChange({ ...filters, status: null });
      return;
    }
    onFiltersChange({
      ...filters,
      status: isWarrantyStatusValue(chip.status) ? chip.status : null,
    });
  };

  const getCount = (chip: WarrantyStatusChip) =>
    counts[chip.key] ?? 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {CHIPS.map((chip) => {
        const Icon = chip.icon;
        const count = getCount(chip);
        const isActive = isChipActive(chip, filters);

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
