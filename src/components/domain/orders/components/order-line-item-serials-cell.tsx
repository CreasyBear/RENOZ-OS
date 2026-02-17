/**
 * Order Line Item Serials Cell
 *
 * Shared component for displaying allocated serial numbers in order line item tables.
 * Used by OrderItemsTab and OrderFulfillmentTab.
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface OrderLineItemSerialsCellProps {
  allocatedSerialNumbers: string[] | null;
}

export function OrderLineItemSerialsCell({
  allocatedSerialNumbers,
}: OrderLineItemSerialsCellProps) {
  const serials = (allocatedSerialNumbers as string[] | null) ?? [];

  if (serials.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-help text-[10px]"
          aria-label={`${serials.length} serial number${serials.length === 1 ? '' : 's'}`}
        >
          {serials.length}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <p className="text-xs font-medium mb-1">Serial Numbers:</p>
        <p className="text-xs text-muted-foreground">{serials.join(', ')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
