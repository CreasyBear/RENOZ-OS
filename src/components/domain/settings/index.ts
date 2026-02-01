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

// --- Organization Settings (Container/Presenter) ---
export { OrganizationSettingsContainer, UnifiedSettingsContainer } from './organization-settings-container';
export {
  OrganizationSettingsPresenter,
  type OrganizationSettingsData,
  type OrganizationSettingsCallbacks,
  type OrganizationSettingsPresenterProps,
} from './organization-settings-presenter';

// --- Modular Settings Sections ---
export {
  GeneralSettingsSection,
  AddressSettingsSection,
  RegionalSettingsSection,
  FinancialSettingsSection,
  LinkSettingsSection,
  type SectionProps,
  type GeneralSettingsData,
  type AddressSettingsData,
  type RegionalSettingsData,
  type FinancialSettingsData,
  type LinkSectionProps,
} from './settings-sections';

// --- Extended Settings Sections ---
export {
  PreferencesSettingsSection,
  EmailSettingsSection,
  SecuritySettingsSection,
  ApiTokensSettingsSection,
  CategoriesSettingsSection,
  TargetsSettingsSection,
  WinLossSettingsSection,
  type PreferencesSettingsData,
  type PreferencesSectionProps,
  type EmailSettingsData,
  type EmailSectionProps,
  type SecuritySettingsData,
  type SecuritySectionProps,
  type ApiToken,
  type ApiTokensSectionProps,
  type Category,
  type CategoriesSectionProps,
  type TargetsSettingsData,
  type TargetsSectionProps,
  type WinLossReason,
  type WinLossSectionProps,
} from './settings-sections-extended';

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
