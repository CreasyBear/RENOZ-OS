/**
 * User Preferences Settings Route
 *
 * Personalized user settings with category-based organization.
 * Features auto-save with success toast notifications.
 *
 * Categories:
 * - Appearance: Theme, accent color, density
 * - Notifications: Email, in-app, push preferences
 * - Localization: Language, timezone, date/number formats
 * - Dashboard: Default view, widgets, refresh interval
 * - Data Display: Table density, page sizes
 * - Accessibility: Motion, font size, contrast
 * - Shortcuts: Keyboard shortcut preferences
 *
 * @see src/server/functions/user-preferences.ts for server functions
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { SettingsCardsSkeleton } from '@/components/skeletons/settings';
import { getPreferences, setPreference } from '@/server/functions/users/user-preferences';
import { PREFERENCE_CATEGORIES, type PreferenceCategory } from 'drizzle/schema';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks';

// Icons
import {
  Palette,
  Bell,
  Globe,
  LayoutDashboard,
  Table2,
  Accessibility,
  Keyboard,
  Loader2,
} from 'lucide-react';

// Route definition
export const Route = createFileRoute('/_authenticated/settings/preferences' as any)({
  component: PreferencesSettings,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsCardsSkeleton sections={3} showSidebar />,
  loader: async () => {
    const result = await getPreferences({ data: {} });
    return { preferences: result.grouped };
  },
});

// Category metadata
const CATEGORIES = [
  {
    id: PREFERENCE_CATEGORIES.APPEARANCE,
    label: 'Appearance',
    description: 'Theme, colors, and visual density',
    icon: Palette,
  },
  {
    id: PREFERENCE_CATEGORIES.NOTIFICATIONS,
    label: 'Notifications',
    description: 'Email, in-app, and push notifications',
    icon: Bell,
  },
  {
    id: PREFERENCE_CATEGORIES.LOCALIZATION,
    label: 'Localization',
    description: 'Language, timezone, and formats',
    icon: Globe,
  },
  {
    id: PREFERENCE_CATEGORIES.DASHBOARD,
    label: 'Dashboard',
    description: 'Default views and widgets',
    icon: LayoutDashboard,
  },
  {
    id: PREFERENCE_CATEGORIES.DATA_DISPLAY,
    label: 'Data Display',
    description: 'Tables, lists, and pagination',
    icon: Table2,
  },
  {
    id: PREFERENCE_CATEGORIES.ACCESSIBILITY,
    label: 'Accessibility',
    description: 'Motion, font size, and contrast',
    icon: Accessibility,
  },
  {
    id: PREFERENCE_CATEGORIES.SHORTCUTS,
    label: 'Shortcuts',
    description: 'Keyboard navigation',
    icon: Keyboard,
  },
];

function PreferencesSettings() {
  const loaderData = (Route.useLoaderData as any)();
  const [activeCategory, setActiveCategory] = useState<PreferenceCategory>(
    PREFERENCE_CATEGORIES.APPEARANCE
  );
  const [preferences, setPreferences] = useState<Record<string, Record<string, any>>>(
    loaderData?.preferences || {}
  );
  const [saving, setSaving] = useState<string | null>(null);

  const setPreferenceFn = useServerFn(setPreference);

  // Get value with default fallback
  const getValue = (category: string, key: string, defaultValue: any) => {
    return preferences[category]?.[key] ?? defaultValue;
  };

  // Save preference with auto-save and toast
  const savePref = async (category: string, key: string, value: any) => {
    const saveKey = `${category}.${key}`;
    setSaving(saveKey);

    // Optimistic update
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));

    try {
      await setPreferenceFn({ data: { category, key, value } });
      toast.success('Preference saved', { duration: 2000 });
    } catch {
      // Revert on error
      setPreferences((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: loaderData?.preferences?.[category]?.[key],
        },
      }));
      toast.error('Failed to save preference');
    } finally {
      setSaving(null);
    }
  };

  // Render preference control based on type
  const renderSwitch = (category: string, key: string, label: string, defaultValue = false) => {
    const saveKey = `${category}.${key}`;
    return (
      <div className="flex items-center justify-between">
        <Label htmlFor={saveKey}>{label}</Label>
        <div className="flex items-center gap-2">
          {saving === saveKey && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
          <Switch
            id={saveKey}
            checked={getValue(category, key, defaultValue)}
            onCheckedChange={(checked) => savePref(category, key, checked)}
          />
        </div>
      </div>
    );
  };

  const renderSelect = (
    category: string,
    key: string,
    label: string,
    options: { value: string; label: string }[],
    defaultValue: string
  ) => {
    const saveKey = `${category}.${key}`;
    return (
      <div className="flex items-center justify-between">
        <Label htmlFor={saveKey}>{label}</Label>
        <div className="flex items-center gap-2">
          {saving === saveKey && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
          <Select
            value={getValue(category, key, defaultValue)}
            onValueChange={(value) => savePref(category, key, value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  // Render active category content
  const renderCategoryContent = () => {
    switch (activeCategory) {
      case PREFERENCE_CATEGORIES.APPEARANCE:
        return (
          <div className="space-y-6">
            {renderSelect(
              'appearance',
              'theme',
              'Theme',
              [
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ],
              'system'
            )}

            {renderSelect(
              'appearance',
              'accentColor',
              'Accent Color',
              [
                { value: 'blue', label: 'Blue' },
                { value: 'green', label: 'Green' },
                { value: 'purple', label: 'Purple' },
                { value: 'orange', label: 'Orange' },
                { value: 'red', label: 'Red' },
              ],
              'blue'
            )}

            {renderSelect(
              'appearance',
              'density',
              'Interface Density',
              [
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'spacious', label: 'Spacious' },
              ],
              'comfortable'
            )}

            {renderSwitch('appearance', 'showAvatars', 'Show avatars in lists', true)}
            {renderSwitch('appearance', 'animatedIcons', 'Animated icons', true)}
          </div>
        );

      case PREFERENCE_CATEGORIES.NOTIFICATIONS:
        return (
          <div className="space-y-6">
            <div>
              <h4 className="mb-4 text-sm font-medium">Email Notifications</h4>
              <div className="space-y-4 pl-4">
                {renderSwitch('notifications', 'email_newLeads', 'New leads assigned to me', true)}
                {renderSwitch('notifications', 'email_quotes', 'Quote status changes', true)}
                {renderSwitch('notifications', 'email_tasks', 'Task reminders', true)}
                {renderSwitch(
                  'notifications',
                  'email_mentions',
                  'When mentioned in comments',
                  true
                )}
                {renderSwitch(
                  'notifications',
                  'email_weeklyDigest',
                  'Weekly activity digest',
                  false
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-4 text-sm font-medium">In-App Notifications</h4>
              <div className="space-y-4 pl-4">
                {renderSwitch(
                  'notifications',
                  'inApp_enabled',
                  'Enable in-app notifications',
                  true
                )}
                {renderSwitch('notifications', 'inApp_sound', 'Play notification sounds', false)}
                {renderSwitch('notifications', 'inApp_desktop', 'Desktop notifications', false)}
              </div>
            </div>
          </div>
        );

      case PREFERENCE_CATEGORIES.LOCALIZATION:
        return (
          <div className="space-y-6">
            {renderSelect(
              'localization',
              'language',
              'Language',
              [
                { value: 'en-US', label: 'English (US)' },
                { value: 'en-GB', label: 'English (UK)' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' },
              ],
              'en-US'
            )}

            {renderSelect(
              'localization',
              'timezone',
              'Timezone',
              [
                { value: 'America/New_York', label: 'Eastern Time (ET)' },
                { value: 'America/Chicago', label: 'Central Time (CT)' },
                { value: 'America/Denver', label: 'Mountain Time (MT)' },
                { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                { value: 'UTC', label: 'UTC' },
              ],
              'America/New_York'
            )}

            {renderSelect(
              'localization',
              'dateFormat',
              'Date Format',
              [
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ],
              'MM/DD/YYYY'
            )}

            {renderSelect(
              'localization',
              'timeFormat',
              'Time Format',
              [
                { value: '12h', label: '12-hour (AM/PM)' },
                { value: '24h', label: '24-hour' },
              ],
              '12h'
            )}

            {renderSelect(
              'localization',
              'currency',
              'Currency',
              [
                { value: 'USD', label: 'US Dollar ($)' },
                { value: 'EUR', label: 'Euro (\u20AC)' },
                { value: 'GBP', label: 'British Pound (\u00A3)' },
                { value: 'CAD', label: 'Canadian Dollar (C$)' },
                { value: 'AUD', label: 'Australian Dollar (A$)' },
              ],
              'USD'
            )}

            {renderSelect(
              'localization',
              'numberFormat',
              'Number Format',
              [
                { value: 'en-US', label: '1,234.56' },
                { value: 'de-DE', label: '1.234,56' },
                { value: 'fr-FR', label: '1 234,56' },
              ],
              'en-US'
            )}
          </div>
        );

      case PREFERENCE_CATEGORIES.DASHBOARD:
        return (
          <div className="space-y-6">
            {renderSelect(
              'dashboard',
              'defaultView',
              'Default Landing Page',
              [
                { value: 'dashboard', label: 'Dashboard' },
                { value: 'pipeline', label: 'Pipeline' },
                { value: 'leads', label: 'Leads' },
                { value: 'quotes', label: 'Quotes' },
              ],
              'dashboard'
            )}

            {renderSelect(
              'dashboard',
              'refreshInterval',
              'Auto-Refresh Interval',
              [
                { value: 'off', label: 'Off' },
                { value: '30', label: 'Every 30 seconds' },
                { value: '60', label: 'Every minute' },
                { value: '300', label: 'Every 5 minutes' },
              ],
              'off'
            )}

            {renderSwitch('dashboard', 'showWelcome', 'Show welcome message', true)}
            {renderSwitch('dashboard', 'showQuickActions', 'Show quick actions bar', true)}
            {renderSwitch('dashboard', 'showRecentActivity', 'Show recent activity', true)}
          </div>
        );

      case PREFERENCE_CATEGORIES.DATA_DISPLAY:
        return (
          <div className="space-y-6">
            {renderSelect(
              'data_display',
              'tablePageSize',
              'Default Table Page Size',
              [
                { value: '10', label: '10 rows' },
                { value: '25', label: '25 rows' },
                { value: '50', label: '50 rows' },
                { value: '100', label: '100 rows' },
              ],
              '25'
            )}

            {renderSelect(
              'data_display',
              'tableDensity',
              'Table Density',
              [
                { value: 'compact', label: 'Compact' },
                { value: 'normal', label: 'Normal' },
                { value: 'relaxed', label: 'Relaxed' },
              ],
              'normal'
            )}

            {renderSwitch('data_display', 'showRowNumbers', 'Show row numbers', false)}
            {renderSwitch('data_display', 'stickyHeaders', 'Sticky table headers', true)}
            {renderSwitch('data_display', 'alternateRowColors', 'Alternate row colors', true)}
            {renderSwitch('data_display', 'wrapText', 'Wrap long text', false)}
          </div>
        );

      case PREFERENCE_CATEGORIES.ACCESSIBILITY:
        return (
          <div className="space-y-6">
            {renderSwitch('accessibility', 'reduceMotion', 'Reduce motion', false)}
            {renderSwitch('accessibility', 'highContrast', 'High contrast mode', false)}

            {renderSelect(
              'accessibility',
              'fontSize',
              'Font Size',
              [
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium (Default)' },
                { value: 'large', label: 'Large' },
                { value: 'x-large', label: 'Extra Large' },
              ],
              'medium'
            )}

            {renderSwitch(
              'accessibility',
              'screenReaderOptimized',
              'Screen reader optimizations',
              false
            )}
            {renderSwitch('accessibility', 'focusIndicators', 'Enhanced focus indicators', false)}
            {renderSwitch('accessibility', 'keyboardNav', 'Enable full keyboard navigation', true)}
          </div>
        );

      case PREFERENCE_CATEGORIES.SHORTCUTS:
        return (
          <div className="space-y-6">
            {renderSwitch('shortcuts', 'enabled', 'Enable keyboard shortcuts', true)}

            <Separator />

            <div className="text-muted-foreground text-sm">
              <h4 className="text-foreground mb-3 font-medium">Available Shortcuts</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Navigate to Dashboard</span>
                  <kbd className="bg-muted rounded px-2 py-1 text-xs">G then D</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Navigate to Pipeline</span>
                  <kbd className="bg-muted rounded px-2 py-1 text-xs">G then P</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Quick Search</span>
                  <kbd className="bg-muted rounded px-2 py-1 text-xs">Cmd + K</kbd>
                </div>
                <div className="flex justify-between">
                  <span>New Lead</span>
                  <kbd className="bg-muted rounded px-2 py-1 text-xs">N then L</kbd>
                </div>
                <div className="flex justify-between">
                  <span>New Quote</span>
                  <kbd className="bg-muted rounded px-2 py-1 text-xs">N then Q</kbd>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const activeCategoryMeta = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Preferences"
        description="Personalize your experience. Changes are saved automatically."
      />
      <PageLayout.Content>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{category.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="max-w-2xl flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {activeCategoryMeta && <activeCategoryMeta.icon className="h-5 w-5" />}
                {activeCategoryMeta?.label}
              </CardTitle>
              <CardDescription>{activeCategoryMeta?.description}</CardDescription>
            </CardHeader>
            <CardContent>{renderCategoryContent()}</CardContent>
          </Card>
        </div>
      </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
