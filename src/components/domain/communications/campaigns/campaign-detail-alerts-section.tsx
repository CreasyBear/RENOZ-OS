import { memo, useCallback, useMemo } from "react";
import { AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAlertDismissals } from "@/hooks/_shared/use-alert-dismissals";
import { generateCampaignAlerts } from "@/lib/communications/campaign-alerts";

import type { Campaign } from "@/lib/schemas/communications";

interface CampaignDetailAlertsSectionProps {
  campaign: Campaign;
}

export const CampaignDetailAlertsSection = memo(
  function CampaignDetailAlertsSection({
    campaign,
  }: CampaignDetailAlertsSectionProps) {
    const { dismiss, isAlertDismissed } = useAlertDismissals();

    const visibleAlerts = useMemo(() => {
      return generateCampaignAlerts(campaign)
        .filter((alert) => !isAlertDismissed(alert.id))
        .slice(0, 3);
    }, [campaign, isAlertDismissed]);

    const handleDismissAlert = useCallback(
      (alertId: string) => {
        dismiss(alertId);
      },
      [dismiss]
    );

    if (visibleAlerts.length === 0) {
      return null;
    }

    return (
      <section className="space-y-2" aria-label="Campaign alerts">
        {visibleAlerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={alert.tone === "critical" ? "destructive" : "default"}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{alert.description}</span>
              <div className="flex items-center gap-2 shrink-0">
                {alert.onAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={alert.onAction}
                  >
                    {alert.actionLabel}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDismissAlert(alert.id)}
                  aria-label="Dismiss alert"
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </section>
    );
  }
);
