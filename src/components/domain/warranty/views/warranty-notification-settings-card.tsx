'use client';

import { useId } from 'react';
import { AlertCircle, Bell, BellOff, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { formatDateAustralian } from '@/lib/warranty';
import type { WarrantyDetail, WarrantyDetailViewProps } from '@/lib/schemas/warranty';

type WarrantyNotificationSettingsContext = Pick<
  WarrantyDetail,
  'expiryAlertOptOut' | 'lastExpiryAlertSent'
>;

interface WarrantyNotificationSettingsCardProps {
  warranty: WarrantyNotificationSettingsContext;
  isOptOutUpdating: boolean;
  onToggleOptOut: WarrantyDetailViewProps['onToggleOptOut'];
}

function formatDate(dateString: string): string {
  return formatDateAustralian(dateString, 'numeric');
}

export function WarrantyNotificationSettingsCard({
  warranty,
  isOptOutUpdating,
  onToggleOptOut,
}: WarrantyNotificationSettingsCardProps) {
  const toggleId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bell className="h-4 w-4" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage expiry alert notifications for this warranty
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 space-y-1">
            <Label
              htmlFor={toggleId}
              className="flex cursor-pointer items-center gap-2"
            >
              {warranty.expiryAlertOptOut ? (
                <BellOff className="text-muted-foreground h-4 w-4" />
              ) : (
                <Bell className="text-primary h-4 w-4" />
              )}
              <span>Expiry Alerts</span>
            </Label>
            <p className="text-muted-foreground text-sm">
              {warranty.expiryAlertOptOut
                ? 'Alerts are disabled for this warranty'
                : 'Receive alerts at 90, 60, and 30 days before expiry'}
            </p>
          </div>
          <Switch
            id={toggleId}
            checked={!warranty.expiryAlertOptOut}
            onCheckedChange={(checked) => onToggleOptOut(!checked)}
            disabled={isOptOutUpdating}
            aria-label={warranty.expiryAlertOptOut ? 'Enable expiry alerts' : 'Disable expiry alerts'}
          />
        </div>

        {isOptOutUpdating ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating...</span>
          </div>
        ) : null}

        <Separator />

        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs tracking-wider uppercase">
            Last Alert Sent
          </Label>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span>
              {warranty.lastExpiryAlertSent
                ? formatDate(warranty.lastExpiryAlertSent)
                : 'No alerts sent yet'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {warranty.expiryAlertOptOut ? (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">
                You will not receive expiry reminders for this warranty
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Expiry reminders are active</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
