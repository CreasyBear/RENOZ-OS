/**
 * Contexts
 *
 * React contexts for global state management.
 */

export {
  ConfirmationProvider,
  useConfirmationContext,
} from "./confirmation-context";
export type {
  ConfirmationContextValue,
  ConfirmationOptions,
  ConfirmationState,
} from "./confirmation-context";

export {
  OrganizationSettingsProvider,
  useOrganizationSettings,
  useOrganizationSettingsLoading,
  DEFAULT_SETTINGS,
} from "./organization-settings-context";
export type {
  OrganizationSettingsContextValue,
  OrganizationSettingsProviderProps,
} from "./organization-settings-context";

export { useOpenQuickLog } from "./open-quick-log-context";
export type { OpenQuickLogContextValue } from "./open-quick-log-context";
export { OpenQuickLogProvider } from "./open-quick-log-provider";
