import { useMemo } from 'react';
import { Boxes, DollarSign, Package, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useOrgFormat } from '@/hooks/use-org-format';
import type { BomItemWithProduct, ProjectBom } from '@/lib/schemas/jobs';

const BOM_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100' },
  ordered: { label: 'Ordered', color: 'text-purple-600', bg: 'bg-purple-100' },
  partial: { label: 'Partial', color: 'text-amber-600', bg: 'bg-amber-100' },
  complete: { label: 'Complete', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
};

export interface ProjectBomSummaryCardsProps {
  items: BomItemWithProduct[];
  bom: ProjectBom;
}

export function ProjectBomSummaryCards({ items, bom }: ProjectBomSummaryCardsProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalEstimatedCost = items.reduce((sum, item) => {
      const qty = Number(item.quantityEstimated) || 0;
      const cost = Number(item.unitCostEstimated) || 0;
      return sum + (qty * cost);
    }, 0);

    const byStatus = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const installedCount = byStatus['installed'] || 0;
    const progress = totalItems > 0 ? (installedCount / totalItems) * 100 : 0;

    return {
      totalItems,
      totalEstimatedCost,
      progress,
      installedCount,
    };
  }, [items]);

  const bomStatus = BOM_STATUS_CONFIG[bom.status] || BOM_STATUS_CONFIG.draft;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', bomStatus.bg)}>
              <Package className={cn('h-4 w-4', bomStatus.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">BOM Status</p>
              <p className={cn('font-semibold', bomStatus.color)}>{bomStatus.label}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <Boxes className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="font-semibold">{stats.totalItems}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Cost</p>
              <p className="font-semibold">{formatCurrencyDisplay(stats.totalEstimatedCost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="font-semibold">{Math.round(stats.progress)}%</p>
              </div>
            </div>
          </div>
          <Progress value={stats.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            {stats.installedCount} of {stats.totalItems} installed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
