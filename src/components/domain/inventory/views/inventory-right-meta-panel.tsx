import { Link } from '@tanstack/react-router';
import { format, isPast } from 'date-fns';
import { ExternalLink, Package } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ItemDetailData } from '../item-detail';

interface RightMetaPanelProps {
  item: ItemDetailData;
}

export function RightMetaPanel({ item }: RightMetaPanelProps) {
  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Product
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{item.productName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {item.productDescription || 'No description'}
            </div>
          </div>
        </div>
        <Link
          to="/products/$productId"
          params={{ productId: item.productId }}
          search={{ tab: 'inventory' }}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          View Product Inventory
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <Separator />

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Identification
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">SKU</span>
            <span className="font-mono text-xs">{item.productSku}</span>
          </div>
          {item.serialNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serial #</span>
              <span className="font-mono text-xs">{item.serialNumber}</span>
            </div>
          )}
          {item.lotNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lot #</span>
              <span className="font-mono text-xs">{item.lotNumber}</span>
            </div>
          )}
          {item.binLocation && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bin</span>
              <span className="font-mono text-xs">{item.binLocation}</span>
            </div>
          )}
        </div>
      </div>
      <Separator />

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Location
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Code</span>
            <span>{item.locationCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="truncate max-w-[120px]">{item.locationName}</span>
          </div>
        </div>
      </div>
      <Separator />

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Dates
        </h3>
        <div className="space-y-2 text-sm">
          {item.expiryDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiry</span>
              <span
                className={cn(
                  isPast(new Date(item.expiryDate)) && 'text-destructive font-medium'
                )}
              >
                {format(new Date(item.expiryDate), 'PP')}
              </span>
            </div>
          )}
          {item.receivedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Received</span>
              <span>{format(new Date(item.receivedAt), 'PP')}</span>
            </div>
          )}
          {item.lastMovementAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Move</span>
              <span>{format(new Date(item.lastMovementAt), 'PP')}</span>
            </div>
          )}
        </div>
      </div>
      <Separator />

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Audit Trail
        </h3>
        <div className="space-y-2 text-sm">
          {item.createdAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(item.createdAt), 'PP')}</span>
            </div>
          )}
          {item.updatedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>{format(new Date(item.updatedAt), 'PP')}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
