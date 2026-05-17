import { format, isPast } from 'date-fns';
import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FormatAmount } from '@/components/shared/format';
import { cn } from '@/lib/utils';
import type { CostLayer } from '../item-tabs';

interface CostLayersTabContentProps {
  costLayers?: CostLayer[];
  isLoading?: boolean;
}

export function CostLayersTabContent({
  costLayers = [],
  isLoading,
}: CostLayersTabContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border rounded">
            <Skeleton className="h-6 w-24" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (costLayers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No cost layers recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {costLayers.map((layer, index) => (
        <div
          key={layer.id}
          className={cn(
            'border rounded-lg p-3',
            index === 0 && 'border-primary/50 bg-primary/5'
          )}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 text-center">
              <Badge variant={index === 0 ? 'default' : 'secondary'}>L{index + 1}</Badge>
            </div>

            <div className="flex-1">
              <div className="text-sm">
                Received: {format(new Date(layer.receivedAt), 'PP')}
              </div>
              {layer.expiryDate && (
                <div
                  className={cn(
                    'text-xs',
                    isPast(new Date(layer.expiryDate))
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  Expires: {format(new Date(layer.expiryDate), 'PP')}
                </div>
              )}
            </div>

            <div className="text-center tabular-nums">
              <div className="font-medium">{layer.quantityRemaining}</div>
              <div className="text-xs text-muted-foreground">of {layer.quantityReceived}</div>
            </div>

            <div className="text-right tabular-nums w-24">
              <div className="font-medium">
                <FormatAmount amount={layer.unitCost} />
              </div>
              <div className="text-xs text-muted-foreground">per unit</div>
            </div>

            <div className="text-right tabular-nums w-28">
              <div className="font-semibold">
                <FormatAmount amount={layer.totalCost} />
              </div>
              <div className="text-xs text-muted-foreground">total</div>
            </div>
          </div>

          {layer.costComponents && layer.costComponents.length > 0 ? (
            <div className="mt-3 rounded-md border bg-muted/30 p-2">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Landed Cost Components</p>
              <div className="space-y-1">
                {layer.costComponents.map((component) => (
                  <div key={component.id} className="grid grid-cols-1 gap-1 text-xs md:grid-cols-4">
                    <div className="font-medium">
                      {component.componentType === 'base_unit_cost' ? 'Base Unit Cost' : 'Allocated Additional Cost'}
                    </div>
                    <div className="text-muted-foreground">
                      {component.costType ?? 'unspecified'}
                    </div>
                    <div className="tabular-nums">
                      <FormatAmount amount={component.amountPerUnit} /> / unit
                    </div>
                    <div className="tabular-nums text-right">
                      <FormatAmount amount={component.amountTotal} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ))}

      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg font-semibold">
        <div className="w-16" />
        <div className="flex-1">Total</div>
        <div className="tabular-nums">
          {costLayers.reduce((sum, layer) => sum + layer.quantityRemaining, 0)}
        </div>
        <div className="w-24" />
        <div className="text-right tabular-nums w-28">
          <FormatAmount amount={costLayers.reduce((sum, layer) => sum + layer.totalCost, 0)} />
        </div>
      </div>
    </div>
  );
}
