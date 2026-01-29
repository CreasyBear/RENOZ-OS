/**
 * Notification Preferences Hook
 *
 * Hook for managing user notification preferences.
 *
 * @see src/server/functions/users/user-preferences.ts
 * @see drizzle/schema/users/user-preferences.ts
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPreferences, setPreference, setPreferences } from "@/server/functions/users/user-preferences";
import { toast } from "@/hooks/_shared/use-toast";
import { queryKeys } from "@/lib/query-keys";
// Note: PREFERENCE_CATEGORIES should be imported from drizzle/schema/users but having resolution issues
// Hardcoding here for now
const PREFERENCE_CATEGORIES = {
  APPEARANCE: "appearance",
  NOTIFICATIONS: "notifications",
  DASHBOARD: "dashboard",
  DATA_DISPLAY: "data_display",
  SHORTCUTS: "shortcuts",
  ACCESSIBILITY: "accessibility",
  LOCALIZATION: "localization",
} as const;

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  digestFrequency: "daily" | "weekly" | "realtime";
  orderUpdates: boolean;
  customerMessages: boolean;
  inventoryAlerts: boolean;
  taskReminders: boolean;
  mentions: boolean;
  systemAnnouncements: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  digestFrequency: "daily",
  orderUpdates: true,
  customerMessages: true,
  inventoryAlerts: true,
  taskReminders: true,
  mentions: true,
  systemAnnouncements: true,
};

/**
 * Convert database keys to camelCase
 */
function mapDbKeyToField(key: string): keyof NotificationPreferences {
  const keyMap: Record<string, keyof NotificationPreferences> = {
    email: "email",
    push: "push",
    digest_frequency: "digestFrequency",
    order_updates: "orderUpdates",
    customer_messages: "customerMessages",
    inventory_alerts: "inventoryAlerts",
    task_reminders: "taskReminders",
    mentions: "mentions",
    system_announcements: "systemAnnouncements",
  };
  return keyMap[key] || (key as keyof NotificationPreferences);
}

/**
 * Convert camelCase to database snake_case keys
 */
function mapFieldToDbKey(field: keyof NotificationPreferences): string {
  const keyMap: Record<keyof NotificationPreferences, string> = {
    email: "email",
    push: "push",
    digestFrequency: "digest_frequency",
    orderUpdates: "order_updates",
    customerMessages: "customer_messages",
    inventoryAlerts: "inventory_alerts",
    taskReminders: "task_reminders",
    mentions: "mentions",
    systemAnnouncements: "system_announcements",
  };
  return keyMap[field];
}

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data: rawPreferences, isLoading } = useQuery({
    queryKey: queryKeys.user.preferences("notifications"),
    queryFn: () => getPreferences({ data: { category: PREFERENCE_CATEGORIES.NOTIFICATIONS } }),
  });

  // Transform raw preferences to typed NotificationPreferences
  const preferences: NotificationPreferences = { ...DEFAULT_PREFERENCES };
  if (rawPreferences?.preferences) {
    for (const pref of rawPreferences.preferences) {
      const field = mapDbKeyToField(pref.key);
      if (field in preferences) {
        (preferences as unknown as Record<string, unknown>)[field as string] = pref.value;
      }
    }
  }

  // Single preference update mutation
  const setSinglePreference = useMutation({
    mutationFn: async ({ key, value }: { key: keyof NotificationPreferences; value: unknown }) => {
      const dbKey = mapFieldToDbKey(key);
      const result = await setPreference({
        data: {
          category: PREFERENCE_CATEGORIES.NOTIFICATIONS,
          key: dbKey,
          value,
        },
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.preferences("notifications") });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update preference");
    },
  });

  // Batch update mutation
  const setAllPreferences = useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      const updates = Object.entries(prefs).map(([key, value]) => ({
        category: PREFERENCE_CATEGORIES.NOTIFICATIONS,
        key: mapFieldToDbKey(key as keyof NotificationPreferences),
        value,
      }));

      const result = await setPreferences({ data: { preferences: updates } });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.preferences("notifications") });
      toast.success("Notification preferences updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update preferences");
    },
  });

  const updatePreference = (key: keyof NotificationPreferences, value: unknown) => {
    setSinglePreference.mutate({ key, value });
  };

  const updatePreferences = (prefs: Partial<NotificationPreferences>) => {
    setAllPreferences.mutate(prefs);
  };

  const isPending = setSinglePreference.isPending || setAllPreferences.isPending;

  return {
    preferences,
    isLoading,
    isPending,
    updatePreference,
    updatePreferences,
  };
}
