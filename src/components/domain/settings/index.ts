/**
 * Settings Domain Components
 *
 * Exports all settings-related UI components.
 */

// --- Settings UI (Cursor-style layout) ---
export {
  SettingsRow,
  SettingsSection,
  SettingsSidebar,
  SettingsSidebarItem,
  SettingsShell,
  type SettingsRowProps,
  type SettingsSectionProps,
  type SettingsSidebarProps,
  type SettingsSidebarItemProps,
  type SettingsShellProps,
} from "./settings-ui";

// --- Win/Loss Reasons ---
export {
  WinLossReasonsManager,
  type WinLossReasonsManagerProps,
} from "./win-loss-reasons-manager";

// Re-export types from hooks for backwards compatibility
export type { ReasonForm } from "@/hooks/settings";

// --- Target Form ---
export { TargetForm } from './target-form';
export type { TargetFormProps } from './target-form';

// --- Scheduled Reports ---
export { ScheduledReportForm } from './scheduled-report-form';
export type { ScheduledReportFormProps } from './scheduled-report-form';

// --- Organization Settings (Container) ---
export { OrganizationSettingsContainer, UnifiedSettingsContainer } from './organization-settings-container';

// --- Modular Settings Sections ---
export {
  GeneralSettingsSection,
  AddressSettingsSection,
  RegionalSettingsSection,
  FinancialSettingsSection,
  BrandingSettingsSection,
  LinkSettingsSection,
  type SectionProps,
  type GeneralSettingsData,
  type AddressSettingsData,
  type RegionalSettingsData,
  type FinancialSettingsData,
  type BrandingSettingsData,
  type LinkSectionProps,
} from './settings-sections';

// --- Settings Presenters (Cursor-style, receive props from container) ---
export {
  PreferencesSettingsPresenter,
  type PreferencesPresenterProps,
} from './preferences-settings-presenter';

export {
  SecuritySettingsPresenter,
  type SessionInfo,
  type SecurityPresenterProps,
} from './security-settings-presenter';

export {
  ApiTokensSettingsPresenter,
  type ApiTokenItem,
  type NewlyCreatedToken,
  type ApiTokensPresenterProps,
  type ApiTokenScope,
} from './api-tokens-settings-presenter';
