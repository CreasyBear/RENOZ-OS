/**
 * SerialNumbersList Component
 *
 * Renders serial numbers as flex-wrap links to the inventory browser.
 * Shared across OrderLineItemSerialsCell, ShipmentList, and ShipOrderDialog.
 */

import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export interface SerialNumbersListProps {
  serials: string[];
  className?: string;
}

export function SerialNumbersList({ serials, className }: SerialNumbersListProps) {
  if (serials.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {serials.map((serial) => (
        <Link
          key={serial}
          to="/inventory/browser"
          search={{ view: 'serialized', serializedSearch: serial, page: 1 }}
          className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-primary hover:bg-muted"
        >
          {serial}
        </Link>
      ))}
    </div>
  );
}
