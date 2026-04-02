/**
 * Receiving Stats Component
 *
 * Metrics cards for receiving dashboard showing actionable KPIs.
 * Follows METRIC-CARD-STANDARDS.md patterns.
 *
 * @see src/components/shared/metric-card.tsx
 * @see docs/design-system/METRIC-CARD-STANDARDS.md
 */

import { memo, useMemo } from 'react';
import { Package, Building2, DollarSign, Calendar } from 'lucide-react';
import { MetricCard } from '@/components/shared';
import { FormatAmount } from '@/components/shared/format';
import { getSummaryMetricSubtitle } from '@/lib/metrics/metric-display';
import type { SummaryState } from '@/lib/metrics/summary-health';

// ============================================================================
// TYPES
// ============================================================================

export interface ReceivingStatsProps {
  /** Total orders awaiting receipt */
  totalOrders: number;
  /** Total value of orders awaiting receipt */
  totalValue: number | null;
  /** Number of unique suppliers */
  supplierCount: number | null;
  /** Date of oldest order awaiting receipt */
  oldestOrderDate: string | null;
  /** Authoritative summary state for headline metrics */
  summaryState?: SummaryState;
  /** Loading state */
  isLoading?: boolean;
  /** Click handler for orders metric (navigate to filtered list) */
  onOrdersClick?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ReceivingStats = memo(function ReceivingStats({
  totalOrders,
  totalValue,
  supplierCount,
  oldestOrderDate,
  summaryState = 'loading',
  isLoading = false,
  onOrdersClick,
}: ReceivingStatsProps) {
  // Calculate days ago for oldest order
  const oldestOrderText = useMemo(() => {
    if (!oldestOrderDate) return summaryState === 'unavailable' ? '—' : 'N/A';
    const date = new Date(oldestOrderDate);
    // eslint-disable-next-line react-hooks/purity -- Date.now() for relative time display; stable per mount
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return `${daysAgo} days ago`;
  }, [oldestOrderDate, summaryState]);

  // Determine if oldest order is overdue (alert state)
  const isOldestOverdue = useMemo(() => {
    if (!oldestOrderDate) return false;
    // eslint-disable-next-line react-hooks/purity -- Date.now() for relative time; stable per mount
    const daysAgo = Math.floor((Date.now() - new Date(oldestOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo > 7; // Alert if older than 7 days
  }, [oldestOrderDate]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Orders Awaiting"
        value={totalOrders}
        subtitle={getSummaryMetricSubtitle({
          summaryState,
          unavailableSubtitle: 'Summary partially unavailable',
        })}
        icon={Package}
        isLoading={isLoading}
        onClick={onOrdersClick}
        className={onOrdersClick ? 'cursor-pointer' : undefined}
      />
      <MetricCard
        title="Total Value"
        value={totalValue != null ? <FormatAmount amount={totalValue} /> : '—'}
        subtitle={getSummaryMetricSubtitle({ summaryState })}
        icon={DollarSign}
        isLoading={isLoading}
      />
      <MetricCard
        title="Suppliers"
        value={supplierCount ?? '—'}
        subtitle={getSummaryMetricSubtitle({ summaryState })}
        icon={Building2}
        isLoading={isLoading}
      />
      <MetricCard
        title="Oldest Order"
        value={oldestOrderText}
        subtitle={getSummaryMetricSubtitle({ summaryState })}
        icon={Calendar}
        isLoading={isLoading}
        alert={isOldestOverdue}
      />
    </div>
  );
});
