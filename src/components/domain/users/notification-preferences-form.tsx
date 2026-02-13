/**
 * Notification Preferences Form
 *
 * Form for managing user notification preferences.
 *
 * ARCHITECTURE: Container/Presenter Pattern
 * - Container handles data fetching (useNotificationPreferences hook)
 * - Presenter renders UI and receives data/callbacks via props
 *
 * @see src/hooks/profile/use-notification-preferences.ts
 */
import { useCallback } from "react";
import { Bell, Mail, Smartphone, Package, MessageSquare, Users, AlertTriangle, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNotificationPreferences } from "@/hooks/profile/use-notification-preferences";
import type { NotificationPreferencesFormPresenterProps } from "@/lib/schemas/users/profile";

// ============================================================================
// PRESENTER
// ============================================================================

/**
 * Notification Preferences Form Presenter
 *
 * Pure UI component - receives all data and callbacks via props.
 * No data fetching hooks.
 */
export function NotificationPreferencesFormPresenter({
  preferences,
  isLoading,
  isPending,
  onToggle,
  onDigestChange,
}: NotificationPreferencesFormPresenterProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified about activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notification Channels
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.email}
                onCheckedChange={() => onToggle("email")}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in browser
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.push}
                onCheckedChange={() => onToggle("push")}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Digest Frequency */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Digest Frequency
          </h4>
          <RadioGroup
            value={preferences.digestFrequency}
            onValueChange={(value) => onDigestChange(value as "daily" | "weekly" | "realtime")}
            className="flex flex-col space-y-2"
            disabled={isPending}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="realtime" id="realtime" />
              <Label htmlFor="realtime" className="font-normal">
                Real-time - Send notifications immediately
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily" className="font-normal">
                Daily digest - Send once per day
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weekly" id="weekly" />
              <Label htmlFor="weekly" className="font-normal">
                Weekly digest - Send once per week
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Notification Types</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="order-updates"
                  className="flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Order Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Status changes, shipments, and delivery updates
                </p>
              </div>
              <Switch
                id="order-updates"
                checked={preferences.orderUpdates}
                onCheckedChange={() => onToggle("orderUpdates")}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="customer-messages"
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Customer Messages
                </Label>
                <p className="text-sm text-muted-foreground">
                  New messages from customers
                </p>
              </div>
              <Switch
                id="customer-messages"
                checked={preferences.customerMessages}
                onCheckedChange={() => onToggle("customerMessages")}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="inventory-alerts"
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Inventory Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Low stock and inventory warnings
                </p>
              </div>
              <Switch
                id="inventory-alerts"
                checked={preferences.inventoryAlerts}
                onCheckedChange={() => onToggle("inventoryAlerts")}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="task-reminders"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Task Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Upcoming tasks and deadlines
                </p>
              </div>
              <Switch
                id="task-reminders"
                checked={preferences.taskReminders}
                onCheckedChange={() => onToggle("taskReminders")}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mentions" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Mentions
                </Label>
                <p className="text-sm text-muted-foreground">
                  When you are @mentioned in comments
                </p>
              </div>
              <Switch
                id="mentions"
                checked={preferences.mentions}
                onCheckedChange={() => onToggle("mentions")}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="system-announcements"
                  className="flex items-center gap-2"
                >
                  <Info className="h-4 w-4" />
                  System Announcements
                </Label>
                <p className="text-sm text-muted-foreground">
                  Important system updates and maintenance notices
                </p>
              </div>
              <Switch
                id="system-announcements"
                checked={preferences.systemAnnouncements}
                onCheckedChange={() => onToggle("systemAnnouncements")}
                disabled={isPending}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CONTAINER
// ============================================================================

/**
 * Notification Preferences Form Container
 *
 * Container responsibilities:
 * - Fetches data hook (useNotificationPreferences)
 * - Handles preference update mutations
 * - Passes data and callbacks to presenter
 *
 * @source preferences from useNotificationPreferences hook
 */
export function NotificationPreferencesForm() {
  const { preferences, isLoading, isPending, updatePreference } =
    useNotificationPreferences();

  const handleToggle = useCallback(
    (key: keyof typeof preferences) => {
      updatePreference(key, !preferences[key]);
    },
    [preferences, updatePreference]
  );

  const handleDigestChange = useCallback(
    (value: "daily" | "weekly" | "realtime") => {
      updatePreference("digestFrequency", value);
    },
    [updatePreference]
  );

  return (
    <NotificationPreferencesFormPresenter
      preferences={preferences}
      isLoading={isLoading}
      isPending={isPending}
      onToggle={handleToggle}
      onDigestChange={handleDigestChange}
    />
  );
}
