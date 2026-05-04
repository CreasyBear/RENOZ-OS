'use client';

import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { WarrantyAlertAction, WarrantyAlertItem } from './warranty-alerts-utils';

interface WarrantyAlertsProps {
  alerts: WarrantyAlertItem[];
  onDismiss: (alertId: string) => void;
  onExtendWarranty: () => void;
  onReviewClaims: () => void;
  onEnableAlerts: () => void;
}

export function WarrantyAlerts({
  alerts,
  onDismiss,
  onExtendWarranty,
  onReviewClaims,
  onEnableAlerts,
}: WarrantyAlertsProps) {
  if (alerts.length === 0) return null;

  const handleAction = (action: WarrantyAlertAction) => {
    switch (action) {
      case 'extend':
        onExtendWarranty();
        break;
      case 'review-claims':
        onReviewClaims();
        break;
      case 'enable-alerts':
        onEnableAlerts();
        break;
    }
  };

  return (
    <section className="space-y-2">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.tone === 'critical' ? 'destructive' : 'default'}
        >
          <AlertDescription className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">{alert.title}</div>
              <div className="text-sm text-muted-foreground">{alert.description}</div>
            </div>
            <div className="flex items-center gap-2">
              {alert.actionLabel && alert.action ? (
                <Button variant="outline" size="sm" onClick={() => handleAction(alert.action!)}>
                  {alert.actionLabel}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dismiss alert"
                onClick={() => onDismiss(alert.id)}
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
