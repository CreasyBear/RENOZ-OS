/**
 * Approval Stats Cards Component
 *
 * Displays key approval metrics: Pending, Approved, Rejected, Urgent
 * Uses shared MetricCard component per design system standards.
 *
 * @see docs/design-system/METRIC-CARD-STANDARDS.md
 */

import { memo } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  urgent: number;
}

export interface ApprovalStatsCardsProps {
  stats: ApprovalStats;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ApprovalStatsCards = memo(function ApprovalStatsCards({
  stats,
}: ApprovalStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <MetricCard
        title="Pending"
        value={stats.pending}
        icon={Clock}
        subtitle="Awaiting approval"
        className="transition-shadow duration-200 hover:shadow-md"
      />

      <MetricCard
        title="Approved"
        value={stats.approved}
        icon={CheckCircle}
        iconClassName="text-green-600"
        subtitle="This week"
        className="transition-shadow duration-200 hover:shadow-md"
      />

      <MetricCard
        title="Rejected"
        value={stats.rejected}
        icon={XCircle}
        iconClassName="text-red-600"
        subtitle="This week"
        className="transition-shadow duration-200 hover:shadow-md"
      />

      <MetricCard
        title="Urgent"
        value={stats.urgent}
        icon={AlertTriangle}
        iconClassName="text-orange-600"
        subtitle="Require immediate attention"
        alert={stats.urgent > 0}
        className="transition-shadow duration-200 hover:shadow-md"
      />
    </div>
  );
});
