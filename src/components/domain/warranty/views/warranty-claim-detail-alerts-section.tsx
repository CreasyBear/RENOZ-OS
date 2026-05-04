'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  generateAlertIdWithValue,
  useAlertDismissals,
} from '@/hooks/_shared/use-alert-dismissals';
import type { WarrantyClaimDetailViewProps } from '@/lib/schemas/warranty';

type WarrantyClaimSlaAlert = {
  id: string;
  tone: 'critical' | 'warning';
  title: string;
  description: string;
};

interface WarrantyClaimDetailAlertsSectionProps {
  claimId: string;
  responseSla: WarrantyClaimDetailViewProps['responseSla'];
  resolutionSla: WarrantyClaimDetailViewProps['resolutionSla'];
  onViewSla: () => void;
}

export function WarrantyClaimDetailAlertsSection({
  claimId,
  responseSla,
  resolutionSla,
  onViewSla,
}: WarrantyClaimDetailAlertsSectionProps) {
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  const alerts = useMemo(() => {
    const items: WarrantyClaimSlaAlert[] = [];

    if (responseSla?.status === 'breached') {
      items.push({
        id: generateAlertIdWithValue(
          'warranty_claim',
          claimId,
          'response_sla_breached',
          responseSla.label
        ),
        tone: 'critical',
        title: 'Response SLA breached',
        description: responseSla.label,
      });
    } else if (responseSla?.status === 'at_risk') {
      items.push({
        id: generateAlertIdWithValue(
          'warranty_claim',
          claimId,
          'response_sla_at_risk',
          responseSla.label
        ),
        tone: 'warning',
        title: 'Response SLA at risk',
        description: responseSla.label,
      });
    }

    if (resolutionSla?.status === 'breached') {
      items.push({
        id: generateAlertIdWithValue(
          'warranty_claim',
          claimId,
          'resolution_sla_breached',
          resolutionSla.label
        ),
        tone: 'critical',
        title: 'Resolution SLA breached',
        description: resolutionSla.label,
      });
    } else if (resolutionSla?.status === 'at_risk') {
      items.push({
        id: generateAlertIdWithValue(
          'warranty_claim',
          claimId,
          'resolution_sla_at_risk',
          resolutionSla.label
        ),
        tone: 'warning',
        title: 'Resolution SLA at risk',
        description: resolutionSla.label,
      });
    }

    return items;
  }, [claimId, resolutionSla, responseSla]);

  const visibleAlerts = alerts.filter((alert) => !isAlertDismissed(alert.id)).slice(0, 3);

  if (visibleAlerts.length === 0) return null;

  return (
    <section className="space-y-2">
      {visibleAlerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.tone === 'critical' ? 'destructive' : 'default'}
        >
          <AlertDescription className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">{alert.title}</div>
              <div className="text-muted-foreground text-sm">{alert.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onViewSla}>
                View SLA
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dismiss alert"
                onClick={() => dismiss(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </section>
  );
}
