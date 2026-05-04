'use client';

import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { getServiceLinkagePresentation } from '@/components/domain/warranty/views/warranty-service-linkage-utils';
import { cn } from '@/lib/utils';
import { formatDateAustralian } from '@/lib/warranty';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

type WarrantyQuickAnswerContext = Pick<
  WarrantyDetail,
  'expiryDate' | 'policyName' | 'serviceLinkageStatus'
>;

interface WarrantyQuickAnswerStripProps {
  warranty: WarrantyQuickAnswerContext;
  daysUntilExpiry: number;
}

function formatDate(dateString: string): string {
  return formatDateAustralian(dateString, 'numeric');
}

function getExpiryBadge(daysUntilExpiry: number) {
  if (daysUntilExpiry <= 0) {
    return <StatusBadge status="expired" variant="error" />;
  }
  if (daysUntilExpiry <= 7) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="error" />;
  }
  if (daysUntilExpiry <= 30) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="pending" />;
  }
  if (daysUntilExpiry <= 90) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="warning" />;
  }
  return <StatusBadge status={`${daysUntilExpiry} days left`} variant="neutral" />;
}

export function WarrantyQuickAnswerStrip({
  warranty,
  daysUntilExpiry,
}: WarrantyQuickAnswerStripProps) {
  const serviceLinkage = getServiceLinkagePresentation(warranty.serviceLinkageStatus);

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {getExpiryBadge(daysUntilExpiry)}
        <Badge
          variant="outline"
          className={cn('rounded-full', serviceLinkage.badgeClassName)}
        >
          {serviceLinkage.label}
        </Badge>
        <span className="text-muted-foreground">
          Policy: {warranty.policyName}
        </span>
        <span className="text-muted-foreground">
          Expires {formatDate(warranty.expiryDate)}
        </span>
      </div>
    </div>
  );
}
