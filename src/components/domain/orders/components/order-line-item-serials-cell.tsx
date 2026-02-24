/**
 * Order Line Item Serials Cell
 *
 * Shared component for displaying allocated serial numbers in order line item tables.
 * Used by OrderItemsTab and OrderFulfillmentTab.
 *
 * Adaptive display:
 * - 0 serials: em dash
 * - 1-2 serials: inline badges (always visible)
 * - 3+ serials: badge with count + expandable row trigger (parent renders expanded row)
 *
 * For 3+ serials, parent must pass lineItemId, isExpanded, onToggle and render
 * an expanded row below when isExpanded. This pushes rows below down (accordion).
 */

import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SerialNumbersList } from './serial-numbers-list';

const INLINE_SERIALS_THRESHOLD = 2;

export interface OrderLineItemSerialsCellProps {
  allocatedSerialNumbers: string[] | null;
  /** For 3+ serials: expandable row mode. Parent renders expanded row. */
  lineItemId?: string;
  isExpanded?: boolean;
  onToggle?: (lineItemId: string) => void;
}

export function OrderLineItemSerialsCell({
  allocatedSerialNumbers,
  lineItemId,
  isExpanded = false,
  onToggle,
}: OrderLineItemSerialsCellProps) {
  const serials = (allocatedSerialNumbers as string[] | null) ?? [];

  if (serials.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (serials.length <= INLINE_SERIALS_THRESHOLD) {
    return <SerialNumbersList serials={serials} />;
  }

  const handleClick = () => {
    if (lineItemId && onToggle) {
      onToggle(lineItemId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`${serials.length} serial numbers. Click to ${isExpanded ? 'collapse' : 'expand'}.`}
      aria-expanded={isExpanded}
    >
      <Badge variant="outline" className="cursor-pointer text-[10px]">
        {serials.length}
      </Badge>
      {isExpanded ? (
        <ChevronUp className="h-3 w-3 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}
