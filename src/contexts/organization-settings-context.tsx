/* eslint-disable react-refresh/only-export-components -- Context file exports provider + hook */
/**
 * Organization Settings Context
 *
 * Provides global access to organization settings (currency, locale, timezone, dateFormat)
 * throughout the application. Follows the same pattern as email template's useOrgFormat().
 *
 * This context is used by:
 * - FormatAmount component (currency, locale)
 * - FormatDate component (locale, dateFormat, timezone)
 * - useOrgFormat() hook (all settings)
 *
 * The provider is mounted in _authenticated.tsx to make settings available
 * to all authenticated routes.
 *
 * @example
 * ```tsx
 * // Using the context via hook
 * const { currency, locale, timezone, dateFormat } = useOrganizationSettings();
 *
 * // Using the formatter hook
 * const { formatCurrency, formatDate } = useOrgFormat();
 * <span>{formatCurrency(12500)}</span>
 * <span>{formatDate(new Date())}</span>
 * ```
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { OrganizationSettings } from "~/lib/schemas/auth";
import { organizationSettingsSchema } from "~/lib/schemas/auth";

/**
 * Default organization settings as fallback
 * These match the database defaults from drizzle/schema/settings/organizations.ts
 */
const DEFAULT_SETTINGS: OrganizationSettings = {
  timezone: "Australia/Sydney",
  locale: "en-AU",
  currency: "AUD",
  dateFormat: "DD/MM/YYYY",
  fiscalYearStart: 1,
  defaultPaymentTerms: 30,
  timeFormat: "12h",
  weekStartDay: 1,
  defaultTaxRate: 10,
  numberFormat: "1,234.56",
};

/**
 * Context value type - extends OrganizationSettings with loading state
 */
interface OrganizationSettingsContextValue extends OrganizationSettings {
  /** Whether settings are still loading */
  isLoading: boolean;
  /** Error if settings failed to load */
  error: Error | null;
}

/**
 * Context for organization settings
 */
const OrganizationSettingsContext = createContext<
  OrganizationSettingsContextValue | undefined
>(undefined);

/**
 * Props for OrganizationSettingsProvider
 */
/** Settings from API may have weekStartDay as number; context normalizes to WeekStartDay */
interface OrganizationSettingsProviderProps {
  children: ReactNode;
  /** Organization settings from the API (may be partial or null) */
  settings?: Partial<OrganizationSettings> | Partial<{ weekStartDay?: number; timeFormat?: string; numberFormat?: string }> | null;
  /** Whether settings are loading */
  isLoading?: boolean;
  /** Error if settings failed to load */
  error?: Error | null;
}

/**
 * Provider component for organization settings
 *
 * Wraps children with the organization settings context.
 * Used in _authenticated.tsx to provide settings to all authenticated routes.
 *
 * @example
 * ```tsx
 * // In _authenticated.tsx
 * const { data: settings, isLoading, error } = useOrganizationSettingsQuery();
 *
 * return (
 *   <OrganizationSettingsProvider settings={settings} isLoading={isLoading} error={error}>
 *     <AppShell>{children}</AppShell>
 *   </OrganizationSettingsProvider>
 * );
 * ```
 */
export function OrganizationSettingsProvider({
  children,
  settings,
  isLoading = false,
  error = null,
}: OrganizationSettingsProviderProps) {
  const value = useMemo<OrganizationSettingsContextValue>(() => {
    const parsed = organizationSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      ...settings,
    });
    const data = parsed.success ? parsed.data : DEFAULT_SETTINGS;
    return {
      ...data,
      isLoading,
      error,
    };
  }, [settings, isLoading, error]);

  return (
    <OrganizationSettingsContext.Provider value={value}>
      {children}
    </OrganizationSettingsContext.Provider>
  );
}

/**
 * Hook to access organization settings
 *
 * Returns the current organization's settings with defaults applied.
 * Must be used within OrganizationSettingsProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currency, locale, timezone } = useOrganizationSettings();
 *
 *   return (
 *     <div>
 *       <p>Currency: {currency}</p>
 *       <p>Locale: {locale}</p>
 *       <p>Timezone: {timezone}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @throws Error if used outside of OrganizationSettingsProvider
 */
export function useOrganizationSettings(): OrganizationSettingsContextValue {
  const context = useContext(OrganizationSettingsContext);

  if (context === undefined) {
    throw new Error(
      "useOrganizationSettings must be used within an OrganizationSettingsProvider"
    );
  }

  return context;
}

/**
 * Hook to check if organization settings are loading
 *
 * Convenience hook for components that need to show loading state
 * while settings are being fetched.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isLoading = useOrganizationSettingsLoading();
 *
 *   if (isLoading) return <Skeleton />;
 *   return <Content />;
 * }
 * ```
 */
export function useOrganizationSettingsLoading(): boolean {
  const context = useContext(OrganizationSettingsContext);

  if (context === undefined) {
    return true; // Assume loading if no provider
  }

  return context.isLoading;
}

// Re-export types
export type { OrganizationSettingsContextValue, OrganizationSettingsProviderProps };
export { DEFAULT_SETTINGS };
