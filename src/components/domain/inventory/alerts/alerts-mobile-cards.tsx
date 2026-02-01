/**
 * Alerts Mobile Cards Component
 *
 * Mobile-optimized card layout for alerts list.
 */

import { memo, useCallback } from "react";
import { Package, Bell, BellOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DateCell } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import { type AlertTableItem, getAlertDisplayName, getThresholdDisplay } from "./alert-columns";
import { ALERT_TYPE_CONFIG } from "./alert-type-config";

export interface AlertsMobileCardsProps {
  /** Alerts to display */
  alerts: AlertTableItem[];
  /** Toggle active handler */
  onToggleActive?: (alertId: string, isActive: boolean) => void;
  /** Edit alert handler */
  onEdit?: (alert: AlertTableItem) => void;
  /** Additional className */
  className?: string;
}

/**
 * Mobile card layout for alerts list.
 * Each card is tappable to view/edit alert details.
 */
export const AlertsMobileCards = memo(function AlertsMobileCards({
  alerts,
  onToggleActive,
  onEdit,
  className,
}: AlertsMobileCardsProps) {
  const handleCardClick = useCallback(
    (alert: AlertTableItem) => {
      if (onEdit) {
        onEdit(alert);
      }
    },
    [onEdit]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, alert: AlertTableItem) => {
      if ((e.key === "Enter" || e.key === " ") && onEdit) {
        e.preventDefault();
        onEdit(alert);
      }
    },
    [onEdit]
  );

  const handleSwitchClick = useCallback((e: React.MouseEvent) => {
    // Prevent card click when toggling switch
    e.stopPropagation();
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      {alerts.map((alert) => {
        const typeConfig = ALERT_TYPE_CONFIG[alert.alertType];
        const TypeIcon = typeConfig.icon;
        const displayName = getAlertDisplayName(alert);
        const { value: thresholdValue, suffix: thresholdSuffix } = getThresholdDisplay(alert);

        return (
          <Card
            key={alert.id}
            tabIndex={onEdit ? 0 : undefined}
            role={onEdit ? "button" : undefined}
            aria-label={onEdit ? `Edit alert ${displayName}` : undefined}
            className={cn(
              "transition-colors",
              onEdit && "cursor-pointer hover:bg-muted/50",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !alert.isActive && "opacity-70"
            )}
            onClick={() => onEdit && handleCardClick(alert)}
            onKeyDown={(e) => onEdit && handleCardKeyDown(e, alert)}
          >
            <CardContent className="p-4">
              {/* Header row: Alert Name + Icon + Status Toggle */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <TypeIcon
                    className={cn("h-5 w-5 shrink-0", typeConfig.color)}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
                  </div>
                </div>
                {onToggleActive ? (
                  <div onClick={handleSwitchClick}>
                    <Switch
                      checked={alert.isActive}
                      onCheckedChange={(checked) => onToggleActive(alert.id, checked)}
                      aria-label={alert.isActive ? "Disable alert" : "Enable alert"}
                    />
                  </div>
                ) : (
                  <Badge variant={alert.isActive ? "default" : "secondary"} className="shrink-0">
                    {alert.isActive ? (
                      <>
                        <Bell className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <BellOff className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                )}
              </div>

              {/* Middle row: Scope */}
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <Package className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {alert.product?.name ?? "All Products"}
                  {alert.location?.name && ` @ ${alert.location.name}`}
                </span>
              </div>

              {/* Footer row: Threshold + Last Triggered */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Threshold: </span>
                  <span className="tabular-nums font-medium">
                    {thresholdValue}
                    {thresholdSuffix && (
                      <span className="text-muted-foreground ml-1">{thresholdSuffix}</span>
                    )}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {alert.lastTriggeredAt ? (
                    <span className="text-xs">
                      Last: <DateCell value={alert.lastTriggeredAt} format="short" />
                    </span>
                  ) : (
                    <span className="text-xs">Never triggered</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

AlertsMobileCards.displayName = "AlertsMobileCards";
