import { format } from 'date-fns';
import { DollarSign, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FormatAmount } from '@/components/shared/format';
import type { ItemDetailData } from '../item-detail';
import type { CostLayer } from '../item-tabs';

interface CostingBreakdownProps {
  item: ItemDetailData;
  costLayers?: CostLayer[];
}

export function CostingBreakdown({ item, costLayers = [] }: CostingBreakdownProps) {
  const totalLayerValue = costLayers.reduce((sum, layer) => sum + layer.totalCost, 0);
  const totalRemaining = costLayers.reduce((sum, layer) => sum + layer.quantityRemaining, 0);
  const weightedAvgCost =
    costLayers.length > 0 && totalRemaining > 0
      ? totalLayerValue / totalRemaining
      : item.unitCost;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Costing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Unit Cost
            </span>
            <span className="font-medium tabular-nums">
              <FormatAmount amount={item.unitCost} />
            </span>
          </div>
          {costLayers.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4" /> Weighted Avg
              </span>
              <span className="font-medium tabular-nums">
                <FormatAmount amount={weightedAvgCost} />
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total Value</span>
            <span className="tabular-nums">
              <FormatAmount amount={item.totalValue} />
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost Layers</span>
            <span className="font-medium">{costLayers.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost Method</span>
            <Badge variant="outline" className="text-xs">
              FIFO
            </Badge>
          </div>
          {costLayers.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Oldest Layer</span>
                <span>{format(new Date(costLayers[0].receivedAt), 'PP')}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
