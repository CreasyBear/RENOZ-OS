/**
 * Preferences Settings Presenter
 *
 * Pure UI component for user preferences using SettingsRow format.
 * Receives preferences data and save callback as props.
 */

import { SettingsSection, SettingsRow } from "./settings-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface PreferencesPresenterProps {
  preferences: Record<string, Record<string, any>>;
  saving: string | null;
  onSave: (category: string, key: string, value: any) => Promise<void>;
}

// ============================================================================
// PRESENTER COMPONENT
// ============================================================================

export function PreferencesSettingsPresenter({
  preferences,
  saving,
  onSave,
}: PreferencesPresenterProps) {
  const getValue = (category: string, key: string, defaultValue: any) => {
    return preferences[category]?.[key] ?? defaultValue;
  };

  return (
    <>
      {/* Appearance */}
      <SettingsSection id="preferences-appearance" title="Appearance" description="Theme, colors, and visual density.">
        <SettingsRow label="Theme" description="Choose light, dark, or system theme.">
          <div className="flex items-center gap-2">
            {saving === "appearance.theme" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Select value={getValue("appearance", "theme", "system")} onValueChange={(v) => onSave("appearance", "theme", v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>

        <SettingsRow label="Accent Color" description="Primary accent color.">
          <div className="flex items-center gap-2">
            {saving === "appearance.accentColor" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Select value={getValue("appearance", "accentColor", "blue")} onValueChange={(v) => onSave("appearance", "accentColor", v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="purple">Purple</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="red">Red</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>

        <SettingsRow label="Interface Density" description="Compact, comfortable, or spacious.">
          <div className="flex items-center gap-2">
            {saving === "appearance.density" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Select value={getValue("appearance", "density", "comfortable")} onValueChange={(v) => onSave("appearance", "density", v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>

        <SettingsRow label="Show Avatars" description="Display avatars in lists.">
          <div className="flex items-center gap-2">
            {saving === "appearance.showAvatars" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("appearance", "showAvatars", true)} onCheckedChange={(v) => onSave("appearance", "showAvatars", v)} />
          </div>
        </SettingsRow>

        <SettingsRow label="Animated Icons" description="Enable icon animations.">
          <div className="flex items-center gap-2">
            {saving === "appearance.animatedIcons" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("appearance", "animatedIcons", true)} onCheckedChange={(v) => onSave("appearance", "animatedIcons", v)} />
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection id="preferences-notifications" title="Notifications" description="Email, in-app, and push notifications.">
        <SettingsRow label="New Leads" description="Email when leads are assigned.">
          <div className="flex items-center gap-2">
            {saving === "notifications.email_newLeads" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("notifications", "email_newLeads", true)} onCheckedChange={(v) => onSave("notifications", "email_newLeads", v)} />
          </div>
        </SettingsRow>

        <SettingsRow label="Quote Updates" description="Email on quote status changes.">
          <div className="flex items-center gap-2">
            {saving === "notifications.email_quotes" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("notifications", "email_quotes", true)} onCheckedChange={(v) => onSave("notifications", "email_quotes", v)} />
          </div>
        </SettingsRow>

        <SettingsRow label="Task Reminders" description="Email for task reminders.">
          <div className="flex items-center gap-2">
            {saving === "notifications.email_tasks" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("notifications", "email_tasks", true)} onCheckedChange={(v) => onSave("notifications", "email_tasks", v)} />
          </div>
        </SettingsRow>

        <SettingsRow label="In-App Notifications" description="Show notifications in the app.">
          <div className="flex items-center gap-2">
            {saving === "notifications.inApp_enabled" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("notifications", "inApp_enabled", true)} onCheckedChange={(v) => onSave("notifications", "inApp_enabled", v)} />
          </div>
        </SettingsRow>

        <SettingsRow label="Sound Effects" description="Play sounds for notifications.">
          <div className="flex items-center gap-2">
            {saving === "notifications.inApp_sound" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("notifications", "inApp_sound", false)} onCheckedChange={(v) => onSave("notifications", "inApp_sound", v)} />
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Data Display */}
      <SettingsSection id="preferences-data" title="Data Display" description="Tables, lists, and pagination.">
        <SettingsRow label="Table Page Size" description="Default rows per page.">
          <div className="flex items-center gap-2">
            {saving === "data_display.tablePageSize" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Select value={getValue("data_display", "tablePageSize", "25")} onValueChange={(v) => onSave("data_display", "tablePageSize", v)}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>

        <SettingsRow label="Sticky Headers" description="Keep table headers visible.">
          <div className="flex items-center gap-2">
            {saving === "data_display.stickyHeaders" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("data_display", "stickyHeaders", true)} onCheckedChange={(v) => onSave("data_display", "stickyHeaders", v)} />
          </div>
        </SettingsRow>

        <SettingsRow label="Alternate Row Colors" description="Zebra stripe table rows.">
          <div className="flex items-center gap-2">
            {saving === "data_display.alternateRowColors" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("data_display", "alternateRowColors", true)} onCheckedChange={(v) => onSave("data_display", "alternateRowColors", v)} />
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Accessibility */}
      <SettingsSection id="preferences-accessibility" title="Accessibility" description="Motion, font size, and contrast.">
        <SettingsRow label="Reduce Motion" description="Minimize animations.">
          <div className="flex items-center gap-2">
            {saving === "accessibility.reduceMotion" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("accessibility", "reduceMotion", false)} onCheckedChange={(v) => onSave("accessibility", "reduceMotion", v)} />
          </div>
        </SettingsRow>

        <SettingsRow label="High Contrast" description="Increase color contrast.">
          <div className="flex items-center gap-2">
            {saving === "accessibility.highContrast" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("accessibility", "highContrast", false)} onCheckedChange={(v) => onSave("accessibility", "highContrast", v)} />
          </div>
        </SettingsRow>

        <SettingsRow label="Font Size" description="Adjust text size.">
          <div className="flex items-center gap-2">
            {saving === "accessibility.fontSize" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Select value={getValue("accessibility", "fontSize", "medium")} onValueChange={(v) => onSave("accessibility", "fontSize", v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="x-large">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>

        <SettingsRow label="Keyboard Navigation" description="Full keyboard navigation support.">
          <div className="flex items-center gap-2">
            {saving === "accessibility.keyboardNav" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch checked={getValue("accessibility", "keyboardNav", true)} onCheckedChange={(v) => onSave("accessibility", "keyboardNav", v)} />
          </div>
        </SettingsRow>
      </SettingsSection>
    </>
  );
}
