/**
 * FilterChip Component
 *
 * Dismissible filter chip for displaying active filters.
 * Use with FilterChipOverflow for chips with overflow popover.
 *
 * @see docs/design-system/TIMELINE-SCHEDULE-DESIGN-SYSTEM.md
 * @source project-management-reference/components/filter-chip.tsx
 */
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterChipProps {
  label: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <div
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-muted px-3 text-sm min-w-0 max-w-[200px]',
        className
      )}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-md p-0.5 hover:bg-accent flex-shrink-0"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
