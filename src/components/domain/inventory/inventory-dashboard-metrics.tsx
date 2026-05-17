import { AlertTriangle, DollarSign, MapPin, Package } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { FormatAmount } from '@/components/shared/format';

interface InventoryDashboardMetricsProps {
  totals: {
    totalValue: number;
    totalUnits: number;
    totalSkus: number;
  };
  comparison?: {
    totalValueChange?: number;
    totalUnitsChange?: number;
    alertsChange?: number;
  } | null;
  metrics?: {
    lowStockCount?: number | null;
    outOfStockCount?: number | null;
  } | null;
  locationsCount: number;
  isLoading: boolean;
  showDashboardUnavailable: boolean;
  stockSemantics?: {
    currentAlerts?: string;
    previousPeriodComparison?: string;
  } | null;
  comparisonUnits?: {
    alertsChange?: string;
  } | null;
}

export function InventoryDashboardMetrics({
  totals,
  comparison,
  metrics,
  locationsCount,
  isLoading,
  showDashboardUnavailable,
  stockSemantics,
  comparisonUnits,
}: InventoryDashboardMetricsProps) {
  const lowStockCount = metrics?.lowStockCount;
  const outOfStockCount = metrics?.outOfStockCount;
  const alertsCount = (lowStockCount ?? 0) + (outOfStockCount ?? 0);
  const alertsComparisonIsComparable =
    stockSemantics?.currentAlerts === stockSemantics?.previousPeriodComparison;
  const alertsChangeCanRenderAsTrend = comparisonUnits?.alertsChange === 'percentage';
  const alertsDelta =
    alertsChangeCanRenderAsTrend &&
    alertsComparisonIsComparable &&
    comparison?.alertsChange !== undefined &&
    comparison.alertsChange !== 0
      ? Math.abs(comparison.alertsChange)
      : undefined;
  const alertsPositive =
    alertsChangeCanRenderAsTrend &&
    alertsComparisonIsComparable &&
    comparison?.alertsChange !== undefined
      ? comparison.alertsChange < 0
      : undefined;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Value"
        value={<FormatAmount amount={totals.totalValue} />}
        subtitle={`${totals.totalSkus.toLocaleString()} SKUs`}
        icon={DollarSign}
        isLoading={isLoading}
        delta={
          comparison?.totalValueChange !== undefined
            ? Math.abs(comparison.totalValueChange)
            : undefined
        }
        positive={
          comparison?.totalValueChange !== undefined
            ? comparison.totalValueChange > 0
            : undefined
        }
      />
      <MetricCard
        title="On-Hand Units"
        value={totals.totalUnits.toLocaleString()}
        subtitle="Physical stock"
        icon={Package}
        isLoading={isLoading}
        delta={
          comparison?.totalUnitsChange !== undefined
            ? Math.abs(comparison.totalUnitsChange)
            : undefined
        }
        positive={
          comparison?.totalUnitsChange !== undefined
            ? comparison.totalUnitsChange > 0
            : undefined
        }
      />
      <MetricCard
        title="Allocatable Alerts"
        value={showDashboardUnavailable ? '--' : alertsCount}
        subtitle={
          showDashboardUnavailable
            ? 'Alert metrics unavailable'
            : `${lowStockCount ?? 0} low, ${outOfStockCount ?? 0} out available`
        }
        icon={AlertTriangle}
        isLoading={isLoading}
        alert={!showDashboardUnavailable && alertsCount > 0}
        delta={alertsDelta}
        positive={alertsPositive}
      />
      <MetricCard
        title="Locations"
        value={locationsCount}
        subtitle="Active warehouses"
        icon={MapPin}
        isLoading={isLoading}
      />
    </div>
  );
}
