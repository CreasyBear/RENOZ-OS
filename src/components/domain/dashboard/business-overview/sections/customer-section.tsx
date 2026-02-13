/**
 * Customer Section
 *
 * Displays customer KPIs: Total Customers, Retention Rate, Churn Rate
 * Plus a health score distribution pie chart.
 *
 * Uses shared MetricCard component per METRIC-CARD-STANDARDS.md
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, UserCheck, UserMinus, PieChart } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { EmptyState } from '@/components/shared/empty-state';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerKpis {
  totalCustomers: number;
  retentionRate: number;
  churnRate: number;
  // Contextual data for insights
  newThisMonth?: number;         // New customers this month
  activeCustomers?: number;      // Recently active customers
}

export interface HealthDistribution {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  atRisk: number;
}

export interface CustomerSectionProps {
  kpis?: CustomerKpis | null;
  healthDistribution?: HealthDistribution | null;
  isLoading?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-AU').format(value);
}

// Health score colors and labels
const healthColors = {
  excellent: 'bg-green-500',
  good: 'bg-blue-500',
  fair: 'bg-yellow-500',
  poor: 'bg-orange-500',
  atRisk: 'bg-red-500',
};

const healthLabels = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  atRisk: 'At Risk',
};

// ============================================================================
// CHART COMPONENT
// ============================================================================

interface HealthDistributionChartProps {
  data: HealthDistribution;
  isLoading?: boolean;
}

function HealthDistributionChart({ data, isLoading }: HealthDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <Skeleton className="h-4 w-40 mb-3" />
        <div className="flex gap-4">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const total = Object.values(data).reduce((sum, v) => sum + v, 0);

  if (total === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <EmptyState
          icon={PieChart}
          message="No customer health data available."
          className="py-4"
        />
      </div>
    );
  }

  // Build accessible summary
  const healthSummary = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => {
      const label = healthLabels[key as keyof typeof healthLabels];
      const pct = ((value / total) * 100).toFixed(0);
      return `${label}: ${value} (${pct}%)`;
    })
    .join(', ');

  return (
    <div
      className="rounded-lg border bg-muted/30 p-4"
      role="figure"
      aria-label={`Customer health distribution showing ${total} total customers`}
    >
      <p className="text-sm font-medium text-muted-foreground mb-3">Health Score Distribution</p>
      {/* Accessible summary for screen readers */}
      <p className="sr-only">
        Distribution of {total} customers: {healthSummary}.
      </p>
      <div className="flex gap-4">
        {/* Ring chart - visual only */}
        <div className="relative size-24 shrink-0" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            {Object.entries(data).reduce<{
              elements: React.ReactNode[];
              offset: number;
            }>(
              (acc, [key, value]) => {
                const percentage = (value / total) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const colorClass = healthColors[key as keyof typeof healthColors];
                // Convert Tailwind class to stroke color
                const strokeColorMap: Record<string, string> = {
                  'bg-green-500': '#22c55e',
                  'bg-blue-500': '#3b82f6',
                  'bg-yellow-500': '#eab308',
                  'bg-orange-500': '#f97316',
                  'bg-red-500': '#ef4444',
                };
                const element = (
                  <circle
                    key={key}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={strokeColorMap[colorClass] ?? '#9ca3af'}
                    strokeWidth="20"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={-acc.offset}
                    className="transition-all"
                  />
                );
                return {
                  elements: [...acc.elements, element],
                  offset: acc.offset + percentage,
                };
              },
              { elements: [], offset: 0 }
            ).elements}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium">{total}</span>
          </div>
        </div>

        {/* Legend - accessible */}
        <div className="flex-1 space-y-1" role="list" aria-label="Health distribution breakdown">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs" role="listitem">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    healthColors[key as keyof typeof healthColors]
                  )}
                  aria-hidden="true"
                />
                <span>{healthLabels[key as keyof typeof healthLabels]}</span>
              </div>
              <span className="text-muted-foreground">
                {value} ({total > 0 ? ((value / total) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerSection({ kpis, healthDistribution, isLoading }: CustomerSectionProps) {
  const navigate = useNavigate();

  // Build contextual subtitles
  const totalSubtitle = kpis?.newThisMonth
    ? `+${kpis.newThisMonth} this month`
    : undefined;

  const retentionSubtitle = kpis?.activeCustomers
    ? `${kpis.activeCustomers} active (30d)`
    : undefined;

  const churnSubtitle =
    kpis?.churnRate !== undefined && kpis.churnRate > 0
      ? 'Needs attention'
      : kpis?.churnRate === 0
        ? 'No churn detected'
        : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Customers</CardTitle>
        <Link
          to="/customers"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          View Details
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid - Using shared MetricCard with drill-down */}
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            title="Total Customers"
            value={formatNumber(kpis?.totalCustomers ?? 0)}
            subtitle={totalSubtitle}
            icon={Users}
            onClick={() => navigate({ to: '/customers' })}
            isLoading={isLoading}
          />
          <MetricCard
            title="Retention Rate"
            value={formatPercent(kpis?.retentionRate ?? 0)}
            subtitle={retentionSubtitle}
            icon={UserCheck}
            iconClassName="text-green-600"
            onClick={() => navigate({ to: '/customers', search: { status: 'active' } })}
            isLoading={isLoading}
          />
          <MetricCard
            title="Churn Rate"
            value={formatPercent(kpis?.churnRate ?? 0)}
            subtitle={churnSubtitle}
            icon={UserMinus}
            alert={!!kpis?.churnRate && kpis.churnRate > 5}
            onClick={() => navigate({ to: '/customers', search: { status: 'inactive' } })}
            isLoading={isLoading}
          />
        </div>

        {/* Health Distribution Chart */}
        <HealthDistributionChart
          data={healthDistribution ?? { excellent: 0, good: 0, fair: 0, poor: 0, atRisk: 0 }}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
