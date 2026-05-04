'use client';

import { useState } from 'react';
import { Clock, Shield, TicketIcon } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { Progress } from '@/components/ui/progress';
import { calculateWarrantyCoverageProgress } from '@/components/domain/warranty/views/warranty-coverage-summary-utils';
import { formatDateAustralian } from '@/lib/warranty';
import { getSummaryMetricSubtitle } from '@/lib/metrics/metric-display';
import type { WarrantyDetail, WarrantyDetailViewProps } from '@/lib/schemas/warranty';

type WarrantyCoverageSummaryContext = Pick<
  WarrantyDetail,
  'registrationDate' | 'expiryDate' | 'items'
>;

interface WarrantyCoverageSummaryProps {
  warranty: WarrantyCoverageSummaryContext;
  daysUntilExpiry: number;
  claimSummary: WarrantyDetailViewProps['claimSummary'];
  claimSummaryState: NonNullable<WarrantyDetailViewProps['claimSummaryState']>;
  isClaimsLoading: boolean;
  isClaimSummaryLoading?: boolean;
  now?: number;
}

function formatDate(dateString: string): string {
  return formatDateAustralian(dateString, 'numeric');
}

export function WarrantyCoverageSummary({
  warranty,
  daysUntilExpiry,
  claimSummary,
  claimSummaryState,
  isClaimsLoading,
  isClaimSummaryLoading = false,
  now,
}: WarrantyCoverageSummaryProps) {
  const [capturedNow] = useState(() => now ?? Date.now());
  const coverageProgress = calculateWarrantyCoverageProgress({
    registrationDate: warranty.registrationDate,
    expiryDate: warranty.expiryDate,
    now: capturedNow,
  });

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <MetricCard
            variant="compact"
            title="Days Left"
            value={daysUntilExpiry > 0 ? `${daysUntilExpiry}d` : 'Expired'}
            icon={Clock}
            iconClassName={
              daysUntilExpiry <= 0
                ? 'text-destructive'
                : daysUntilExpiry <= 30
                  ? 'text-warning'
                  : 'text-muted-foreground'
            }
            subtitle={daysUntilExpiry > 0 ? `Expires ${formatDate(warranty.expiryDate)}` : undefined}
            alert={daysUntilExpiry <= 0 || daysUntilExpiry <= 30}
          />
          <MetricCard
            variant="compact"
            title="Claims"
            value={claimSummaryState === 'ready' ? claimSummary?.totalClaims ?? 0 : '—'}
            icon={TicketIcon}
            iconClassName="text-muted-foreground"
            isLoading={isClaimsLoading || isClaimSummaryLoading}
            subtitle={getSummaryMetricSubtitle({
              summaryState: claimSummaryState,
              readySubtitle:
                claimSummaryState === 'ready' && (claimSummary?.pendingClaims ?? 0) > 0
                  ? `${claimSummary?.pendingClaims ?? 0} pending`
                  : undefined,
              unavailableSubtitle: 'Claim summary unavailable',
            })}
          />
          <MetricCard
            variant="compact"
            title="Covered Items"
            value={warranty.items.length}
            icon={Shield}
            iconClassName="text-muted-foreground"
          />
        </div>
      </section>

      <section
        className="rounded-lg border bg-background p-4"
        role="progressbar"
        aria-label={`Coverage progress: ${coverageProgress}%`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Coverage timeline</div>
            <div className="text-xs text-muted-foreground">
              Registered {formatDate(warranty.registrationDate)} · Expires {formatDate(warranty.expiryDate)}
            </div>
          </div>
          <div className="text-sm font-medium">
            {coverageProgress}% used
          </div>
        </div>
        <Progress value={coverageProgress} className="mt-3 h-2" />
      </section>
    </>
  );
}
